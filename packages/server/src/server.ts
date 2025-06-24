import { EventEmitter } from 'eventemitter3'
import { v4 as uuidv4 } from 'uuid'
import { WebSocket, WebSocketServer } from 'ws'
import { Peer } from './peer'
import { Room } from './room'

export type SignalingMessage = {
  type: 'JOIN' | 'LEAVE' | 'OFFER' | 'ANSWER' | 'CANDIDATE' | 'UPDATE_NAME'
  roomId?: string
  displayName?: string
  target?: string
  payload?: any
}

export type GrabstreamServerConfig = {
  port?: number
  host?: string
}

export class GrabstreamServer extends EventEmitter {
  private wss: WebSocketServer | null = null
  private peers: Map<string, Peer> = new Map()
  private rooms: Map<string, Room> = new Map()
  private config: GrabstreamServerConfig

  constructor(config: GrabstreamServerConfig = {}) {
    super()
    this.config = {
      port: 3000,
      host: '0.0.0.0',
      ...config
    }
  }

  async start(): Promise<void> {
    if (this.wss) {
      throw new Error('Server is already running')
    }

    this.wss = new WebSocketServer({
      port: this.config.port,
      host: this.config.host
    })

    this.wss.on('connection', this.handleConnection.bind(this))

    return new Promise((resolve) => {
      if (!this.wss) {
        throw new Error('WebSocket server not initialized')
      }
      this.wss.on('listening', () => {
        console.log(
          `GrabstreamServer listening on ${this.config.host}:${this.config.port}`
        )
        this.emit('listening', this.config.port)
        resolve()
      })
    })
  }

  async stop(): Promise<void> {
    if (!this.wss) {
      return
    }

    const wss = this.wss
    return new Promise((resolve, reject) => {
      wss.close((err) => {
        if (err) {
          reject(err)
        } else {
          this.wss = null
          this.peers.clear()
          this.rooms.clear()
          console.log('GrabstreamServer stopped')
          this.emit('closed')
          resolve()
        }
      })
    })
  }

  private handleConnection(ws: WebSocket): void {
    const peerId = uuidv4()
    console.log(`New connection: ${peerId}`)

    // Create peer but don't add to any room yet
    const peer = new Peer(peerId, ws)

    this.peers.set(peerId, peer)
    this.emit('peer:connected', peer)

    ws.on('message', (data) => {
      this.handleMessage(peerId, ws, data)
    })

    ws.on('close', () => {
      this.handleDisconnection(peerId)
    })

    ws.on('error', (error) => {
      console.error(`WebSocket error for peer ${peerId}:`, error)
      this.handleDisconnection(peerId)
    })
  }

  private handleMessage(peerId: string, ws: WebSocket, data: any): void {
    try {
      const message: SignalingMessage = JSON.parse(data.toString())
      console.log(`Message from ${peerId}:`, message.type)

      const peer = this.peers.get(peerId)
      if (!peer) {
        console.error(`Peer ${peerId} not found`)
        ws.close(1002, 'Peer not found')
        return
      }

      switch (message.type) {
        case 'JOIN':
          this.handleJoinMessage(peer, message)
          break

        case 'LEAVE':
          this.handleLeaveMessage(peer, message)
          break

        case 'UPDATE_NAME':
          this.handleUpdateNameMessage(peer, message)
          break

        case 'OFFER':
        case 'ANSWER':
        case 'CANDIDATE':
          this.handleWebRTCMessage(peer, message)
          break

        default:
          console.warn(`Unknown message type: ${message.type}`)
          this.sendErrorToSocket(ws, 'Unknown message type')
      }

      this.emit('message', peerId, message)
    } catch (error) {
      console.error(`Invalid message from ${peerId}:`, error)
      ws.close(1002, 'Invalid message format')
    }
  }

  private handleDisconnection(peerId: string): void {
    console.log(`Peer disconnected: ${peerId}`)

    const peer = this.peers.get(peerId)
    if (peer?.isInRoom()) {
      // Remove peer from room if they were in one
      this.leavePeerFromRoom(peerId)
    }

    this.peers.delete(peerId)
    this.emit('peer:disconnect', peerId)
  }

  // Room management methods
  createRoom(roomId: string): Room {
    if (this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} already exists`)
    }

    const room = new Room(roomId)

    this.rooms.set(roomId, room)
    console.log(`Room created: ${roomId}`)
    this.emit('room:created', room)

    return room
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  getRooms(): Room[] {
    return Array.from(this.rooms.values())
  }

  deleteRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) {
      return false
    }

    // Remove all peers from the room
    for (const peer of room.getPeers()) {
      peer.leaveRoom()
      this.emit('peer:left', peer, room)
    }

    this.rooms.delete(roomId)
    console.log(`Room deleted: ${roomId}`)
    this.emit('room:deleted', roomId)

    return true
  }

  getRoomCount(): number {
    return this.rooms.size
  }

  getPeerCount(): number {
    return this.peers.size
  }

  getRoomPeerCount(roomId: string): number {
    const room = this.getRoom(roomId)
    return room ? room.getPeerCount() : 0
  }

  // Peer management methods
  getPeer(peerId: string): Peer | undefined {
    return this.peers.get(peerId)
  }

  joinPeerToRoom(peerId: string, roomId: string): boolean {
    const peer = this.peers.get(peerId)
    if (!peer) {
      return false
    }

    // Leave current room if in one
    if (peer.isInRoom()) {
      this.leavePeerFromRoom(peerId)
    }

    // Create room if it doesn't exist
    let room = this.getRoom(roomId)
    if (!room) {
      room = this.createRoom(roomId)
    }

    // Add peer to room using Room class method
    const success = room.addPeer(peer)
    if (success) {
      console.log(`Peer ${peerId} joined room ${roomId}`)
      this.emit('peer:joined', peer, room)
    }

    return success
  }

  leavePeerFromRoom(peerId: string): boolean {
    const peer = this.peers.get(peerId)
    if (!peer || !peer.isInRoom()) {
      return false
    }

    const roomId = peer.roomId!
    const room = this.getRoom(roomId)
    if (room) {
      const removedPeer = room.removePeer(peerId)
      if (removedPeer) {
        console.log(`Peer ${peerId} left room ${roomId}`)
        this.emit('peer:left', peer, room)

        // Delete room if empty
        if (room.isEmpty()) {
          this.deleteRoom(roomId)
        }
        return true
      }
    }

    return false
  }

  updatePeerDisplayName(peerId: string, displayName: string): boolean {
    const peer = this.peers.get(peerId)
    if (!peer) {
      return false
    }

    const oldDisplayName = peer.updateDisplayName(displayName)

    console.log(
      `Peer ${peerId} updated display name: ${oldDisplayName} -> ${displayName}`
    )
    this.emit('peer:displayName:updated', peer, oldDisplayName)

    // Notify room members if peer is in a room
    if (peer.isInRoom()) {
      const room = this.getRoom(peer.roomId!)
      if (room) {
        room.updatePeerDisplayName(peerId, displayName)
      }
    }

    return true
  }

  // Helper methods
  private sendToSocket(socket: WebSocket, message: any): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    }
  }

  private sendErrorToSocket(socket: WebSocket, error: string): void {
    this.sendToSocket(socket, {
      type: 'error',
      message: error
    })
  }

  // Message handlers
  private handleJoinMessage(peer: Peer, message: SignalingMessage): void {
    if (!message.roomId) {
      peer.sendError('Room ID is required for join')
      return
    }

    // Update display name if provided
    if (message.displayName) {
      peer.updateDisplayName(message.displayName)
    }

    const success = this.joinPeerToRoom(peer.id, message.roomId)

    if (success) {
      peer.send({
        type: 'join:success',
        roomId: message.roomId,
        peerId: peer.id,
        displayName: peer.displayName
      })
    } else {
      peer.sendError('Failed to join room')
    }
  }

  private handleLeaveMessage(peer: Peer, _message: SignalingMessage): void {
    if (!peer.isInRoom()) {
      peer.sendError('Not in any room')
      return
    }

    const roomId = peer.roomId
    const success = this.leavePeerFromRoom(peer.id)

    if (success) {
      peer.send({
        type: 'leave:success',
        roomId: roomId
      })
    } else {
      peer.sendError('Failed to leave room')
    }
  }

  private handleUpdateNameMessage(peer: Peer, message: SignalingMessage): void {
    if (!message.displayName) {
      peer.sendError('Display name is required')
      return
    }

    const success = this.updatePeerDisplayName(peer.id, message.displayName)

    if (success) {
      peer.send({
        type: 'update-name:success',
        displayName: message.displayName
      })
    } else {
      peer.sendError('Failed to update display name')
    }
  }

  private handleWebRTCMessage(peer: Peer, message: SignalingMessage): void {
    if (!peer.isInRoom()) {
      peer.sendError('Must be in a room to send WebRTC messages')
      return
    }

    if (!message.target) {
      peer.sendError('Target peer ID is required for WebRTC messages')
      return
    }

    const targetPeer = this.peers.get(message.target)
    if (!targetPeer) {
      peer.sendError('Target peer not found')
      return
    }

    if (!targetPeer.isInRoom(peer.roomId!)) {
      peer.sendError('Target peer is not in the same room')
      return
    }

    // Forward the WebRTC message to the target peer
    targetPeer.send({
      type: message.type,
      from: peer.id,
      payload: message.payload
    })

    console.log(
      `WebRTC ${message.type} forwarded from ${peer.id} to ${message.target}`
    )
  }
}
