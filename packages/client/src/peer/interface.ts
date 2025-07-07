export interface Peer {
  id: string
  displayName: string

  updateDisplayName(displayName: string): void
}
