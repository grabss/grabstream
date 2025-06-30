import type { Server as HTTPServer } from 'node:http'
import type { Server as HTTPSServer } from 'node:https'

import { EventEmitter } from 'eventemitter3'
import type { RawData, WebSocket } from 'ws'
import { WebSocketServer } from 'ws'
import type {
  AnswerMessage,
  IceCandidateMessage,
  JoinRoomMessage,
  OfferMessage,
  UpdateDisplayNameMessage
} from './messages'
import { isClientToServerMessage } from './messages'
import { Peer } from './peer'
import { Room } from './room'

export type GrabstreamServerOptions = {
  host?: string
  port?: number
  path?: string
  server?: HTTPServer | HTTPSServer
}

export class GrabstreamServer extends EventEmitter {
  private wss?: WebSocketServer
  private readonly rooms: Map<string, Room> = new Map()
  private readonly peers: Map<string, Peer> = new Map()
  private readonly options: GrabstreamServerOptions

  constructor(options: GrabstreamServerOptions = {}) {
    super()

    if (options.server && (options.host || options.port)) {
      throw new Error('Cannot specify both server and host/port options')
    }

    if (options.server) {
      this.options = {
        path: options.path,
        server: options.server
      }
    } else {
      this.options = {
        host: options.host || '0.0.0.0',
        port: options.port || 8080,
        path: options.path
      }
    }
  }

  async start(): Promise<void> {
    if (this.wss) {
      throw new Error('GrabstreamServer is already running')
    }

    this.wss = new WebSocketServer({
      ...this.options,
      perMessageDeflate: false,
      maxPayload: 1024 * 1024
    })

    const wss = this.wss
    return new Promise((resolve, reject) => {
      const onListening = () => {
        wss.off('error', onError)

        this.setupWebSocketServerEventHandlers(wss)

        console.log('GrabstreamServer started...')
        this.emit('server:started')
        resolve()
      }

      const onError = (error: Error) => {
        wss.off('listening', onListening)
        wss.removeAllListeners()
        wss.close()

        this.cleanup()

        console.error('Error starting GrabstreamServer:', error)
        reject(error)
      }

      wss.once('listening', onListening)
      wss.once('error', onError)
    })
  }

  async stop(): Promise<void> {
    if (!this.wss) {
      throw new Error('GrabstreamServer is not running')
    }

    const wss = this.wss
    return new Promise((resolve, reject) => {
      wss.close((error) => {
        if (error) {
          console.error('Error stopping GrabstreamServer:', error)
          reject(error)
        } else {
          this.cleanup()

          console.log('GrabstreamServer stopped')
          this.emit('server:stopped')
          resolve()
        }
      })
    })
  }

  private setupWebSocketServerEventHandlers(wss: WebSocketServer): void {
    wss.on('error', (error) => {
      console.error('WebSocketServer error:', error)
      this.emit('server:error', error)
    })

    wss.on('connection', this.handleConnection.bind(this))
  }

  private handleConnection(socket: WebSocket): void {
    const peer = new Peer({ socket })
    console.log(`New peer connected: ${peer.id}`)

    peer.send({
      type: 'CONNECTION_ESTABLISHED',
      payload: {
        peerId: peer.id
      }
    })

    this.peers.set(peer.id, peer)
    this.emit('peer:connected', peer)

    socket.on('message', (data) => {
      this.handleMessage({ peer, data })
    })

    socket.on('close', () => {
      this.handleDisconnection(peer)
    })

    socket.on('error', (error) => {
      console.error(`WebSocket error for peer ${peer.id}:`, error)
      this.emit('peer:error', { peer, error })
    })
  }

  private handleDisconnection(peer: Peer): void {
    console.log(`Peer disconnected: ${peer.id}`)

    this.removePeerFromRoom(peer)

    this.peers.delete(peer.id)
    this.emit('peer:disconnected', peer)
  }

  private handleMessage({ peer, data }: { peer: Peer; data: RawData }): void {
    if (!peer.isConnected) {
      console.warn(`Received message from disconnected peer ${peer.id}`)
      return
    }

    if (!this.peers.has(peer.id)) {
      console.warn(`Received message from removed peer ${peer.id}`)
      return
    }

    let message: unknown
    try {
      message = JSON.parse(data.toString())
    } catch (error) {
      console.error(`Failed to parse message from peer ${peer.id}:`, error)
      return
    }

    if (!isClientToServerMessage(message)) {
      console.error(`Invalid message from peer ${peer.id}:`, message)
      return
    }

    console.log(
      `Received message from peer ${peer.id}:${JSON.stringify(message)}`
    )

    switch (message.type) {
      case 'JOIN_ROOM':
        this.handleJoinMessage({ peer, message })
        break
      case 'LEAVE_ROOM':
        this.handleLeaveMessage(peer)
        break
      case 'UPDATE_DISPLAY_NAME':
        this.handleUpdateDisplayNameMessage({ peer, message })
        break
      case 'OFFER':
        this.handleSignalingMessage({ peer, message })
        break
      case 'ANSWER':
        this.handleSignalingMessage({ peer, message })
        break
      case 'ICE_CANDIDATE':
        this.handleSignalingMessage({ peer, message })
        break
      default: {
        const _exhaustive: never = message
        console.error('Unexpected message type', _exhaustive)
        return
      }
    }
  }

  private handleJoinMessage({
    peer,
    message
  }: {
    peer: Peer
    message: JoinRoomMessage
  }): void {
    const { roomId, displayName } = message.payload

    if (displayName) peer.updateDisplayName(displayName)

    let room = this.rooms.get(roomId)
    let isNewRoom = false
    if (!room) {
      room = new Room(roomId)
      this.rooms.set(roomId, room)
      isNewRoom = true
    }

    try {
      peer.joinRoom(roomId)
      room.addPeer(peer)
    } catch (error) {
      console.error(`Failed to add peer ${peer.id} to room ${roomId}:`, error)

      if (isNewRoom) {
        this.rooms.delete(roomId)
        console.log(`Deleted empty room ${roomId} due to join failure`)
      }

      if (peer.isInRoom()) {
        peer.leaveRoom()
      }

      peer.sendError(`Failed to join room: ${error}`)
    }

    if (isNewRoom) {
      console.log(`Created new room: ${roomId}`)
      this.emit('room:created', room)
    }

    console.log(
      `Peer ${peer.id} (${peer.displayName}) joined room ${roomId}. ` +
        `Room now has ${room.peers.length} peer(s).`
    )
    this.emit('peer:joined', { peer, room })

    // Notify existing peers about the new member
    room.broadcast({
      message: {
        type: 'PEER_JOINED',
        payload: {
          peerId: peer.id,
          displayName: peer.displayName
        }
      },
      excludePeerIds: [peer.id]
    })

    // Notify the joining peer about the room state
    peer.send({
      type: 'ROOM_JOINED',
      payload: {
        roomId: room.id,
        peers: room.peers
          .filter((p) => p.id !== peer.id)
          .map((p) => ({
            id: p.id,
            displayName: p.displayName
          }))
      }
    })
  }

  private handleLeaveMessage(peer: Peer): void {
    const roomId = peer.roomId
    const result = this.removePeerFromRoom(peer) && !!roomId

    if (result) {
      peer.send({
        type: 'ROOM_LEFT',
        payload: {
          roomId
        }
      })
    } else {
      peer.sendError('Failed to leave room')
    }
  }

  private handleUpdateDisplayNameMessage({
    peer,
    message
  }: {
    peer: Peer
    message: UpdateDisplayNameMessage
  }): void {
    const { displayName } = message.payload
    const previousDisplayName = peer.displayName

    try {
      peer.updateDisplayName(displayName)
    } catch (error) {
      peer.sendError(`Failed to update display name: ${error}`)
      return
    }

    console.log(
      `Peer ${peer.id} updated display name: "${previousDisplayName}" → "${displayName}"`
    )

    peer.send({
      type: 'DISPLAY_NAME_UPDATED',
      payload: {
        displayName
      }
    })

    if (peer.isInRoom()) {
      const room = this.rooms.get(peer.roomId)
      if (room) {
        room.broadcast({
          message: {
            type: 'PEER_UPDATED',
            payload: {
              peerId: peer.id,
              displayName
            }
          },
          excludePeerIds: [peer.id]
        })
      }
    }

    this.emit('peer:displayNameUpdated', {
      peer,
      previousDisplayName,
      displayName
    })
  }

  private handleSignalingMessage({
    peer,
    message
  }: {
    peer: Peer
    message: OfferMessage | AnswerMessage | IceCandidateMessage
  }): void {
    if (!peer.isInRoom()) {
      peer.sendError(`Cannot send ${message.type.toLowerCase()}: not in a room`)
      return
    }

    const { toPeerId } = message.payload
    if (toPeerId === peer.id) {
      peer.sendError(`Cannot send ${message.type.toLowerCase()} to self`)
      return
    }

    const room = this.rooms.get(peer.roomId)
    if (!room) {
      peer.sendError(
        `Cannot send ${message.type.toLowerCase()}: room not found`
      )
      return
    }

    const targetPeer = room.getPeer(toPeerId)
    if (!targetPeer) {
      peer.sendError(
        `Cannot send ${message.type.toLowerCase()}: target peer not found`
      )
      return
    }

    const peerInfo = {
      fromPeerId: peer.id,
      toPeerId
    }
    switch (message.type) {
      case 'OFFER':
        targetPeer.send({
          type: 'OFFER',
          payload: {
            ...peerInfo,
            offer: message.payload.offer
          }
        })
        break
      case 'ANSWER':
        targetPeer.send({
          type: 'ANSWER',
          payload: {
            ...peerInfo,
            answer: message.payload.answer
          }
        })
        break
      case 'ICE_CANDIDATE':
        targetPeer.send({
          type: 'ICE_CANDIDATE',
          payload: {
            ...peerInfo,
            candidate: message.payload.candidate
          }
        })
        break
    }
  }

  private removePeerFromRoom(peer: Peer): boolean {
    if (!peer.isInRoom()) return false

    const roomId = peer.roomId
    const room = this.rooms.get(roomId)

    try {
      peer.leaveRoom()
    } catch (error) {
      console.error(`Failed to leave room for peer ${peer.id}:`, error)
    }

    if (room) {
      try {
        room.removePeer(peer.id)
      } catch (error) {
        console.error(
          `Failed to remove peer ${peer.id} from room ${roomId}:`,
          error
        )
        return false
      }

      room.broadcast({
        message: {
          type: 'PEER_LEFT',
          payload: { peerId: peer.id }
        }
      })

      console.log(
        `Peer ${peer.id} left room ${roomId}. ` +
          `Room now has ${room.peers.length} peer(s).`
      )
      this.emit('peer:left', { peer, roomId })

      if (room.isEmpty) {
        this.rooms.delete(roomId)
        console.log(`Deleted empty room: ${roomId}`)
        this.emit('room:removed', { roomId })
      }
    } else {
      console.error(`Peer ${peer.id} disconnected from unknown room ${roomId}`)
      return false
    }

    return true
  }

  private cleanup(): void {
    this.wss = undefined
    this.rooms.clear()
    this.peers.clear()
  }
}
