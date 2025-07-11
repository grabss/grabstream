import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MockMediaStream, type MockMediaStreamTrack } from '../test-utils/mocks'
import { LocalPeer } from './local'

describe('LocalPeer', () => {
  let peer: LocalPeer
  let mockStream: MockMediaStream
  let mockAudioTrack: MockMediaStreamTrack
  let mockVideoTrack: MockMediaStreamTrack

  beforeEach(() => {
    peer = new LocalPeer({ id: 'test-peer', displayName: 'Test User' })
    mockStream = new MockMediaStream('test-stream')
    mockAudioTrack = mockStream.addMockTrack('audio')
    mockVideoTrack = mockStream.addMockTrack('video')
  })

  describe('constructor', () => {
    it('should create peer with correct properties', () => {
      expect(peer.id).toBe('test-peer')
      expect(peer.displayName).toBe('Test User')
      expect(peer.roomId).toBeUndefined()
      expect(peer.isInRoom).toBe(false)
      expect(peer.streams).toEqual([])
    })
  })

  describe('getters', () => {
    it('should return correct id', () => {
      expect(peer.id).toBe('test-peer')
    })

    it('should return correct display name', () => {
      expect(peer.displayName).toBe('Test User')
    })

    it('should return undefined room id when not in room', () => {
      expect(peer.roomId).toBeUndefined()
    })

    it('should return false for isInRoom when not in room', () => {
      expect(peer.isInRoom).toBe(false)
    })

    it('should return empty streams array initially', () => {
      expect(peer.streams).toEqual([])
    })
  })

  describe('joinRoom', () => {
    it('should join room successfully', () => {
      peer.joinRoom({ roomId: 'test-room', displayName: 'Updated Name' })

      expect(peer.roomId).toBe('test-room')
      expect(peer.displayName).toBe('Updated Name')
      expect(peer.isInRoom).toBe(true)
    })

    it('should throw error if already in room', () => {
      peer.joinRoom({ roomId: 'test-room', displayName: 'Test User' })

      expect(() => {
        peer.joinRoom({ roomId: 'another-room', displayName: 'Test User' })
      }).toThrow('Already in room test-room')
    })
  })

  describe('leaveRoom', () => {
    it('should leave room successfully', () => {
      peer.joinRoom({ roomId: 'test-room', displayName: 'Test User' })
      peer.leaveRoom()

      expect(peer.roomId).toBeUndefined()
      expect(peer.isInRoom).toBe(false)
    })

    it('should throw error if not in room', () => {
      expect(() => {
        peer.leaveRoom()
      }).toThrow('Not in any room')
    })
  })

  describe('updateDisplayName', () => {
    it('should update display name', () => {
      peer.updateDisplayName('New Name')

      expect(peer.displayName).toBe('New Name')
    })
  })

  describe('addStream', () => {
    it('should add stream successfully', () => {
      peer.addStream(mockStream as unknown as MediaStream, 'AUDIO_VIDEO')

      expect(peer.streams).toHaveLength(1)
      expect(peer.streams[0]).toEqual({
        stream: mockStream,
        type: 'AUDIO_VIDEO'
      })
    })

    it('should replace stream of same type', () => {
      const firstStream = new MockMediaStream('first-stream')
      const secondStream = new MockMediaStream('second-stream')

      peer.addStream(firstStream as unknown as MediaStream, 'AUDIO_VIDEO')
      peer.addStream(secondStream as unknown as MediaStream, 'AUDIO_VIDEO')

      expect(peer.streams).toHaveLength(1)
      expect(peer.streams[0].stream).toBe(secondStream)
    })

    it('should stop tracks of replaced stream', () => {
      const firstStream = new MockMediaStream('first-stream')
      const audioTrack = firstStream.addMockTrack('audio')
      const videoTrack = firstStream.addMockTrack('video')

      peer.addStream(firstStream as unknown as MediaStream, 'AUDIO_VIDEO')

      const secondStream = new MockMediaStream('second-stream')
      peer.addStream(secondStream as unknown as MediaStream, 'AUDIO_VIDEO')

      expect(audioTrack.stop).toHaveBeenCalled()
      expect(videoTrack.stop).toHaveBeenCalled()
    })

    it('should allow different stream types', () => {
      const audioStream = new MockMediaStream('audio-stream')
      const videoStream = new MockMediaStream('video-stream')

      peer.addStream(audioStream as unknown as MediaStream, 'AUDIO')
      peer.addStream(videoStream as unknown as MediaStream, 'AUDIO_VIDEO')

      expect(peer.streams).toHaveLength(2)
    })
  })

  describe('removeStream', () => {
    beforeEach(() => {
      peer.addStream(mockStream as unknown as MediaStream, 'AUDIO_VIDEO')
    })

    it('should remove stream successfully', () => {
      peer.removeStream(mockStream.id)

      expect(peer.streams).toHaveLength(0)
    })

    it('should stop tracks when removing stream', () => {
      peer.removeStream(mockStream.id)

      expect(mockAudioTrack.stop).toHaveBeenCalled()
      expect(mockVideoTrack.stop).toHaveBeenCalled()
    })

    it('should handle removing non-existent stream', () => {
      expect(() => {
        peer.removeStream('non-existent-id')
      }).not.toThrow()
    })
  })

  describe('audio control', () => {
    beforeEach(() => {
      const audioStream = new MockMediaStream('audio-stream')
      audioStream.addMockTrack('audio')
      peer.addStream(audioStream as unknown as MediaStream, 'AUDIO')

      const videoStream = new MockMediaStream('video-stream')
      videoStream.addMockTrack('audio')
      videoStream.addMockTrack('video')
      peer.addStream(videoStream as unknown as MediaStream, 'AUDIO_VIDEO')
    })

    it('should mute audio', () => {
      peer.muteAudio()

      for (const stream of peer.streams) {
        if (stream.type === 'AUDIO' || stream.type === 'AUDIO_VIDEO') {
          const audioTracks = (
            stream.stream as unknown as MockMediaStream
          ).getAudioTracks()
          audioTracks.forEach((track) => {
            expect(track.enabled).toBe(false)
          })
        }
      }
    })

    it('should unmute audio', () => {
      peer.muteAudio()
      peer.unmuteAudio()

      for (const stream of peer.streams) {
        if (stream.type === 'AUDIO' || stream.type === 'AUDIO_VIDEO') {
          const audioTracks = (
            stream.stream as unknown as MockMediaStream
          ).getAudioTracks()
          audioTracks.forEach((track) => {
            expect(track.enabled).toBe(true)
          })
        }
      }
    })

    it('should not affect video tracks when muting audio', () => {
      peer.muteAudio()

      for (const stream of peer.streams) {
        if (stream.type === 'AUDIO_VIDEO') {
          const videoTracks = (
            stream.stream as unknown as MockMediaStream
          ).getVideoTracks()
          videoTracks.forEach((track) => {
            expect(track.enabled).toBe(true)
          })
        }
      }
    })
  })

  describe('video control', () => {
    beforeEach(() => {
      const videoStream = new MockMediaStream('video-stream')
      videoStream.addMockTrack('audio')
      videoStream.addMockTrack('video')
      peer.addStream(videoStream as unknown as MediaStream, 'AUDIO_VIDEO')
    })

    it('should disable video', () => {
      peer.disableVideo()

      for (const stream of peer.streams) {
        if (stream.type === 'AUDIO_VIDEO') {
          const videoTracks = (
            stream.stream as unknown as MockMediaStream
          ).getVideoTracks()
          videoTracks.forEach((track) => {
            expect(track.enabled).toBe(false)
          })
        }
      }
    })

    it('should enable video', () => {
      peer.disableVideo()
      peer.enableVideo()

      for (const stream of peer.streams) {
        if (stream.type === 'AUDIO_VIDEO') {
          const videoTracks = (
            stream.stream as unknown as MockMediaStream
          ).getVideoTracks()
          videoTracks.forEach((track) => {
            expect(track.enabled).toBe(true)
          })
        }
      }
    })

    it('should not affect audio tracks when disabling video', () => {
      peer.disableVideo()

      for (const stream of peer.streams) {
        if (stream.type === 'AUDIO_VIDEO') {
          const audioTracks = (
            stream.stream as unknown as MockMediaStream
          ).getAudioTracks()
          audioTracks.forEach((track) => {
            expect(track.enabled).toBe(true)
          })
        }
      }
    })

    it('should not affect AUDIO streams when controlling video', () => {
      const audioStream = new MockMediaStream('audio-stream')
      const audioTrack = audioStream.addMockTrack('audio')
      peer.addStream(audioStream as unknown as MediaStream, 'AUDIO')

      peer.disableVideo()

      expect(audioTrack.enabled).toBe(true)
    })
  })

  describe('integration', () => {
    it('should handle complete peer lifecycle', () => {
      // Join room
      peer.joinRoom({ roomId: 'test-room', displayName: 'Test User' })
      expect(peer.isInRoom).toBe(true)

      // Add stream
      peer.addStream(mockStream as unknown as MediaStream, 'AUDIO_VIDEO')
      expect(peer.streams).toHaveLength(1)

      // Control audio/video
      peer.muteAudio()
      peer.disableVideo()

      // Update display name
      peer.updateDisplayName('Updated Name')
      expect(peer.displayName).toBe('Updated Name')

      // Remove stream
      peer.removeStream(mockStream.id)
      expect(peer.streams).toHaveLength(0)

      // Leave room
      peer.leaveRoom()
      expect(peer.isInRoom).toBe(false)
    })
  })
})
