import type {
  ClientToServerMessage,
  ConnectionEstablishedMessage,
  JoinRoomMessage,
  RTCIceCandidate,
  RTCIceServer,
  RTCSessionDescription,
  ServerToClientMessage
} from './types'

describe('Message Types', () => {
  describe('WebRTC Types', () => {
    it('should create valid RTCSessionDescription', () => {
      const offer: RTCSessionDescription = {
        type: 'offer',
        sdp: 'v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n'
      }

      expect(offer.type).toBe('offer')
      expect(offer.sdp).toContain('v=0')
    })

    it('should create valid RTCIceCandidate', () => {
      const candidate: RTCIceCandidate = {
        candidate: 'candidate:1 1 UDP 2013266431 192.168.1.100 54400 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0'
      }

      expect(candidate.candidate).toContain('candidate:')
      expect(candidate.sdpMLineIndex).toBe(0)
    })

    it('should create valid RTCIceServer', () => {
      const iceServer: RTCIceServer = {
        urls: ['stun:stun.l.google.com:19302'],
        username: 'testuser',
        credential: 'testpass'
      }

      expect(Array.isArray(iceServer.urls)).toBe(true)
      expect(iceServer.username).toBe('testuser')
    })
  })

  describe('Client to Server Messages', () => {
    it('should create valid JoinRoomMessage', () => {
      const message: JoinRoomMessage = {
        type: 'JOIN_ROOM',
        payload: {
          roomId: 'test-room',
          displayName: 'Test User',
          password: 'secret'
        }
      }

      expect(message.type).toBe('JOIN_ROOM')
      expect(message.payload.roomId).toBe('test-room')
      expect(message.payload.displayName).toBe('Test User')
    })

    it('should create JoinRoomMessage without optional fields', () => {
      const message: JoinRoomMessage = {
        type: 'JOIN_ROOM',
        payload: {
          roomId: 'test-room'
        }
      }

      expect(message.type).toBe('JOIN_ROOM')
      expect(message.payload.roomId).toBe('test-room')
      expect(message.payload.displayName).toBeUndefined()
      expect(message.payload.password).toBeUndefined()
    })
  })

  describe('Server to Client Messages', () => {
    it('should create valid ConnectionEstablishedMessage', () => {
      const message: ConnectionEstablishedMessage = {
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          peerId: 'peer-123',
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        }
      }

      expect(message.type).toBe('CONNECTION_ESTABLISHED')
      expect(message.payload.peerId).toBe('peer-123')
      expect(Array.isArray(message.payload.iceServers)).toBe(true)
    })
  })

  describe('Union Types', () => {
    it('should accept valid ClientToServerMessage types', () => {
      const messages: ClientToServerMessage[] = [
        {
          type: 'JOIN_ROOM',
          payload: { roomId: 'test' }
        },
        {
          type: 'LEAVE_ROOM',
          payload: {}
        },
        {
          type: 'OFFER',
          payload: {
            toPeerId: 'peer-123',
            offer: { type: 'offer', sdp: 'sdp-content' }
          }
        }
      ]

      expect(messages).toHaveLength(3)
      expect(messages[0].type).toBe('JOIN_ROOM')
      expect(messages[1].type).toBe('LEAVE_ROOM')
      expect(messages[2].type).toBe('OFFER')
    })

    it('should accept valid ServerToClientMessage types', () => {
      const messages: ServerToClientMessage[] = [
        {
          type: 'CONNECTION_ESTABLISHED',
          payload: {
            peerId: 'peer-123',
            iceServers: []
          }
        },
        {
          type: 'ERROR',
          payload: {
            message: 'Test error'
          }
        }
      ]

      expect(messages).toHaveLength(2)
      expect(messages[0].type).toBe('CONNECTION_ESTABLISHED')
      expect(messages[1].type).toBe('ERROR')
    })
  })
})
