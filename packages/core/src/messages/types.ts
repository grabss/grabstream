// ==================== WebRTC Types ====================

export type RTCIceServer = {
  urls: string | string[]
  username?: string
  credential?: string
}

export type RTCSessionDescription = {
  type: 'offer' | 'answer'
  sdp: string
}

export type RTCIceCandidate = {
  candidate: string
  sdpMLineIndex?: number
  sdpMid?: string
  usernameFragment?: string
}

// ==================== Client to Server Messages ====================

// Room management
export type JoinRoomMessage = {
  type: 'JOIN_ROOM'
  payload: {
    roomId: string
    displayName?: string
    password?: string
  }
}

export type LeaveRoomMessage = {
  type: 'LEAVE_ROOM'
  payload?: Record<string, never>
}

export type UpdateDisplayNameMessage = {
  type: 'UPDATE_DISPLAY_NAME'
  payload: {
    displayName: string
  }
}

export type KnockMessage = {
  type: 'KNOCK'
  payload: {
    roomId: string
  }
}

// Custom messages
export type CustomMessage = {
  type: 'CUSTOM'
  payload: {
    customType: string
    target?: {
      type: 'peer' | 'room'
      peerId?: string
    }
    data: unknown
  }
}

// WebRTC Signaling
export type OfferMessage = {
  type: 'OFFER'
  payload: {
    toPeerId: string
    offer: RTCSessionDescription
  }
}

export type AnswerMessage = {
  type: 'ANSWER'
  payload: {
    toPeerId: string
    answer: RTCSessionDescription
  }
}

export type IceCandidateMessage = {
  type: 'ICE_CANDIDATE'
  payload: {
    toPeerId: string
    candidate: RTCIceCandidate
  }
}

// ==================== Server to Client Messages ====================

// Connection management
export type ConnectionEstablishedMessage = {
  type: 'CONNECTION_ESTABLISHED'
  payload: {
    peerId: string
    displayName: string
    iceServers: RTCIceServer[]
  }
}

// Room management
export type RoomJoinedMessage = {
  type: 'ROOM_JOINED'
  payload: {
    roomId: string
    displayName: string
    peers: Array<{
      id: string
      displayName: string
    }>
  }
}

export type RoomLeftMessage = {
  type: 'ROOM_LEFT'
  payload: {
    roomId: string
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

export type PeerUpdatedMessage = {
  type: 'PEER_UPDATED'
  payload: {
    peerId: string
    displayName: string
  }
}

export type DisplayNameUpdatedMessage = {
  type: 'DISPLAY_NAME_UPDATED'
  payload: {
    displayName: string
  }
}

// WebRTC Signaling
export type OfferRelayMessage = {
  type: 'OFFER'
  payload: {
    fromPeerId: string
    toPeerId: string
    offer: RTCSessionDescription
  }
}

export type AnswerRelayMessage = {
  type: 'ANSWER'
  payload: {
    fromPeerId: string
    toPeerId: string
    answer: RTCSessionDescription
  }
}

export type IceCandidateRelayMessage = {
  type: 'ICE_CANDIDATE'
  payload: {
    fromPeerId: string
    toPeerId: string
    candidate: RTCIceCandidate
  }
}

// Custom message relay
export type CustomRelayMessage = {
  type: 'CUSTOM'
  payload: {
    fromPeerId: string
    customType: string
    data: unknown
  }
}

// Error
export type ErrorMessage = {
  type: 'ERROR'
  payload: {
    message: string
  }
}

// Password management
export type PasswordRequiredMessage = {
  type: 'PASSWORD_REQUIRED'
  payload: {
    roomId: string
  }
}

export type KnockResponseMessage = {
  type: 'KNOCK_RESPONSE'
  payload: {
    roomId: string
    exists: boolean
    hasPassword: boolean
    peerCount: number
    isFull: boolean
  }
}

// ==================== Union Types ====================

export type ClientToServerMessage =
  | JoinRoomMessage
  | LeaveRoomMessage
  | UpdateDisplayNameMessage
  | KnockMessage
  | CustomMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage

export type ServerToClientMessage =
  | ConnectionEstablishedMessage
  | RoomJoinedMessage
  | RoomLeftMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | PeerUpdatedMessage
  | DisplayNameUpdatedMessage
  | CustomRelayMessage
  | ErrorMessage
  | PasswordRequiredMessage
  | KnockResponseMessage
  | OfferRelayMessage
  | AnswerRelayMessage
  | IceCandidateRelayMessage
