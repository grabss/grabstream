import { logger } from '@grabstream/core'

export interface Peer {
  id: string
  displayName: string

  updateDisplayName(displayName: string): void
}

export class LocalPeer implements Peer {
  private readonly _id: string
  private _displayName: string
  private _roomId?: string
  private _stream?: MediaStream
  private _screenStream?: MediaStream

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

  get roomId(): string | undefined {
    return this._roomId
  }

  get stream(): MediaStream | undefined {
    return this._stream
  }

  get screenStream(): MediaStream | undefined {
    return this._screenStream
  }

  set stream(stream: MediaStream) {
    if (this._stream) {
      this._stream.getTracks().forEach((track) => track.stop())
    }
    this._stream = stream
  }

  set screenStream(stream: MediaStream) {
    if (this._screenStream) {
      this._screenStream.getTracks().forEach((track) => track.stop())
    }
    this._screenStream = stream
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
  private _screenStream?: MediaStream

  constructor({
    id,
    displayName,
    iceServers
  }: { id: string; displayName: string; iceServers: RTCIceServer[] }) {
    this._id = id
    this._displayName = displayName
    this._connection = new RTCPeerConnection({ iceServers })
    this.setupPeerConnectionEventHandlers(this._connection)
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

  get screenStream(): MediaStream | undefined {
    return this._screenStream
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
    // TODO: emit leave event to the server
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

  private setupPeerConnectionEventHandlers(
    connection: RTCPeerConnection
  ): void {
    connection.onconnectionstatechange = () => {
      logger.debug('peer:connectionStateChanged', {
        peerId: this._id,
        state: connection.connectionState
      })
    }

    connection.ontrack = (event) => {
      const { track, streams } = event
      const isScreenShare =
        track.label.toLowerCase().includes('screen') ||
        track.label.toLowerCase().includes('display')

      logger.debug('peer:trackReceived', {
        peerId: this._id,
        streams: streams.map((s) => s.id),
        trackKind: track.kind,
        isScreenShare
      })

      for (const stream of streams) {
        if (isScreenShare) {
          this._screenStream = stream
        } else {
          this._streams.set(stream.id, stream)
        }
      }

      // TODO: emit received stream event
    }

    connection.onicecandidate = (event) => {
      const { candidate } = event

      if (candidate) {
        logger.debug('peer:iceCandidateGenerated', {
          peerId: this._id,
          candidate
        })

        // TODO: emit this candidate to the server
      }
    }
  }
}
