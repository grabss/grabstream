# @grabstream/server

A WebRTC P2P signaling server for Node.js that enables peer-to-peer communication through room-based connections.

## Features

- **WebRTC Signaling**: Handles SDP offers, answers, and ICE candidates
- **Room-based Communication**: Organize peers into rooms with optional password protection
- **Custom Messages**: Send custom data between peers or broadcast to rooms
- **Connection Limits**: Configurable limits for peers per room and rooms per server
- **Event-driven**: Rich event system for monitoring server activity
- **TypeScript**: Full TypeScript support with comprehensive type definitions
- **ESM/CommonJS**: Dual package support for modern and legacy Node.js environments

## Installation

```bash
npm install @grabstream/server
# or
yarn add @grabstream/server
# or
pnpm add @grabstream/server
```

## Requirements

- Node.js >= 20.0.0

## Quick Start

### Basic Usage

```typescript
import { GrabstreamServer } from '@grabstream/server'

const server = new GrabstreamServer({
  host: '0.0.0.0',
  port: 8080
})

await server.start()
console.log('Signaling server started on port 8080')
```

### Integration with HTTP Server

```typescript
import { createServer } from 'http'
import { GrabstreamServer } from '@grabstream/server'

const httpServer = createServer()
const signalingServer = new GrabstreamServer({
  server: httpServer,
  path: '/signaling'
})

await signalingServer.start()
httpServer.listen(8080)
```

## API Reference

### GrabstreamServer

#### Constructor

```typescript
new GrabstreamServer(options?: GrabstreamServerOptions)
```

#### Options

```typescript
interface GrabstreamServerOptions {
  // Connection options (choose one approach)
  host?: string              // Default: '0.0.0.0'
  port?: number             // Default: 8080
  path?: string             // WebSocket path
  server?: HTTPServer | HTTPSServer  // Existing HTTP/HTTPS server
  
  // Room configuration
  requireRoomPassword?: boolean      // Default: false
  
  // Connection limits
  limits?: {
    maxPeersPerRoom?: number        // Default: 4
    maxRoomsPerServer?: number      // Default: 0 (unlimited)
  }
}
```

#### Methods

##### `start(): Promise<void>`

Starts the WebSocket server.

```typescript
await server.start()
```

##### `stop(): Promise<void>`

Stops the WebSocket server and cleans up resources.

```typescript
await server.stop()
```

#### Events

The server extends an event emitter with the following events:

```typescript
// Server lifecycle
server.on('server:started', () => {})
server.on('server:stopped', () => {})
server.on('server:error', (error: Error) => {})

// Peer lifecycle
server.on('peer:connected', (peer: Peer) => {})
server.on('peer:disconnected', (peer: Peer) => {})
server.on('peer:joined', ({ peer, room }) => {})
server.on('peer:left', ({ peer, roomId }) => {})
server.on('peer:error', ({ peer, error }) => {})
server.on('peer:timeout', (peer: Peer) => {})

// Display name updates
server.on('peer:displayNameUpdated', ({ peer, oldDisplayName, newDisplayName }) => {})

// Room lifecycle
server.on('room:created', (room: Room) => {})
server.on('room:removed', ({ roomId }) => {})

// Limit events
server.on('room:limitReachedPerServer', ({ roomId, peerId, currentRooms, maxRooms }) => {})
server.on('peer:limitReachedPerRoom', ({ roomId, peerId, currentPeers, maxPeers }) => {})
```

## Message Protocol

### Client to Server Messages

#### Join Room
```typescript
{
  type: 'JOIN_ROOM',
  payload: {
    roomId: string
    displayName?: string
    password?: string
  }
}
```

#### Leave Room
```typescript
{
  type: 'LEAVE_ROOM',
  payload: {}
}
```

#### Update Display Name
```typescript
{
  type: 'UPDATE_DISPLAY_NAME',
  payload: {
    displayName: string
  }
}
```

#### Room Information
```typescript
{
  type: 'KNOCK',
  payload: {
    roomId: string
  }
}
```

#### Custom Messages
```typescript
{
  type: 'CUSTOM',
  payload: {
    customType: string
    target?: {
      type: 'peer' | 'room'
      peerId?: string  // Required when target.type is 'peer'
    }
    data: any
  }
}
```

#### WebRTC Signaling
```typescript
// Offer
{
  type: 'OFFER',
  payload: {
    toPeerId: string
    offer: RTCSessionDescription
  }
}

// Answer
{
  type: 'ANSWER',
  payload: {
    toPeerId: string
    answer: RTCSessionDescription
  }
}

// ICE Candidate
{
  type: 'ICE_CANDIDATE',
  payload: {
    toPeerId: string
    candidate: RTCIceCandidate
  }
}
```

### Server to Client Messages

#### Connection Established
```typescript
{
  type: 'CONNECTION_ESTABLISHED',
  payload: {
    peerId: string
  }
}
```

#### Room Events
```typescript
// Room joined
{
  type: 'ROOM_JOINED',
  payload: {
    roomId: string
    peers: Array<{ id: string, displayName: string }>
  }
}

// Room left
{
  type: 'ROOM_LEFT',
  payload: {
    roomId: string
  }
}

// Peer joined room
{
  type: 'PEER_JOINED',
  payload: {
    peerId: string
    displayName: string
  }
}

// Peer left room
{
  type: 'PEER_LEFT',
  payload: {
    peerId: string
  }
}

// Peer updated
{
  type: 'PEER_UPDATED',
  payload: {
    peerId: string
    displayName: string
  }
}
```

#### Room Information Response
```typescript
{
  type: 'KNOCK_RESPONSE',
  payload: {
    roomId: string
    exists: boolean
    hasPassword: boolean
    peerCount: number
    isFull: boolean
  }
}
```

#### Password Required
```typescript
{
  type: 'PASSWORD_REQUIRED',
  payload: {
    roomId: string
  }
}
```

#### Custom Message Relay
```typescript
{
  type: 'CUSTOM',
  payload: {
    fromPeerId: string
    customType: string
    data: any
  }
}
```

#### WebRTC Signaling Relay
```typescript
// Offer relay
{
  type: 'OFFER',
  payload: {
    fromPeerId: string
    toPeerId: string
    offer: RTCSessionDescription
  }
}

// Answer relay
{
  type: 'ANSWER',
  payload: {
    fromPeerId: string
    toPeerId: string
    answer: RTCSessionDescription
  }
}

// ICE candidate relay
{
  type: 'ICE_CANDIDATE',
  payload: {
    fromPeerId: string
    toPeerId: string
    candidate: RTCIceCandidate
  }
}
```

#### Error
```typescript
{
  type: 'ERROR',
  payload: {
    message: string
  }
}
```

## Advanced Usage

### Custom Limits Configuration

```typescript
const server = new GrabstreamServer({
  port: 8080,
  limits: {
    maxPeersPerRoom: 8,        // Max 8 peers per room
    maxRoomsPerServer: 100     // Max 100 rooms per server
  }
})
```

### Password-Protected Rooms

```typescript
const server = new GrabstreamServer({
  port: 8080,
  requireRoomPassword: true  // All rooms must have passwords
})
```

### Event Monitoring

```typescript
server.on('peer:joined', ({ peer, room }) => {
  console.log(`Peer ${peer.displayName} joined room ${room.id}`)
})

server.on('room:created', (room) => {
  console.log(`New room created: ${room.id}`)
})

server.on('peer:limitReachedPerRoom', ({ roomId, peerId, currentPeers, maxPeers }) => {
  console.log(`Room ${roomId} is full (${currentPeers}/${maxPeers})`)
})
```

### Error Handling

```typescript
server.on('server:error', (error) => {
  console.error('Server error:', error)
})

server.on('peer:error', ({ peer, error }) => {
  console.error(`Peer ${peer.id} error:`, error)
})
```

## Development

### Running Tests

```bash
npm test
# or
npm run test:watch
# or
npm run test:coverage
```

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Configuration Limits

### Room IDs
- Maximum length: 64 characters
- Allowed characters: `a-z`, `A-Z`, `0-9`, `_`, `-`

### Display Names
- Maximum length: 50 characters

### Passwords
- Minimum length: 4 characters
- Maximum length: 128 characters

### Custom Message Types
- Maximum length: 32 characters
- Allowed characters: `a-z`, `A-Z`, `0-9`, `.`, `_`, `-`

## License

MIT

## Links

- [Repository](https://github.com/grabss/grabstream)
- [Bug Reports](https://github.com/grabss/grabstream/issues)
- [Homepage](https://grabss.co.jp)
