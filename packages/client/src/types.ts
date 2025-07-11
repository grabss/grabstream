// ==================== Client Configuration ====================

export type GrabstreamClientOptions = {
  url?: string
  connectionTimeoutMs?: number
}

export type GrabstreamClientConfiguration = Required<GrabstreamClientOptions>

// ==================== Stream Management ====================

export type StreamType = 'AUDIO_VIDEO' | 'AUDIO' | 'SCREEN'

export type StreamMetadata = {
  streamId: string
  type: StreamType
  timestamp: number
}

export type StreamDataChannelMessage =
  | {
      type: 'STREAM_METADATA'
      data: StreamMetadata
    }
  | {
      type: 'STREAM_REMOVED'
      data: { streamId: string }
    }

export type LocalStream = {
  type: StreamType
  stream: MediaStream
}
