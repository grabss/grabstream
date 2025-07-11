import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RemotePeer } from './remote'

// Simple mock for RTCPeerConnection - only testing basic properties
class MockRTCPeerConnection {
  connectionState: RTCPeerConnectionState = 'new'
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null = null
  onconnectionstatechange: ((event: Event) => void) | null = null
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null
  ontrack: ((event: RTCTrackEvent) => void) | null = null
  oniceconnectionstatechange: ((event: Event) => void) | null = null

  addTrack = vi.fn()
  createOffer = vi.fn()
  createAnswer = vi.fn()
  setLocalDescription = vi.fn()
  setRemoteDescription = vi.fn()
  addIceCandidate = vi.fn()
  createDataChannel = vi.fn()
  close = vi.fn()
  restartIce = vi.fn()
}

// Mock for RTCDataChannel
class MockRTCDataChannel {
  readyState: RTCDataChannelState = 'closed'
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  send = vi.fn()
  close = vi.fn()
}

describe('RemotePeer', () => {
  let peer: RemotePeer
  let mockCallbacks: {
    onConnectionStateChanged: ReturnType<typeof vi.fn>
    onStreamReceived: ReturnType<typeof vi.fn>
    onIceCandidate: ReturnType<typeof vi.fn>
    onDataChannelMessage: ReturnType<typeof vi.fn>
    onRenegotiationNeeded: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Setup global mocks
    // biome-ignore lint/suspicious/noExplicitAny: Required for global mock setup
    global.RTCPeerConnection = MockRTCPeerConnection as any
    // biome-ignore lint/suspicious/noExplicitAny: Required for global mock setup
    global.RTCDataChannel = MockRTCDataChannel as any

    mockCallbacks = {
      onConnectionStateChanged: vi.fn(),
      onStreamReceived: vi.fn(),
      onIceCandidate: vi.fn(),
      onDataChannelMessage: vi.fn(),
      onRenegotiationNeeded: vi.fn()
    }

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

    it('should return empty streams array initially', () => {
      expect(peer.streams).toEqual([])
    })
  })

  describe('updateDisplayName', () => {
    it('should update display name', () => {
      peer.updateDisplayName('New Name')
      expect(peer.displayName).toBe('New Name')
    })
  })

  describe('sendData', () => {
    it('should throw error when data channel is not open', () => {
      expect(() => {
        peer.sendData('test data')
      }).toThrow('DataChannel is not open for peer test-peer')
    })
  })

  describe('close', () => {
    it('should close peer connection', () => {
      const mockConnection = peer.connection as MockRTCPeerConnection

      peer.close()

      expect(mockConnection.close).toHaveBeenCalled()
    })
  })

  describe('createDataChannel', () => {
    it('should create data channel', () => {
      const mockConnection = peer.connection as MockRTCPeerConnection
      const mockDataChannel = new MockRTCDataChannel()
      mockConnection.createDataChannel.mockReturnValue(mockDataChannel)

      peer.createDataChannel()

      expect(mockConnection.createDataChannel).toHaveBeenCalledWith('data', {
        ordered: true
      })
    })

    it('should not create duplicate data channel', () => {
      const mockConnection = peer.connection as MockRTCPeerConnection
      const mockDataChannel = new MockRTCDataChannel()
      mockConnection.createDataChannel.mockReturnValue(mockDataChannel)

      peer.createDataChannel()
      peer.createDataChannel()

      expect(mockConnection.createDataChannel).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling', () => {
    it('should handle sendData errors gracefully', () => {
      // Without creating data channel, sendData should throw
      expect(() => {
        peer.sendData('test data')
      }).toThrow('DataChannel is not open for peer test-peer')
    })

    it('should propagate close errors', () => {
      const mockConnection = peer.connection as MockRTCPeerConnection
      mockConnection.close.mockImplementation(() => {
        throw new Error('Connection already closed')
      })

      // Should throw error since the close method doesn't handle errors
      expect(() => {
        peer.close()
      }).toThrow('Connection already closed')
    })
  })
})
