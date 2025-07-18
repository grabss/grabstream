import {
  logger,
  type ServerToClientMessage,
  validatePassword,
  validateRoomId
} from '@grabstream/core'

import type { Peer } from './peer.js'

export class Room {
  private readonly _id: string
  private readonly _peers: Map<string, Peer>

  private readonly password?: string
  private readonly createdAt: Date

  constructor(id: string, password?: string) {
    this.validateRoomId(id)
    this._id = id
    this._peers = new Map<string, Peer>()
    this.createdAt = new Date()

    if (password !== undefined) {
      this.validatePassword(password)
      this.password = password
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
    return this.password !== undefined
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
    return !this.hasPassword || this.password === password
  }

  toJSON() {
    return {
      id: this._id,
      peers: this.peers.map((peer) => peer.toJSON()),
      createdAt: this.createdAt,
      hasPassword: this.hasPassword
    }
  }

  private validateRoomId(roomId: string): void {
    const validation = validateRoomId(roomId)
    if (!validation.success) {
      throw new Error(validation.error)
    }
  }

  private validatePassword(password: string): void {
    const validation = validatePassword(password)
    if (!validation.success) {
      throw new Error(validation.error)
    }
  }
}
