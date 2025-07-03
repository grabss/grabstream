import type { WebSocket } from 'ws'
import { Peer } from './peer'
import { Room } from './room'

// Mock WebSocket
class MockWebSocket {
  public readyState = 1 // OPEN
  public OPEN = 1
  private listeners = new Map<string, Function[]>()

  send = jest.fn()
  ping = jest.fn()
  terminate = jest.fn()

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      for (const callback of callbacks) {
        callback(...args)
      }
    }
  }
}

describe('Room', () => {
  let mockSocket: MockWebSocket
  let peer1: Peer
  let peer2: Peer

  beforeEach(() => {
    mockSocket = new MockWebSocket()
    peer1 = new Peer({
      socket: mockSocket as unknown as WebSocket,
      displayName: 'Peer1'
    })
    peer2 = new Peer({
      socket: mockSocket as unknown as WebSocket,
      displayName: 'Peer2'
    })
  })

  describe('constructor', () => {
    it('should create room with valid ID', () => {
      const room = new Room('test-room')

      expect(room.id).toBe('test-room')
      expect(room.isEmpty).toBe(true)
      expect(room.hasPassword).toBe(false)
      expect(room.peers).toEqual([])
    })

    it('should create room with password', () => {
      const room = new Room('test-room', 'password123')

      expect(room.id).toBe('test-room')
      expect(room.hasPassword).toBe(true)
    })

    it('should throw error for empty room ID', () => {
      expect(() => {
        new Room('')
      }).toThrow('Room ID cannot be empty')
    })

    it('should throw error for too long room ID', () => {
      const longId = 'a'.repeat(65)

      expect(() => {
        new Room(longId)
      }).toThrow('Room ID cannot exceed 64 characters')
    })

    it('should throw error for invalid room ID pattern', () => {
      expect(() => {
        new Room('invalid room id!')
      }).toThrow('Room ID must match pattern')
    })

    it('should accept valid room ID patterns', () => {
      expect(() => new Room('valid-room')).not.toThrow()
      expect(() => new Room('valid_room')).not.toThrow()
      expect(() => new Room('validRoom123')).not.toThrow()
      expect(() => new Room('123-456')).not.toThrow()
    })

    it('should throw error for empty password', () => {
      expect(() => {
        new Room('test-room', '')
      }).toThrow('Password cannot be empty')
    })

    it('should throw error for too short password', () => {
      expect(() => {
        new Room('test-room', '123')
      }).toThrow('Password must be at least 4 characters')
    })

    it('should throw error for too long password', () => {
      const longPassword = 'a'.repeat(129)

      expect(() => {
        new Room('test-room', longPassword)
      }).toThrow('Password cannot exceed 128 characters')
    })

    it('should accept valid password', () => {
      expect(() => new Room('test-room', 'validPassword123')).not.toThrow()
    })
  })

  describe('peer management', () => {
    let room: Room

    beforeEach(() => {
      room = new Room('test-room')
    })

    it('should add peer successfully', () => {
      room.addPeer(peer1)

      expect(room.isEmpty).toBe(false)
      expect(room.peers).toHaveLength(1)
      expect(room.peers[0]).toBe(peer1)
      expect(room.hasPeer(peer1.id)).toBe(true)
    })

    it('should add multiple peers', () => {
      room.addPeer(peer1)
      room.addPeer(peer2)

      expect(room.peers).toHaveLength(2)
      expect(room.hasPeer(peer1.id)).toBe(true)
      expect(room.hasPeer(peer2.id)).toBe(true)
    })

    it('should throw error when adding duplicate peer', () => {
      room.addPeer(peer1)

      expect(() => {
        room.addPeer(peer1)
      }).toThrow(`Peer with id ${peer1.id} already exists in room test-room`)
    })

    it('should remove peer successfully', () => {
      room.addPeer(peer1)
      room.addPeer(peer2)

      room.removePeer(peer1.id)

      expect(room.peers).toHaveLength(1)
      expect(room.hasPeer(peer1.id)).toBe(false)
      expect(room.hasPeer(peer2.id)).toBe(true)
    })

    it('should throw error when removing non-existent peer', () => {
      expect(() => {
        room.removePeer('non-existent')
      }).toThrow('Peer with id non-existent does not exist in room test-room')
    })

    it('should get peer by ID', () => {
      room.addPeer(peer1)

      const foundPeer = room.getPeer(peer1.id)

      expect(foundPeer).toBe(peer1)
    })

    it('should return undefined for non-existent peer', () => {
      const foundPeer = room.getPeer('non-existent')

      expect(foundPeer).toBeUndefined()
    })

    it('should check if room becomes empty after removing all peers', () => {
      room.addPeer(peer1)
      expect(room.isEmpty).toBe(false)

      room.removePeer(peer1.id)
      expect(room.isEmpty).toBe(true)
    })
  })

  describe('password verification', () => {
    it('should verify password for room with password', () => {
      const room = new Room('test-room', 'correct-password')

      expect(room.verifyPassword('correct-password')).toBe(true)
      expect(room.verifyPassword('wrong-password')).toBe(false)
    })

    it('should always return true for room without password', () => {
      const room = new Room('test-room')

      expect(room.verifyPassword('any-password')).toBe(true)
      expect(room.verifyPassword('')).toBe(true)
    })
  })

  describe('broadcast', () => {
    let room: Room

    beforeEach(() => {
      room = new Room('test-room')
      room.addPeer(peer1)
      room.addPeer(peer2)
    })

    it('should broadcast message to all peers', () => {
      const message = {
        type: 'PEER_JOINED' as const,
        payload: {
          peerId: peer1.id,
          displayName: peer1.displayName
        }
      }

      room.broadcast({ message })

      expect(mockSocket.send).toHaveBeenCalledTimes(2)
      expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify(message))
    })

    it('should broadcast message excluding specified peers', () => {
      const message = {
        type: 'PEER_JOINED' as const,
        payload: {
          peerId: peer1.id,
          displayName: peer1.displayName
        }
      }

      room.broadcast({ message, excludePeerIds: [peer1.id] })

      expect(mockSocket.send).toHaveBeenCalledTimes(1)
    })

    it('should broadcast to empty room without error', () => {
      const emptyRoom = new Room('empty-room')
      const message = {
        type: 'PEER_JOINED' as const,
        payload: {
          peerId: peer1.id,
          displayName: peer1.displayName
        }
      }

      expect(() => {
        emptyRoom.broadcast({ message })
      }).not.toThrow()

      expect(mockSocket.send).not.toHaveBeenCalled()
    })

    it('should handle failed message sends gracefully', () => {
      mockSocket.send.mockReturnValue(false)

      const message = {
        type: 'PEER_JOINED' as const,
        payload: {
          peerId: peer1.id,
          displayName: peer1.displayName
        }
      }

      expect(() => {
        room.broadcast({ message })
      }).not.toThrow()
    })
  })

  describe('toJSON', () => {
    it('should return correct JSON representation without password', () => {
      const room = new Room('test-room')
      room.addPeer(peer1)

      const json = room.toJSON()

      expect(json).toEqual({
        id: 'test-room',
        peers: [peer1.toJSON()],
        createdAt: expect.any(Date),
        hasPassword: false
      })
    })

    it('should return correct JSON representation with password', () => {
      const room = new Room('test-room', 'password123')
      room.addPeer(peer1)

      const json = room.toJSON()

      expect(json).toEqual({
        id: 'test-room',
        peers: [peer1.toJSON()],
        createdAt: expect.any(Date),
        hasPassword: true
      })
    })

    it('should return JSON with empty peers array for empty room', () => {
      const room = new Room('test-room')

      const json = room.toJSON()

      expect(json.peers).toEqual([])
    })
  })

})
