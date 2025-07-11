import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONNECTION_TIMEOUT_MS,
  DEFAULT_ICE_MAX_RESTARTS,
  DEFAULT_SERVER_URL
} from './constants'

describe('Constants', () => {
  describe('DEFAULT_SERVER_URL', () => {
    it('should be a valid WebSocket URL', () => {
      expect(DEFAULT_SERVER_URL).toBe('ws://localhost:8080')
      expect(DEFAULT_SERVER_URL).toMatch(/^wss?:\/\//)
    })

    it('should be a string', () => {
      expect(typeof DEFAULT_SERVER_URL).toBe('string')
    })
  })

  describe('DEFAULT_CONNECTION_TIMEOUT_MS', () => {
    it('should be 10 seconds in milliseconds', () => {
      expect(DEFAULT_CONNECTION_TIMEOUT_MS).toBe(10000)
      expect(DEFAULT_CONNECTION_TIMEOUT_MS).toBe(10 * 1000)
    })

    it('should be a positive number', () => {
      expect(typeof DEFAULT_CONNECTION_TIMEOUT_MS).toBe('number')
      expect(DEFAULT_CONNECTION_TIMEOUT_MS).toBeGreaterThan(0)
    })
  })

  describe('DEFAULT_ICE_MAX_RESTARTS', () => {
    it('should be 2 attempts', () => {
      expect(DEFAULT_ICE_MAX_RESTARTS).toBe(2)
    })

    it('should be a positive integer', () => {
      expect(typeof DEFAULT_ICE_MAX_RESTARTS).toBe('number')
      expect(DEFAULT_ICE_MAX_RESTARTS).toBeGreaterThan(0)
      expect(Number.isInteger(DEFAULT_ICE_MAX_RESTARTS)).toBe(true)
    })
  })
})
