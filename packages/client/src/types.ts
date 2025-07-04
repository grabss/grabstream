// ==================== Client Configuration ====================

export type GrabstreamClientOptions = {
  url?: string
  connectionTimeoutMs?: number
}

export type GrabstreamClientConfiguration = Required<GrabstreamClientOptions>

// ==================== Room Management ====================

export type JoinRoomOptions = {
  displayName?: string
  password?: string
}

// ==================== Peer Management ====================

export type Peer = {
  id: string
  displayName: string
}

// ==================== Connection Types ====================

export type WebSocketConnectionState = 'disconnected' | 'connecting' | 'connected'

// ==================== WebRTC Types ====================

export type MediaStreamConstraints = {
  audio?: boolean | MediaTrackConstraints
  video?: boolean | MediaTrackConstraints
}
