import { isServerToClientMessage, logger } from '@grabstream/core'

import { DEFAULT_CONNECTION_TIMEOUT_MS, DEFAULT_SERVER_URL } from './constants'
import { GrabstreamClientEmitter } from './emitter'
import type {
  GrabstreamClientConfiguration,
  GrabstreamClientOptions,
  Peer
} from './types'

export class GrabstreamClient extends GrabstreamClientEmitter {
  private ws?: WebSocket
  private peerId?: string
  private roomId?: string
  private iceServers: RTCIceServer[] = []
  private readonly peers: Map<string, Peer> = new Map()

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
        this.peerId = message.payload.peerId
        this.iceServers = message.payload.iceServers

        this.setupWebSocketEventHandlers(ws)

        logger.info('client:connected', {
          peerId: this.peerId
        })
        this.emit('client:connected', { peerId: this.peerId })
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

    switch (message.type) {
      case 'CONNECTION_ESTABLISHED': {
        // TODO
        break
      }
      case 'ROOM_JOINED': {
        // TODO
        break
      }
      case 'ROOM_LEFT': {
        // TODO
        break
      }
      case 'PEER_JOINED': {
        // TODO
        break
      }
      case 'PEER_LEFT': {
        // TODO
        break
      }
      case 'PEER_UPDATED': {
        // TODO
        break
      }
      case 'DISPLAY_NAME_UPDATED': {
        // TODO
        break
      }
      case 'OFFER': {
        // TODO
        break
      }
      case 'ANSWER': {
        // TODO
        break
      }
      case 'ICE_CANDIDATE': {
        // TODO
        break
      }
      case 'CUSTOM': {
        // TODO
        break
      }
      case 'ERROR': {
        // TODO
        break
      }
      case 'PASSWORD_REQUIRED': {
        // TODO
        break
      }
      case 'KNOCK_RESPONSE': {
        // TODO
        break
      }
      default: {
        const _exhaustive: never = message
        logger.error('message:unexpectedType', { message: _exhaustive })
        return
      }
    }
  }

  private cleanup(): void {
    this.ws = undefined
    this.peerId = undefined
    this.roomId = undefined
    this.peers.clear()
  }
}
