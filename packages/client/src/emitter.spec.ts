import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GrabstreamClientEmitter } from './emitter'

// Test implementation of abstract class
class TestEmitter extends GrabstreamClientEmitter {
  public testEmit<K extends keyof EventMap>(
    event: K,
    ...args: EventMap[K]
  ): void {
    this.emit(event, ...args)
  }
}

// Mock RemotePeer for testing
const mockPeer = {
  id: 'test-peer',
  displayName: 'Test Peer'
} as any

describe('GrabstreamClientEmitter', () => {
  let emitter: TestEmitter

  beforeEach(() => {
    emitter = new TestEmitter()
  })

  describe('on()', () => {
    it('should register event listener', () => {
      const callback = vi.fn()

      emitter.on('client:connected', callback)
      emitter.testEmit('client:connected', { peerId: 'test-peer' })

      expect(callback).toHaveBeenCalledWith({ peerId: 'test-peer' })
    })

    it('should register multiple listeners for same event', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      emitter.on('client:connected', callback1)
      emitter.on('client:connected', callback2)
      emitter.testEmit('client:connected', { peerId: 'test-peer' })

      expect(callback1).toHaveBeenCalledWith({ peerId: 'test-peer' })
      expect(callback2).toHaveBeenCalledWith({ peerId: 'test-peer' })
    })

    it('should register listeners for different events', () => {
      const connectCallback = vi.fn()
      const disconnectCallback = vi.fn()

      emitter.on('client:connected', connectCallback)
      emitter.on('client:disconnected', disconnectCallback)

      emitter.testEmit('client:connected', { peerId: 'test-peer' })
      emitter.testEmit('client:disconnected', { code: 1000, reason: 'Normal' })

      expect(connectCallback).toHaveBeenCalledWith({ peerId: 'test-peer' })
      expect(disconnectCallback).toHaveBeenCalledWith({
        code: 1000,
        reason: 'Normal'
      })
    })
  })

  describe('off()', () => {
    it('should remove event listener', () => {
      const callback = vi.fn()

      emitter.on('client:connected', callback)
      emitter.off('client:connected', callback)
      emitter.testEmit('client:connected', { peerId: 'test-peer' })

      expect(callback).not.toHaveBeenCalled()
    })

    it('should remove only specified listener', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      emitter.on('client:connected', callback1)
      emitter.on('client:connected', callback2)
      emitter.off('client:connected', callback1)
      emitter.testEmit('client:connected', { peerId: 'test-peer' })

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).toHaveBeenCalledWith({ peerId: 'test-peer' })
    })

    it('should handle removing non-existent listener', () => {
      const callback = vi.fn()

      // Should not throw error
      emitter.off('client:connected', callback)
      emitter.testEmit('client:connected', { peerId: 'test-peer' })

      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle removing listener from non-existent event', () => {
      const callback = vi.fn()

      // Should not throw error
      emitter.off('client:connected', callback)

      // Should not throw error
      expect(() => {
        emitter.off('client:connected', callback)
      }).not.toThrow()
    })
  })

  describe('emit()', () => {
    it('should handle listener errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error')
      })
      const normalCallback = vi.fn()

      emitter.on('client:connected', errorCallback)
      emitter.on('client:connected', normalCallback)

      // Should not throw error
      expect(() => {
        emitter.testEmit('client:connected', { peerId: 'test-peer' })
      }).not.toThrow()

      expect(errorCallback).toHaveBeenCalled()
      expect(normalCallback).toHaveBeenCalled()
    })

    it('should handle emitting to non-existent event', () => {
      // Should not throw error
      expect(() => {
        emitter.testEmit('client:connected', { peerId: 'test-peer' })
      }).not.toThrow()
    })

    it('should pass correct arguments to listeners', () => {
      const callback = vi.fn()

      emitter.on('client:disconnected', callback)
      emitter.testEmit('client:disconnected', {
        code: 1006,
        reason: 'Abnormal'
      })

      expect(callback).toHaveBeenCalledWith({ code: 1006, reason: 'Abnormal' })
    })
  })

  describe('event types', () => {
    it('should handle client events', () => {
      const connectedCallback = vi.fn()
      const disconnectedCallback = vi.fn()
      const errorCallback = vi.fn()
      const displayNameCallback = vi.fn()

      emitter.on('client:connected', connectedCallback)
      emitter.on('client:disconnected', disconnectedCallback)
      emitter.on('client:error', errorCallback)
      emitter.on('client:displayNameUpdated', displayNameCallback)

      emitter.testEmit('client:connected', { peerId: 'test-peer' })
      emitter.testEmit('client:disconnected', { code: 1000, reason: 'Normal' })
      emitter.testEmit('client:error', new Event('error'))
      emitter.testEmit('client:displayNameUpdated', { displayName: 'New Name' })

      expect(connectedCallback).toHaveBeenCalledWith({ peerId: 'test-peer' })
      expect(disconnectedCallback).toHaveBeenCalledWith({
        code: 1000,
        reason: 'Normal'
      })
      expect(errorCallback).toHaveBeenCalledWith(expect.any(Event))
      expect(displayNameCallback).toHaveBeenCalledWith({
        displayName: 'New Name'
      })
    })

    it('should handle room events', () => {
      const joinedCallback = vi.fn()
      const leftCallback = vi.fn()
      const passwordCallback = vi.fn()

      emitter.on('room:joined', joinedCallback)
      emitter.on('room:left', leftCallback)
      emitter.on('room:passwordRequired', passwordCallback)

      emitter.testEmit('room:joined', { roomId: 'test-room', peerCount: 3 })
      emitter.testEmit('room:left', { roomId: 'test-room' })
      emitter.testEmit('room:passwordRequired', { roomId: 'test-room' })

      expect(joinedCallback).toHaveBeenCalledWith({
        roomId: 'test-room',
        peerCount: 3
      })
      expect(leftCallback).toHaveBeenCalledWith({ roomId: 'test-room' })
      expect(passwordCallback).toHaveBeenCalledWith({ roomId: 'test-room' })
    })

    it('should handle peer events', () => {
      const joinedCallback = vi.fn()
      const leftCallback = vi.fn()
      const updatedCallback = vi.fn()
      const connectedCallback = vi.fn()
      const disconnectedCallback = vi.fn()
      const errorCallback = vi.fn()

      emitter.on('peer:joined', joinedCallback)
      emitter.on('peer:left', leftCallback)
      emitter.on('peer:updated', updatedCallback)
      emitter.on('peer:connected', connectedCallback)
      emitter.on('peer:disconnected', disconnectedCallback)
      emitter.on('peer:error', errorCallback)

      emitter.testEmit('peer:joined', mockPeer)
      emitter.testEmit('peer:left', mockPeer)
      emitter.testEmit('peer:updated', mockPeer)
      emitter.testEmit('peer:connected', mockPeer)
      emitter.testEmit('peer:disconnected', mockPeer)
      emitter.testEmit('peer:error', {
        peer: mockPeer,
        error: new Error('Test error')
      })

      expect(joinedCallback).toHaveBeenCalledWith(mockPeer)
      expect(leftCallback).toHaveBeenCalledWith(mockPeer)
      expect(updatedCallback).toHaveBeenCalledWith(mockPeer)
      expect(connectedCallback).toHaveBeenCalledWith(mockPeer)
      expect(disconnectedCallback).toHaveBeenCalledWith(mockPeer)
      expect(errorCallback).toHaveBeenCalledWith({
        peer: mockPeer,
        error: expect.any(Error)
      })
    })

    it('should handle stream and signaling events', () => {
      const streamCallback = vi.fn()
      const signalingCallback = vi.fn()
      const customCallback = vi.fn()
      const dataChannelCallback = vi.fn()

      emitter.on('peer:streamReceived', streamCallback)
      emitter.on('peer:signaling', signalingCallback)
      emitter.on('peer:customMessage', customCallback)
      emitter.on('peer:dataChannelMessage', dataChannelCallback)

      const mockStream = {} as MediaStream
      const mockMessage = { type: 'OFFER', payload: {} } as any

      emitter.testEmit('peer:streamReceived', {
        peer: mockPeer,
        type: 'AUDIO_VIDEO',
        stream: mockStream
      })
      emitter.testEmit('peer:signaling', {
        peer: mockPeer,
        message: mockMessage
      })
      emitter.testEmit('peer:customMessage', {
        peer: mockPeer,
        customType: 'test',
        data: { test: true }
      })
      emitter.testEmit('peer:dataChannelMessage', {
        peer: mockPeer,
        data: 'test data'
      })

      expect(streamCallback).toHaveBeenCalledWith({
        peer: mockPeer,
        type: 'AUDIO_VIDEO',
        stream: mockStream
      })
      expect(signalingCallback).toHaveBeenCalledWith({
        peer: mockPeer,
        message: mockMessage
      })
      expect(customCallback).toHaveBeenCalledWith({
        peer: mockPeer,
        customType: 'test',
        data: { test: true }
      })
      expect(dataChannelCallback).toHaveBeenCalledWith({
        peer: mockPeer,
        data: 'test data'
      })
    })

    it('should handle server events', () => {
      const serverErrorCallback = vi.fn()

      emitter.on('server:error', serverErrorCallback)
      emitter.testEmit('server:error', { message: 'Server error message' })

      expect(serverErrorCallback).toHaveBeenCalledWith({
        message: 'Server error message'
      })
    })
  })

  describe('memory management', () => {
    it('should properly clean up listeners', () => {
      const callback = vi.fn()

      emitter.on('client:connected', callback)
      emitter.testEmit('client:connected', { peerId: 'test-peer' })
      expect(callback).toHaveBeenCalledTimes(1)

      emitter.off('client:connected', callback)
      emitter.testEmit('client:connected', { peerId: 'test-peer' })
      expect(callback).toHaveBeenCalledTimes(1) // Should not be called again
    })

    it('should handle multiple registrations of same callback', () => {
      const callback = vi.fn()

      emitter.on('client:connected', callback)
      emitter.on('client:connected', callback) // Register same callback twice
      emitter.testEmit('client:connected', { peerId: 'test-peer' })

      expect(callback).toHaveBeenCalledTimes(2) // Should be called twice

      emitter.off('client:connected', callback)
      emitter.testEmit('client:connected', { peerId: 'test-peer' })

      expect(callback).toHaveBeenCalledTimes(3) // Should be called once more (only one removed)
    })
  })
})
