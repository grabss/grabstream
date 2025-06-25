import { v4 as uuidv4 } from 'uuid'
import type { WebSocket } from 'ws'

export class Peer {
  private readonly _id: string
  private _displayName: string
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
}
