import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GrabstreamClient } from './client'
import { DEFAULT_SERVER_URL } from './constants'
import {
  PeerNotInitializedError,
  ValidationError,
  WebSocketNotConnectedError
} from './errors'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(public url: string) {}

  send(_data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
  }

  close(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSING
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED
      if (this.onclose) {
        this.onclose({ code, reason } as CloseEvent)
      }
    }, 0)
  }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN
    if (this.onopen) {
      this.onopen(new Event('open'))
    }
  }

  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent)
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }

  simulateClose(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose({ code, reason } as CloseEvent)
    }
  }
}

// Mock MediaStream
class MockMediaStream {
  id = 'mock-stream-id'
  active = true
  getTracks(): MediaStreamTrack[] {
    return []
  }
  getAudioTracks(): MediaStreamTrack[] {
    return []
  }
  getVideoTracks(): MediaStreamTrack[] {
    return []
  }
}

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  connectionState = 'new'
  iceConnectionState = 'new'
  signalingState = 'stable'

  onconnectionstatechange: ((event: Event) => void) | null = null
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null
  ontrack: ((event: RTCTrackEvent) => void) | null = null
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null = null

  localDescription: RTCSessionDescription | null = null
  remoteDescription: RTCSessionDescription | null = null

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'offer', sdp: 'mock-offer-sdp' }
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'answer', sdp: 'mock-answer-sdp' }
  }

  async setLocalDescription(
    description: RTCSessionDescriptionInit
  ): Promise<void> {
    this.localDescription = description as RTCSessionDescription
  }

  async setRemoteDescription(
    description: RTCSessionDescriptionInit
  ): Promise<void> {
    this.remoteDescription = description as RTCSessionDescription
  }

  async addIceCandidate(): Promise<void> {}

  addTrack(): RTCRtpSender {
    return {} as RTCRtpSender
  }

  removeTrack(): void {}

  createDataChannel(): RTCDataChannel {
    return {
      label: 'test',
      readyState: 'open',
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null
    } as unknown as RTCDataChannel
  }

  close(): void {
    this.connectionState = 'closed'
  }
}

// Global mocks
global.WebSocket = MockWebSocket as typeof WebSocket
global.MediaStream = MockMediaStream as typeof MediaStream
global.RTCPeerConnection = MockRTCPeerConnection as typeof RTCPeerConnection

describe('GrabstreamClient', () => {
  let client: GrabstreamClient
  let mockWs: MockWebSocket

  beforeEach(() => {
    client = new GrabstreamClient()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const client = new GrabstreamClient()
      expect(client.localStreams).toEqual([])
    })

    it('should initialize with custom configuration', () => {
      const client = new GrabstreamClient({
        url: 'ws://custom.example.com',
        connectionTimeoutMs: 5000
      })
      expect(client.localStreams).toEqual([])
    })

    it('should use default values when options are partial', () => {
      const client = new GrabstreamClient({
        url: 'ws://custom.example.com'
      })
      expect(client.localStreams).toEqual([])
    })
  })

  describe('localStreams getter', () => {
    it('should return empty array when no peer', () => {
      expect(client.localStreams).toEqual([])
    })
  })

  describe('connect()', () => {
    it('should throw error if already connected', async () => {
      const client = new GrabstreamClient()

      // First connection
      const connectPromise = client.connect()
      mockWs = (client as { ws: MockWebSocket }).ws

      // Try to connect again
      await expect(client.connect()).rejects.toThrow(
        'GrabstreamClient is already connected'
      )

      // Cleanup
      mockWs.simulateClose()
      await expect(connectPromise).rejects.toThrow()
    })

    it('should establish WebSocket connection', async () => {
      const client = new GrabstreamClient()

      const connectPromise = client.connect()
      mockWs = (client as { ws: MockWebSocket }).ws

      expect(mockWs.url).toBe(DEFAULT_SERVER_URL)

      // Simulate successful connection
      mockWs.simulateMessage({
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          peerId: 'test-peer-id',
          displayName: 'Test Peer',
          iceServers: []
        }
      })

      await expect(connectPromise).resolves.toBeUndefined()
    })

    it('should handle connection timeout', async () => {
      const client = new GrabstreamClient({
        connectionTimeoutMs: 100
      })

      const connectPromise = client.connect()
      mockWs = (client as { ws: MockWebSocket }).ws

      // Don't simulate any response - let it timeout
      await expect(connectPromise).rejects.toThrow('Connection closed')
    })

    it('should handle invalid message format', async () => {
      const client = new GrabstreamClient()

      const connectPromise = client.connect()
      mockWs = (client as { ws: MockWebSocket }).ws

      // Simulate invalid message
      mockWs.simulateMessage({
        type: 'INVALID_MESSAGE'
      })

      await expect(connectPromise).rejects.toThrow('Connection closed')
    })

    it('should handle WebSocket error', async () => {
      const client = new GrabstreamClient()

      const connectPromise = client.connect()
      mockWs = (client as { ws: MockWebSocket }).ws

      // Simulate WebSocket error
      mockWs.simulateError()
      mockWs.simulateClose(1006, 'Connection error')

      await expect(connectPromise).rejects.toThrow('Connection closed')
    })
  })

  describe('disconnect()', () => {
    it('should throw error if not connected', async () => {
      await expect(client.disconnect()).rejects.toThrow(
        'GrabstreamClient is not connected'
      )
    })

    it('should disconnect successfully', async () => {
      // First connect
      const connectPromise = client.connect()
      mockWs = (client as { ws: MockWebSocket }).ws

      mockWs.simulateMessage({
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          peerId: 'test-peer-id',
          displayName: 'Test Peer',
          iceServers: []
        }
      })

      await connectPromise

      // Then disconnect
      const disconnectPromise = client.disconnect()
      mockWs.simulateClose(1000, 'Client disconnect requested')

      await expect(disconnectPromise).resolves.toBeUndefined()
    })
  })

  describe('joinRoom()', () => {
    beforeEach(async () => {
      const connectPromise = client.connect()
      mockWs = (client as { ws: MockWebSocket }).ws

      mockWs.simulateMessage({
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          peerId: 'test-peer-id',
          displayName: 'Test Peer',
          iceServers: []
        }
      })

      await connectPromise

      // Ensure WebSocket is in open state
      mockWs.readyState = MockWebSocket.OPEN
    })

    it('should throw error if WebSocket not connected', () => {
      const client = new GrabstreamClient()
      expect(() => client.joinRoom('test-room')).toThrow(
        WebSocketNotConnectedError
      )
    })

    it('should throw error if peer not initialized', () => {
      const client = new GrabstreamClient()
      ;(client as { ws: { readyState: number } }).ws = {
        readyState: WebSocket.OPEN
      }

      expect(() => client.joinRoom('test-room')).toThrow(
        PeerNotInitializedError
      )
    })

    it('should throw error if already in room', () => {
      ;(
        client as {
          peer: {
            joinRoom: (opts: { roomId: string; displayName: string }) => void
          }
        }
      ).peer.joinRoom({
        roomId: 'existing-room',
        displayName: 'Test'
      })

      expect(() => client.joinRoom('test-room')).toThrow(
        'Already in room existing-room'
      )
    })

    it('should validate room ID', () => {
      expect(() => client.joinRoom('')).toThrow(ValidationError)
      expect(() => client.joinRoom('a'.repeat(101))).toThrow(ValidationError)
    })

    it('should validate display name', () => {
      // Empty string becomes falsy after trim, so no validation error
      expect(() =>
        client.joinRoom('test-room', { displayName: '' })
      ).not.toThrow()
      expect(() =>
        client.joinRoom('test-room', { displayName: 'a'.repeat(101) })
      ).toThrow(ValidationError)
    })

    it('should validate password', () => {
      // Empty string is falsy, so validation is skipped
      expect(() => client.joinRoom('test-room', { password: '' })).not.toThrow()
      expect(() =>
        client.joinRoom('test-room', { password: 'a'.repeat(129) })
      ).toThrow(ValidationError)
    })

    it('should send join room message', () => {
      const sendSpy = vi.spyOn(mockWs, 'send')

      client.joinRoom('test-room', {
        displayName: 'Custom Name',
        password: 'secret'
      })

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'JOIN_ROOM',
          payload: {
            roomId: 'test-room',
            displayName: 'Custom Name',
            password: 'secret'
          }
        })
      )
    })

    it('should send join room message without optional parameters', () => {
      const sendSpy = vi.spyOn(mockWs, 'send')

      client.joinRoom('test-room')

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'JOIN_ROOM',
          payload: {
            roomId: 'test-room',
            displayName: undefined,
            password: undefined
          }
        })
      )
    })
  })

  describe('leaveRoom()', () => {
    beforeEach(async () => {
      const connectPromise = client.connect()
      mockWs = (client as { ws: MockWebSocket }).ws

      mockWs.simulateMessage({
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          peerId: 'test-peer-id',
          displayName: 'Test Peer',
          iceServers: []
        }
      })

      await connectPromise

      // Ensure WebSocket is in open state
      mockWs.readyState = MockWebSocket.OPEN
    })

    it('should throw error if WebSocket not connected', () => {
      const client = new GrabstreamClient()
      expect(() => client.leaveRoom()).toThrow(WebSocketNotConnectedError)
    })

    it('should throw error if peer not initialized', () => {
      const client = new GrabstreamClient()
      ;(client as { ws: { readyState: number } }).ws = {
        readyState: WebSocket.OPEN
      }

      expect(() => client.leaveRoom()).toThrow(PeerNotInitializedError)
    })

    it('should throw error if not in room', () => {
      expect(() => client.leaveRoom()).toThrow('Not in any room')
    })

    it('should send leave room message', () => {
      ;(
        client as {
          peer: {
            joinRoom: (opts: { roomId: string; displayName: string }) => void
          }
        }
      ).peer.joinRoom({
        roomId: 'test-room',
        displayName: 'Test'
      })

      const sendSpy = vi.spyOn(mockWs, 'send')

      client.leaveRoom()

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'LEAVE_ROOM'
        })
      )
    })
  })

  describe('updateDisplayName()', () => {
    beforeEach(async () => {
      const connectPromise = client.connect()
      mockWs = (client as { ws: MockWebSocket }).ws

      mockWs.simulateMessage({
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          peerId: 'test-peer-id',
          displayName: 'Test Peer',
          iceServers: []
        }
      })

      await connectPromise

      // Ensure WebSocket is in open state
      mockWs.readyState = MockWebSocket.OPEN
    })

    it('should throw error if WebSocket not connected', () => {
      const client = new GrabstreamClient()
      expect(() => client.updateDisplayName('New Name')).toThrow(
        WebSocketNotConnectedError
      )
    })

    it('should throw error if peer not initialized', () => {
      const client = new GrabstreamClient()
      ;(client as { ws: { readyState: number } }).ws = {
        readyState: WebSocket.OPEN
      }

      expect(() => client.updateDisplayName('New Name')).toThrow(
        PeerNotInitializedError
      )
    })

    it('should validate display name', () => {
      expect(() => client.updateDisplayName('')).toThrow(ValidationError)
      expect(() => client.updateDisplayName('a'.repeat(101))).toThrow(
        ValidationError
      )
    })

    it('should send update display name message', () => {
      const sendSpy = vi.spyOn(mockWs, 'send')

      client.updateDisplayName('New Name')

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'UPDATE_DISPLAY_NAME',
          payload: {
            displayName: 'New Name'
          }
        })
      )
    })

    it('should trim display name', () => {
      const sendSpy = vi.spyOn(mockWs, 'send')

      client.updateDisplayName('  New Name  ')

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'UPDATE_DISPLAY_NAME',
          payload: {
            displayName: 'New Name'
          }
        })
      )
    })
  })

  describe('sendCustomMessage()', () => {
    beforeEach(async () => {
      const connectPromise = client.connect()
      mockWs = (client as { ws: MockWebSocket }).ws

      mockWs.simulateMessage({
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          peerId: 'test-peer-id',
          displayName: 'Test Peer',
          iceServers: []
        }
      })

      await connectPromise

      // Ensure WebSocket is in open state
      mockWs.readyState = MockWebSocket.OPEN

      // Join room
      ;(
        client as {
          peer: {
            joinRoom: (opts: { roomId: string; displayName: string }) => void
          }
        }
      ).peer.joinRoom({
        roomId: 'test-room',
        displayName: 'Test'
      })
    })

    it('should throw error if WebSocket not connected', () => {
      const client = new GrabstreamClient()
      expect(() => client.sendCustomMessage('test', {})).toThrow(
        WebSocketNotConnectedError
      )
    })

    it('should throw error if peer not initialized', () => {
      const client = new GrabstreamClient()
      ;(client as { ws: { readyState: number } }).ws = {
        readyState: WebSocket.OPEN
      }

      expect(() => client.sendCustomMessage('test', {})).toThrow(
        PeerNotInitializedError
      )
    })

    it('should throw error if not in room', () => {
      ;(client as { peer: { leaveRoom: () => void } }).peer.leaveRoom()

      expect(() => client.sendCustomMessage('test', {})).toThrow(
        'Not in any room'
      )
    })

    it('should send custom message to room', () => {
      const sendSpy = vi.spyOn(mockWs, 'send')

      client.sendCustomMessage('test-type', { test: 'data' })

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'CUSTOM',
          payload: {
            customType: 'test-type',
            target: undefined,
            data: { test: 'data' }
          }
        })
      )
    })

    it('should send custom message to specific peer', () => {
      // Add mock peer
      const mockPeer = { id: 'target-peer' }
      ;(client as { peers: Map<string, unknown> }).peers.set(
        'target-peer',
        mockPeer
      )

      const sendSpy = vi.spyOn(mockWs, 'send')

      client.sendCustomMessage(
        'test-type',
        { test: 'data' },
        {
          type: 'peer',
          peerId: 'target-peer'
        }
      )

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'CUSTOM',
          payload: {
            customType: 'test-type',
            target: { type: 'peer', peerId: 'target-peer' },
            data: { test: 'data' }
          }
        })
      )
    })

    it('should throw error if target peer not found', () => {
      expect(() =>
        client.sendCustomMessage(
          'test-type',
          {},
          {
            type: 'peer',
            peerId: 'non-existent-peer'
          }
        )
      ).toThrow('Peer non-existent-peer not found')
    })

    it('should throw error if peerId not provided for peer target', () => {
      expect(() =>
        client.sendCustomMessage(
          'test-type',
          {},
          {
            type: 'peer'
          }
        )
      ).toThrow('peerId is required when targeting a specific peer')
    })
  })

  describe('sendDataToPeer()', () => {
    beforeEach(async () => {
      const connectPromise = client.connect()
      mockWs = (client as { ws: MockWebSocket }).ws

      mockWs.simulateMessage({
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          peerId: 'test-peer-id',
          displayName: 'Test Peer',
          iceServers: []
        }
      })

      await connectPromise

      // Ensure WebSocket is in open state
      mockWs.readyState = MockWebSocket.OPEN
    })

    it('should throw error if peer not found', () => {
      expect(() =>
        client.sendDataToPeer('non-existent-peer', 'test data')
      ).toThrow('Peer non-existent-peer not found')
    })

    it('should send data to peer', () => {
      const mockPeer = { sendData: vi.fn() }
      ;(client as { peers: Map<string, unknown> }).peers.set(
        'target-peer',
        mockPeer
      )

      client.sendDataToPeer('target-peer', 'test data')

      expect(mockPeer.sendData).toHaveBeenCalledWith('test data')
    })
  })

  describe('stream management', () => {
    beforeEach(async () => {
      const connectPromise = client.connect()
      mockWs = (client as { ws: MockWebSocket }).ws

      mockWs.simulateMessage({
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          peerId: 'test-peer-id',
          displayName: 'Test Peer',
          iceServers: []
        }
      })

      await connectPromise

      // Ensure WebSocket is in open state
      mockWs.readyState = MockWebSocket.OPEN
    })

    describe('addLocalStream()', () => {
      it('should throw error if peer not initialized', async () => {
        const client = new GrabstreamClient()
        const mockStream = new MockMediaStream()

        await expect(
          client.addLocalStream({
            type: 'AUDIO_VIDEO',
            stream: mockStream as MediaStream
          })
        ).rejects.toThrow(PeerNotInitializedError)
      })

      it('should add stream to local peer', async () => {
        const mockStream = new MockMediaStream()
        const addStreamSpy = vi.spyOn(
          (
            client as {
              peer: { addStream: (stream: unknown, type: string) => void }
            }
          ).peer,
          'addStream'
        )

        await client.addLocalStream({
          type: 'AUDIO_VIDEO',
          stream: mockStream as MediaStream
        })

        expect(addStreamSpy).toHaveBeenCalledWith(mockStream, 'AUDIO_VIDEO')
      })
    })

    describe('removeLocalStream()', () => {
      it('should throw error if peer not initialized', async () => {
        const client = new GrabstreamClient()

        await expect(client.removeLocalStream('stream-id')).rejects.toThrow(
          PeerNotInitializedError
        )
      })

      it('should remove stream from local peer', async () => {
        const removeStreamSpy = vi.spyOn(
          (client as { peer: { removeStream: (id: string) => void } }).peer,
          'removeStream'
        )

        await client.removeLocalStream('stream-id')

        expect(removeStreamSpy).toHaveBeenCalledWith('stream-id')
      })
    })

    describe('audio/video controls', () => {
      it('should mute local audio', () => {
        const muteAudioSpy = vi.spyOn(
          (client as { peer: { muteAudio: () => void } }).peer,
          'muteAudio'
        )

        client.muteLocalAudio()

        expect(muteAudioSpy).toHaveBeenCalled()
      })

      it('should unmute local audio', () => {
        const unmuteAudioSpy = vi.spyOn(
          (client as { peer: { unmuteAudio: () => void } }).peer,
          'unmuteAudio'
        )

        client.unmuteLocalAudio()

        expect(unmuteAudioSpy).toHaveBeenCalled()
      })

      it('should disable local video', () => {
        const disableVideoSpy = vi.spyOn(
          (client as { peer: { disableVideo: () => void } }).peer,
          'disableVideo'
        )

        client.disableLocalVideo()

        expect(disableVideoSpy).toHaveBeenCalled()
      })

      it('should enable local video', () => {
        const enableVideoSpy = vi.spyOn(
          (client as { peer: { enableVideo: () => void } }).peer,
          'enableVideo'
        )

        client.enableLocalVideo()

        expect(enableVideoSpy).toHaveBeenCalled()
      })

      it('should throw error if peer not initialized', () => {
        const client = new GrabstreamClient()

        expect(() => client.muteLocalAudio()).toThrow(PeerNotInitializedError)
        expect(() => client.unmuteLocalAudio()).toThrow(PeerNotInitializedError)
        expect(() => client.disableLocalVideo()).toThrow(
          PeerNotInitializedError
        )
        expect(() => client.enableLocalVideo()).toThrow(PeerNotInitializedError)
      })
    })
  })
})
