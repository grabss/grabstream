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
    it('should return true for valid display names', () => {
      expect(validateDisplayName('John')).toBe(true)
      expect(validateDisplayName('Jane Doe')).toBe(true)
      expect(validateDisplayName('User123')).toBe(true)
      expect(validateDisplayName('A')).toBe(true)
      expect(validateDisplayName('あいうえお')).toBe(true)
      expect(validateDisplayName('🙂')).toBe(true)
    })

    it('should return true for display name at max length', () => {
      const maxLengthName = 'A'.repeat(MAX_DISPLAY_NAME_LENGTH)
      expect(validateDisplayName(maxLengthName)).toBe(true)
    })

    it('should return false for empty display name', () => {
      expect(validateDisplayName('')).toBe(false)
    })

    it('should return false for display name exceeding max length', () => {
      const tooLongName = 'A'.repeat(MAX_DISPLAY_NAME_LENGTH + 1)
      expect(validateDisplayName(tooLongName)).toBe(false)
    })

    it('should handle unicode characters correctly', () => {
      const unicodeName = '👨‍💻'.repeat(10) // Short unicode string
      expect(validateDisplayName(unicodeName)).toBe(true)

      // Test with simple unicode
      expect(validateDisplayName('あいうえお')).toBe(true)
    })
  })

  describe('validateRoomId', () => {
    it('should return true for valid room IDs', () => {
      expect(validateRoomId('room123')).toBe(true)
      expect(validateRoomId('test-room')).toBe(true)
      expect(validateRoomId('room_test')).toBe(true)
      expect(validateRoomId('ABC123')).toBe(true)
      expect(validateRoomId('a')).toBe(true)
      expect(validateRoomId('123')).toBe(true)
      expect(validateRoomId('test-room-123_ABC')).toBe(true)
    })

    it('should return true for room ID at max length', () => {
      const maxLengthRoomId = 'A'.repeat(MAX_ROOM_ID_LENGTH)
      expect(validateRoomId(maxLengthRoomId)).toBe(true)
    })

    it('should return false for empty room ID', () => {
      expect(validateRoomId('')).toBe(false)
    })

    it('should return false for room ID exceeding max length', () => {
      const tooLongRoomId = 'A'.repeat(MAX_ROOM_ID_LENGTH + 1)
      expect(validateRoomId(tooLongRoomId)).toBe(false)
    })

    it('should return false for room IDs with invalid characters', () => {
      expect(validateRoomId('room 123')).toBe(false) // space
      expect(validateRoomId('room@123')).toBe(false) // @
      expect(validateRoomId('room#123')).toBe(false) // #
      expect(validateRoomId('room.123')).toBe(false) // .
      expect(validateRoomId('room!123')).toBe(false) // !
      expect(validateRoomId('room$123')).toBe(false) // $
      expect(validateRoomId('room%123')).toBe(false) // %
      expect(validateRoomId('room&123')).toBe(false) // &
      expect(validateRoomId('room*123')).toBe(false) // *
      expect(validateRoomId('room+123')).toBe(false) // +
      expect(validateRoomId('room=123')).toBe(false) // =
      expect(validateRoomId('room?123')).toBe(false) // ?
      expect(validateRoomId('room/123')).toBe(false) // /
      expect(validateRoomId('room\\123')).toBe(false) // \
      expect(validateRoomId('room|123')).toBe(false) // |
    })

    it('should return false for room IDs with unicode characters', () => {
      expect(validateRoomId('room-あいうえお')).toBe(false)
      expect(validateRoomId('room-🙂')).toBe(false)
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
    it('should return true for valid passwords', () => {
      expect(validatePassword('1234')).toBe(true) // min length
      expect(validatePassword('password')).toBe(true)
      expect(validatePassword('Password123!')).toBe(true)
      expect(validatePassword('あいうえお')).toBe(true)
      expect(validatePassword('🔐secure')).toBe(true)
    })

    it('should return true for password at min length', () => {
      const minLengthPassword = 'A'.repeat(MIN_PASSWORD_LENGTH)
      expect(validatePassword(minLengthPassword)).toBe(true)
    })

    it('should return true for password at max length', () => {
      const maxLengthPassword = 'A'.repeat(MAX_PASSWORD_LENGTH)
      expect(validatePassword(maxLengthPassword)).toBe(true)
    })

    it('should return false for empty password', () => {
      expect(validatePassword('')).toBe(false)
    })

    it('should return false for password shorter than min length', () => {
      const tooShortPassword = 'A'.repeat(MIN_PASSWORD_LENGTH - 1)
      expect(validatePassword(tooShortPassword)).toBe(false)
    })

    it('should return false for password exceeding max length', () => {
      const tooLongPassword = 'A'.repeat(MAX_PASSWORD_LENGTH + 1)
      expect(validatePassword(tooLongPassword)).toBe(false)
    })

    it('should handle special characters', () => {
      expect(validatePassword('pass!@#$%^&*()')).toBe(true)
      expect(validatePassword('pass{}[]|\\:";\'<>?,./')).toBe(true)
      expect(validatePassword('pass`~')).toBe(true)
    })

    it('should handle unicode characters correctly', () => {
      const unicodePassword = '👨‍💻🔐🔑🛡️'
      expect(validatePassword(unicodePassword)).toBe(true)
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
      expect(validateDisplayName('   ')).toBe(true) // spaces are valid for display names
      expect(validateRoomId('   ')).toBe(false) // spaces are invalid for room IDs
      expect(validatePassword('   ')).toBe(false) // too short for password
    })

    it('should handle newlines and tabs', () => {
      expect(validateDisplayName('Name\nWithNewline')).toBe(true)
      expect(validateDisplayName('Name\tWithTab')).toBe(true)
      expect(validateRoomId('room\nid')).toBe(false)
      expect(validateRoomId('room\tid')).toBe(false)
      expect(validatePassword('pass\nword')).toBe(true)
      expect(validatePassword('pass\tword')).toBe(true)
    })

    it('should handle mixed character sets', () => {
      expect(validateDisplayName('English日本語🙂')).toBe(true)
      expect(validateRoomId('English日本語')).toBe(false) // unicode not allowed
      expect(validatePassword('English日本語🙂')).toBe(true)
    })
  })
})
