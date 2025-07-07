import type {
  AnswerMessage,
  CustomMessage,
  IceCandidateMessage,
  JoinRoomMessage,
  KnockMessage,
  OfferMessage,
  UpdateDisplayNameMessage
} from '@grabstream/core'
import { isClientToServerMessage, logger } from '@grabstream/core'
import type { RawData, WebSocket } from 'ws'
import { WebSocketServer } from 'ws'

import {
  CUSTOM_TYPE_PATTERN,
  DEFAULT_ICE_SERVERS,
  DEFAULT_MAX_PEERS_PER_ROOM,
  DEFAULT_MAX_ROOMS_PER_SERVER,
  DEFAULT_REQUIRE_ROOM_PASSWORD,
  MAX_CUSTOM_TYPE_LENGTH,
  PING_INTERVAL_MS,
  WEBSOCKET_MAX_PAYLOAD,
  WEBSOCKET_PER_MESSAGE_DEFLATE
} from './constants'
import { GrabstreamServerEmitter } from './emitter'
import { Peer } from './peer'
import { Room } from './room'
import type {
  GrabstreamServerConfiguration,
  GrabstreamServerConnectionOptions,
  GrabstreamServerLimits,
  GrabstreamServerOptions
} from './types'

export class GrabstreamServer extends GrabstreamServerEmitter {
  private wss?: WebSocketServer
  private readonly rooms: Map<string, Room> = new Map()
  private readonly peers: Map<string, Peer> = new Map()
  private readonly configuration: GrabstreamServerConfiguration
  private pingInterval?: NodeJS.Timeout

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
      limits,
      requireRoomPassword:
        options.requireRoomPassword ?? DEFAULT_REQUIRE_ROOM_PASSWORD,
      iceServers: options.iceServers ?? DEFAULT_ICE_SERVERS
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
        this.startPingInterval()

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

    this.stopPingInterval()

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

    wss.on('connection', (socket) => this.handleConnection(socket))
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
        peerId: peer.id,
        iceServers: this.configuration.iceServers
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

    socket.on('pong', () => {
      peer.updatePongReceived()
      logger.debug('peer:pongReceived', { peerId: peer.id })
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
      case 'JOIN_ROOM': {
        this.handleJoinMessage({ peer, message })
        break
      }
      case 'LEAVE_ROOM': {
        this.handleLeaveMessage(peer)
        break
      }
      case 'UPDATE_DISPLAY_NAME': {
        this.handleUpdateDisplayNameMessage({ peer, message })
        break
      }
      case 'KNOCK': {
        this.handleKnockMessage({ peer, message })
        break
      }
      case 'CUSTOM': {
        this.handleCustomMessage({ peer, message })
        break
      }
      case 'OFFER': {
        this.handleSignalingMessage({ peer, message })
        break
      }
      case 'ANSWER': {
        this.handleSignalingMessage({ peer, message })
        break
      }
      case 'ICE_CANDIDATE': {
        this.handleSignalingMessage({ peer, message })
        break
      }
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
    const { roomId, displayName, password } = message.payload

    if (displayName) {
      try {
        peer.updateDisplayName(displayName)
      } catch (error) {
        logger.warn('peer:updateDisplayNameFailed', { peerId: peer.id, error })
        peer.sendError('Failed to update display name')
        return
      }
    }

    let room = this.rooms.get(roomId)
    let isNewRoom = false

    if (!room) {
      if (this.configuration.requireRoomPassword && !password) {
        logger.warn('room:passwordRequiredForCreation', {
          peerId: peer.id,
          roomId
        })
        peer.sendError('Password is required to create a room')
        return
      }

      const maxRooms = this.configuration.limits.maxRoomsPerServer
      if (maxRooms > 0 && this.rooms.size >= maxRooms) {
        logger.warn('room:limitReachedPerServer', {
          roomId,
          currentRooms: this.rooms.size,
          maxRooms
        })
        peer.sendError('Server room limit reached. Cannot create new room')
        this.emit('room:limitReachedPerServer', {
          roomId,
          peerId: peer.id,
          currentRooms: this.rooms.size,
          maxRooms
        })
        return
      }

      try {
        room = new Room(roomId, password)
        this.rooms.set(roomId, room)
        isNewRoom = true
      } catch (error) {
        logger.warn('room:creationFailed', { roomId, error })
        peer.sendError('Failed to create room')
        return
      }
    } else {
      if (room.hasPassword) {
        if (!password || !room.verifyPassword(password)) {
          logger.warn('room:passwordVerificationFailed', {
            peerId: peer.id,
            roomId
          })
          peer.send({
            type: 'PASSWORD_REQUIRED',
            payload: { roomId }
          })
          return
        }
      }

      const maxPeers = this.configuration.limits.maxPeersPerRoom
      if (maxPeers > 0 && room.peers.length >= maxPeers) {
        logger.warn('peer:limitReachedPerRoom', {
          peerId: peer.id,
          roomId,
          currentPeers: room.peers.length,
          maxPeers
        })
        peer.sendError(`Room is full. Maximum ${maxPeers} peers allowed`)
        this.emit('peer:limitReachedPerRoom', {
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

      peer.sendError('Failed to join room')
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
      logger.warn('peer:leaveRoomFailed', { peerId: peer.id, roomId })
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
    const oldDisplayName = peer.displayName

    try {
      peer.updateDisplayName(displayName)
    } catch (error) {
      logger.warn('peer:updateDisplayNameFailed', { peerId: peer.id, error })
      peer.sendError('Failed to update display name')
      return
    }

    logger.info('peer:displayNameUpdated', {
      peerId: peer.id,
      oldDisplayName,
      newDisplayName: displayName
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
      oldDisplayName,
      newDisplayName: displayName
    })
  }

  private handleKnockMessage({
    peer,
    message
  }: {
    peer: Peer
    message: KnockMessage
  }): void {
    const { roomId } = message.payload
    const room = this.rooms.get(roomId)

    if (!room) {
      peer.send({
        type: 'KNOCK_RESPONSE',
        payload: {
          roomId,
          exists: false,
          hasPassword: false,
          peerCount: 0,
          isFull: false
        }
      })
      return
    }

    const maxPeers = this.configuration.limits.maxPeersPerRoom
    const isFull = maxPeers > 0 && room.peers.length >= maxPeers

    peer.send({
      type: 'KNOCK_RESPONSE',
      payload: {
        roomId,
        exists: true,
        hasPassword: room.hasPassword,
        peerCount: room.peers.length,
        isFull
      }
    })

    logger.debug('room:knocked', {
      peerId: peer.id,
      roomId,
      exists: true,
      hasPassword: room.hasPassword,
      peerCount: room.peers.length,
      isFull
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
      logger.warn('custom:missingType', { peerId: peer.id })
      peer.sendError('Custom type is required')
      return
    }

    if (customType.length > MAX_CUSTOM_TYPE_LENGTH) {
      logger.warn('custom:typeTooLong', {
        peerId: peer.id,
        customType,
        length: customType.length,
        maxLength: MAX_CUSTOM_TYPE_LENGTH
      })
      peer.sendError(
        `Custom type cannot exceed ${MAX_CUSTOM_TYPE_LENGTH} characters`
      )
      return
    }

    if (!CUSTOM_TYPE_PATTERN.test(customType)) {
      logger.warn('custom:invalidPattern', {
        peerId: peer.id,
        customType,
        pattern: CUSTOM_TYPE_PATTERN.source
      })
      peer.sendError(
        `Custom type must match pattern: ${CUSTOM_TYPE_PATTERN.source}`
      )
      return
    }

    // Default to room broadcast if in a room, otherwise error
    const targetType = target?.type || (peer.isInRoom() ? 'room' : undefined)

    if (!targetType) {
      logger.warn('custom:missingTarget', { peerId: peer.id })
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
          logger.warn('custom:missingTargetPeerId', { peerId: peer.id })
          peer.sendError('Target peer ID is required')
          return
        }

        if (!peer.isInRoom()) {
          logger.warn('custom:notInRoom', {
            peerId: peer.id,
            targetType: 'peer'
          })
          peer.sendError('Must be in a room to send to peers')
          return
        }

        const room = this.rooms.get(peer.roomId)
        if (!room) {
          logger.warn('custom:roomNotFound', {
            peerId: peer.id,
            roomId: peer.roomId,
            targetType: 'peer'
          })
          peer.sendError('Room not found')
          return
        }

        const targetPeer = room.getPeer(target.peerId)
        if (!targetPeer) {
          logger.warn('custom:targetPeerNotFound', {
            peerId: peer.id,
            targetPeerId: target.peerId
          })
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
          logger.warn('custom:notInRoom', {
            peerId: peer.id,
            targetType: 'room'
          })
          peer.sendError('Not in any room')
          return
        }

        const room = this.rooms.get(peer.roomId)
        if (!room) {
          logger.warn('custom:roomNotFound', {
            peerId: peer.id,
            roomId: peer.roomId,
            targetType: 'room'
          })
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
      default: {
        peer.sendError('Invalid target type')
      }
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
      logger.warn('signaling:notInRoom', {
        peerId: peer.id,
        messageType: message.type
      })
      peer.sendError(`Cannot send ${message.type.toLowerCase()}: not in a room`)
      return
    }

    const { toPeerId } = message.payload
    if (toPeerId === peer.id) {
      logger.warn('signaling:selfTarget', {
        peerId: peer.id,
        messageType: message.type
      })
      peer.sendError(`Cannot send ${message.type.toLowerCase()} to self`)
      return
    }

    const room = this.rooms.get(peer.roomId)
    if (!room) {
      logger.warn('signaling:roomNotFound', {
        peerId: peer.id,
        roomId: peer.roomId,
        messageType: message.type
      })
      peer.sendError(
        `Cannot send ${message.type.toLowerCase()}: room not found`
      )
      return
    }

    const targetPeer = room.getPeer(toPeerId)
    if (!targetPeer) {
      logger.warn('signaling:targetPeerNotFound', {
        peerId: peer.id,
        targetPeerId: toPeerId,
        messageType: message.type
      })
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
      case 'OFFER': {
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
      }
      case 'ANSWER': {
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
      }
      case 'ICE_CANDIDATE': {
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
      logger.warn('room:unknownOnDisconnect', { peerId: peer.id, roomId })
      return false
    }

    return true
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.peers.forEach((peer) => {
        if (!peer.isAlive) {
          logger.info('peer:timeout', { peerId: peer.id })
          this.emit('peer:timeout', peer)
          peer.terminate()
          return
        }

        peer.ping()
      })
    }, PING_INTERVAL_MS).unref()

    logger.debug('pingInterval:started')
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = undefined
      logger.debug('pingInterval:stopped')
    }
  }

  private cleanup(): void {
    this.stopPingInterval()
    this.wss = undefined
    this.rooms.clear()
    this.peers.clear()
  }
}
