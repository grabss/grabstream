import { WebSocket } from 'ws'

export class Peer {
  public readonly id: string
  public displayName: string
  public roomId: string | null
  public readonly socket: WebSocket
  public readonly joinedAt: Date

  constructor(id: string, socket: WebSocket, displayName?: string) {
    this.id = id
    this.socket = socket
    this.displayName = displayName || `Peer-${id.slice(0, 8)}`
    this.roomId = null
    this.joinedAt = new Date()
  }

  // Send message to this peer
  send(message: any): boolean {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
      return true
    }
    return false
  }

  // Send error message to this peer
  sendError(error: string): boolean {
    return this.send({
      type: 'error',
      message: error
    })
  }

  // Update display name
  updateDisplayName(newDisplayName: string): string {
    const oldDisplayName = this.displayName
    this.displayName = newDisplayName
    return oldDisplayName
  }

  // Join a room
  joinRoom(roomId: string): void {
    this.roomId = roomId
  }

  // Leave current room
  leaveRoom(): string | null {
    const previousRoomId = this.roomId
    this.roomId = null
    return previousRoomId
  }

  // Check if peer is in a room
  isInRoom(roomId?: string): boolean {
    if (roomId) {
      return this.roomId === roomId
    }
    return this.roomId !== null
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket.readyState === WebSocket.OPEN
  }

  // Get peer info for serialization
  toJSON() {
    return {
      id: this.id,
      displayName: this.displayName,
      roomId: this.roomId,
      joinedAt: this.joinedAt,
      isConnected: this.isConnected()
    }
  }
}
