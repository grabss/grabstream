import { EventEmitter } from 'eventemitter3'

import type { Peer, PeerMessage } from './peer'

export class Room extends EventEmitter {
  private readonly _id: string
  private readonly _peers: Map<string, Peer>
  private readonly _createdAt: Date

  constructor(id: string) {
    super()

    this._id = id
    this._peers = new Map<string, Peer>()
    this._createdAt = new Date()
  }

  get id(): string {
    return this._id
  }

  get isEmpty(): boolean {
    return this._peers.size === 0
  }

  addPeer(peer: Peer): void {
    if (this.hasPeer(peer.id)) {
      throw new Error(
        `Peer with id ${peer.id} already exists in room ${this._id}`
      )
    }
    this._peers.set(peer.id, peer)
  }

  hasPeer(peerId: string): boolean {
    return this._peers.has(peerId)
  }

  broadcast({
    message,
    excludePeerIds = []
  }: {
    message: PeerMessage
    excludePeerIds?: string[]
  }): void {
    this._peers.forEach((peer) => {
      if (!excludePeerIds.includes(peer.id)) {
        peer.send(message)
      }
    })
  }
}
