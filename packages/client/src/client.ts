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
          logger.error('connect:invalidFormat', { messageType })
          ws.close(1002, 'Invalid message format')
          return
        }

        clearTimeout(timeout)
        this.peerId = message.payload.peerId
        this.iceServers = message.payload.iceServers

        // TODO: setup handlers

        logger.info('client:connected', {
          peerId: this.peerId
        })
        this.emit('client:connected', { peerId: this.peerId })
        resolve()
      }

      ws.onerror = (event) => {
        clearTimeout(timeout)
        logger.error('client:error', event)

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

        const reason = event.reason || 'No reason provided'
        logger.error('client:disconnected', {
          code: event.code,
          reason
        })
        reject(
          new Error(`Connection closed with code ${event.code}: ${reason}`)
        )
      }
    })
  }

  private cleanup(): void {
    this.ws = undefined
    this.peerId = undefined
    this.roomId = undefined
    this.peers.clear()
  }
}
