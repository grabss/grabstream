import {
  logger,
  type ServerToClientMessage,
  validateDisplayName
} from '@grabstream/core'
import { v4 as uuidv4 } from 'uuid'
import type { WebSocket } from 'ws'

export class Peer {
  private readonly _id: string
  private _displayName: string
  private _roomId?: string
  private _isAlive: boolean
  private _lastPongReceivedAt: Date

  private readonly socket: WebSocket
  private readonly joinedAt: Date

  constructor({
    socket,
    displayName
  }: { socket: WebSocket; displayName?: string }) {
    this._id = uuidv4()

    if (displayName) {
      this._displayName = this.validatedDisplayName(displayName)
    } else {
      this._displayName = `Peer-${this._id.slice(0, 8)}`
    }

    this._isAlive = true
    this._lastPongReceivedAt = new Date()

    this.socket = socket
    this.joinedAt = new Date()
  }

  get id(): string {
    return this._id
  }

  get displayName(): string {
    return this._displayName
  }

  get roomId(): string | undefined {
    return this._roomId
  }

  get isConnected(): boolean {
    return this.socket.readyState === this.socket.OPEN
  }

  get isAlive(): boolean {
    return this._isAlive
  }

  get lastPongReceivedAt(): Date {
    return this._lastPongReceivedAt
  }

  ping(): void {
    this._isAlive = false
    this.socket.ping()
  }

  terminate(): void {
    this.socket.terminate()
  }

  updatePongReceived(): void {
    this._isAlive = true
    this._lastPongReceivedAt = new Date()
  }

  updateDisplayName(displayName: string): void {
    this._displayName = this.validatedDisplayName(displayName)
  }

  joinRoom(roomId: string): void {
    if (this._roomId) {
      throw new Error(`Peer ${this._id} is already in room ${this._roomId}`)
    }
    this._roomId = roomId
  }

  leaveRoom(): string {
    if (!this._roomId) {
      throw new Error(`Peer ${this._id} is not in any room`)
    }

    const leftRoomId = this._roomId
    this._roomId = undefined
    return leftRoomId
  }

  isInRoom(): this is Peer & { readonly roomId: string } {
    return this._roomId !== undefined
  }

  send(message: ServerToClientMessage): boolean {
    if (!this.isConnected) {
      logger.warn('peer:sendFailedDisconnected', {
        peerId: this._id
      })
      return false
    }

    try {
      this.socket.send(JSON.stringify(message))
      return true
    } catch (error) {
      logger.error('peer:sendFailed', {
        peerId: this._id,
        error
      })
      return false
    }
  }

  sendError(error: string | Error): boolean {
    const message = typeof error === 'string' ? error : error.message

    logger.debug('peer:errorSent', {
      peerId: this._id,
      message
    })

    return this.send({
      type: 'ERROR',
      payload: {
        message
      }
    })
  }

  toJSON() {
    return {
      id: this._id,
      displayName: this._displayName,
      roomId: this._roomId,
      joinedAt: this.joinedAt,
      lastPongReceivedAt: this._lastPongReceivedAt
    }
  }

  private validatedDisplayName(displayName: string): string {
    const trimmedDisplayName = displayName.trim()

    const validation = validateDisplayName(trimmedDisplayName)
    if (!validation.success) {
      throw new Error(validation.error)
    }

    return trimmedDisplayName
  }
}
