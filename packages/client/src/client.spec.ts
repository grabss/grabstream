import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GrabstreamClient } from './client'
import {
  PeerNotInitializedError,
  ValidationError,
  WebSocketNotConnectedError
} from './errors'
import { MockMediaStream, MockWebSocket } from './test-utils/mocks'

describe('GrabstreamClient', () => {
  let client: GrabstreamClient
  let mockWebSocket: MockWebSocket

  // Helper function for connecting client
  async function connectClient(): Promise<void> {
    const connectPromise = client.connect()

    // Wait for next tick to ensure onmessage handler is set
    await new Promise((resolve) => setTimeout(resolve, 0))
    const establishedMessage = {
      type: 'CONNECTION_ESTABLISHED',
      payload: {
        peerId: 'test-peer-id',
        displayName: 'Test User',
        iceServers: []
      }
    }
    const messageData = JSON.stringify(establishedMessage)
    if (!messageData || messageData === 'undefined') {
      throw new Error('Invalid message data')
    }
    mockWebSocket.simulateMessage(messageData)

    await connectPromise
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup WebSocket mock
    mockWebSocket = new MockWebSocket('ws://localhost:8080')
    global.WebSocket = vi.fn().mockImplementation(() => {
      return mockWebSocket
    })

    client = new GrabstreamClient()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create client with default options', () => {
      const client = new GrabstreamClient()

      expect(client).toBeDefined()
      expect(client.localStreams).toEqual([])
    })

    it('should create client with custom options', () => {
      const client = new GrabstreamClient({
        url: 'ws://custom.server.com',
        connectionTimeoutMs: 5000
      })

      expect(client).toBeDefined()
    })
  })

  describe('connect', () => {
    it('should connect successfully', async () => {
      await expect(connectClient()).resolves.not.toThrow()
    })

    it('should throw error if already connected', async () => {
      // Set up a WebSocket that is not closed
      // biome-ignore lint/suspicious/noExplicitAny: Testing private property
      ;(client as any).ws = { readyState: WebSocket.CONNECTING } as WebSocket

      await expect(client.connect()).rejects.toThrow(
        'GrabstreamClient is already connected'
      )
    })
  })

  describe('disconnect', () => {
    it('should throw error if not connected', async () => {
      await expect(client.disconnect()).rejects.toThrow(
        'GrabstreamClient is not connected'
      )
    })
  })

  describe('validation errors', () => {
    it('should throw WebSocketNotConnectedError if not connected', () => {
      expect(() => {
        client.joinRoom('test-room')
      }).toThrow(WebSocketNotConnectedError)
    })

    it('should throw PeerNotInitializedError if peer not initialized', async () => {
      await connectClient()

      // biome-ignore lint/suspicious/noExplicitAny: Testing private property
      ;(client as any).peer = undefined

      expect(() => {
        client.joinRoom('test-room')
      }).toThrow(PeerNotInitializedError)
    })

    it('should throw ValidationError for invalid room ID', async () => {
      await connectClient()

      expect(() => {
        client.joinRoom('')
      }).toThrow(ValidationError)
    })
  })

  describe('stream management', () => {
    let mockStream: MockMediaStream

    beforeEach(async () => {
      mockStream = new MockMediaStream('test-stream')
      await connectClient()
    })

    it('should add local stream', async () => {
      await expect(
        client.addLocalStream({
          type: 'AUDIO_VIDEO',
          stream: mockStream as unknown as MediaStream
        })
      ).resolves.not.toThrow()

      expect(client.localStreams).toHaveLength(1)
    })

    it('should remove local stream', async () => {
      await client.addLocalStream({
        type: 'AUDIO_VIDEO',
        stream: mockStream as unknown as MediaStream
      })

      await expect(
        client.removeLocalStream(mockStream.id)
      ).resolves.not.toThrow()

      expect(client.localStreams).toHaveLength(0)
    })

    it('should throw PeerNotInitializedError when adding stream without peer', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing private property
      ;(client as any).peer = undefined

      await expect(
        client.addLocalStream({
          type: 'AUDIO_VIDEO',
          stream: mockStream as unknown as MediaStream
        })
      ).rejects.toThrow(PeerNotInitializedError)
    })
  })

  describe('audio/video control', () => {
    beforeEach(async () => {
      await connectClient()
    })

    it('should mute local audio', () => {
      expect(() => {
        client.muteLocalAudio()
      }).not.toThrow()
    })

    it('should throw PeerNotInitializedError for audio control without peer', () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing private property
      ;(client as any).peer = undefined

      expect(() => {
        client.muteLocalAudio()
      }).toThrow(PeerNotInitializedError)
    })
  })

  describe('event handling', () => {
    it('should emit client:connected event', async () => {
      const connectCallback = vi.fn()
      client.on('client:connected', connectCallback)

      await connectClient()

      expect(connectCallback).toHaveBeenCalledWith({ peerId: 'test-peer-id' })
    })

    it('should emit server:error event', async () => {
      const errorCallback = vi.fn()
      client.on('server:error', errorCallback)

      await connectClient()

      // Send error message
      const errorMessage = {
        type: 'ERROR',
        payload: {
          message: 'Test error message'
        }
      }
      mockWebSocket.simulateMessage(JSON.stringify(errorMessage))

      expect(errorCallback).toHaveBeenCalledWith({
        message: 'Test error message'
      })
    })
  })

  describe('cleanup', () => {
    it('should cleanup properly on disconnect', async () => {
      await connectClient()

      // Simulate disconnect
      mockWebSocket.simulateClose(1000, 'Normal closure')

      // biome-ignore lint/suspicious/noExplicitAny: Testing private properties
      expect((client as any).ws).toBeUndefined()
      // biome-ignore lint/suspicious/noExplicitAny: Testing private properties
      expect((client as any).peer).toBeUndefined()
      // biome-ignore lint/suspicious/noExplicitAny: Testing private properties
      expect((client as any).peers.size).toBe(0)
    })
  })
})
