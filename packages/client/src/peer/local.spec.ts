import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalPeer } from './local'

// Mock MediaStream and MediaStreamTrack
class MockMediaStreamTrack {
  enabled = true
  id: string
  kind: string

  constructor(kind: string) {
    this.id = `${kind}-track-${Math.random()}`
    this.kind = kind
  }

  stop() {
    // Mock implementation
  }
}

class MockMediaStream {
  id: string
  private tracks: MockMediaStreamTrack[] = []

  constructor(id?: string) {
    this.id = id || `stream-${Math.random()}`
  }

  addTrack(track: MockMediaStreamTrack) {
    this.tracks.push(track)
  }

  getTracks() {
    return this.tracks
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === 'audio')
  }

  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === 'video')
  }
}

describe('LocalPeer', () => {
  let peer: LocalPeer

  beforeEach(() => {
    peer = new LocalPeer({
      id: 'test-peer-id',
      displayName: 'Test User'
    })
  })

  describe('constructor', () => {
    it('should create peer with correct properties', () => {
      expect(peer.id).toBe('test-peer-id')
      expect(peer.displayName).toBe('Test User')
      expect(peer.roomId).toBeUndefined()
      expect(peer.isInRoom).toBe(false)
      expect(peer.streams).toEqual([])
    })
  })

  describe('getters', () => {
    it('should return correct id', () => {
      expect(peer.id).toBe('test-peer-id')
    })

    it('should return correct display name', () => {
      expect(peer.displayName).toBe('Test User')
    })

    it('should return undefined room id initially', () => {
      expect(peer.roomId).toBeUndefined()
    })

    it('should return false for isInRoom initially', () => {
      expect(peer.isInRoom).toBe(false)
    })

    it('should return empty array for streams initially', () => {
      expect(peer.streams).toEqual([])
    })
  })

  describe('joinRoom', () => {
    it('should join room successfully', () => {
      peer.joinRoom({
        roomId: 'test-room',
        displayName: 'Updated Name'
      })

      expect(peer.roomId).toBe('test-room')
      expect(peer.displayName).toBe('Updated Name')
      expect(peer.isInRoom).toBe(true)
    })

    it('should throw error when already in room', () => {
      peer.joinRoom({
        roomId: 'test-room',
        displayName: 'Updated Name'
      })

      expect(() => {
        peer.joinRoom({
          roomId: 'another-room',
          displayName: 'Another Name'
        })
      }).toThrow('Already in room test-room')
    })
  })

  describe('leaveRoom', () => {
    it('should leave room successfully', () => {
      peer.joinRoom({
        roomId: 'test-room',
        displayName: 'Updated Name'
      })

      peer.leaveRoom()

      expect(peer.roomId).toBeUndefined()
      expect(peer.isInRoom).toBe(false)
    })

    it('should throw error when not in room', () => {
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

  describe('stream management', () => {
    let mockStream: MockMediaStream
    let audioTrack: MockMediaStreamTrack
    let videoTrack: MockMediaStreamTrack

    beforeEach(() => {
      mockStream = new MockMediaStream('test-stream')
      audioTrack = new MockMediaStreamTrack('audio')
      videoTrack = new MockMediaStreamTrack('video')
      mockStream.addTrack(audioTrack)
      mockStream.addTrack(videoTrack)
    })

    describe('addStream', () => {
      it('should add stream successfully', () => {
        peer.addStream(mockStream as unknown as MediaStream, 'AUDIO_VIDEO')

        expect(peer.streams).toHaveLength(1)
        expect(peer.streams[0].type).toBe('AUDIO_VIDEO')
        expect(peer.streams[0].stream.id).toBe('test-stream')
      })

      it('should replace existing stream of same type', () => {
        const firstStream = new MockMediaStream('first-stream')
        const firstAudioTrack = new MockMediaStreamTrack('audio')
        firstStream.addTrack(firstAudioTrack)
        const stopSpy = vi.spyOn(firstAudioTrack, 'stop')

        peer.addStream(firstStream as unknown as MediaStream, 'AUDIO')
        expect(peer.streams).toHaveLength(1)

        const secondStream = new MockMediaStream('second-stream')
        peer.addStream(secondStream as unknown as MediaStream, 'AUDIO')

        expect(peer.streams).toHaveLength(1)
        expect(peer.streams[0].stream.id).toBe('second-stream')
        expect(stopSpy).toHaveBeenCalled()
      })
    })

    describe('removeStream', () => {
      it('should remove stream successfully', () => {
        peer.addStream(mockStream as unknown as MediaStream, 'AUDIO_VIDEO')
        const stopSpy = vi.spyOn(audioTrack, 'stop')

        peer.removeStream('test-stream')

        expect(peer.streams).toHaveLength(0)
        expect(stopSpy).toHaveBeenCalled()
      })

      it('should do nothing when stream not found', () => {
        peer.removeStream('non-existent-stream')
        expect(peer.streams).toHaveLength(0)
      })
    })

    describe('audio control', () => {
      beforeEach(() => {
        peer.addStream(mockStream as unknown as MediaStream, 'AUDIO_VIDEO')
      })

      it('should mute audio', () => {
        peer.muteAudio()
        expect(audioTrack.enabled).toBe(false)
      })

      it('should unmute audio', () => {
        peer.muteAudio()
        peer.unmuteAudio()
        expect(audioTrack.enabled).toBe(true)
      })

      it('should only affect audio tracks', () => {
        peer.muteAudio()
        expect(audioTrack.enabled).toBe(false)
        expect(videoTrack.enabled).toBe(true)
      })
    })

    describe('video control', () => {
      beforeEach(() => {
        peer.addStream(mockStream as unknown as MediaStream, 'AUDIO_VIDEO')
      })

      it('should disable video', () => {
        peer.disableVideo()
        expect(videoTrack.enabled).toBe(false)
      })

      it('should enable video', () => {
        peer.disableVideo()
        peer.enableVideo()
        expect(videoTrack.enabled).toBe(true)
      })

      it('should only affect video tracks', () => {
        peer.disableVideo()
        expect(videoTrack.enabled).toBe(false)
        expect(audioTrack.enabled).toBe(true)
      })
    })

    describe('audio-only streams', () => {
      it('should handle audio-only streams correctly', () => {
        const audioStream = new MockMediaStream('audio-stream')
        const audioOnlyTrack = new MockMediaStreamTrack('audio')
        audioStream.addTrack(audioOnlyTrack)

        peer.addStream(audioStream as unknown as MediaStream, 'AUDIO')

        peer.muteAudio()
        expect(audioOnlyTrack.enabled).toBe(false)

        peer.disableVideo()
        // Should not affect audio-only stream
        expect(audioOnlyTrack.enabled).toBe(false)
      })
    })
  })
})
