import type { ClientToServerMessage, ServerToClientMessage } from './types'

export function isClientToServerMessage(
  message: unknown
): message is ClientToServerMessage {
  if (typeof message !== 'object' || message === null) {
    return false
  }
  const msg = message as { type?: string; payload?: unknown }
  if (!msg.type || typeof msg.payload !== 'object') {
    return false
  }
  return [
    'JOIN_ROOM',
    'LEAVE_ROOM',
    'UPDATE_DISPLAY_NAME',
    'KNOCK',
    'CUSTOM',
    'OFFER',
    'ANSWER',
    'ICE_CANDIDATE'
  ].includes(msg.type)
}

export function isServerToClientMessage(
  message: unknown
): message is ServerToClientMessage {
  if (typeof message !== 'object' || message === null) {
    return false
  }
  const msg = message as { type?: string; payload?: unknown }
  if (!msg.type || typeof msg.payload !== 'object') {
    return false
  }
  return [
    'CONNECTION_ESTABLISHED',
    'ROOM_JOINED',
    'ROOM_LEFT',
    'PEER_JOINED',
    'PEER_LEFT',
    'PEER_UPDATED',
    'DISPLAY_NAME_UPDATED',
    'CUSTOM',
    'ERROR',
    'PASSWORD_REQUIRED',
    'KNOCK_RESPONSE',
    'OFFER',
    'ANSWER',
    'ICE_CANDIDATE'
  ].includes(msg.type)
}
