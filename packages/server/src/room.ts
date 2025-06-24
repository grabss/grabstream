import { EventEmitter } from 'eventemitter3'
import type { Peer } from './peer'

export class Room extends EventEmitter {
  public readonly id: string
  public readonly peers: Map<string, Peer>
  public readonly createdAt: Date

  constructor(id: string) {
    super()
    this.id = id
    this.peers = new Map()
    this.createdAt = new Date()
  }

  // Add peer to room
  addPeer(peer: Peer): boolean {
    if (this.peers.has(peer.id)) {
      return false // Peer already in room
    }

    this.peers.set(peer.id, peer)
    peer.joinRoom(this.id)

    // Notify existing peers about new member
    this.broadcast(
      {
        type: 'peer:joined',
        peerId: peer.id,
        displayName: peer.displayName
      },
      [peer.id]
    )

    // Send current members to new peer
    this.sendMembersToNewPeer(peer)

    this.emit('peer:added', peer)
    return true
  }

  // Remove peer from room
  removePeer(peerId: string): Peer | null {
    const peer = this.peers.get(peerId)
    if (!peer) {
      return null
    }

    this.peers.delete(peerId)
    peer.leaveRoom()

    // Notify remaining peers
    this.broadcast({
      type: 'peer:left',
      peerId: peer.id
    })

    this.emit('peer:removed', peer)
    return peer
  }

  // Get peer by ID
  getPeer(peerId: string): Peer | undefined {
    return this.peers.get(peerId)
  }

  // Get all peers as array
  getPeers(): Peer[] {
    return Array.from(this.peers.values())
  }

  // Get peer count
  getPeerCount(): number {
    return this.peers.size
  }

  // Check if room is empty
  isEmpty(): boolean {
    return this.peers.size === 0
  }

  // Check if peer is in this room
  hasPeer(peerId: string): boolean {
    return this.peers.has(peerId)
  }

  // Broadcast message to all peers in room
  broadcast(message: any, excludePeerIds: string[] = []): number {
    let sentCount = 0
    for (const peer of this.peers.values()) {
      if (!excludePeerIds.includes(peer.id) && peer.send(message)) {
        sentCount++
      }
    }
    return sentCount
  }

  // Send message to specific peer in room
  sendToPeer(peerId: string, message: any): boolean {
    const peer = this.peers.get(peerId)
    return peer ? peer.send(message) : false
  }

  // Update peer display name and notify others
  updatePeerDisplayName(peerId: string, newDisplayName: string): boolean {
    const peer = this.peers.get(peerId)
    if (!peer) {
      return false
    }

    const oldDisplayName = peer.updateDisplayName(newDisplayName)

    // Notify other peers in room
    this.broadcast(
      {
        type: 'peer:displayName:updated',
        peerId: peer.id,
        displayName: newDisplayName
      },
      [peerId]
    )

    this.emit('peer:displayName:updated', peer, oldDisplayName)
    return true
  }

  // Send current room members to new peer
  private sendMembersToNewPeer(newPeer: Peer): void {
    const members = this.getPeers()
      .filter((p) => p.id !== newPeer.id)
      .map((p) => ({
        id: p.id,
        displayName: p.displayName
      }))

    newPeer.send({
      type: 'room:members',
      members: members
    })
  }

  // Get room info for serialization
  toJSON() {
    return {
      id: this.id,
      peerCount: this.getPeerCount(),
      peers: this.getPeers().map((p) => p.toJSON()),
      createdAt: this.createdAt
    }
  }
}
