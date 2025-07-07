export interface Peer {
  id: string
  displayName: string

  updateDisplayName(displayName: string): void
}

export class LocalPeer implements Peer {
  private readonly _id: string
  private _displayName: string
  private _roomId?: string

  private iceServers: RTCIceServer[]

  constructor({
    id,
    displayName,
    iceServers
  }: { id: string; displayName: string; iceServers: RTCIceServer[] }) {
    this._id = id
    this._displayName = displayName
    this.iceServers = iceServers
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

  joinRoom({
    roomId,
    displayName
  }: {
    roomId: string
    displayName: string
  }): void {
    if (this._roomId) {
      throw new Error(`Already in room ${this._roomId}`)
    }
    this._roomId = roomId
    this._displayName = displayName
  }

  leaveRoom(): void {
    if (!this._roomId) {
      throw new Error('Not in any room')
    }
    this._roomId = undefined
  }

  updateDisplayName(displayName: string): void {
    this._displayName = displayName
  }
}

export class RemotePeer implements Peer {
  private readonly _id: string
  private _displayName: string
  private _connection?: RTCPeerConnection

  constructor({
    id,
    displayName,
    iceServers
  }: { id: string; displayName: string; iceServers: RTCIceServer[] }) {
    this._id = id
    this._displayName = displayName
    this._connection = new RTCPeerConnection({ iceServers })
  }

  get id(): string {
    return this._id
  }

  get displayName(): string {
    return this._displayName
  }

  get connection(): RTCPeerConnection | undefined {
    return this._connection
  }

  get connectionState(): RTCPeerConnectionState {
    return this._connection?.connectionState ?? 'new'
  }

  updateDisplayName(displayName: string): void {
    this._displayName = displayName
  }

  close(): void {
    if (!this._connection) return

    this._connection.close()
    this._connection = undefined
  }
}
