import type {
  AnswerRelayMessage,
  CustomRelayMessage,
  DisplayNameUpdatedMessage,
  IceCandidateMessage,
  IceCandidateRelayMessage,
  JoinRoomMessage,
  OfferRelayMessage,
  PeerJoinedMessage,
  PeerLeftMessage,
  PeerUpdatedMessage,
  RoomJoinedMessage,
  RoomLeftMessage
} from '@grabstream/core'
import { isServerToClientMessage, logger } from '@grabstream/core'

import { DEFAULT_CONNECTION_TIMEOUT_MS, DEFAULT_SERVER_URL } from './constants'
import { GrabstreamClientEmitter } from './emitter'
import { LocalPeer, RemotePeer } from './peer'
import type {
  GrabstreamClientConfiguration,
  GrabstreamClientOptions
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

  async joinRoom(
    roomId: string,
    options?: {
      displayName?: string
      password?: string
    }
  ): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    if (!this.peer) {
      throw new Error('Peer is not initialized')
    }

    if (this.peer.roomId) {
      throw new Error(`Already in room ${this.peer.roomId}`)
    }

    const message: JoinRoomMessage = {
      type: 'JOIN_ROOM',
      payload: {
        roomId,
        displayName: options?.displayName,
        password: options?.password
      }
    }
    this.ws.send(JSON.stringify(message))
  }

  private setupWebSocketEventHandlers(ws: WebSocket): void {
    ws.onopen = null

    ws.onmessage = (event) => this.handleMessage(event)

    ws.onerror = (event) => {
      logger.error('websocket:error', event)
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

  private handleMessage(event: MessageEvent): void {
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
      logger.error('connect:invalidFormat', {
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
        this.handleRoomJoinedMessage({
          localPeer: this.peer,
          message
        })
        break
      }
      case 'ROOM_LEFT': {
        this.handleRoomLeftMessage({
          localPeer: this.peer,
          message
        })
        break
      }
      case 'PEER_JOINED': {
        this.handlePeerJoinedMessage(message)
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
      case 'KNOCK_RESPONSE': {
        logger.debug('room:knockResponse', message.payload)
        this.emit('room:knockResponse', message.payload)
        break
      }
      case 'OFFER':
      case 'ANSWER':
      case 'ICE_CANDIDATE': {
        this.handleSignalingMessage(message)
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
      default: {
        const _exhaustive: never = message
        logger.error('message:unexpectedType', { message: _exhaustive })
        return
      }
    }
  }

  private handleRoomJoinedMessage({
    localPeer,
    message
  }: {
    localPeer: LocalPeer
    message: RoomJoinedMessage
  }): void {
    const { roomId, displayName, peers } = message.payload

    localPeer.joinRoom({
      roomId,
      displayName
    })

    this.peers.clear()
    for (const peer of peers) {
      const remotePeer = this.createRemotePeer({
        id: peer.id,
        displayName: peer.displayName
      })
      this.peers.set(peer.id, remotePeer)
    }

    logger.info('room:joined', {
      roomId,
      peers
    })
    this.emit('room:joined', {
      roomId,
      peers: Array.from(this.peers.values())
    })

    for (const _peer of peers) {
      // TODO: initiateConnectionToPeer
    }
  }

  private handleRoomLeftMessage({
    localPeer,
    message
  }: {
    localPeer: LocalPeer
    message: RoomLeftMessage
  }): void {
    const { roomId } = message.payload

    localPeer.leaveRoom()
    this.peers.clear()

    logger.info('room:left', { roomId })
    this.emit('room:left', { roomId })

    // TODO: closeAllPeerConnections
  }

  private handlePeerJoinedMessage(message: PeerJoinedMessage): void {
    const { peerId, displayName } = message.payload

    const remotePeer = this.createRemotePeer({
      id: peerId,
      displayName
    })
    this.peers.set(peerId, remotePeer)

    logger.info('peer:joined', {
      peerId,
      displayName,
      peerCount: this.peers.size
    })
    this.emit('peer:joined', remotePeer)

    // TODO: initiateConnectionToPeer(peerId)
  }

  private handlePeerLeftMessage(message: PeerLeftMessage): void {
    const { peerId } = message.payload

    const peer = this.peers.get(peerId)
    if (!peer) {
      logger.warn('peer:notFound', { peerId })
      return
    }

    this.peers.delete(peerId)

    logger.info('peer:left', {
      peerId,
      displayName: peer.displayName,
      peerCount: this.peers.size
    })
    this.emit('peer:left', peer)

    // TODO: closePeerConnection(peerId)
  }

  private handlePeerUpdatedMessage(message: PeerUpdatedMessage): void {
    const { peerId, displayName } = message.payload

    const peer = this.peers.get(peerId)
    if (!peer) {
      logger.warn('peer:notFound', { peerId })
      return
    }

    const oldDisplayName = peer.displayName
    peer.updateDisplayName(displayName)
    this.peers.set(peerId, peer)

    logger.info('peer:updated', {
      peerId,
      oldDisplayName,
      newDisplayName: displayName
    })
    this.emit('peer:updated', peer)
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

  private handleSignalingMessage(
    message: OfferRelayMessage | AnswerRelayMessage | IceCandidateRelayMessage
  ): void {
    const { fromPeerId } = message.payload

    const peer = this.peers.get(fromPeerId)
    if (!peer) {
      logger.warn('signaling:peerNotFound', {
        fromPeerId,
        messageType: message.type
      })
      return
    }

    switch (message.type) {
      case 'OFFER':
        logger.debug('signaling:offerReceived', { fromPeerId })
        // TODO: WebRTC - createAnswer, setRemoteDescription
        break

      case 'ANSWER':
        logger.debug('signaling:answerReceived', { fromPeerId })
        // TODO: WebRTC - setRemoteDescription
        break

      case 'ICE_CANDIDATE':
        logger.debug('signaling:iceCandidateReceived', { fromPeerId })
        // TODO: WebRTC - addIceCandidate
        break
    }

    this.emit('peer:signaling', { peer, message })
  }

  private handleCustomMessage(message: CustomRelayMessage): void {
    const { fromPeerId } = message.payload

    const peer = this.peers.get(fromPeerId)
    if (!peer) {
      logger.warn('peer:customMessage:peerNotFound', message.payload)
      return
    }

    logger.debug('peer:customMessage', message.payload)
    this.emit('peer:customMessage', {
      peer,
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
      onStreamReceived: (streams) => {
        this.emit('peer:streamReceived', { peer: remotePeer, streams })
      },
      onIceCandidate: (candidate) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          logger.warn('signaling:iceCandidateNotSent', {
            toPeerId: id,
            candidate
          })
          return
        }

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
      }
    })

    this.peers.set(id, remotePeer)
    return remotePeer
  }

  private cleanup(): void {
    this.ws = undefined
    this.peer = undefined
    this.peers.clear()
  }
}
