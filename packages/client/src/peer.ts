export interface Peer {
  id: string
  displayName: string
}

export class LocalPeer implements Peer {
  private readonly _id: string
  private _displayName?: string
  private _roomId?: string

  private iceServers: RTCIceServer[]

  constructor({
    id,
    displayName,
    iceServers
  }: { id: string; displayName?: string; iceServers: RTCIceServer[] }) {
    this._id = id
    this._displayName = displayName
    this.iceServers = iceServers
  }

  get id(): string {
    return this._id
  }

  get displayName(): string {
    return this._displayName || '<None>'
  }

  get roomId(): string | undefined {
    return this._roomId
  }

  joinRoom({
    roomId,
    displayName
  }: {
    roomId: string
    displayName?: string
  }): void {
    if (this._roomId) {
      throw new Error(`Already in room ${this._roomId}`)
    }
    this._roomId = roomId

    if (displayName) {
      this._displayName = displayName
    }
  }

  leaveRoom(): void {
    if (!this._roomId) {
      throw new Error('Not in any room')
    }
    this._roomId = undefined
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

  updateDisplayName(displayName: string): void {
    this._displayName = displayName
  }
}
