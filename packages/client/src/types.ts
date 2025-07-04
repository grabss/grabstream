// ==================== Client Configuration ====================

export type GrabstreamClientOptions = {
  url?: string
  connectionTimeoutMs?: number
}

export type GrabstreamClientConfiguration = Required<GrabstreamClientOptions>

export type Peer = {
  id: string
  displayName: string
}
