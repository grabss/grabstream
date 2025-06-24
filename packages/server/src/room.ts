import type { Peer } from './peer'

export type Room = {
  id: string
  peers: Map<string, Peer>
  createdAt: Date
}