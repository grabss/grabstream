import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_ROOM_ID_LENGTH,
  MIN_PASSWORD_LENGTH,
  ROOM_ID_PATTERN
} from './constants'

export * from './constants'

export function validateDisplayName(name: string): boolean {
  return name.length > 0 && name.length <= MAX_DISPLAY_NAME_LENGTH
}

export function validateRoomId(roomId: string): boolean {
  return roomId.length <= MAX_ROOM_ID_LENGTH && ROOM_ID_PATTERN.test(roomId)
}

export function validatePassword(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  )
}
