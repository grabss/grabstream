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
  private _socket?: WebSocket
  private readonly _configuration: GrabstreamClientConfiguration
  private _peerId?: string
  private _roomId?: string
  private readonly _peers: Map<string, Peer> = new Map()
  private _connectionState: 'disconnected' | 'connecting' | 'connected' =
    'disconnected'

  constructor(options: GrabstreamClientOptions = {}) {
    super()

    this._configuration = {
      url: options.url ?? DEFAULT_SERVER_URL,
      connectionTimeoutMs:
        options.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS
    }

    logger.debug('client:initialized', {
      url: this._configuration.url,
      connectionTimeoutMs: this._configuration.connectionTimeoutMs
    })
  }

  get isConnected(): boolean {
    return (
      this._connectionState === 'connected' &&
      this._socket?.readyState === WebSocket.OPEN
    )
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
