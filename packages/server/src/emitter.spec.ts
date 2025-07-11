import type { WebSocket } from 'ws'
import { type EventMap, GrabstreamServerEmitter } from './emitter'
import { Peer } from './peer'
import { Room } from './room'

// Test implementation that extends the abstract class
class TestEmitter extends GrabstreamServerEmitter {
  triggerEvent<K extends keyof EventMap>(event: K, ...args: EventMap[K]): void {
    this.emit(event, ...args)
  }
}

describe('GrabstreamServerEmitter', () => {
  let emitter: TestEmitter

  beforeEach(() => {
    emitter = new TestEmitter()
  })

  describe('event listener management', () => {
    it('should register and call event listeners', () => {
      const callback = jest.fn()

      emitter.on('server:started', callback)
      emitter.triggerEvent('server:started')

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith()
    })

    it('should support multiple listeners for the same event', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      emitter.on('server:started', callback1)
      emitter.on('server:started', callback2)
      emitter.triggerEvent('server:started')

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments to event listeners', () => {
      const callback = jest.fn()
      const error = new Error('Test error')

      emitter.on('server:error', callback)
      emitter.triggerEvent('server:error', error)

      expect(callback).toHaveBeenCalledWith(error)
    })

    it('should remove event listeners', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      emitter.on('server:started', callback1)
      emitter.on('server:started', callback2)
      emitter.off('server:started', callback1)
      emitter.triggerEvent('server:started')

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('should handle removing non-existent listeners', () => {
      const callback = jest.fn()

      expect(() => {
        emitter.off('server:started', callback)
      }).not.toThrow()
    })

    it('should handle removing listeners from non-existent events', () => {
      const callback = jest.fn()

      expect(() => {
        emitter.off('server:started', callback)
      }).not.toThrow()
    })
  })

  describe('error handling in callbacks', () => {
    it('should handle errors in event callbacks without crashing', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error')
      })
      const normalCallback = jest.fn()

      emitter.on('server:started', errorCallback)
      emitter.on('server:started', normalCallback)

      expect(() => {
        emitter.triggerEvent('server:started')
      }).not.toThrow()

      expect(errorCallback).toHaveBeenCalledTimes(1)
      expect(normalCallback).toHaveBeenCalledTimes(1)
    })
  })

  describe('event types', () => {
    it('should handle server events', () => {
      const startedCallback = jest.fn()
      const stoppedCallback = jest.fn()
      const errorCallback = jest.fn()

      emitter.on('server:started', startedCallback)
      emitter.on('server:stopped', stoppedCallback)
      emitter.on('server:error', errorCallback)

      emitter.triggerEvent('server:started')
      emitter.triggerEvent('server:stopped')
      emitter.triggerEvent('server:error', new Error('Test'))

      expect(startedCallback).toHaveBeenCalledTimes(1)
      expect(stoppedCallback).toHaveBeenCalledTimes(1)
      expect(errorCallback).toHaveBeenCalledWith(new Error('Test'))
    })

    it('should handle peer events with correct arguments', () => {
      const connectedCallback = jest.fn()
      const joinedCallback = jest.fn()
      const leftCallback = jest.fn()
      const errorCallback = jest.fn()
      const displayNameCallback = jest.fn()
      const timeoutCallback = jest.fn()
      const limitCallback = jest.fn()

      // Mock WebSocket for Peer
      const mockSocket = {
        readyState: 1,
        send: jest.fn(),
        ping: jest.fn(),
        terminate: jest.fn(),
        on: jest.fn()
      } as unknown as WebSocket

      const mockPeer = new Peer({
        socket: mockSocket,
        displayName: 'Test Peer'
      })
      const mockRoom = new Room('room-1')
      const mockError = new Error('Peer error')

      emitter.on('peer:connected', connectedCallback)
      emitter.on('peer:joined', joinedCallback)
      emitter.on('peer:left', leftCallback)
      emitter.on('peer:error', errorCallback)
      emitter.on('peer:displayNameUpdated', displayNameCallback)
      emitter.on('peer:timeout', timeoutCallback)
      emitter.on('peer:limitReachedPerRoom', limitCallback)

      emitter.triggerEvent('peer:connected', mockPeer)
      emitter.triggerEvent('peer:joined', {
        peer: mockPeer,
        room: mockRoom
      })
      emitter.triggerEvent('peer:left', {
        peer: mockPeer,
        roomId: 'room-1'
      })
      emitter.triggerEvent('peer:error', {
        peer: mockPeer,
        error: mockError
      })
      emitter.triggerEvent('peer:displayNameUpdated', {
        peer: mockPeer,
        oldDisplayName: 'Old Name',
        newDisplayName: 'New Name'
      })
      emitter.triggerEvent('peer:timeout', mockPeer)
      emitter.triggerEvent('peer:limitReachedPerRoom', {
        roomId: 'room-1',
        peerId: 'peer-1',
        currentPeers: 5,
        maxPeers: 4
      })

      expect(connectedCallback).toHaveBeenCalledWith(mockPeer)
      expect(joinedCallback).toHaveBeenCalledWith({
        peer: mockPeer,
        room: mockRoom
      })
      expect(leftCallback).toHaveBeenCalledWith({
        peer: mockPeer,
        roomId: 'room-1'
      })
      expect(errorCallback).toHaveBeenCalledWith({
        peer: mockPeer,
        error: mockError
      })
      expect(displayNameCallback).toHaveBeenCalledWith({
        peer: mockPeer,
        oldDisplayName: 'Old Name',
        newDisplayName: 'New Name'
      })
      expect(timeoutCallback).toHaveBeenCalledWith(mockPeer)
      expect(limitCallback).toHaveBeenCalledWith({
        roomId: 'room-1',
        peerId: 'peer-1',
        currentPeers: 5,
        maxPeers: 4
      })
    })

    it('should handle room events with correct arguments', () => {
      const createdCallback = jest.fn()
      const removedCallback = jest.fn()
      const limitCallback = jest.fn()

      const mockRoom = new Room('room-1')

      emitter.on('room:created', createdCallback)
      emitter.on('room:removed', removedCallback)
      emitter.on('room:limitReachedPerServer', limitCallback)

      emitter.triggerEvent('room:created', mockRoom)
      emitter.triggerEvent('room:removed', { roomId: 'room-1' })
      emitter.triggerEvent('room:limitReachedPerServer', {
        roomId: 'room-1',
        peerId: 'peer-1',
        currentRooms: 10,
        maxRooms: 5
      })

      expect(createdCallback).toHaveBeenCalledWith(mockRoom)
      expect(removedCallback).toHaveBeenCalledWith({ roomId: 'room-1' })
      expect(limitCallback).toHaveBeenCalledWith({
        roomId: 'room-1',
        peerId: 'peer-1',
        currentRooms: 10,
        maxRooms: 5
      })
    })
  })

  describe('edge cases', () => {
    it('should handle emitting events with no listeners', () => {
      expect(() => {
        emitter.triggerEvent('server:started')
      }).not.toThrow()
    })

    it('should handle same callback registered multiple times', () => {
      const callback = jest.fn()

      emitter.on('server:started', callback)
      emitter.on('server:started', callback)
      emitter.triggerEvent('server:started')

      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('should handle removing callback that was registered multiple times', () => {
      const callback = jest.fn()

      emitter.on('server:started', callback)
      emitter.on('server:started', callback)
      emitter.off('server:started', callback)
      emitter.triggerEvent('server:started')

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})
