import { logger } from '@grabstream/core'

import { DEFAULT_CONNECTION_TIMEOUT_MS, DEFAULT_SERVER_URL } from './constants'
import { GrabstreamClientEmitter } from './emitter'
import type {
  GrabstreamClientConfiguration,
  GrabstreamClientOptions,
  JoinRoomOptions,
  Peer
} from './types'

export class GrabstreamClient extends GrabstreamClientEmitter {
  private _peerId?: string
  private _roomId?: string
  private readonly _peers: Map<string, Peer> = new Map()
  private _connectionState: 'disconnected' | 'connecting' | 'connected' =
    'disconnected'

  private readonly configuration: GrabstreamClientConfiguration
  private socket?: WebSocket

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

  get peerId(): string | undefined {
    return this._peerId
  }

  get roomId(): string | undefined {
    return this._roomId
  }

  get peers(): ReadonlyArray<Peer> {
    return Array.from(this._peers.values())
  }

  get connectionState(): 'disconnected' | 'connecting' | 'connected' {
    return this._connectionState
  }

  get isConnected(): boolean {
    return (
      this._connectionState === 'connected' &&
      this.socket?.readyState === WebSocket.OPEN
    )
  }

  async connect(): Promise<void> {
    logger.debug('client:connectAttempted')
    throw new Error('connect() method not implemented yet')
  }

  async disconnect(): Promise<void> {
    logger.debug('client:disconnectAttempted')
    throw new Error('disconnect() method not implemented yet')
  }

  async joinRoom(roomId: string, _options?: JoinRoomOptions): Promise<void> {
    logger.debug('client:joinRoomAttempted', { roomId })
    throw new Error('joinRoom() method not implemented yet')
  }

  async leaveRoom(): Promise<void> {
    logger.debug('client:leaveRoomAttempted')
    throw new Error('leaveRoom() method not implemented yet')
  }
}
