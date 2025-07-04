// ==================== Display Name Configuration ====================

export const MAX_DISPLAY_NAME_LENGTH = 50

// ==================== Room Configuration ====================

export const MAX_ROOM_ID_LENGTH = 64
export const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

// ==================== Password Configuration ====================

export const MIN_PASSWORD_LENGTH = 4
export const MAX_PASSWORD_LENGTH = 128

// ==================== Validation Error Codes ====================

export const VALIDATION_ERROR_CODES = {
  DISPLAY_NAME_EMPTY: 'DISPLAY_NAME_EMPTY',
  DISPLAY_NAME_TOO_LONG: 'DISPLAY_NAME_TOO_LONG',
  ROOM_ID_EMPTY: 'ROOM_ID_EMPTY',
  ROOM_ID_TOO_LONG: 'ROOM_ID_TOO_LONG',
  ROOM_ID_INVALID_PATTERN: 'ROOM_ID_INVALID_PATTERN',
  PASSWORD_EMPTY: 'PASSWORD_EMPTY',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_LONG: 'PASSWORD_TOO_LONG'
} as const

export type ValidationErrorCode =
  (typeof VALIDATION_ERROR_CODES)[keyof typeof VALIDATION_ERROR_CODES]
