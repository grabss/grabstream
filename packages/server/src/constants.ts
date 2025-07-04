// ==================== Room Configuration ====================

// false - rooms can be created without password by default
export const DEFAULT_REQUIRE_ROOM_PASSWORD = false

// ==================== Custom Message Configuration ====================

export const MAX_CUSTOM_TYPE_LENGTH = 32
export const CUSTOM_TYPE_PATTERN = /^[a-zA-Z0-9._-]+$/

// ==================== WebSocket Configuration ====================

// Disable compression for low latency
export const WEBSOCKET_PER_MESSAGE_DEFLATE = false

// 1MB - sufficient for SDP/ICE
export const WEBSOCKET_MAX_PAYLOAD = 1024 * 1024

// 30 seconds - WebSocket keepalive ping interval
export const PING_INTERVAL_MS = 30 * 1000

// ==================== Connection Limits ====================

export const DEFAULT_MAX_PEERS_PER_ROOM = 4

// 0 = unlimited
export const DEFAULT_MAX_ROOMS_PER_SERVER = 0

// ==================== ICE Server Configuration ====================

export const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]
