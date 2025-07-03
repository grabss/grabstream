<div align="center">

# @grabstream/server

*A minimal, extensible WebRTC signaling server for Node.js.*

</div>

## Installation

```bash
npm install @grabstream/server
```

## How to use

```ts
import { GrabstreamServer } from '@grabstream/server'

const server = new GrabstreamServer()

// Start the server
await server.start()

// Listen to events
server.on('peer:connected', (peer) => {
  console.log(`Peer connected: ${peer.id}`)
})

server.on('room:created', (room) => {
  console.log(`Room created: ${room.id}`)
})

// Stop the server
await server.stop()
```

## Configuration

```ts
interface GrabstreamServerOptions {
  // Choose one approach:
  // Option 1: Create new server
  host?: string // Default: '0.0.0.0'
  port?: number // Default: 8080

  // Option 2: Use existing server
  // Existing HTTP/HTTPS server (cannot use with host/port)
  server?: HTTPServer | HTTPSServer

  limits?: {
    maxPeersPerRoom?: number　// Default: 4
    maxRoomsPerServer?: number　// Default: 0 (unlimited)
  }
  requireRoomPassword?: boolean // Default: false
}
```
