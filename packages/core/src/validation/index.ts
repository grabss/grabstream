import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_ROOM_ID_LENGTH,
  MIN_PASSWORD_LENGTH,
  ROOM_ID_PATTERN,
  VALIDATION_ERROR_CODES,
  type ValidationErrorCode
} from './constants.js'

export * from './constants.js'

export type ValidationResult =
  | { success: true }
  | {
      success: false
      error: string
      code: ValidationErrorCode
      details?: Record<string, unknown>
    }

export function validateDisplayName(displayName: string): ValidationResult {
  if (!displayName) {
    return {
      success: false,
      error: 'Display name cannot be empty',
      code: VALIDATION_ERROR_CODES.DISPLAY_NAME_EMPTY,
      details: { displayName }
    }
  }

  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      success: false,
      error: `Display name cannot exceed ${MAX_DISPLAY_NAME_LENGTH} characters`,
      code: VALIDATION_ERROR_CODES.DISPLAY_NAME_TOO_LONG,
      details: {
        displayName,
        length: displayName.length,
        maxLength: MAX_DISPLAY_NAME_LENGTH
      }
    }
  }

  return { success: true }
}

export function validateRoomId(roomId: string): ValidationResult {
  if (!roomId) {
    return {
      success: false,
      error: 'Room ID cannot be empty',
      code: VALIDATION_ERROR_CODES.ROOM_ID_EMPTY,
      details: { roomId }
    }
  }

  if (roomId.length > MAX_ROOM_ID_LENGTH) {
    return {
      success: false,
      error: `Room ID cannot exceed ${MAX_ROOM_ID_LENGTH} characters`,
      code: VALIDATION_ERROR_CODES.ROOM_ID_TOO_LONG,
      details: {
        roomId,
        length: roomId.length,
        maxLength: MAX_ROOM_ID_LENGTH
      }
    }
  }

  if (!ROOM_ID_PATTERN.test(roomId)) {
    return {
      success: false,
      error: `Room ID must match pattern: ${ROOM_ID_PATTERN.source}`,
      code: VALIDATION_ERROR_CODES.ROOM_ID_INVALID_PATTERN,
      details: {
        roomId,
        pattern: ROOM_ID_PATTERN.source
      }
    }
  }

  return { success: true }
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return {
      success: false,
      error: 'Password cannot be empty',
      code: VALIDATION_ERROR_CODES.PASSWORD_EMPTY,
      details: { password }
    }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      code: VALIDATION_ERROR_CODES.PASSWORD_TOO_SHORT,
      details: {
        password,
        length: password.length,
        minLength: MIN_PASSWORD_LENGTH
      }
    }
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`,
      code: VALIDATION_ERROR_CODES.PASSWORD_TOO_LONG,
      details: {
        password,
        length: password.length,
        maxLength: MAX_PASSWORD_LENGTH
      }
    }
  }

  return { success: true }
}
