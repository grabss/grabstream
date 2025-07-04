import { logger } from '@grabstream/core'

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

    this.ws.onopen = () => {
      logger.debug('client:connected')
      this.emit('client:connected')
    }

    this.ws.onmessage = (event) => {
      // TODO: handleMessage
    }

    this.ws.onclose = (event) => {
      logger.debug('client:disconnected', {
        code: event.code,
        reason: event.reason
      })
      this.emit('client:disconnected', {
        code: event.code,
        reason: event.reason
      })
      // TODO: handleDisconnection
    }

    this.ws.onerror = (event) => {
      logger.error('client:error', event)
      this.emit('client:error', event)
    }
  }
}
