import { EventEmitter } from 'eventemitter3'

import type { Peer } from './peer'

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
}
