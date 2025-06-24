// Main server class

// Types
export type { Peer } from './peer'
export type { Room } from './room'
export type { GrabstreamServerConfig, SignalingMessage } from './server'
export { GrabstreamServer, GrabstreamServer as default } from './server'

// Usage example:
/*
import { GrabstreamServer } from '@grabstream/server'

const server = new GrabstreamServer({ 
  port: 3000,
  host: 'localhost'
})

// Listen to events
server.on('peer:connected', (peer) => {
  console.log(`Peer connected: ${peer.displayName}`)
})

server.on('peer:joined', (peer, room) => {
  console.log(`Peer ${peer.displayName} joined room ${room.id}`)
})

// Start server
await server.start()
console.log('Grabstream server is running!')
*/
