import {
  MAX_PASSWORD_LENGTH,
  MAX_ROOM_ID_LENGTH,
  MIN_PASSWORD_LENGTH,
  ROOM_ID_PATTERN
} from './constants'
import { logger } from './logger'
import type { ServerToClientMessage } from './messages'
import type { Peer } from './peer'

export class Room {
  private readonly _id: string
  private readonly _password?: string
  private readonly _peers: Map<string, Peer>
  private readonly _createdAt: Date

  constructor(id: string, password?: string) {
    this.validateRoomId(id)
    this._id = id
    this._peers = new Map<string, Peer>()
    this._createdAt = new Date()

    if (password !== undefined) {
      this.validatePassword(password)
      this._password = password
    }
  }

  get id(): string {
    return this._id
  }

  get peers(): Peer[] {
    return Array.from(this._peers.values())
  }

  get isEmpty(): boolean {
    return this._peers.size === 0
  }

  get hasPassword(): boolean {
    return this._password !== undefined
  }

  addPeer(peer: Peer): void {
    if (this.hasPeer(peer.id)) {
      throw new Error(
        `Peer with id ${peer.id} already exists in room ${this._id}`
      )
    }
    this._peers.set(peer.id, peer)
  }

  removePeer(peerId: string): void {
    if (!this.hasPeer(peerId)) {
      throw new Error(
        `Peer with id ${peerId} does not exist in room ${this._id}`
      )
    }
    this._peers.delete(peerId)
  }

  getPeer(peerId: string): Peer | undefined {
    return this._peers.get(peerId)
  }

  hasPeer(peerId: string): boolean {
    return this._peers.has(peerId)
  }

  broadcast({
    message,
    excludePeerIds = []
  }: {
    message: ServerToClientMessage
    excludePeerIds?: string[]
  }): void {
    let recipientCount = 0

    this._peers.forEach((peer) => {
      if (!excludePeerIds.includes(peer.id)) {
        if (peer.send(message)) recipientCount++
      }
    })

    logger.debug('room:broadcast', {
      roomId: this._id,
      messageType: message.type,
      targetCount: this._peers.size - excludePeerIds.length,
      recipientCount
    })
  }

  verifyPassword(password: string): boolean {
    return !this.hasPassword || this._password === password
  }

  toJSON() {
    return {
      id: this._id,
      peers: this.peers.map((peer) => peer.toJSON()),
      createdAt: this._createdAt,
      hasPassword: this.hasPassword
    }
  }

  private validateRoomId(roomId: string): void {
    if (!roomId) {
      throw new Error('Room ID cannot be empty')
    }

    if (roomId.length > MAX_ROOM_ID_LENGTH) {
      throw new Error(`Room ID cannot exceed ${MAX_ROOM_ID_LENGTH} characters`)
    }

    if (!ROOM_ID_PATTERN.test(roomId)) {
      throw new Error(`Room ID must match pattern: ${ROOM_ID_PATTERN.source}`)
    }
  }

  private validatePassword(password: string): void {
    if (!password) {
      throw new Error('Password cannot be empty')
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      )
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      throw new Error(
        `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`
      )
    }
  }
}
