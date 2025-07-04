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

    logger.debug('client:initialized', {
      url: this.configuration.url,
      connectionTimeoutMs: this.configuration.connectionTimeoutMs
    })
  }

  async connect(): Promise<void> {
    logger.debug('client:connectAttempted')
    throw new Error('connect() method not implemented yet')
  }
}
