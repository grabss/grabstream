import { vi } from 'vitest'

// WebRTCのグローバルAPIをモック化
global.RTCSessionDescription = vi.fn().mockImplementation((init) => ({
  type: init?.type || 'offer',
  sdp: init?.sdp || ''
}))

global.RTCIceCandidate = vi.fn().mockImplementation((init) => ({
  candidate: init?.candidate || '',
  sdpMLineIndex: init?.sdpMLineIndex || 0,
  sdpMid: init?.sdpMid || ''
}))

global.RTCPeerConnectionIceEvent = vi
  .fn()
  .mockImplementation((type, eventInitDict) => ({
    type,
    candidate: eventInitDict?.candidate || null
  }))

global.RTCTrackEvent = vi.fn().mockImplementation((type, eventInitDict) => ({
  type,
  track: eventInitDict?.track || null,
  streams: eventInitDict?.streams || [],
  receiver: eventInitDict?.receiver || null,
  transceiver: eventInitDict?.transceiver || null
}))

global.RTCDataChannelEvent = vi
  .fn()
  .mockImplementation((type, eventInitDict) => ({
    type,
    channel: eventInitDict?.channel || null
  }))

global.MessageEvent = vi.fn().mockImplementation((type, eventInitDict) => ({
  type,
  data: eventInitDict?.data || null
}))

global.Event = vi.fn().mockImplementation((type) => ({
  type
}))

global.CloseEvent = vi.fn().mockImplementation((type, eventInitDict) => ({
  type,
  code: eventInitDict?.code || 1000,
  reason: eventInitDict?.reason || ''
}))
