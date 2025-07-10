import { logger } from '@grabstream/core'

export class RemotePeer {
  private readonly _id: string
  private _displayName: string
  private _connection: RTCPeerConnection
  private _dataChannel?: RTCDataChannel
  private _streams: Map<string, MediaStream> = new Map()
  private _screenStream?: MediaStream

  private onConnectionStateChanged?: (state: RTCPeerConnectionState) => void
  private onStreamReceived?: (
    streams: readonly MediaStream[],
    isScreenShare: boolean
  ) => void
  private onIceCandidate?: (candidate: RTCIceCandidate) => void
  private onDataChannelMessage?: (data: string) => void

  constructor({
    id,
    displayName,
    iceServers,
    onConnectionStateChanged,
    onStreamReceived,
    onIceCandidate,
    onDataChannelMessage
  }: {
    id: string
    displayName: string
    iceServers: RTCIceServer[]
    onConnectionStateChanged?: (state: RTCPeerConnectionState) => void
    onStreamReceived?: (
      streams: readonly MediaStream[],
      isScreenShare: boolean
    ) => void
    onIceCandidate?: (candidate: RTCIceCandidate) => void
    onDataChannelMessage?: (data: string) => void
  }) {
    this._id = id
    this._displayName = displayName

    this._connection = new RTCPeerConnection({ iceServers })
    this._connection.ondatachannel = (event) => {
      this._dataChannel = event.channel
      this.setupDataChannel(this._dataChannel)
    }

    this.setupPeerConnectionEventHandlers(this._connection)

    this.onConnectionStateChanged = onConnectionStateChanged
    this.onStreamReceived = onStreamReceived
    this.onIceCandidate = onIceCandidate
    this.onDataChannelMessage = onDataChannelMessage
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

  get dataChannelState(): RTCDataChannelState | undefined {
    return this._dataChannel?.readyState
  }

  get streams(): Map<string, MediaStream> {
    return this._streams
  }

  get screenStream(): MediaStream | undefined {
    return this._screenStream
  }

  clearScreenStream(): void {
    if (this._screenStream) {
      this._screenStream.getTracks().forEach((track) => track.stop())
      this._screenStream = undefined
    }
  }

  sendStream(stream: MediaStream): void {
    for (const track of stream.getTracks()) {
      this._connection.addTrack(track, stream)
    }
  }

  sendData(data: string): void {
    if (!this._dataChannel || this.dataChannelState !== 'open') {
      throw new Error(`DataChannel is not open for peer ${this._id}`)
    }

    this._dataChannel.send(data)
  }

  updateDisplayName(displayName: string): void {
    this._displayName = displayName
  }

  close(): void {
    this._connection.close()
  }

  createDataChannel(label = 'data', options?: RTCDataChannelInit): void {
    if (this._dataChannel) {
      logger.warn('peer:dataChannelAlreadyExists', { peerId: this._id })
      return
    }

    this._dataChannel = this._connection.createDataChannel(label, {
      ordered: true,
      ...options
    })

    this.setupDataChannel(this._dataChannel)
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

  async receiveAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this._connection.setRemoteDescription(answer)
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
      this.onConnectionStateChanged?.(connection.connectionState)
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

      this.onStreamReceived?.(streams, isScreenShare)
    }

    connection.onicecandidate = (event) => {
      const { candidate } = event

      if (candidate) {
        logger.debug('peer:iceCandidateGenerated', {
          peerId: this._id,
          candidate
        })

        this.onIceCandidate?.(candidate)
      }
    }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      logger.debug('peer:dataChannelOpened', { peerId: this._id })
    }

    channel.onmessage = (event) => {
      logger.debug('peer:dataChannelMessage', {
        peerId: this._id,
        dataLength:
          typeof event.data === 'string'
            ? event.data.length
            : event.data.byteLength
      })
      this.onDataChannelMessage?.(event.data)
    }

    channel.onclose = () => {
      logger.debug('peer:dataChannelClosed', { peerId: this._id })
    }

    channel.onerror = (event) => {
      logger.error('peer:dataChannelError', { peerId: this._id, event })
    }
  }
}
