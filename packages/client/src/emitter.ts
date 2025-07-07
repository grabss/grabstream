import type {
  AnswerRelayMessage,
  IceCandidateRelayMessage,
  OfferRelayMessage
} from '@grabstream/core'
import { logger } from '@grabstream/core'

import type { Peer } from './types'

type EventMap = {
  'client:connected': [{ peerId: string }]
  'client:disconnected': [{ code: number; reason: string }]
  'client:error': [Event]
  'client:ready': [{ peerId: string; iceServers: RTCIceServer[] }]
  'client:displayNameUpdated': [{ displayName: string }]
  'room:joined': [{ roomId: string; peers: Peer[] }]
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
  'peer:joined': [Peer]
  'peer:left': [Peer]
  'peer:updated': [Peer]
  'peer:connected': [{ peerId: string }]
  'peer:disconnected': [{ peerId: string }]
  'peer:error': [{ peerId: string; error: Error }]
  'signaling:message': [
    OfferRelayMessage | AnswerRelayMessage | IceCandidateRelayMessage
  ]
  'stream:added': [{ peerId: string; stream: MediaStream }]
  'stream:removed': [{ peerId: string; streamId: string }]
  'message:custom': [{ fromPeerId: string; customType: string; data: unknown }]
  'message:error': [{ message: string }]
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
