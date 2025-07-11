import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GrabstreamClientEmitter } from './emitter'

class TestEmitter extends GrabstreamClientEmitter {
  // biome-ignore lint/suspicious/noExplicitAny: Test helper needs flexible event typing
  public testEmit<K extends keyof any>(event: K, ...args: any[]): void {
    this.emit(event, ...args)
  }
}

describe('GrabstreamClientEmitter', () => {
  let emitter: TestEmitter

  beforeEach(() => {
    emitter = new TestEmitter()
  })

  describe('on', () => {
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

    it('should handle different event types', () => {
      const clientCallback = vi.fn()
      const roomCallback = vi.fn()

      emitter.on('client:connected', clientCallback)
      emitter.on('room:joined', roomCallback)

      emitter.testEmit('client:connected', { peerId: 'test-peer' })
      emitter.testEmit('room:joined', { roomId: 'test-room', peerCount: 1 })

      expect(clientCallback).toHaveBeenCalledWith({ peerId: 'test-peer' })
      expect(roomCallback).toHaveBeenCalledWith({
        roomId: 'test-room',
        peerCount: 1
      })
    })
  })

  describe('off', () => {
    it('should remove event listener', () => {
      const callback = vi.fn()

      emitter.on('client:connected', callback)
      emitter.off('client:connected', callback)
      emitter.testEmit('client:connected', { peerId: 'test-peer' })

      expect(callback).not.toHaveBeenCalled()
    })

    it('should remove only specific listener', () => {
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

      expect(() => {
        emitter.off('client:connected', callback)
      }).not.toThrow()
    })

    it('should handle removing listener for non-existent event', () => {
      const callback = vi.fn()

      expect(() => {
        // biome-ignore lint/suspicious/noExplicitAny: Testing with invalid event type
        emitter.off('nonexistent:event' as any, callback)
      }).not.toThrow()
    })
  })

  describe('emit', () => {
    it('should call all registered listeners', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      emitter.on('client:connected', callback1)
      emitter.on('client:connected', callback2)
      emitter.testEmit('client:connected', { peerId: 'test-peer' })

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('should pass correct arguments to listeners', () => {
      const callback = vi.fn()

      emitter.on('client:disconnected', callback)
      emitter.testEmit('client:disconnected', { code: 1000, reason: 'test' })

      expect(callback).toHaveBeenCalledWith({ code: 1000, reason: 'test' })
    })

    it('should handle emit with no listeners', () => {
      expect(() => {
        emitter.testEmit('client:connected', { peerId: 'test-peer' })
      }).not.toThrow()
    })

    it('should handle listener errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error')
      })
      const normalCallback = vi.fn()

      emitter.on('client:connected', errorCallback)
      emitter.on('client:connected', normalCallback)

      expect(() => {
        emitter.testEmit('client:connected', { peerId: 'test-peer' })
      }).not.toThrow()

      expect(errorCallback).toHaveBeenCalled()
      expect(normalCallback).toHaveBeenCalled()
    })

    it('should handle multiple event emissions', () => {
      const callback = vi.fn()

      emitter.on('client:connected', callback)
      emitter.testEmit('client:connected', { peerId: 'test-peer-1' })
      emitter.testEmit('client:connected', { peerId: 'test-peer-2' })

      expect(callback).toHaveBeenCalledTimes(2)
      expect(callback).toHaveBeenNthCalledWith(1, { peerId: 'test-peer-1' })
      expect(callback).toHaveBeenNthCalledWith(2, { peerId: 'test-peer-2' })
    })
  })

  describe('integration', () => {
    it('should handle complex event flow', () => {
      const connectCallback = vi.fn()
      const disconnectCallback = vi.fn()

      emitter.on('client:connected', connectCallback)
      emitter.on('client:disconnected', disconnectCallback)

      emitter.testEmit('client:connected', { peerId: 'test-peer' })
      emitter.testEmit('client:disconnected', { code: 1000, reason: 'normal' })

      expect(connectCallback).toHaveBeenCalledWith({ peerId: 'test-peer' })
      expect(disconnectCallback).toHaveBeenCalledWith({
        code: 1000,
        reason: 'normal'
      })
    })

    it('should handle add/remove/emit cycle', () => {
      const callback = vi.fn()

      emitter.on('client:connected', callback)
      emitter.testEmit('client:connected', { peerId: 'test-peer-1' })

      emitter.off('client:connected', callback)
      emitter.testEmit('client:connected', { peerId: 'test-peer-2' })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ peerId: 'test-peer-1' })
    })
  })
})
