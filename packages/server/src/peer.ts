import { v4 as uuidv4 } from 'uuid'
import type { WebSocket } from 'ws'

import type { ServerToClientMessage } from './messages'

export class Peer {
  private readonly _id: string
  private _displayName: string
  private _roomId?: string
  private readonly _socket: WebSocket
  private readonly _joinedAt: Date

  constructor({
    socket,
    displayName
  }: { socket: WebSocket; displayName?: string }) {
    this._id = uuidv4()
    this._displayName = displayName || `Peer-${this._id.slice(0, 8)}`
    this._socket = socket
    this._joinedAt = new Date()
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
    return this._socket.readyState === this._socket.OPEN
  }

  updateDisplayName(displayName: string): void {
    if (!displayName || displayName.trim() === '') {
      throw new Error('Display name cannot be empty')
    }
    this._displayName = displayName.trim()
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
      console.warn(
        `Cannot send message to peer ${this._id}: socket is not connected`
      )
      return false
    }

    try {
      this._socket.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error(`Failed to send message to peer ${this._id}:`, error)
      return false
    }
  }

  sendError(error: string | Error): boolean {
    const message = typeof error === 'string' ? error : error.message

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
      joinedAt: this._joinedAt
    }
  }
}
