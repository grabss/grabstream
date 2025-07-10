// ==================== Client Configuration ====================

export type GrabstreamClientOptions = {
  url?: string
  connectionTimeoutMs?: number
  enableDataChannel?: boolean
}

export type GrabstreamClientConfiguration = Required<GrabstreamClientOptions>
