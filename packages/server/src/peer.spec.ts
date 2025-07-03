import type { WebSocket } from 'ws'
import { Peer } from './peer'

// Mock WebSocket
class MockWebSocket {
  public readyState = 1 // OPEN
  public OPEN = 1
  private listeners = new Map<string, Array<(...args: unknown[]) => void>>()

  send = jest.fn()
  ping = jest.fn()
  terminate = jest.fn()

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)?.push(callback)
  }

  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      for (const callback of callbacks) {
        callback(...args)
      }
    }
  }
}

describe('Peer', () => {
  let mockSocket: MockWebSocket
  let peer: Peer

  beforeEach(() => {
    mockSocket = new MockWebSocket()
    peer = new Peer({ socket: mockSocket as unknown as WebSocket })
  })

  describe('constructor', () => {
    it('should generate unique ID', () => {
      const peer1 = new Peer({ socket: mockSocket as unknown as WebSocket })
      const peer2 = new Peer({ socket: mockSocket as unknown as WebSocket })

      expect(peer1.id).toBeDefined()
      expect(peer2.id).toBeDefined()
      expect(peer1.id).not.toBe(peer2.id)
    })

    it('should set default display name when not provided', () => {
      expect(peer.displayName).toMatch(/^Peer-[a-f0-9]{8}$/)
    })

    it('should use provided display name', () => {
      const customPeer = new Peer({
        socket: mockSocket as unknown as WebSocket,
        displayName: 'TestUser'
      })

      expect(customPeer.displayName).toBe('TestUser')
    })

    it('should trim provided display name', () => {
      const customPeer = new Peer({
        socket: mockSocket as unknown as WebSocket,
        displayName: '  TestUser  '
      })

      expect(customPeer.displayName).toBe('TestUser')
    })

    it('should throw error for empty display name', () => {
      expect(() => {
        new Peer({
          socket: mockSocket as unknown as WebSocket,
          displayName: '   '
        })
      }).toThrow('Display name cannot be empty')
    })

    it('should throw error for too long display name', () => {
      const longName = 'a'.repeat(51)

      expect(() => {
        new Peer({
          socket: mockSocket as unknown as WebSocket,
          displayName: longName
        })
      }).toThrow('Display name cannot exceed 50 characters')
    })
  })

  describe('properties', () => {
    it('should have correct initial state', () => {
      expect(peer.roomId).toBeUndefined()
      expect(peer.isConnected).toBe(true)
      expect(peer.isAlive).toBe(true)
      expect(peer.lastPongReceivedAt).toBeInstanceOf(Date)
    })

    it('should return false for isConnected when socket is closed', () => {
      mockSocket.readyState = 3 // CLOSED
      expect(peer.isConnected).toBe(false)
    })
  })

  describe('updateDisplayName', () => {
    it('should update display name successfully', () => {
      peer.updateDisplayName('NewName')
      expect(peer.displayName).toBe('NewName')
    })

    it('should trim display name', () => {
      peer.updateDisplayName('  NewName  ')
      expect(peer.displayName).toBe('NewName')
    })

    it('should throw error for empty display name', () => {
      expect(() => {
        peer.updateDisplayName('')
      }).toThrow('Display name cannot be empty')
    })

    it('should throw error for too long display name', () => {
      const longName = 'a'.repeat(51)

      expect(() => {
        peer.updateDisplayName(longName)
      }).toThrow('Display name cannot exceed 50 characters')
    })
  })

  describe('room management', () => {
    it('should join room successfully', () => {
      peer.joinRoom('test-room')

      expect(peer.roomId).toBe('test-room')
      expect(peer.isInRoom()).toBe(true)
    })

    it('should throw error when joining room while already in room', () => {
      peer.joinRoom('room1')

      expect(() => {
        peer.joinRoom('room2')
      }).toThrow('Peer')
    })

    it('should leave room successfully', () => {
      peer.joinRoom('test-room')
      const leftRoomId = peer.leaveRoom()

      expect(leftRoomId).toBe('test-room')
      expect(peer.roomId).toBeUndefined()
      expect(peer.isInRoom()).toBe(false)
    })

    it('should throw error when leaving room while not in room', () => {
      expect(() => {
        peer.leaveRoom()
      }).toThrow('Peer')
    })
  })

  describe('message sending', () => {
    it('should send message successfully', () => {
      const message = {
        type: 'CONNECTION_ESTABLISHED' as const,
        payload: { 
          peerId: 'test',
          iceServers: []
        }
      }

      const result = peer.send(message)

      expect(result).toBe(true)
      expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify(message))
    })

    it('should return false when socket is disconnected', () => {
      mockSocket.readyState = 3 // CLOSED

      const message = {
        type: 'CONNECTION_ESTABLISHED' as const,
        payload: { 
          peerId: 'test',
          iceServers: []
        }
      }

      const result = peer.send(message)

      expect(result).toBe(false)
      expect(mockSocket.send).not.toHaveBeenCalled()
    })

    it('should return false when send throws error', () => {
      mockSocket.send.mockImplementation(() => {
        throw new Error('Send failed')
      })

      const message = {
        type: 'CONNECTION_ESTABLISHED' as const,
        payload: { 
          peerId: 'test',
          iceServers: []
        }
      }

      const result = peer.send(message)

      expect(result).toBe(false)
    })

    it('should send error message with string', () => {
      const result = peer.sendError('Test error')

      expect(result).toBe(true)
      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'ERROR',
          payload: { message: 'Test error' }
        })
      )
    })

    it('should send error message with Error object', () => {
      const error = new Error('Test error')
      const result = peer.sendError(error)

      expect(result).toBe(true)
      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'ERROR',
          payload: { message: 'Test error' }
        })
      )
    })
  })

  describe('ping/pong functionality', () => {
    it('should send ping and set isAlive to false', () => {
      peer.ping()

      expect(peer.isAlive).toBe(false)
      expect(mockSocket.ping).toHaveBeenCalled()
    })

    it('should update pong received', async () => {
      peer.ping()
      const beforePong = peer.lastPongReceivedAt

      // Add small delay to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10))
      peer.updatePongReceived()

      expect(peer.isAlive).toBe(true)
      expect(peer.lastPongReceivedAt.getTime()).toBeGreaterThan(
        beforePong.getTime()
      )
    })

    it('should terminate connection', () => {
      peer.terminate()

      expect(mockSocket.terminate).toHaveBeenCalled()
    })
  })

  describe('toJSON', () => {
    it('should return correct JSON representation', () => {
      peer.joinRoom('test-room')
      const json = peer.toJSON()

      expect(json).toEqual({
        id: peer.id,
        displayName: peer.displayName,
        roomId: 'test-room',
        joinedAt: expect.any(Date),
        lastPongReceivedAt: expect.any(Date)
      })
    })

    it('should return JSON with undefined roomId when not in room', () => {
      const json = peer.toJSON()

      expect(json.roomId).toBeUndefined()
    })
  })
})
