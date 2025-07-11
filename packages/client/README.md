<div align="center">

# @grabstream/client

*grabstream client SDK for browsers.*

[![NPM Version](https://img.shields.io/npm/v/@grabstream/client.svg)](https://www.npmjs.com/package/@grabstream/client)
[![License](https://img.shields.io/npm/l/@grabstream/client.svg)](https://github.com/grabss/grabstream/blob/main/LICENSE)

</div>

## Installation

```bash
npm install @grabstream/client
```

## How to use

```ts
import { GrabstreamClient } from '@grabstream/client'

const client = new GrabstreamClient({
  url: 'ws://localhost:8080'
})

// Connect to the server
await client.connect()

// Join a room
client.joinRoom('room-id', { displayName: 'your-display-name' })

// Listen to events
client.on('peer:joined', (peer) => {
  console.log(`Peer joined: ${peer.displayName}`)
})

client.on('peer:streamReceived', ({ peer, type, stream }) => {
  console.log(`Stream received from: ${peer.displayName}`)
  // Display the stream in video element
  const videoElement = document.getElementById('video')
  videoElement.srcObject = stream
})

// Share your media stream
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
await client.addLocalStream({ type: 'AUDIO_VIDEO', stream })

// Leave the room
client.leaveRoom()

// Disconnect
await client.disconnect()
```

## Configuration

```ts
interface GrabstreamClientOptions {
  url?: string // WebSocket URL of the signaling server (default: ws://localhost:8080)
  connectionTimeoutMs?: number // Connection timeout in milliseconds
}
```
