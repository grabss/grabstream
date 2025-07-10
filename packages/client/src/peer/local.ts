import type { LocalStream, StreamType } from '../types'

export class LocalPeer {
  private readonly _id: string
  private _displayName: string
  private _roomId?: string
  private _streams: Map<string, LocalStream> = new Map()

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

  get isInRoom(): boolean {
    return this._roomId !== undefined
  }

  get streams(): LocalStream[] {
    return Array.from(this._streams.values())
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

  addStream(stream: MediaStream, type: StreamType): void {
    for (const [id, data] of this._streams.entries()) {
      if (data.type === type) {
        data.stream.getTracks().forEach((track) => track.stop())
        this._streams.delete(id)
      }
    }

    this._streams.set(stream.id, { stream, type })
  }

  removeStream(streamId: string): void {
    const data = this._streams.get(streamId)
    if (data) {
      data.stream.getTracks().forEach((track) => track.stop())
      this._streams.delete(streamId)
    }
  }

  muteAudio(): void {
    this.setAudioEnabled(false)
  }

  unmuteAudio(): void {
    this.setAudioEnabled(true)
  }

  enableVideo(): void {
    this.setVideoEnabled(true)
  }

  disableVideo(): void {
    this.setVideoEnabled(false)
  }

  private setAudioEnabled(enabled: boolean): void {
    for (const stream of this.streams) {
      if (stream.type === 'AUDIO' || stream.type === 'AUDIO_VIDEO') {
        stream.stream.getAudioTracks().forEach((track) => {
          track.enabled = enabled
        })
      }
    }
  }

  private setVideoEnabled(enabled: boolean): void {
    for (const stream of this.streams) {
      if (stream.type === 'AUDIO_VIDEO') {
        stream.stream.getVideoTracks().forEach((track) => {
          track.enabled = enabled
        })
      }
    }
  }
}
