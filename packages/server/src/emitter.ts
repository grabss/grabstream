import { logger } from '@grabstream/core'

import type { Peer } from './peer'
import type { Room } from './room'

type EventMap = {
  'server:started': []
  'server:stopped': []
  'server:error': [Error]
  'peer:connected': [Peer]
  'peer:disconnected': [Peer]
  'peer:joined': [{ peer: Peer; room: Room }]
  'peer:left': [{ peer: Peer; roomId: string }]
  'peer:error': [{ peer: Peer; error: Error }]
  'peer:displayNameUpdated': [
    { peer: Peer; oldDisplayName: string; newDisplayName: string }
  ]
  'peer:timeout': [Peer]
  'peer:limitReachedPerRoom': [
    { roomId: string; peerId: string; currentPeers: number; maxPeers: number }
  ]
  'room:created': [Room]
  'room:removed': [{ roomId: string }]
  'room:limitReachedPerServer': [
    { roomId: string; peerId: string; currentRooms: number; maxRooms: number }
  ]
}

export abstract class GrabstreamServerEmitter {
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
          logger.error('server:callbackError', {
            event: String(event),
            error
          })
        }
      }
    }
  }
}
