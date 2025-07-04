import { isClientToServerMessage, isServerToClientMessage } from './guards'
import type { ClientToServerMessage, ServerToClientMessage } from './types'

describe('Message Guards', () => {
  describe('isClientToServerMessage', () => {
    it('should return true for valid JOIN_ROOM message', () => {
      const message = {
        type: 'JOIN_ROOM',
        payload: {
          roomId: 'test-room',
          displayName: 'Test User'
        }
      }

      expect(isClientToServerMessage(message)).toBe(true)
    })

    it('should return true for valid LEAVE_ROOM message', () => {
      const message = {
        type: 'LEAVE_ROOM',
        payload: {}
      }

      expect(isClientToServerMessage(message)).toBe(true)
    })

    it('should return true for valid OFFER message', () => {
      const message = {
        type: 'OFFER',
        payload: {
          toPeerId: 'peer-123',
          offer: { type: 'offer', sdp: 'sdp-content' }
        }
      }

      expect(isClientToServerMessage(message)).toBe(true)
    })

    it('should return true for valid ANSWER message', () => {
      const message = {
        type: 'ANSWER',
        payload: {
          toPeerId: 'peer-123',
          answer: { type: 'answer', sdp: 'sdp-content' }
        }
      }

      expect(isClientToServerMessage(message)).toBe(true)
    })

    it('should return true for valid ICE_CANDIDATE message', () => {
      const message = {
        type: 'ICE_CANDIDATE',
        payload: {
          toPeerId: 'peer-123',
          candidate: {
            candidate:
              'candidate:1 1 UDP 2013266431 192.168.1.100 54400 typ host',
            sdpMLineIndex: 0,
            sdpMid: '0'
          }
        }
      }

      expect(isClientToServerMessage(message)).toBe(true)
    })

    it('should return false for server-to-client messages', () => {
      const message = {
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          peerId: 'peer-123',
          iceServers: []
        }
      }

      expect(isClientToServerMessage(message)).toBe(false)
    })

    it('should return false for invalid message structure', () => {
      expect(isClientToServerMessage(null)).toBe(false)
      expect(isClientToServerMessage(undefined)).toBe(false)
      expect(isClientToServerMessage({})).toBe(false)
      expect(isClientToServerMessage({ type: 'INVALID' })).toBe(false)
      expect(isClientToServerMessage({ payload: {} })).toBe(false)
      expect(isClientToServerMessage('string')).toBe(false)
      expect(isClientToServerMessage(123)).toBe(false)
    })

    it('should return false for missing payload', () => {
      const message = {
        type: 'JOIN_ROOM'
      }

      expect(isClientToServerMessage(message)).toBe(false)
    })
  })

  describe('isServerToClientMessage', () => {
    it('should return true for valid CONNECTION_ESTABLISHED message', () => {
      const message = {
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          peerId: 'peer-123',
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        }
      }

      expect(isServerToClientMessage(message)).toBe(true)
    })

    it('should return true for valid ERROR message', () => {
      const message = {
        type: 'ERROR',
        payload: {
          message: 'Test error message'
        }
      }

      expect(isServerToClientMessage(message)).toBe(true)
    })

    it('should return true for valid PEER_JOINED message', () => {
      const message = {
        type: 'PEER_JOINED',
        payload: {
          peerId: 'peer-123',
          displayName: 'New User'
        }
      }

      expect(isServerToClientMessage(message)).toBe(true)
    })

    it('should return true for valid PEER_LEFT message', () => {
      const message = {
        type: 'PEER_LEFT',
        payload: {
          peerId: 'peer-123'
        }
      }

      expect(isServerToClientMessage(message)).toBe(true)
    })

    it('should return true for valid OFFER message', () => {
      const message = {
        type: 'OFFER',
        payload: {
          fromPeerId: 'peer-123',
          offer: { type: 'offer', sdp: 'sdp-content' }
        }
      }

      expect(isServerToClientMessage(message)).toBe(true)
    })

    it('should return true for valid ANSWER message', () => {
      const message = {
        type: 'ANSWER',
        payload: {
          fromPeerId: 'peer-123',
          answer: { type: 'answer', sdp: 'sdp-content' }
        }
      }

      expect(isServerToClientMessage(message)).toBe(true)
    })

    it('should return true for valid ICE_CANDIDATE message', () => {
      const message = {
        type: 'ICE_CANDIDATE',
        payload: {
          fromPeerId: 'peer-123',
          candidate: {
            candidate:
              'candidate:1 1 UDP 2013266431 192.168.1.100 54400 typ host',
            sdpMLineIndex: 0,
            sdpMid: '0'
          }
        }
      }

      expect(isServerToClientMessage(message)).toBe(true)
    })

    it('should return false for client-to-server messages', () => {
      const message = {
        type: 'JOIN_ROOM',
        payload: {
          roomId: 'test-room'
        }
      }

      expect(isServerToClientMessage(message)).toBe(false)
    })

    it('should return false for invalid message structure', () => {
      expect(isServerToClientMessage(null)).toBe(false)
      expect(isServerToClientMessage(undefined)).toBe(false)
      expect(isServerToClientMessage({})).toBe(false)
      expect(isServerToClientMessage({ type: 'INVALID' })).toBe(false)
      expect(isServerToClientMessage({ payload: {} })).toBe(false)
      expect(isServerToClientMessage('string')).toBe(false)
      expect(isServerToClientMessage(123)).toBe(false)
    })

    it('should return false for missing payload', () => {
      const message = {
        type: 'ERROR'
      }

      expect(isServerToClientMessage(message)).toBe(false)
    })
  })

  describe('Type safety', () => {
    it('should provide proper type narrowing for ClientToServerMessage', () => {
      const message: unknown = {
        type: 'JOIN_ROOM',
        payload: {
          roomId: 'test-room'
        }
      }

      if (isClientToServerMessage(message)) {
        // TypeScript should now know this is ClientToServerMessage
        expect(message.type).toBeDefined()
        expect(message.payload).toBeDefined()

        // This should compile without errors
        const clientMessage: ClientToServerMessage = message
        expect(clientMessage).toBeDefined()
      }
    })

    it('should provide proper type narrowing for ServerToClientMessage', () => {
      const message: unknown = {
        type: 'ERROR',
        payload: {
          message: 'Test error'
        }
      }

      if (isServerToClientMessage(message)) {
        // TypeScript should now know this is ServerToClientMessage
        expect(message.type).toBeDefined()
        expect(message.payload).toBeDefined()

        // This should compile without errors
        const serverMessage: ServerToClientMessage = message
        expect(serverMessage).toBeDefined()
      }
    })
  })
})
