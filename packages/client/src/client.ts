import { isServerToClientMessage, logger } from '@grabstream/core'

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
  private connectPromise?: Promise<void>
  private connectionTimeout?: number

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

  get peers(): Peer[] {
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

  get readyState(): number {
    return this.socket?.readyState ?? WebSocket.CLOSED
  }

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      logger.warn('client:alreadyConnected')
      return
    }

    if (this.connectPromise) {
      logger.debug('client:waitingForExisting')
      return this.connectPromise
    }

    this.connectPromise = this.performConnect()
    try {
      await this.connectPromise
    } finally {
      this.connectPromise = undefined
    }
  }

  async disconnect(): Promise<void> {
    this.clearConnectionTimeout()

    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      logger.debug('client:alreadyDisconnected')
      this._connectionState = 'disconnected'
      return
    }

    return new Promise((resolve) => {
      if (!this.socket) {
        resolve()
        return
      }

      const onClose = () => {
        this.cleanup()
        logger.debug('client:disconnected')
        resolve()
      }

      if (this.socket.readyState === WebSocket.CLOSING) {
        this.socket.addEventListener('close', onClose, { once: true })
      } else {
        this.socket.addEventListener('close', onClose, { once: true })
        this.socket.close(1000, 'Client disconnect')
      }
    })
  }

  async joinRoom(roomId: string, _options?: JoinRoomOptions): Promise<void> {
    logger.debug('client:joinRoomAttempted', { roomId })
    throw new Error('joinRoom() method not implemented yet')
  }

  async leaveRoom(): Promise<void> {
    logger.debug('client:leaveRoomAttempted')
    throw new Error('leaveRoom() method not implemented yet')
  }

  send(message: unknown): boolean {
    if (!this.isConnected || !this.socket) {
      logger.warn('client:sendFailedNotConnected')
      return false
    }

    try {
      this.socket.send(JSON.stringify(message))
      return true
    } catch (error) {
      logger.error('client:sendFailed', { error })
      return false
    }
  }

  onMessage(handler: (message: unknown) => void): void {
    if (!this.socket) {
      logger.warn('client:noSocketForMessageHandler')
      return
    }

    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data)
        if (isServerToClientMessage(message)) {
          handler(message)
        } else {
          logger.warn('client:invalidMessageFormat', {
            // biome-ignore lint/suspicious/noExplicitAny: Need to access type property of unknown message structure
            messageType: (message as any)?.type || 'unknown'
          })
        }
      } catch (error) {
        logger.error('client:messageParseError', { error })
      }
    })
  }

  private async performConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this._connectionState = 'connecting'
        this.socket = new WebSocket(this.configuration.url)

        const onOpen = () => {
          this.clearConnectionTimeout()
          this.socket?.removeEventListener('error', onError)
          this._connectionState = 'connected'
          logger.debug('client:connected', { url: this.configuration.url })
          this.emit('client:connected')
          resolve()
        }

        const onError = (_event: Event) => {
          this.clearConnectionTimeout()
          this.socket?.removeEventListener('open', onOpen)
          this.cleanup()
          const error = new Error('WebSocket connection failed')
          logger.error('client:connectionFailed', {
            url: this.configuration.url,
            error
          })
          this.emit('client:error', error)
          reject(error)
        }

        const onClose = (event: CloseEvent) => {
          logger.debug('client:closed', {
            code: event.code,
            reason: event.reason || 'No reason provided'
          })
          this.cleanup()
          this.emit('client:disconnected')
        }

        const onMessage = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data)
            if (isServerToClientMessage(message)) {
              this.handleMessage(message)
            } else {
              logger.warn('client:invalidMessageFormat', {
                // biome-ignore lint/suspicious/noExplicitAny: Need to access type property of unknown message structure
                messageType: (message as any)?.type || 'unknown'
              })
            }
          } catch (error) {
            logger.error('client:messageParseError', { error })
          }
        }

        this.socket.addEventListener('open', onOpen, { once: true })
        this.socket.addEventListener('error', onError, { once: true })
        this.socket.addEventListener('close', onClose)
        this.socket.addEventListener('message', onMessage)

        this.connectionTimeout = window.setTimeout(() => {
          this.socket?.removeEventListener('open', onOpen)
          this.socket?.removeEventListener('error', onError)
          this.cleanup()
          const error = new Error(
            `Connection timeout after ${this.configuration.connectionTimeoutMs}ms`
          )
          logger.error('client:connectionTimeout', {
            url: this.configuration.url,
            timeout: this.configuration.connectionTimeoutMs
          })
          this.emit('client:error', error)
          reject(error)
        }, this.configuration.connectionTimeoutMs)
      } catch (error) {
        logger.error('client:setupFailed', { error })
        this.emit('client:error', error as Error)
        reject(error)
      }
    })
  }

  private handleMessage(message: unknown): void {
    logger.debug('client:messageReceived', {
      // biome-ignore lint/suspicious/noExplicitAny: Need to access type property of unknown message structure
      type: (message as any)?.type
    })
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = undefined
    }
  }

  private cleanup(): void {
    this.clearConnectionTimeout()
    this._connectionState = 'disconnected'
    this.socket = undefined
  }
}
