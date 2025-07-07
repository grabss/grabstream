import type {
  AnswerRelayMessage,
  IceCandidateRelayMessage,
  OfferRelayMessage
} from '@grabstream/core'
import { logger } from '@grabstream/core'

import type { RemotePeer } from './peer'

type EventMap = {
  'client:connected': [{ peerId: string }]
  'client:disconnected': [{ code: number; reason: string }]
  'client:error': [Event]
  'client:displayNameUpdated': [{ displayName: string }]
  'room:joined': [{ roomId: string; peers: RemotePeer[] }]
  'room:left': [{ roomId: string }]
  'room:passwordRequired': [{ roomId: string }]
  'room:knockResponse': [
    {
      roomId: string
      exists: boolean
      hasPassword: boolean
      peerCount: number
      isFull: boolean
    }
  ]
  'peer:joined': [RemotePeer]
  'peer:left': [RemotePeer]
  'peer:updated': [RemotePeer]
  'peer:connected': [RemotePeer]
  'peer:disconnected': [RemotePeer]
  'peer:error': [{ peer: RemotePeer; error: Error }]
  'peer:signaling': [
    {
      peer: RemotePeer
      message: OfferRelayMessage | AnswerRelayMessage | IceCandidateRelayMessage
    }
  ]
  'peer:streamReceived': [{ peer: RemotePeer; streams: readonly MediaStream[] }]
  'peer:customMessage': [
    { peer: RemotePeer; customType: string; data: unknown }
  ]
  'server:error': [{ message: string }]
}

export abstract class GrabstreamClientEmitter {
  private listeners = new Map<string, Array<(...args: unknown[]) => void>>()

  on<K extends keyof EventMap>(
    event: K,
    callback: (...args: EventMap[K]) => void
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)?.push(callback as (...args: unknown[]) => void)
  }

  off<K extends keyof EventMap>(
    event: K,
    callback: (...args: EventMap[K]) => void
  ): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback as (...args: unknown[]) => void)
      if (index !== -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  protected emit<K extends keyof EventMap>(
    event: K,
    ...args: EventMap[K]
  ): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(...args)
        } catch (error) {
          logger.error('client:callbackError', {
            event: String(event),
            error
          })
        }
      }
    }
  }
}
