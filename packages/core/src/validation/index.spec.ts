import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_ROOM_ID_LENGTH,
  MIN_PASSWORD_LENGTH,
  ROOM_ID_PATTERN,
  validateDisplayName,
  validatePassword,
  validateRoomId
} from './index'

describe('Validation Functions', () => {
  describe('validateDisplayName', () => {
    it('should return success for valid display names', () => {
      expect(validateDisplayName('John')).toEqual({ success: true })
      expect(validateDisplayName('Jane Doe')).toEqual({ success: true })
      expect(validateDisplayName('User123')).toEqual({ success: true })
      expect(validateDisplayName('A')).toEqual({ success: true })
      expect(validateDisplayName('あいうえお')).toEqual({ success: true })
      expect(validateDisplayName('🙂')).toEqual({ success: true })
    })

    it('should return success for display name at max length', () => {
      const maxLengthName = 'A'.repeat(MAX_DISPLAY_NAME_LENGTH)
      expect(validateDisplayName(maxLengthName)).toEqual({ success: true })
    })

    it('should return error for empty display name', () => {
      const result = validateDisplayName('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Display name cannot be empty')
        expect(result.code).toBe('DISPLAY_NAME_EMPTY')
        expect(result.details).toEqual({ displayName: '' })
      }
    })

    it('should return error for display name exceeding max length', () => {
      const tooLongName = 'A'.repeat(MAX_DISPLAY_NAME_LENGTH + 1)
      const result = validateDisplayName(tooLongName)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(
          `Display name cannot exceed ${MAX_DISPLAY_NAME_LENGTH} characters`
        )
        expect(result.code).toBe('DISPLAY_NAME_TOO_LONG')
        expect(result.details).toEqual({
          displayName: tooLongName,
          length: tooLongName.length,
          maxLength: MAX_DISPLAY_NAME_LENGTH
        })
      }
    })

    it('should handle unicode characters correctly', () => {
      const unicodeName = '👨‍💻'.repeat(10) // Short unicode string
      expect(validateDisplayName(unicodeName)).toEqual({ success: true })

      // Test with simple unicode
      expect(validateDisplayName('あいうえお')).toEqual({ success: true })
    })
  })

  describe('validateRoomId', () => {
    it('should return success for valid room IDs', () => {
      expect(validateRoomId('room123')).toEqual({ success: true })
      expect(validateRoomId('test-room')).toEqual({ success: true })
      expect(validateRoomId('room_test')).toEqual({ success: true })
      expect(validateRoomId('ABC123')).toEqual({ success: true })
      expect(validateRoomId('a')).toEqual({ success: true })
      expect(validateRoomId('123')).toEqual({ success: true })
      expect(validateRoomId('test-room-123_ABC')).toEqual({ success: true })
    })

    it('should return success for room ID at max length', () => {
      const maxLengthRoomId = 'A'.repeat(MAX_ROOM_ID_LENGTH)
      expect(validateRoomId(maxLengthRoomId)).toEqual({ success: true })
    })

    it('should return error for empty room ID', () => {
      const result = validateRoomId('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Room ID cannot be empty')
        expect(result.code).toBe('ROOM_ID_EMPTY')
        expect(result.details).toEqual({ roomId: '' })
      }
    })

    it('should return error for room ID exceeding max length', () => {
      const tooLongRoomId = 'A'.repeat(MAX_ROOM_ID_LENGTH + 1)
      const result = validateRoomId(tooLongRoomId)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(
          `Room ID cannot exceed ${MAX_ROOM_ID_LENGTH} characters`
        )
        expect(result.code).toBe('ROOM_ID_TOO_LONG')
        expect(result.details).toEqual({
          roomId: tooLongRoomId,
          length: tooLongRoomId.length,
          maxLength: MAX_ROOM_ID_LENGTH
        })
      }
    })

    it('should return error for room IDs with invalid characters', () => {
      const invalidRoomIds = [
        'room 123', // space
        'room@123', // @
        'room#123', // #
        'room.123', // .
        'room!123', // !
        'room$123', // $
        'room%123', // %
        'room&123', // &
        'room*123', // *
        'room+123', // +
        'room=123', // =
        'room?123', // ?
        'room/123', // /
        'room\\123', // \
        'room|123' // |
      ]

      for (const roomId of invalidRoomIds) {
        const result = validateRoomId(roomId)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.code).toBe('ROOM_ID_INVALID_PATTERN')
          expect(result.details).toEqual({
            roomId,
            pattern: ROOM_ID_PATTERN.source
          })
        }
      }
    })

    it('should return error for room IDs with unicode characters', () => {
      const unicodeRoomIds = ['room-あいうえお', 'room-🙂']

      for (const roomId of unicodeRoomIds) {
        const result = validateRoomId(roomId)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.code).toBe('ROOM_ID_INVALID_PATTERN')
          expect(result.details).toEqual({
            roomId,
            pattern: ROOM_ID_PATTERN.source
          })
        }
      }
    })

    it('should follow ROOM_ID_PATTERN exactly', () => {
      // Test pattern directly
      expect(ROOM_ID_PATTERN.test('validRoom123')).toBe(true)
      expect(ROOM_ID_PATTERN.test('valid-room')).toBe(true)
      expect(ROOM_ID_PATTERN.test('valid_room')).toBe(true)
      expect(ROOM_ID_PATTERN.test('invalid room')).toBe(false)
      expect(ROOM_ID_PATTERN.test('invalid@room')).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('should return success for valid passwords', () => {
      expect(validatePassword('1234')).toEqual({ success: true }) // min length
      expect(validatePassword('password')).toEqual({ success: true })
      expect(validatePassword('Password123!')).toEqual({ success: true })
      expect(validatePassword('あいうえお')).toEqual({ success: true })
      expect(validatePassword('🔐secure')).toEqual({ success: true })
    })

    it('should return success for password at min length', () => {
      const minLengthPassword = 'A'.repeat(MIN_PASSWORD_LENGTH)
      expect(validatePassword(minLengthPassword)).toEqual({ success: true })
    })

    it('should return success for password at max length', () => {
      const maxLengthPassword = 'A'.repeat(MAX_PASSWORD_LENGTH)
      expect(validatePassword(maxLengthPassword)).toEqual({ success: true })
    })

    it('should return error for empty password', () => {
      const result = validatePassword('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Password cannot be empty')
        expect(result.code).toBe('PASSWORD_EMPTY')
        expect(result.details).toEqual({ password: '' })
      }
    })

    it('should return error for password shorter than min length', () => {
      const tooShortPassword = 'A'.repeat(MIN_PASSWORD_LENGTH - 1)
      const result = validatePassword(tooShortPassword)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
        )
        expect(result.code).toBe('PASSWORD_TOO_SHORT')
        expect(result.details).toEqual({
          password: tooShortPassword,
          length: tooShortPassword.length,
          minLength: MIN_PASSWORD_LENGTH
        })
      }
    })

    it('should return error for password exceeding max length', () => {
      const tooLongPassword = 'A'.repeat(MAX_PASSWORD_LENGTH + 1)
      const result = validatePassword(tooLongPassword)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(
          `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`
        )
        expect(result.code).toBe('PASSWORD_TOO_LONG')
        expect(result.details).toEqual({
          password: tooLongPassword,
          length: tooLongPassword.length,
          maxLength: MAX_PASSWORD_LENGTH
        })
      }
    })

    it('should handle special characters', () => {
      expect(validatePassword('pass!@#$%^&*()')).toEqual({ success: true })
      expect(validatePassword('pass{}[]|\\:";\'<>?,./')).toEqual({
        success: true
      })
      expect(validatePassword('pass`~')).toEqual({ success: true })
    })

    it('should handle unicode characters correctly', () => {
      const unicodePassword = '👨‍💻🔐🔑🛡️'
      expect(validatePassword(unicodePassword)).toEqual({ success: true })
    })
  })

  describe('Constants', () => {
    it('should have consistent validation constants', () => {
      expect(typeof MAX_DISPLAY_NAME_LENGTH).toBe('number')
      expect(MAX_DISPLAY_NAME_LENGTH).toBeGreaterThan(0)

      expect(typeof MAX_ROOM_ID_LENGTH).toBe('number')
      expect(MAX_ROOM_ID_LENGTH).toBeGreaterThan(0)

      expect(ROOM_ID_PATTERN).toBeInstanceOf(RegExp)

      expect(typeof MIN_PASSWORD_LENGTH).toBe('number')
      expect(MIN_PASSWORD_LENGTH).toBeGreaterThan(0)

      expect(typeof MAX_PASSWORD_LENGTH).toBe('number')
      expect(MAX_PASSWORD_LENGTH).toBeGreaterThan(MIN_PASSWORD_LENGTH)
    })

    it('should have reasonable validation limits', () => {
      expect(MAX_DISPLAY_NAME_LENGTH).toBe(50)
      expect(MAX_ROOM_ID_LENGTH).toBe(64)
      expect(MIN_PASSWORD_LENGTH).toBe(4)
      expect(MAX_PASSWORD_LENGTH).toBe(128)
      expect(ROOM_ID_PATTERN.source).toBe('^[a-zA-Z0-9_-]+$')
    })
  })

  describe('Edge cases', () => {
    it('should handle whitespace-only strings', () => {
      expect(validateDisplayName('   ')).toEqual({ success: true }) // spaces are valid for display names

      const roomIdResult = validateRoomId('   ')
      expect(roomIdResult.success).toBe(false) // spaces are invalid for room IDs

      const passwordResult = validatePassword('   ')
      expect(passwordResult.success).toBe(false) // too short for password
    })

    it('should handle newlines and tabs', () => {
      expect(validateDisplayName('Name\nWithNewline')).toEqual({
        success: true
      })
      expect(validateDisplayName('Name\tWithTab')).toEqual({ success: true })

      const roomIdNewlineResult = validateRoomId('room\nid')
      expect(roomIdNewlineResult.success).toBe(false)

      const roomIdTabResult = validateRoomId('room\tid')
      expect(roomIdTabResult.success).toBe(false)

      expect(validatePassword('pass\nword')).toEqual({ success: true })
      expect(validatePassword('pass\tword')).toEqual({ success: true })
    })

    it('should handle mixed character sets', () => {
      expect(validateDisplayName('English日本語🙂')).toEqual({ success: true })

      const roomIdResult = validateRoomId('English日本語')
      expect(roomIdResult.success).toBe(false) // unicode not allowed

      expect(validatePassword('English日本語🙂')).toEqual({ success: true })
    })
  })
})
