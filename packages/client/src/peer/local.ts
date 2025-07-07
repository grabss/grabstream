import type { Peer } from './interface'

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
