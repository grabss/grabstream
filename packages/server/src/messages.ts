// ==================== Client to Server Messages ====================

export type JoinRoomMessage = {
  type: 'JOIN_ROOM'
  payload: {
    roomId: string
    displayName?: string
  }
}

export type LeaveRoomMessage = {
  type: 'LEAVE_ROOM'
  payload?: Record<string, never>
}

// ==================== Server to Client Messages ====================

// Connection management
export type ConnectionEstablishedMessage = {
  type: 'CONNECTION_ESTABLISHED'
  payload: {
    peerId: string
  }
}

// Room management
export type RoomJoinedMessage = {
  type: 'ROOM_JOINED'
  payload: {
    roomId: string
    peers: Array<{
      id: string
      displayName: string
    }>
  }
}

export type PeerJoinedMessage = {
  type: 'PEER_JOINED'
  payload: {
    peerId: string
    displayName: string
  }
}

export type PeerLeftMessage = {
  type: 'PEER_LEFT'
  payload: {
    peerId: string
  }
}

// Error
export type ErrorMessage = {
  type: 'ERROR'
  payload: {
    message: string
  }
}

// WebRTC Signaling (for future use)
export type OfferMessage = {
  type: 'OFFER'
  payload: {
    fromPeerId: string
    toPeerId: string
    offer: string
  }
}

export type AnswerMessage = {
  type: 'ANSWER'
  payload: {
    fromPeerId: string
    toPeerId: string
    answer: string
  }
}

export type IceCandidateMessage = {
  type: 'ICE_CANDIDATE'
  payload: {
    fromPeerId: string
    toPeerId: string
    candidate: string
  }
}

// ==================== Union Types ====================

export type ClientToServerMessage =
  | JoinRoomMessage
  | LeaveRoomMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage

export type ServerToClientMessage =
  | ConnectionEstablishedMessage
  | RoomJoinedMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | ErrorMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage

// ==================== Type Guards ====================

export function isClientToServerMessage(
  message: unknown
): message is ClientToServerMessage {
  if (typeof message !== 'object' || message === null) {
    return false
  }
  const msg = message as { type?: string }
  return [
    'JOIN_ROOM',
    'LEAVE_ROOM',
    'OFFER',
    'ANSWER',
    'ICE_CANDIDATE'
  ].includes(msg.type || '')
}

// ==================== Utility Types ====================

export type MessageType =
  | ClientToServerMessage['type']
  | ServerToClientMessage['type']

export type PeerInfo = {
  id: string
  displayName: string
}
