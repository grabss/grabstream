import { logger } from '@grabstream/core'
import { DEFAULT_ICE_MAX_RESTARTS } from '../constants'
import type {
  StreamDataChannelMessage,
  StreamMetadata,
  StreamType
} from '../types'

export class RemotePeer {
  private readonly _id: string
  private _displayName: string
  private _connection: RTCPeerConnection
  private _dataChannel?: RTCDataChannel
  private _streams: Map<string, MediaStream> = new Map()
  private _streamMetadata: Map<string, StreamMetadata> = new Map()

  private onConnectionStateChanged?: (state: RTCPeerConnectionState) => void
  private onStreamReceived?: (type: StreamType, stream: MediaStream) => void
  private onIceCandidate?: (candidate: RTCIceCandidate) => void
  private onDataChannelMessage?: (data: string) => void
  private onRenegotiationNeeded?: (offer: RTCSessionDescriptionInit) => void

  private iceRestartCount = 0

  constructor({
    id,
    displayName,
    iceServers,
    onConnectionStateChanged,
    onStreamReceived,
    onIceCandidate,
    onDataChannelMessage,
    onRenegotiationNeeded
  }: {
    id: string
    displayName: string
    iceServers: RTCIceServer[]
    onConnectionStateChanged?: (state: RTCPeerConnectionState) => void
    onStreamReceived?: (type: StreamType, stream: MediaStream) => void
    onIceCandidate?: (candidate: RTCIceCandidate) => void
    onDataChannelMessage?: (data: string) => void
    onRenegotiationNeeded?: (offer: RTCSessionDescriptionInit) => void
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
    this.onRenegotiationNeeded = onRenegotiationNeeded
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

  get streams(): MediaStream[] {
    return Array.from(this._streams.values())
  }

  async sendStream({
    type,
    stream
  }: {
    type: StreamType
    stream: MediaStream
  }): Promise<void> {
    for (const track of stream.getTracks()) {
      this._connection.addTrack(track, stream)
    }

    try {
      const metadata: StreamMetadata = {
        streamId: stream.id,
        type,
        timestamp: Date.now()
      }
      const message: StreamDataChannelMessage = {
        type: 'STREAM_METADATA',
        data: metadata
      }
      this.sendData(JSON.stringify(message))
    } catch (error) {
      logger.error('peer:sendStreamMetadataFailed', {
        peerId: this._id,
        error
      })
    }

    if (this._connection.signalingState === 'stable') {
      try {
        const offer = await this.createOffer()
        this.onRenegotiationNeeded?.(offer)

        logger.debug('peer:renegotiationOfferCreated', {
          peerId: this._id,
          offer
        })
      } catch (error) {
        logger.error('peer:renegotiationFailed', {
          peerId: this._id,
          error
        })
      }
    }
  }

  async sendStreamRemoved(streamId: string): Promise<void> {
    try {
      const message: StreamDataChannelMessage = {
        type: 'STREAM_REMOVED',
        data: { streamId }
      }
      this.sendData(JSON.stringify(message))
    } catch (error) {
      logger.error('peer:sendStreamRemovedFailed', {
        peerId: this._id,
        error
      })
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

  createDataChannel(): void {
    if (this._dataChannel) {
      logger.warn('peer:dataChannelAlreadyExists', { peerId: this._id })
      return
    }

    this._dataChannel = this._connection.createDataChannel('data', {
      ordered: true
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

    connection.oniceconnectionstatechange = () => {
      if (connection.iceConnectionState === 'failed') {
        this.handleIceConnectionFailure()
      }
    }

    connection.ontrack = (event) => {
      const { track, streams } = event

      logger.debug('peer:trackReceived', {
        peerId: this._id,
        streams: streams.map((s) => s.id),
        trackKind: track.kind
      })

      for (const stream of streams) {
        this._streams.set(stream.id, stream)
        this.matchStream(stream.id)
      }
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
        data: event.data
      })

      try {
        const message: StreamDataChannelMessage = JSON.parse(event.data)

        switch (message.type) {
          case 'STREAM_METADATA': {
            const metadata = message.data
            this._streamMetadata.set(metadata.streamId, metadata)
            this.matchStream(metadata.streamId)
            return
          }
          case 'STREAM_REMOVED': {
            const { streamId } = message.data
            this._streamMetadata.delete(streamId)
            this._streams.delete(streamId)
            return
          }
        }
      } catch {}

      this.onDataChannelMessage?.(event.data)
    }

    channel.onclose = () => {
      logger.debug('peer:dataChannelClosed', { peerId: this._id })
    }

    channel.onerror = (event) => {
      logger.error('peer:dataChannelError', { peerId: this._id, event })
    }
  }

  private handleIceConnectionFailure(): void {
    if (this.iceRestartCount >= DEFAULT_ICE_MAX_RESTARTS) {
      logger.error('peer:iceRestartFailed', {
        peerId: this._id,
        attempts: this.iceRestartCount
      })
      return
    }

    this.iceRestartCount++

    logger.warn('peer:iceRestart', {
      peerId: this._id,
      attempt: this.iceRestartCount
    })

    try {
      this._connection.restartIce()
    } catch (error) {
      logger.error('peer:iceRestartError', {
        peerId: this._id,
        error
      })
    }
  }

  private matchStream(streamId: string): void {
    const stream = this._streams.get(streamId)
    const metadata = this._streamMetadata.get(streamId)

    if (stream && metadata) {
      this.onStreamReceived?.(metadata.type, stream)
    }
  }
}
