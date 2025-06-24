export type SignalingMessage = {
  type: 'join' | 'leave' | 'offer' | 'answer' | 'candidate' | 'update-name'
  roomId?: string
  displayName?: string
  target?: string
  payload?: any
}

export class GrabstreamServer {
  constructor() {
    // Minimal implementation
    console.log('GrabstreamServer initialized')
  }
}
