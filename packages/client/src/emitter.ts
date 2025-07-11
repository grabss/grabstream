import type {
  AnswerRelayMessage,
  IceCandidateRelayMessage,
  OfferRelayMessage
} from '@grabstream/core'
import { logger } from '@grabstream/core'

import type { RemotePeer } from './peer'
import type { StreamType } from './types'

export type EventMap = {
  'client:connected': [{ peerId: string }]
  'client:disconnected': [
    {
      code: number
      reason: string
    }
  ]
  'client:error': [Event]
  'client:displayNameUpdated': [{ displayName: string }]
  'room:joined': [
    {
      roomId: string
      peerCount: number
    }
  ]
  'room:left': [{ roomId: string }]
  'room:passwordRequired': [{ roomId: string }]
  'peer:joined': [RemotePeer]
  'peer:left': [RemotePeer]
  'peer:updated': [RemotePeer]
  'peer:connected': [RemotePeer]
  'peer:disconnected': [RemotePeer]
  'peer:error': [
    {
      peer: RemotePeer
      error: Error
    }
  ]
  'peer:signaling': [
    {
      peer: RemotePeer
      message: OfferRelayMessage | AnswerRelayMessage | IceCandidateRelayMessage
    }
  ]
  'peer:streamReceived': [
    {
      peer: RemotePeer
      type: StreamType
      stream: MediaStream
    }
  ]
  'peer:customMessage': [
    {
      peer: RemotePeer
      customType: string
      data: unknown
    }
  ]
  'peer:dataChannelMessage': [
    {
      peer: RemotePeer
      data: string
    }
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
