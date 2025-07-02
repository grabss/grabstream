/**
 * Validation constants
 */

// Display name
export const MAX_DISPLAY_NAME_LENGTH = 50

// Room ID
export const MAX_ROOM_ID_LENGTH = 64
export const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

// Custom message
export const MAX_CUSTOM_TYPE_LENGTH = 32
export const CUSTOM_TYPE_PATTERN = /^[a-zA-Z0-9._-]+$/

// Connection limits (to be implemented)
export const MAX_PEERS_PER_ROOM = 100
export const MAX_ROOMS_PER_SERVER = 1000

// Timeout values (to be implemented)
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour
export const PING_INTERVAL_MS = 30 * 1000 // 30 seconds
