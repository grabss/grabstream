export interface Peer {
  id: string
  displayName: string
}

export class LocalPeer implements Peer {
  private readonly _id: string
  private _displayName: string

  constructor({ id, displayName }: { id: string; displayName: string }) {
    this._id = id
    this._displayName = displayName
  }

  get id(): string {
    return this._id
  }

  get displayName(): string {
    return this._displayName
  }
}

export class RemotePeer implements Peer {
  private readonly _id: string
  private _displayName: string

  constructor({ id, displayName }: { id: string; displayName: string }) {
    this._id = id
    this._displayName = displayName
  }

  get id(): string {
    return this._id
  }

  get displayName(): string {
    return this._displayName
  }
}
