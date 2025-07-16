import type {
  AnswerMessage,
  AnswerRelayMessage,
  CustomMessage,
  CustomRelayMessage,
  DisplayNameUpdatedMessage,
  IceCandidateMessage,
  IceCandidateRelayMessage,
  JoinRoomMessage,
  LeaveRoomMessage,
  OfferMessage,
  OfferRelayMessage,
  PeerJoinedMessage,
  PeerLeftMessage,
  PeerUpdatedMessage,
  RoomJoinedMessage,
  RoomLeftMessage,
  UpdateDisplayNameMessage
} from '@grabstream/core'
import {
  isServerToClientMessage,
  logger,
  validateDisplayName,
  validatePassword,
  validateRoomId
} from '@grabstream/core'

import { DEFAULT_CONNECTION_TIMEOUT_MS, DEFAULT_SERVER_URL } from './constants'
import { GrabstreamClientEmitter } from './emitter'
import {
  PeerNotInitializedError,
  ValidationError,
  WebSocketNotConnectedError
} from './errors'
import { LocalPeer, RemotePeer } from './peer'
import type {
  GrabstreamClientConfiguration,
  GrabstreamClientOptions,
  LocalStream,
  StreamType
} from './types'

export class GrabstreamClient extends GrabstreamClientEmitter {
  private ws?: WebSocket
  private peer?: LocalPeer
  private iceServers: RTCIceServer[] = []
  private readonly peers: Map<string, RemotePeer> = new Map()
  private readonly configuration: GrabstreamClientConfiguration

  constructor(options: GrabstreamClientOptions = {}) {
    super()

    this.configuration = {
      url: options.url ?? DEFAULT_SERVER_URL,
      connectionTimeoutMs:
        options.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS
    }
  }

  get isConnected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN
  }

  get isJoined(): boolean {
    return !!this.peer && this.peer.isInRoom
  }

  get localStreams(): LocalStream[] {
    return this.peer?.streams || []
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      throw new Error('GrabstreamClient is already connected')
    }

    this.ws = new WebSocket(this.configuration.url)

    const ws = this.ws
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close(1000, 'Connection timeout exceeded')
      }, this.configuration.connectionTimeoutMs)

      ws.onopen = () => {
        logger.debug('websocket:opened')
      }

      ws.onmessage = (event) => {
        let message: unknown
        try {
          message = JSON.parse(event.data)
        } catch (error) {
          logger.error('connect:parseFailed', { error })
          ws.close(1002, 'Failed to parse message')
          return
        }

        if (
          !isServerToClientMessage(message) ||
          message.type !== 'CONNECTION_ESTABLISHED'
        ) {
          // biome-ignore lint/suspicious/noExplicitAny: Need to access type property of unknown message structure
          const messageType = (message as any)?.type || 'unknown'
          logger.error('connect:invalidFormat', {
            messageType,
            messageKeys:
              message && typeof message === 'object' ? Object.keys(message) : []
          })
          ws.close(1002, 'Invalid message format')
          return
        }

        clearTimeout(timeout)

        const { peerId, displayName, iceServers } = message.payload
        this.peer = new LocalPeer({
          id: peerId,
          displayName
        })
        this.iceServers = iceServers

        this.setupWebSocketEventHandlers(ws)

        logger.info('client:connected', {
          peerId: this.peer.id
        })
        this.emit('client:connected', { peerId: this.peer.id })
        resolve()
      }

      ws.onerror = (event) => {
        clearTimeout(timeout)
        logger.error('connect:error', event)

        if (
          ws.readyState !== WebSocket.CLOSED &&
          ws.readyState !== WebSocket.CLOSING
        ) {
          ws.close(1006, 'Connection error occurred')
        }
      }

      ws.onclose = (event) => {
        clearTimeout(timeout)
        this.cleanup()

        logger.error('connect:failed', {
          code: event.code,
          reason: event.reason
        })
        reject(
          new Error(
            `Connection closed with code ${event.code}: ${event.reason}`
          )
        )
      }
    })
  }

  async disconnect(): Promise<void> {
    if (
      !this.ws ||
      this.ws.readyState === WebSocket.CLOSED ||
      this.ws.readyState === WebSocket.CLOSING
    ) {
      throw new Error('GrabstreamClient is not connected')
    }

    const ws = this.ws
    return new Promise((resolve) => {
      ws.onclose = (event) => {
        this.handleDisconnection(event)
        resolve()
      }
      ws.close(1000, 'Client disconnect requested')
    })
  }

  joinRoom(
    roomId: string,
    options?: {
      displayName?: string
      password?: string
    }
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new WebSocketNotConnectedError()
    }

    if (!this.peer) {
      throw new PeerNotInitializedError()
    }

    if (this.peer.isInRoom) {
      throw new Error(`Already in room ${this.peer.roomId}`)
    }

    const validation = validateRoomId(roomId)
    if (!validation.success) {
      throw new ValidationError(validation)
    }

    const trimmedDisplayName =
      options?.displayName !== undefined
        ? options.displayName.trim()
        : undefined
    if (trimmedDisplayName) {
      const validation = validateDisplayName(trimmedDisplayName)
      if (!validation.success) {
        throw new ValidationError(validation)
      }
    }

    if (options?.password) {
      const validation = validatePassword(options.password)
      if (!validation.success) {
        throw new ValidationError(validation)
      }
    }

    const message: JoinRoomMessage = {
      type: 'JOIN_ROOM',
      payload: {
        roomId,
        displayName: trimmedDisplayName,
        password: options?.password
      }
    }
    this.ws.send(JSON.stringify(message))
  }

  leaveRoom(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new WebSocketNotConnectedError()
    }

    if (!this.peer) {
      throw new PeerNotInitializedError()
    }

    if (!this.peer.isInRoom) {
      throw new Error('Not in any room')
    }

    const message: LeaveRoomMessage = {
      type: 'LEAVE_ROOM'
    }
    this.ws.send(JSON.stringify(message))
  }

  updateDisplayName(displayName: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new WebSocketNotConnectedError()
    }

    if (!this.peer) {
      throw new PeerNotInitializedError()
    }

    const trimmedDisplayName = displayName.trim()
    const validation = validateDisplayName(trimmedDisplayName)
    if (!validation.success) {
      throw new ValidationError(validation)
    }

    const message: UpdateDisplayNameMessage = {
      type: 'UPDATE_DISPLAY_NAME',
      payload: {
        displayName: trimmedDisplayName
      }
    }
    this.ws.send(JSON.stringify(message))
  }

  sendCustomMessage(
    customType: string,
    data: unknown,
    target?: {
      type: 'peer' | 'room'
      peerId?: string
    }
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new WebSocketNotConnectedError()
    }

    if (!this.peer) {
      throw new PeerNotInitializedError()
    }

    if (!this.peer.isInRoom) {
      throw new Error('Not in any room')
    }

    if (target?.type === 'peer') {
      if (!target.peerId) {
        throw new Error('peerId is required when targeting a specific peer')
      }
      if (!this.peers.has(target.peerId)) {
        throw new Error(`Peer ${target.peerId} not found`)
      }
    }

    const message: CustomMessage = {
      type: 'CUSTOM',
      payload: {
        customType,
        target,
        data
      }
    }
    this.ws.send(JSON.stringify(message))
  }

  sendDataToPeer(peerId: string, data: string): void {
    const remotePeer = this.peers.get(peerId)
    if (!remotePeer) {
      throw new Error(`Peer ${peerId} not found`)
    }

    remotePeer.sendData(data)
  }

  async addLocalStream({
    type,
    stream
  }: {
    type: StreamType
    stream: MediaStream
  }): Promise<void> {
    if (!this.peer) {
      throw new PeerNotInitializedError()
    }

    this.peer.addStream(stream, type)

    if (this.peer.isInRoom) {
      for (const remotePeer of this.peers.values()) {
        await remotePeer.sendStream({ stream, type })
      }
    }
  }

  async removeLocalStream(streamId: string): Promise<void> {
    if (!this.peer) {
      throw new PeerNotInitializedError()
    }

    this.peer.removeStream(streamId)

    if (this.peer.isInRoom) {
      for (const remotePeer of this.peers.values()) {
        await remotePeer.sendStreamRemoved(streamId)
      }
    }
  }

  muteLocalAudio(): void {
    if (!this.peer) {
      throw new PeerNotInitializedError()
    }

    this.peer.muteAudio()
  }

  unmuteLocalAudio(): void {
    if (!this.peer) {
      throw new PeerNotInitializedError()
    }

    this.peer.unmuteAudio()
  }

  disableLocalVideo(): void {
    if (!this.peer) {
      throw new PeerNotInitializedError()
    }

    this.peer.disableVideo()
  }

  enableLocalVideo(): void {
    if (!this.peer) {
      throw new PeerNotInitializedError()
    }

    this.peer.enableVideo()
  }

  private setupWebSocketEventHandlers(ws: WebSocket): void {
    ws.onopen = null

    ws.onmessage = (event) => this.handleMessage(event)

    ws.onerror = (event) => {
      logger.error('client:error', event)
      this.emit('client:error', event)
    }

    ws.onclose = (event) => this.handleDisconnection(event)
  }

  private handleDisconnection(event: CloseEvent): void {
    this.cleanup()

    if (event.code === 1000 || event.code === 1001) {
      logger.info('client:disconnected', {
        code: event.code,
        reason: event.reason
      })
    } else {
      logger.error('client:disconnected', {
        code: event.code,
        reason: event.reason
      })
    }
    this.emit('client:disconnected', {
      code: event.code,
      reason: event.reason
    })
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    let message: unknown
    try {
      message = JSON.parse(event.data)
    } catch (error) {
      logger.error('message:parseFailed', { error })
      return
    }

    if (!isServerToClientMessage(message)) {
      // biome-ignore lint/suspicious/noExplicitAny: Need to access type property of unknown message structure
      const messageType = (message as any)?.type || 'unknown'
      logger.error('message:invalidFormat', {
        messageType,
        messageKeys:
          message && typeof message === 'object' ? Object.keys(message) : []
      })
      return
    }

    logger.debug('message:received', { type: message.type })

    if (!this.peer) {
      logger.error('message:peerNotInitialized', { messageType: message.type })
      return
    }

    switch (message.type) {
      case 'CONNECTION_ESTABLISHED': {
        logger.warn('message:unexpectedConnectionEstablished', {
          currentPeerId: this.peer.id,
          newPeerId: message.payload.peerId
        })
        break
      }
      case 'ROOM_JOINED': {
        await this.handleRoomJoinedMessage({
          localPeer: this.peer,
          message
        })
        break
      }
      case 'ROOM_LEFT': {
        await this.handleRoomLeftMessage({
          localPeer: this.peer,
          message
        })
        break
      }
      case 'PEER_JOINED': {
        await this.handlePeerJoinedMessage(message)
        break
      }
      case 'PEER_LEFT': {
        this.handlePeerLeftMessage(message)
        break
      }
      case 'PEER_UPDATED': {
        this.handlePeerUpdatedMessage(message)
        break
      }
      case 'DISPLAY_NAME_UPDATED': {
        this.handleDisplayNameUpdatedMessage({
          localPeer: this.peer,
          message
        })
        break
      }
      case 'PASSWORD_REQUIRED': {
        logger.info('room:passwordRequired', message.payload)
        this.emit('room:passwordRequired', message.payload)
        break
      }
      case 'CUSTOM': {
        this.handleCustomMessage(message)
        break
      }
      case 'ERROR': {
        logger.error('server:error', {
          message: message.payload.message
        })
        this.emit('server:error', {
          message: message.payload.message
        })
        break
      }
      case 'OFFER':
      case 'ANSWER':
      case 'ICE_CANDIDATE': {
        await this.handleSignalingMessage(message)
        break
      }
      default: {
        const _exhaustive: never = message
        logger.error('message:unexpectedType', { message: _exhaustive })
        return
      }
    }
  }

  private async handleRoomJoinedMessage({
    localPeer,
    message
  }: {
    localPeer: LocalPeer
    message: RoomJoinedMessage
  }): Promise<void> {
    const { roomId, displayName, peers } = message.payload

    await this.cleanupRoomState(localPeer)

    localPeer.joinRoom({
      roomId,
      displayName
    })

    for (const peer of peers) {
      const remotePeer = this.createRemotePeer({
        id: peer.id,
        displayName: peer.displayName
      })
      this.peers.set(peer.id, remotePeer)
    }

    logger.info('room:joined', {
      roomId,
      peerCount: this.peers.size + 1
    })
    this.emit('room:joined', {
      roomId,
      peerCount: this.peers.size + 1
    })

    for (const remotePeer of this.peers.values()) {
      // Initiate connections in parallel (no await)
      this.initiateConnectionToPeer(remotePeer)
    }
  }

  private async handleRoomLeftMessage({
    localPeer,
    message
  }: {
    localPeer: LocalPeer
    message: RoomLeftMessage
  }): Promise<void> {
    const { roomId } = message.payload

    await this.cleanupRoomState(localPeer)

    logger.info('room:left', { roomId })
    this.emit('room:left', { roomId })
  }

  private async handlePeerJoinedMessage(
    message: PeerJoinedMessage
  ): Promise<void> {
    const { peerId, displayName } = message.payload

    const remotePeer = this.createRemotePeer({
      id: peerId,
      displayName
    })
    this.peers.set(peerId, remotePeer)

    for (const localStream of this.peer?.streams || []) {
      await remotePeer.sendStream({
        type: localStream.type,
        stream: localStream.stream
      })
    }

    logger.info('peer:joined', {
      peerId,
      displayName,
      peerCount: this.peers.size + 1
    })
    this.emit('peer:joined', remotePeer)
  }

  private handlePeerLeftMessage(message: PeerLeftMessage): void {
    const { peerId } = message.payload

    const remotePeer = this.peers.get(peerId)
    if (!remotePeer) {
      logger.warn('peer:notFound', { peerId })
      return
    }

    this.peers.delete(peerId)

    logger.info('peer:left', {
      peerId,
      displayName: remotePeer.displayName,
      peerCount: this.peers.size + 1
    })
    this.emit('peer:left', remotePeer)

    try {
      remotePeer.close()
    } catch (error) {
      logger.warn('peer:closeConnectionFailed', {
        peerId,
        error
      })
    }
  }

  private handlePeerUpdatedMessage(message: PeerUpdatedMessage): void {
    const { peerId, displayName } = message.payload

    const remotePeer = this.peers.get(peerId)
    if (!remotePeer) {
      logger.warn('peer:notFound', { peerId })
      return
    }

    const oldDisplayName = remotePeer.displayName
    remotePeer.updateDisplayName(displayName)
    this.peers.set(peerId, remotePeer)

    logger.info('peer:updated', {
      peerId,
      oldDisplayName,
      newDisplayName: displayName
    })
    this.emit('peer:updated', remotePeer)
  }

  private handleDisplayNameUpdatedMessage({
    localPeer,
    message
  }: {
    localPeer: LocalPeer
    message: DisplayNameUpdatedMessage
  }): void {
    const { displayName } = message.payload

    localPeer.updateDisplayName(displayName)

    logger.info('client:displayNameUpdated', { displayName })
    this.emit('client:displayNameUpdated', { displayName })
  }

  private async handleSignalingMessage(
    message: OfferRelayMessage | AnswerRelayMessage | IceCandidateRelayMessage
  ): Promise<void> {
    const { fromPeerId, toPeerId } = message.payload

    const remotePeer = this.peers.get(fromPeerId)
    if (!remotePeer) {
      logger.warn('peer:notFound', {
        fromPeerId,
        messageType: message.type
      })
      return
    }

    if (toPeerId !== this.peer?.id) {
      logger.warn('signaling:messageToWrongPeer', {
        fromPeerId,
        toPeerId,
        messageType: message.type
      })
      return
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('signaling:messageNotProcessed', {
        fromPeerId,
        messageType: message.type,
        reason: 'WebSocket not connected'
      })
      return
    }

    switch (message.type) {
      case 'OFFER': {
        logger.debug('signaling:offerReceived', {
          fromPeerId,
          offer: message.payload.offer
        })

        try {
          const answer = await remotePeer.createAnswer(message.payload.offer)

          const answerMessage: AnswerMessage = {
            type: 'ANSWER',
            payload: {
              toPeerId: fromPeerId,
              answer
            }
          }
          this.ws.send(JSON.stringify(answerMessage))

          logger.debug('signaling:answerSent', {
            toPeerId: fromPeerId,
            answer
          })
        } catch (error) {
          logger.error('signaling:answerFailed', {
            toPeerId: fromPeerId,
            error
          })
          return
        }
        break
      }
      case 'ANSWER': {
        logger.debug('signaling:answerReceived', {
          fromPeerId,
          answer: message.payload.answer
        })

        try {
          await remotePeer.receiveAnswer(message.payload.answer)

          logger.debug('signaling:answerProcessed', { fromPeerId })
        } catch (error) {
          logger.error('signaling:answerFailed', {
            fromPeerId,
            error
          })
          return
        }
        break
      }
      case 'ICE_CANDIDATE': {
        logger.debug('signaling:iceCandidateReceived', {
          fromPeerId,
          candidate: message.payload.candidate
        })

        try {
          await remotePeer.addIceCandidate(message.payload.candidate)

          logger.debug('signaling:iceCandidateProcessed', { fromPeerId })
        } catch (error) {
          logger.error('signaling:iceCandidateFailed', {
            fromPeerId,
            error
          })
          return
        }
        break
      }
    }

    logger.debug('peer:signaling', {
      peerId: remotePeer.id,
      messageType: message.type
    })
    this.emit('peer:signaling', { peer: remotePeer, message })
  }

  private handleCustomMessage(message: CustomRelayMessage): void {
    const { fromPeerId } = message.payload

    const remotePeer = this.peers.get(fromPeerId)
    if (!remotePeer) {
      logger.warn('peer:notFound', message.payload)
      return
    }

    logger.debug('peer:customMessage', message.payload)
    this.emit('peer:customMessage', {
      peer: remotePeer,
      ...message.payload
    })
  }

  private createRemotePeer({
    id,
    displayName
  }: {
    id: string
    displayName: string
  }): RemotePeer {
    const remotePeer = new RemotePeer({
      id,
      displayName,
      iceServers: this.iceServers,
      onConnectionStateChanged: (state) => {
        logger.debug('peer:connectionStateChanged', {
          peerId: remotePeer.id,
          state
        })

        switch (state) {
          case 'connected': {
            this.emit('peer:connected', remotePeer)
            break
          }
          case 'disconnected': {
            this.emit('peer:disconnected', remotePeer)
            break
          }
          case 'failed': {
            this.emit('peer:error', {
              peer: remotePeer,
              error: new Error(`Connection failed for peer ${remotePeer.id}`)
            })
            break
          }
        }
      },
      onStreamReceived: (type, stream) => {
        logger.debug('peer:streamReceived', {
          peerId: remotePeer.id,
          streamId: stream.id,
          type
        })
        this.emit('peer:streamReceived', { peer: remotePeer, type, stream })
      },
      onIceCandidate: (candidate) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          logger.warn('signaling:iceCandidateNotSent', {
            toPeerId: id,
            reason: 'WebSocket not connected'
          })
          return
        }

        try {
          const message: IceCandidateMessage = {
            type: 'ICE_CANDIDATE',
            payload: {
              toPeerId: id,
              candidate
            }
          }
          this.ws.send(JSON.stringify(message))

          logger.debug('signaling:iceCandidateSent', {
            toPeerId: id,
            candidate
          })
        } catch (error) {
          logger.error('signaling:iceCandidateFailed', {
            toPeerId: id,
            error
          })
        }
      },
      onDataChannelMessage: (data) => {
        logger.debug('peer:dataChannelMessage', {
          peerId: id,
          dataLength: data.length
        })
        this.emit('peer:dataChannelMessage', {
          peer: remotePeer,
          data
        })
      },
      onRenegotiationNeeded: (offer) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          logger.warn('signaling:renegotiationOfferNotSent', {
            toPeerId: id,
            reason: 'WebSocket not connected'
          })
          return
        }

        try {
          const message: OfferMessage = {
            type: 'OFFER',
            payload: {
              toPeerId: id,
              offer
            }
          }
          this.ws.send(JSON.stringify(message))

          logger.debug('signaling:renegotiationOfferSent', {
            toPeerId: id,
            offer
          })
        } catch (error) {
          logger.error('signaling:renegotiationOfferFailed', {
            toPeerId: id,
            error
          })
        }
      }
    })

    this.peers.set(id, remotePeer)
    return remotePeer
  }

  private async initiateConnectionToPeer(
    remotePeer: RemotePeer
  ): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('signaling:offerNotSent', {
        toPeerId: remotePeer.id,
        reason: 'WebSocket not connected'
      })
      return
    }

    try {
      remotePeer.createDataChannel()
      for (const localStream of this.peer?.streams || []) {
        await remotePeer.sendStream({
          stream: localStream.stream,
          type: localStream.type
        })
      }
      const offer = await remotePeer.createOffer()

      const message: OfferMessage = {
        type: 'OFFER',
        payload: {
          toPeerId: remotePeer.id,
          offer
        }
      }
      this.ws.send(JSON.stringify(message))

      logger.debug('signaling:offerSent', {
        toPeerId: remotePeer.id,
        offer
      })
    } catch (error) {
      logger.error('signaling:offerFailed', {
        toPeerId: remotePeer.id,
        error
      })
    }
  }

  private async cleanupRoomState(localPeer: LocalPeer): Promise<void> {
    for (const remotePeer of this.peers.values()) {
      try {
        remotePeer.close()
      } catch (error) {
        logger.warn('peer:closeConnectionFailed', {
          peerId: remotePeer.id,
          error
        })
      }
    }

    if (localPeer.isInRoom) localPeer.leaveRoom()
    this.peers.clear()
  }

  private cleanup(): void {
    this.ws = undefined
    this.peer = undefined
    this.peers.clear()
  }
}
