import type { ValidationResult } from '@grabstream/core'

export class PeerNotInitializedError extends Error {
  constructor() {
    super('Peer is not initialized')
    this.name = 'PeerNotInitializedError'
  }
}

export class WebSocketNotConnectedError extends Error {
  constructor() {
    super('WebSocket is not connected')
    this.name = 'WebSocketNotConnectedError'
  }
}

export class ValidationError extends Error {
  code: string
  details?: Record<string, unknown>

  constructor(validation: Extract<ValidationResult, { success: false }>) {
    super(validation.error)
    this.name = 'ValidationError'
    this.code = validation.code
    this.details = validation.details
  }
}
