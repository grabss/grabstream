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

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup WebSocket mock
    mockWebSocket = new MockWebSocket('ws://localhost:8080')
    global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket)

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
      const connectPromise = client.connect()

      // Simulate connection established message
      const establishedMessage = {
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          peerId: 'test-peer-id',
          displayName: 'Test User',
          iceServers: [{ urls: 'stun:stun.example.com' }]
        }
      }

      setTimeout(() => {
        mockWebSocket.simulateMessage(JSON.stringify(establishedMessage))
      }, 10)

      await expect(connectPromise).resolves.not.toThrow()
    })

    it('should throw error if already connected', async () => {
      // Mock WebSocket as already connected
      client['ws'] = { readyState: WebSocket.OPEN } as WebSocket

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
      // Connect first
      const connectPromise = client.connect()

      setTimeout(() => {
        const establishedMessage = {
          type: 'CONNECTION_ESTABLISHED',
          payload: {
            peerId: 'test-peer-id',
            displayName: 'Test User',
            iceServers: []
          }
        }
        mockWebSocket.simulateMessage(JSON.stringify(establishedMessage))
      }, 10)

      await connectPromise

      // Clear peer
      client['peer'] = undefined

      expect(() => {
        client.joinRoom('test-room')
      }).toThrow(PeerNotInitializedError)
    })

    it('should throw ValidationError for invalid room ID', async () => {
      // Connect first
      const connectPromise = client.connect()

      setTimeout(() => {
        const establishedMessage = {
          type: 'CONNECTION_ESTABLISHED',
          payload: {
            peerId: 'test-peer-id',
            displayName: 'Test User',
            iceServers: []
          }
        }
        mockWebSocket.simulateMessage(JSON.stringify(establishedMessage))
      }, 10)

      await connectPromise

      expect(() => {
        client.joinRoom('')
      }).toThrow(ValidationError)
    })
  })

  describe('stream management', () => {
    let mockStream: MockMediaStream

    beforeEach(async () => {
      mockStream = new MockMediaStream('test-stream')

      // Setup connected client
      const connectPromise = client.connect()

      setTimeout(() => {
        const establishedMessage = {
          type: 'CONNECTION_ESTABLISHED',
          payload: {
            peerId: 'test-peer-id',
            displayName: 'Test User',
            iceServers: []
          }
        }
        mockWebSocket.simulateMessage(JSON.stringify(establishedMessage))
      }, 10)

      await connectPromise
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
      client['peer'] = undefined

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
      // Setup connected client
      const connectPromise = client.connect()

      setTimeout(() => {
        const establishedMessage = {
          type: 'CONNECTION_ESTABLISHED',
          payload: {
            peerId: 'test-peer-id',
            displayName: 'Test User',
            iceServers: []
          }
        }
        mockWebSocket.simulateMessage(JSON.stringify(establishedMessage))
      }, 10)

      await connectPromise
    })

    it('should mute local audio', () => {
      expect(() => {
        client.muteLocalAudio()
      }).not.toThrow()
    })

    it('should throw PeerNotInitializedError for audio control without peer', () => {
      client['peer'] = undefined

      expect(() => {
        client.muteLocalAudio()
      }).toThrow(PeerNotInitializedError)
    })
  })

  describe('event handling', () => {
    it('should emit client:connected event', async () => {
      const connectCallback = vi.fn()
      client.on('client:connected', connectCallback)

      const connectPromise = client.connect()

      setTimeout(() => {
        const establishedMessage = {
          type: 'CONNECTION_ESTABLISHED',
          payload: {
            peerId: 'test-peer-id',
            displayName: 'Test User',
            iceServers: []
          }
        }
        mockWebSocket.simulateMessage(JSON.stringify(establishedMessage))
      }, 10)

      await connectPromise

      expect(connectCallback).toHaveBeenCalledWith({ peerId: 'test-peer-id' })
    })

    it('should emit server:error event', async () => {
      const errorCallback = vi.fn()
      client.on('server:error', errorCallback)

      const connectPromise = client.connect()

      setTimeout(() => {
        const establishedMessage = {
          type: 'CONNECTION_ESTABLISHED',
          payload: {
            peerId: 'test-peer-id',
            displayName: 'Test User',
            iceServers: []
          }
        }
        mockWebSocket.simulateMessage(JSON.stringify(establishedMessage))

        // Then send error message
        setTimeout(() => {
          const errorMessage = {
            type: 'ERROR',
            payload: {
              message: 'Test error message'
            }
          }
          mockWebSocket.simulateMessage(JSON.stringify(errorMessage))
        }, 10)
      }, 10)

      await connectPromise

      // Wait for error message
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(errorCallback).toHaveBeenCalledWith({
        message: 'Test error message'
      })
    })
  })

  describe('cleanup', () => {
    it('should cleanup properly on disconnect', async () => {
      const connectPromise = client.connect()

      setTimeout(() => {
        const establishedMessage = {
          type: 'CONNECTION_ESTABLISHED',
          payload: {
            peerId: 'test-peer-id',
            displayName: 'Test User',
            iceServers: []
          }
        }
        mockWebSocket.simulateMessage(JSON.stringify(establishedMessage))
      }, 10)

      await connectPromise

      // Simulate disconnect
      mockWebSocket.simulateClose(1000, 'Normal closure')

      expect(client['ws']).toBeUndefined()
      expect(client['peer']).toBeUndefined()
      expect(client['peers'].size).toBe(0)
    })
  })
})
