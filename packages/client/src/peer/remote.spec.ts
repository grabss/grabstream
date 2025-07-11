import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MockMediaStream,
  MockMediaStreamTrack,
  MockRTCDataChannel,
  MockRTCPeerConnection
} from '../test-utils/mocks'
import { RemotePeer } from './remote'

describe('RemotePeer', () => {
  let peer: RemotePeer
  let mockConnection: MockRTCPeerConnection
  let mockDataChannel: MockRTCDataChannel
  let mockStream: MockMediaStream
  let mockTrack: MockMediaStreamTrack

  const mockCallbacks = {
    onConnectionStateChanged: vi.fn(),
    onStreamReceived: vi.fn(),
    onIceCandidate: vi.fn(),
    onDataChannelMessage: vi.fn(),
    onRenegotiationNeeded: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockConnection = new MockRTCPeerConnection()
    mockDataChannel = new MockRTCDataChannel()
    mockStream = new MockMediaStream('test-stream')
    mockTrack = mockStream.addMockTrack('audio')

    peer = new RemotePeer({
      id: 'test-peer',
      displayName: 'Test User',
      iceServers: [{ urls: 'stun:stun.example.com' }],
      ...mockCallbacks
    })
  })

  describe('constructor', () => {
    it('should create peer with correct properties', () => {
      expect(peer.id).toBe('test-peer')
      expect(peer.displayName).toBe('Test User')
      expect(peer.connectionState).toBe('new')
      expect(peer.streams).toEqual([])
    })

    it('should setup RTCPeerConnection', () => {
      expect(peer.connection).toBeDefined()
      expect(peer.connection).toBeInstanceOf(MockRTCPeerConnection)
    })
  })

  describe('getters', () => {
    it('should return correct id', () => {
      expect(peer.id).toBe('test-peer')
    })

    it('should return correct display name', () => {
      expect(peer.displayName).toBe('Test User')
    })

    it('should return connection state', () => {
      expect(peer.connectionState).toBe('new')
    })

    it('should return undefined data channel state initially', () => {
      expect(peer.dataChannelState).toBeUndefined()
    })
  })

  describe('updateDisplayName', () => {
    it('should update display name', () => {
      peer.updateDisplayName('New Name')
      expect(peer.displayName).toBe('New Name')
    })
  })

  describe('createDataChannel', () => {
    it('should create data channel', () => {
      peer.createDataChannel()

      expect(mockConnection.createDataChannel).toHaveBeenCalledWith('data', {
        ordered: true
      })
    })

    it('should not create duplicate data channel', () => {
      peer.createDataChannel()
      peer.createDataChannel()

      expect(mockConnection.createDataChannel).toHaveBeenCalledTimes(1)
    })
  })

  describe('sendData', () => {
    beforeEach(() => {
      peer.createDataChannel()
      mockConnection.createDataChannel.mockReturnValue(mockDataChannel)
    })

    it('should throw error when data channel is not open', () => {
      mockDataChannel.readyState = 'closed'

      expect(() => {
        peer.sendData('test data')
      }).toThrow('DataChannel is not open for peer test-peer')
    })

    it('should send data when channel is open', () => {
      mockDataChannel.readyState = 'open'
      peer.sendData('test data')

      expect(mockDataChannel.send).toHaveBeenCalledWith('test data')
    })
  })

  describe('WebRTC signaling', () => {
    it('should create offer', async () => {
      const offer = await peer.createOffer()

      expect(mockConnection.createOffer).toHaveBeenCalled()
      expect(mockConnection.setLocalDescription).toHaveBeenCalled()
      expect(offer).toBeDefined()
    })

    it('should create answer', async () => {
      const mockOffer = { type: 'offer' as const, sdp: 'test-offer' }

      const answer = await peer.createAnswer(mockOffer)

      expect(mockConnection.setRemoteDescription).toHaveBeenCalledWith(
        mockOffer
      )
      expect(mockConnection.createAnswer).toHaveBeenCalled()
      expect(mockConnection.setLocalDescription).toHaveBeenCalled()
      expect(answer).toBeDefined()
    })

    it('should receive answer', async () => {
      const mockAnswer = { type: 'answer' as const, sdp: 'test-answer' }

      await peer.receiveAnswer(mockAnswer)

      expect(mockConnection.setRemoteDescription).toHaveBeenCalledWith(
        mockAnswer
      )
    })

    it('should add ICE candidate', async () => {
      const mockCandidate = { candidate: 'test-candidate' }

      await peer.addIceCandidate(mockCandidate)

      expect(mockConnection.addIceCandidate).toHaveBeenCalledWith(mockCandidate)
    })
  })

  describe('stream management', () => {
    beforeEach(() => {
      peer.createDataChannel()
      mockConnection.createDataChannel.mockReturnValue(mockDataChannel)
      mockDataChannel.readyState = 'open'
    })

    it('should send stream', async () => {
      await peer.sendStream({
        type: 'AUDIO_VIDEO',
        stream: mockStream as unknown as MediaStream
      })

      expect(mockConnection.addTrack).toHaveBeenCalledWith(
        mockTrack,
        mockStream
      )
      expect(mockDataChannel.send).toHaveBeenCalledWith(
        expect.stringContaining('STREAM_METADATA')
      )
    })

    it('should send stream removed', async () => {
      await peer.sendStreamRemoved('test-stream-id')

      expect(mockDataChannel.send).toHaveBeenCalledWith(
        expect.stringContaining('STREAM_REMOVED')
      )
    })

    it('should trigger renegotiation when connection is stable', async () => {
      mockConnection.signalingState = 'stable'

      await peer.sendStream({
        type: 'AUDIO_VIDEO',
        stream: mockStream as unknown as MediaStream
      })

      expect(mockConnection.createOffer).toHaveBeenCalled()
      expect(mockCallbacks.onRenegotiationNeeded).toHaveBeenCalled()
    })
  })

  describe('connection state changes', () => {
    it('should handle connection state change', () => {
      const connection = peer.connection as MockRTCPeerConnection
      connection.simulateConnectionStateChange('connected')

      expect(mockCallbacks.onConnectionStateChanged).toHaveBeenCalledWith(
        'connected'
      )
    })

    it('should handle ICE connection failure', () => {
      const connection = peer.connection as MockRTCPeerConnection
      connection.simulateIceConnectionStateChange('failed')

      expect(mockConnection.restartIce).toHaveBeenCalled()
    })

    it('should handle ICE candidate generation', () => {
      const connection = peer.connection as MockRTCPeerConnection
      const mockCandidate = { candidate: 'test-candidate' } as RTCIceCandidate

      connection.simulateIceCandidate(mockCandidate)

      expect(mockCallbacks.onIceCandidate).toHaveBeenCalledWith(mockCandidate)
    })
  })

  describe('track handling', () => {
    it('should handle received tracks', () => {
      const connection = peer.connection as MockRTCPeerConnection
      const mockTrack = new MockMediaStreamTrack('audio')
      const mockStream = new MockMediaStream('received-stream')

      connection.simulateTrack(mockTrack as unknown as MediaStreamTrack, [
        mockStream as unknown as MediaStream
      ])

      expect(peer.streams).toHaveLength(1)
      expect(peer.streams[0]).toBe(mockStream)
    })
  })

  describe('data channel handling', () => {
    it('should handle data channel messages', () => {
      const connection = peer.connection as MockRTCPeerConnection
      const dataChannel = new MockRTCDataChannel()

      connection.simulateDataChannel(dataChannel)
      dataChannel.simulateMessage('test message')

      expect(mockCallbacks.onDataChannelMessage).toHaveBeenCalledWith(
        'test message'
      )
    })

    it('should handle stream metadata messages', () => {
      const connection = peer.connection as MockRTCPeerConnection
      const dataChannel = new MockRTCDataChannel()
      const mockStream = new MockMediaStream('metadata-stream')

      // Add stream to peer's streams
      peer.streams.push(mockStream as unknown as MediaStream)

      connection.simulateDataChannel(dataChannel)

      const metadata = {
        type: 'STREAM_METADATA',
        data: {
          streamId: 'metadata-stream',
          type: 'AUDIO_VIDEO',
          timestamp: Date.now()
        }
      }

      dataChannel.simulateMessage(JSON.stringify(metadata))

      expect(mockCallbacks.onStreamReceived).toHaveBeenCalledWith(
        'AUDIO_VIDEO',
        mockStream
      )
    })

    it('should handle stream removed messages', () => {
      const connection = peer.connection as MockRTCPeerConnection
      const dataChannel = new MockRTCDataChannel()

      connection.simulateDataChannel(dataChannel)

      const removeMessage = {
        type: 'STREAM_REMOVED',
        data: { streamId: 'removed-stream' }
      }

      dataChannel.simulateMessage(JSON.stringify(removeMessage))

      expect(
        peer.streams.find((s) => s.id === 'removed-stream')
      ).toBeUndefined()
    })
  })

  describe('close', () => {
    it('should close peer connection', () => {
      peer.close()

      expect(mockConnection.close).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle data channel send errors gracefully', () => {
      expect(() => {
        peer.sendData('test data')
      }).toThrow()
    })

    it('should handle stream metadata send errors gracefully', async () => {
      await expect(
        peer.sendStream({
          type: 'AUDIO_VIDEO',
          stream: mockStream as unknown as MediaStream
        })
      ).resolves.not.toThrow()
    })

    it('should handle stream removed send errors gracefully', async () => {
      await expect(peer.sendStreamRemoved('test-stream')).resolves.not.toThrow()
    })
  })
})
