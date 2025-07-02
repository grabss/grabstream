import { EventEmitter } from 'eventemitter3'
import type { RawData, WebSocket } from 'ws'
import { WebSocketServer } from 'ws'
import {
  CUSTOM_TYPE_PATTERN,
  DEFAULT_MAX_PEERS_PER_ROOM,
  DEFAULT_MAX_ROOMS_PER_SERVER,
  MAX_CUSTOM_TYPE_LENGTH,
  WEBSOCKET_MAX_PAYLOAD,
  WEBSOCKET_PER_MESSAGE_DEFLATE
} from './constants'
import { logger } from './logger'
import type {
  AnswerMessage,
  CustomMessage,
  IceCandidateMessage,
  JoinRoomMessage,
  OfferMessage,
  UpdateDisplayNameMessage
} from './messages'
import { isClientToServerMessage } from './messages'
import { Peer } from './peer'
import { Room } from './room'
import type {
  GrabstreamServerConfiguration,
  GrabstreamServerConnectionOptions,
  GrabstreamServerLimits,
  GrabstreamServerOptions
} from './types'

export class GrabstreamServer extends EventEmitter {
  private wss?: WebSocketServer
  private readonly rooms: Map<string, Room> = new Map()
  private readonly peers: Map<string, Peer> = new Map()
  private readonly configuration: GrabstreamServerConfiguration

  constructor(options: GrabstreamServerOptions = {}) {
    super()

    if (options.server && (options.host || options.port)) {
      throw new Error('Cannot specify both server and host/port options')
    }

    let connectionOptions: GrabstreamServerConnectionOptions
    if (options.server) {
      connectionOptions = {
        path: options.path,
        server: options.server
      }
    } else {
      connectionOptions = {
        host: options.host ?? '0.0.0.0',
        port: options.port ?? 8080,
        path: options.path
      }
    }

    const limits: GrabstreamServerLimits = {
      maxPeersPerRoom:
        options.limits?.maxPeersPerRoom ?? DEFAULT_MAX_PEERS_PER_ROOM,
      maxRoomsPerServer:
        options.limits?.maxRoomsPerServer ?? DEFAULT_MAX_ROOMS_PER_SERVER
    }

    this.configuration = {
      connectionOptions,
      limits
    }
  }

  async start(): Promise<void> {
    if (this.wss) {
      throw new Error('GrabstreamServer is already running')
    }

    this.wss = new WebSocketServer({
      ...this.configuration.connectionOptions,
      perMessageDeflate: WEBSOCKET_PER_MESSAGE_DEFLATE,
      maxPayload: WEBSOCKET_MAX_PAYLOAD
    })

    const wss = this.wss
    return new Promise((resolve, reject) => {
      const onListening = () => {
        wss.off('error', onError)

        this.setupWebSocketServerEventHandlers(wss)

        logger.info('server:started')
        this.emit('server:started')
        resolve()
      }

      const onError = (error: Error) => {
        wss.off('listening', onListening)
        wss.removeAllListeners()
        wss.close()

        this.cleanup()

        logger.error('server:startFailed', { error })
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
          logger.error('server:stopFailed', { error })
          reject(error)
        } else {
          this.cleanup()

          logger.info('server:stopped')
          this.emit('server:stopped')
          resolve()
        }
      })
    })
  }

  private setupWebSocketServerEventHandlers(wss: WebSocketServer): void {
    wss.on('error', (error) => {
      logger.error('websocket:error', { error })
      this.emit('server:error', error)
    })

    wss.on('connection', this.handleConnection.bind(this))
  }

  private handleConnection(socket: WebSocket): void {
    let peer: Peer
    try {
      peer = new Peer({ socket })
    } catch (error) {
      logger.error('peer:creationFailed', { error })
      socket.close(1002, 'Failed to create peer')
      return
    }

    logger.info('peer:connected', { peerId: peer.id })

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

    socket.on('close', (code, reason) => {
      logger.debug('websocket:closed', {
        peerId: peer.id,
        code,
        reason: reason?.toString() || 'No reason provided'
      })
      this.handleDisconnection(peer)
    })

    socket.on('error', (error) => {
      logger.error('peer:socketError', { peerId: peer.id, error })
      this.emit('peer:error', { peer, error })
    })
  }

  private handleDisconnection(peer: Peer): void {
    logger.info('peer:disconnected', { peerId: peer.id })

    this.removePeerFromRoom(peer)

    this.peers.delete(peer.id)
    this.emit('peer:disconnected', peer)
  }

  private handleMessage({ peer, data }: { peer: Peer; data: RawData }): void {
    if (!peer.isConnected) {
      logger.warn('message:fromDisconnectedPeer', { peerId: peer.id })
      return
    }

    if (!this.peers.has(peer.id)) {
      logger.warn('message:fromRemovedPeer', { peerId: peer.id })
      return
    }

    let message: unknown
    try {
      message = JSON.parse(data.toString())
    } catch (error) {
      logger.error('message:parseFailed', { peerId: peer.id, error })
      return
    }

    if (!isClientToServerMessage(message)) {
      // biome-ignore lint/suspicious/noExplicitAny: Need to access type property of unknown message structure
      const messageType = (message as any)?.type || 'unknown'
      logger.error('message:invalidFormat', {
        peerId: peer.id,
        messageType,
        messageKeys:
          message && typeof message === 'object' ? Object.keys(message) : []
      })
      return
    }

    logger.debug('message:received', { peerId: peer.id, type: message.type })

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
      case 'CUSTOM':
        this.handleCustomMessage({ peer, message })
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
        logger.error('message:unexpectedType', { message: _exhaustive })
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

    if (displayName) {
      try {
        peer.updateDisplayName(displayName)
      } catch (error) {
        peer.sendError(`Failed to update display name: ${error}`)
        return
      }
    }

    let room = this.rooms.get(roomId)
    let isNewRoom = false

    if (!room) {
      const maxRooms = this.configuration.limits.maxRoomsPerServer
      if (maxRooms > 0 && this.rooms.size >= maxRooms) {
        logger.error('room:limitReached', {
          roomId,
          currentRooms: this.rooms.size,
          maxRooms
        })
        peer.sendError('Server room limit reached. Cannot create new room.')
        this.emit('room:limitReached', {
          roomId,
          peerId: peer.id,
          currentRooms: this.rooms.size,
          maxRooms
        })
        return
      }

      try {
        room = new Room(roomId)
        this.rooms.set(roomId, room)
        isNewRoom = true
      } catch (error) {
        logger.error('room:creationFailed', { roomId, error })
        peer.sendError(`Failed to create room: ${error}`)
        return
      }
    } else {
      const maxPeers = this.configuration.limits.maxPeersPerRoom
      if (maxPeers > 0 && room.peers.length >= maxPeers) {
        logger.error('peer:limitReached', {
          peerId: peer.id,
          roomId,
          currentPeers: room.peers.length,
          maxPeers
        })
        peer.sendError(`Room is full. Maximum ${maxPeers} peers allowed.`)
        this.emit('peer:limitReached', {
          peerId: peer.id,
          roomId,
          currentPeers: room.peers.length,
          maxPeers
        })
        return
      }
    }

    try {
      peer.joinRoom(roomId)
      logger.debug('peer:stateChanged', {
        peerId: peer.id,
        state: 'joinedRoom',
        roomId
      })
      room.addPeer(peer)
    } catch (error) {
      logger.error('room:joinFailed', { peerId: peer.id, roomId, error })

      if (isNewRoom) {
        this.rooms.delete(roomId)
        logger.info('room:deletedAfterJoinFailure', { roomId })
      }

      if (peer.isInRoom()) {
        peer.leaveRoom()
      }

      peer.sendError(`Failed to join room: ${error}`)
    }

    if (isNewRoom) {
      logger.info('room:created', { roomId })
      this.emit('room:created', room)
    }

    logger.info('peer:joinedRoom', {
      peerId: peer.id,
      displayName: peer.displayName,
      roomId,
      roomSize: room.peers.length
    })
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

    logger.info('peer:displayNameUpdated', {
      peerId: peer.id,
      from: previousDisplayName,
      to: displayName
    })

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

  private handleCustomMessage({
    peer,
    message
  }: {
    peer: Peer
    message: CustomMessage
  }): void {
    const { customType, target, data } = message.payload

    if (!customType) {
      peer.sendError('Custom type is required')
      return
    }

    if (customType.length > MAX_CUSTOM_TYPE_LENGTH) {
      peer.sendError(
        `Custom type cannot exceed ${MAX_CUSTOM_TYPE_LENGTH} characters`
      )
      return
    }

    if (!CUSTOM_TYPE_PATTERN.test(customType)) {
      peer.sendError(
        `Custom type must match pattern: ${CUSTOM_TYPE_PATTERN.source}`
      )
      return
    }

    // Default to room broadcast if in a room, otherwise error
    const targetType = target?.type || (peer.isInRoom() ? 'room' : undefined)

    if (!targetType) {
      peer.sendError('Target is required when not in a room')
      return
    }

    logger.debug('custom:received', {
      peerId: peer.id,
      customType,
      targetType
    })

    switch (targetType) {
      case 'peer': {
        if (!target?.peerId) {
          peer.sendError('Target peer ID is required')
          return
        }

        if (!peer.isInRoom()) {
          peer.sendError('Must be in a room to send to peers')
          return
        }

        const room = this.rooms.get(peer.roomId)
        if (!room) {
          peer.sendError('Room not found')
          return
        }

        const targetPeer = room.getPeer(target.peerId)
        if (!targetPeer) {
          peer.sendError('Target peer not found')
          return
        }

        targetPeer.send({
          type: 'CUSTOM',
          payload: {
            fromPeerId: peer.id,
            customType,
            data
          }
        })
        break
      }
      case 'room': {
        if (!peer.isInRoom()) {
          peer.sendError('Not in any room')
          return
        }

        const room = this.rooms.get(peer.roomId)
        if (!room) {
          peer.sendError('Room not found')
          return
        }

        room.broadcast({
          message: {
            type: 'CUSTOM',
            payload: {
              fromPeerId: peer.id,
              customType,
              data
            }
          },
          excludePeerIds: [peer.id]
        })
        break
      }
      default:
        peer.sendError('Invalid target type')
    }
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
        logger.debug('signaling:relayed', {
          type: 'OFFER',
          from: peer.id,
          to: toPeerId
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
        logger.debug('signaling:relayed', {
          type: 'ANSWER',
          from: peer.id,
          to: toPeerId
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
        logger.debug('signaling:relayed', {
          type: 'ICE_CANDIDATE',
          from: peer.id,
          to: toPeerId
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
      logger.debug('peer:stateChanged', {
        peerId: peer.id,
        state: 'leftRoom',
        roomId
      })
    } catch (error) {
      logger.error('room:leaveFailed', { peerId: peer.id, error })
    }

    if (room) {
      try {
        room.removePeer(peer.id)
      } catch (error) {
        logger.error('room:removePeerFailed', {
          peerId: peer.id,
          roomId,
          error
        })
        return false
      }

      room.broadcast({
        message: {
          type: 'PEER_LEFT',
          payload: { peerId: peer.id }
        }
      })

      logger.info('peer:leftRoom', {
        peerId: peer.id,
        roomId,
        remainingPeers: room.peers.length
      })
      this.emit('peer:left', { peer, roomId })

      if (room.isEmpty) {
        this.rooms.delete(roomId)
        logger.info('room:deletedEmpty', { roomId })
        this.emit('room:removed', { roomId })
      }
    } else {
      logger.error('room:unknownOnDisconnect', { peerId: peer.id, roomId })
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
