import { describe, expect, it } from 'vitest'
import {
  PeerNotInitializedError,
  ValidationError,
  WebSocketNotConnectedError
} from './errors'

describe('PeerNotInitializedError', () => {
  it('should create error with correct message and name', () => {
    const error = new PeerNotInitializedError()

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Peer is not initialized')
    expect(error.name).toBe('PeerNotInitializedError')
  })

  it('should have correct stack trace', () => {
    const error = new PeerNotInitializedError()

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('PeerNotInitializedError')
  })
})

describe('WebSocketNotConnectedError', () => {
  it('should create error with correct message and name', () => {
    const error = new WebSocketNotConnectedError()

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('WebSocket is not connected')
    expect(error.name).toBe('WebSocketNotConnectedError')
  })

  it('should have correct stack trace', () => {
    const error = new WebSocketNotConnectedError()

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('WebSocketNotConnectedError')
  })
})

describe('ValidationError', () => {
  it('should create error with validation result', () => {
    const validation = {
      success: false as const,
      error: 'Display name is too long',
      code: 'DISPLAY_NAME_TOO_LONG',
      details: { displayName: 'VeryLongDisplayName', length: 18, maxLength: 10 }
    }

    const error = new ValidationError(validation)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Display name is too long')
    expect(error.name).toBe('ValidationError')
    expect(error.code).toBe('DISPLAY_NAME_TOO_LONG')
    expect(error.details).toEqual({
      displayName: 'VeryLongDisplayName',
      length: 18,
      maxLength: 10
    })
  })

  it('should create error without details', () => {
    const validation = {
      success: false as const,
      error: 'Room ID is empty',
      code: 'ROOM_ID_EMPTY',
      details: { roomId: '' }
    }

    const error = new ValidationError(validation)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Room ID is empty')
    expect(error.name).toBe('ValidationError')
    expect(error.code).toBe('ROOM_ID_EMPTY')
    expect(error.details).toEqual({ roomId: '' })
  })

  it('should have correct stack trace', () => {
    const validation = {
      success: false as const,
      error: 'Test error',
      code: 'TEST_ERROR',
      details: {}
    }

    const error = new ValidationError(validation)

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('ValidationError')
  })
})
