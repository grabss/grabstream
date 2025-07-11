/** biome-ignore-all lint/suspicious/noExplicitAny: Test mock setup requires any */
import { vi } from 'vitest'

export class MockWebSocket {
  public static readonly CONNECTING = 0
  public static readonly OPEN = 1
  public static readonly CLOSING = 2
  public static readonly CLOSED = 3

  public readyState = MockWebSocket.OPEN
  public url = ''

  public onopen: ((event: Event) => void) | null = null
  public onclose: ((event: CloseEvent) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null

  public send = vi.fn()
  public close = vi.fn()
  public addEventListener = vi.fn()
  public removeEventListener = vi.fn()
  public dispatchEvent = vi.fn()

  constructor(url: string) {
    this.url = url
  }

  public simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN
    if (this.onopen) {
      this.onopen(new Event('open'))
    }
  }

  public simulateConnecting(): void {
    this.readyState = MockWebSocket.CONNECTING
  }

  public simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }))
    }
  }

  public simulateClose(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }))
    }
  }

  public simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

export class MockRTCPeerConnection {
  public connectionState: RTCPeerConnectionState = 'new'
  public iceConnectionState: RTCIceConnectionState = 'new'
  public signalingState: RTCSignalingState = 'stable'
  public localDescription: RTCSessionDescription | null = null
  public remoteDescription: RTCSessionDescription | null = null

  public onconnectionstatechange: ((event: Event) => void) | null = null
  public oniceconnectionstatechange: ((event: Event) => void) | null = null
  public onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null =
    null
  public ontrack: ((event: RTCTrackEvent) => void) | null = null
  public ondatachannel: ((event: RTCDataChannelEvent) => void) | null = null
  public onnegotiationneeded: ((event: Event) => void) | null = null

  public addTrack = vi.fn()
  public removeTrack = vi.fn()
  public createOffer = vi.fn()
  public createAnswer = vi.fn()
  public setLocalDescription = vi.fn()
  public setRemoteDescription = vi.fn()
  public addIceCandidate = vi.fn()
  public createDataChannel = vi.fn()
  public close = vi.fn()
  public restartIce = vi.fn()

  constructor(_config?: RTCConfiguration) {
    this.createOffer.mockResolvedValue(
      new RTCSessionDescription({ type: 'offer', sdp: 'mock-offer' })
    )
    this.createAnswer.mockResolvedValue(
      new RTCSessionDescription({ type: 'answer', sdp: 'mock-answer' })
    )
    this.setLocalDescription.mockResolvedValue(undefined)
    this.setRemoteDescription.mockResolvedValue(undefined)
    this.addIceCandidate.mockResolvedValue(undefined)
    this.createDataChannel.mockReturnValue(new MockRTCDataChannel())
  }

  public simulateConnectionStateChange(state: RTCPeerConnectionState): void {
    this.connectionState = state
    if (this.onconnectionstatechange) {
      this.onconnectionstatechange(new Event('connectionstatechange'))
    }
  }

  public simulateIceConnectionStateChange(state: RTCIceConnectionState): void {
    this.iceConnectionState = state
    if (this.oniceconnectionstatechange) {
      this.oniceconnectionstatechange(new Event('iceconnectionstatechange'))
    }
  }

  public simulateIceCandidate(candidate: RTCIceCandidate): void {
    if (this.onicecandidate) {
      this.onicecandidate(
        new RTCPeerConnectionIceEvent('icecandidate', { candidate })
      )
    }
  }

  public simulateTrack(track: MediaStreamTrack, streams: MediaStream[]): void {
    if (this.ontrack) {
      this.ontrack(
        new RTCTrackEvent('track', {
          track,
          streams,
          receiver: {} as RTCRtpReceiver,
          transceiver: {} as RTCRtpTransceiver
        })
      )
    }
  }

  public simulateDataChannel(channel: MockRTCDataChannel): void {
    if (this.ondatachannel) {
      this.ondatachannel(
        new RTCDataChannelEvent('datachannel', {
          channel: channel as unknown as RTCDataChannel
        })
      )
    }
  }
}

export class MockRTCDataChannel {
  public readyState: RTCDataChannelState = 'open'
  public label = 'data'
  public ordered = true
  public maxRetransmits: number | null = null
  public maxPacketLifeTime: number | null = null
  public protocol = ''
  public negotiated = false
  public id: number | null = null
  public priority: RTCPriorityType = 'low'
  public bufferedAmount = 0
  public bufferedAmountLowThreshold = 0

  public onopen: ((event: Event) => void) | null = null
  public onclose: ((event: Event) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null
  public onbufferedamountlow: ((event: Event) => void) | null = null

  public send = vi.fn()
  public close = vi.fn()
  public addEventListener = vi.fn()
  public removeEventListener = vi.fn()
  public dispatchEvent = vi.fn()

  public simulateOpen(): void {
    this.readyState = 'open'
    if (this.onopen) {
      this.onopen(new Event('open'))
    }
  }

  public simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }))
    }
  }

  public simulateClose(): void {
    this.readyState = 'closed'
    if (this.onclose) {
      this.onclose(new Event('close'))
    }
  }

  public simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

export class MockMediaStream {
  public id: string
  public active = true
  private tracks: MediaStreamTrack[] = []

  public onaddtrack: ((event: MediaStreamTrackEvent) => void) | null = null
  public onremovetrack: ((event: MediaStreamTrackEvent) => void) | null = null
  public onactive: ((event: Event) => void) | null = null
  public oninactive: ((event: Event) => void) | null = null

  public addTrack = vi.fn()
  public removeTrack = vi.fn()
  public getTrackById = vi.fn()
  public clone = vi.fn()
  public addEventListener = vi.fn()
  public removeEventListener = vi.fn()
  public dispatchEvent = vi.fn()

  constructor(id = `stream-${Math.random().toString(36).substr(2, 9)}`) {
    this.id = id
  }

  public getTracks(): MediaStreamTrack[] {
    return [...this.tracks]
  }

  public getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'audio')
  }

  public getVideoTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'video')
  }

  public addMockTrack(kind: 'audio' | 'video'): MockMediaStreamTrack {
    const track = new MockMediaStreamTrack(kind)
    this.tracks.push(track)
    return track
  }
}

export class MockMediaStreamTrack {
  public id: string
  public kind: string
  public label = ''
  public enabled = true
  public muted = false
  public readonly = false
  public readyState: MediaStreamTrackState = 'live'
  public isolated = false
  public contentHint = ''

  public onmute: ((event: Event) => void) | null = null
  public onunmute: ((event: Event) => void) | null = null
  public onended: ((event: Event) => void) | null = null
  public onisolationchange: ((event: Event) => void) | null = null

  public stop = vi.fn()
  public clone = vi.fn()
  public getConstraints = vi.fn()
  public getSettings = vi.fn()
  public getCapabilities = vi.fn()
  public applyConstraints = vi.fn()
  public addEventListener = vi.fn()
  public removeEventListener = vi.fn()
  public dispatchEvent = vi.fn()

  constructor(kind: string) {
    this.kind = kind
    this.id = `track-${Math.random().toString(36).substr(2, 9)}`
  }

  public simulateStop(): void {
    this.readyState = 'ended'
    if (this.onended) {
      this.onended(new Event('ended'))
    }
  }
}

export function setupGlobalMocks(): void {
  global.WebSocket = MockWebSocket as any
  global.RTCPeerConnection = MockRTCPeerConnection as any
  global.RTCDataChannel = MockRTCDataChannel as any
  global.MediaStream = MockMediaStream as any
  global.MediaStreamTrack = MockMediaStreamTrack as any
  global.RTCSessionDescription = MockRTCSessionDescription as any
  global.RTCIceCandidate = MockRTCIceCandidate as any
}

export function setupWebSocketMock(): void {
  global.WebSocket = MockWebSocket as any
}

export function setupRTCMocks(): void {
  global.RTCPeerConnection = MockRTCPeerConnection as any
  global.RTCDataChannel = MockRTCDataChannel as any
}

export function setupMediaStreamMocks(): void {
  global.MediaStream = MockMediaStream as any
  global.MediaStreamTrack = MockMediaStreamTrack as any
}

export class MockRTCSessionDescription {
  public type: RTCSessionDescriptionType
  public sdp: string

  constructor(init?: RTCSessionDescriptionInit) {
    this.type = init?.type || 'offer'
    this.sdp = init?.sdp || ''
  }
}

export class MockRTCIceCandidate {
  public candidate: string
  public sdpMLineIndex: number | null
  public sdpMid: string | null

  constructor(init?: RTCIceCandidateInit) {
    this.candidate = init?.candidate || ''
    this.sdpMLineIndex = init?.sdpMLineIndex || null
    this.sdpMid = init?.sdpMid || null
  }
}

export function setupRTCSessionDescriptionMock(): void {
  global.RTCSessionDescription = MockRTCSessionDescription as any
  global.RTCIceCandidate = MockRTCIceCandidate as any
}
