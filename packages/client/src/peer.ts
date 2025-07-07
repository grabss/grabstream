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
  private _connection: RTCPeerConnection
  private _streams: Map<string, MediaStream> = new Map()

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

  get streams(): Map<string, MediaStream> {
    return this._streams
  }

  sendStream(stream: MediaStream): void {
    for (const track of stream.getTracks()) {
      this._connection.addTrack(track, stream)
    }
  }

  updateDisplayName(displayName: string): void {
    this._displayName = displayName
  }

  leave(): void {
    this._connection.close()
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this._connection.createOffer()
    await this._connection.setLocalDescription(offer)

    return offer
  }

  async createAnswer(
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    await this._connection.setRemoteDescription(offer)

    const answer = await this._connection.createAnswer()
    await this._connection.setLocalDescription(answer)

    return answer
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this._connection.addIceCandidate(candidate)
  }
}
