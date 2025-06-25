import type { Server as HTTPServer } from 'node:http'
import type { Server as HTTPSServer } from 'node:https'

import { EventEmitter } from 'eventemitter3'
import { type WebSocket, WebSocketServer } from 'ws'

import { Peer } from './peer'
import type { Room } from './room'

export type GrabstreamServerOptions = {
  host?: string
  port?: number
  server?: HTTPServer | HTTPSServer
}

export class GrabstreamServer extends EventEmitter {
  private wss?: WebSocketServer
  private readonly rooms: Map<string, Room> = new Map()
  private readonly peers: Map<string, Peer> = new Map()
  private readonly options: GrabstreamServerOptions

  constructor(options: GrabstreamServerOptions = {}) {
    super()

    if (options.server && (options.host || options.port)) {
      throw new Error('Cannot specify both server and host/port options')
    }

    if (options.server) {
      this.options = { server: options.server }
    } else {
      this.options = {
        host: options.host || '0.0.0.0',
        port: options.port || 8080
      }
    }
  }

  async start(): Promise<void> {
    if (this.wss) {
      throw new Error('GrabstreamServer is already running')
    }

    this.wss = new WebSocketServer({
      ...this.options,
      perMessageDeflate: false,
      maxPayload: 1024 * 1024
    })

    const wss = this.wss
    return new Promise((resolve, reject) => {
      const onListening = () => {
        wss.off('error', onError)

        this.setupWebSocketServerEventHandlers(wss)

        console.log('GrabstreamServer started...')
        this.emit('started')
        resolve()
      }

      const onError = (error: Error) => {
        wss.off('listening', onListening)
        wss.removeAllListeners()
        wss.close()

        this.cleanup()

        console.error('Error starting GrabstreamServer:', error)
        reject(error)
      }

      wss.once('listening', onListening)
      wss.once('error', onError)
    })
  }

  async stop(): Promise<void> {
    if (!this.wss) {
      throw new Error('GrabstreamServer is not running')
    }

    const wss = this.wss
    return new Promise((resolve, reject) => {
      wss.close((error) => {
        if (error) {
          console.error('Error stopping GrabstreamServer:', error)
          reject(error)
        } else {
          this.cleanup()

          console.log('GrabstreamServer stopped')
          this.emit('stopped')
          resolve()
        }
      })
    })
  }

  private setupWebSocketServerEventHandlers(wss: WebSocketServer): void {
    wss.on('error', (error) => {
      console.error('WebSocketServer error:', error)
      this.emit('error', error)
    })

    wss.on('connection', this.handleConnection.bind(this))
  }

  private handleConnection(socket: WebSocket): void {
    const peer = new Peer({ socket })
    console.log(`New peer connected: ${peer.id}`)

    this.peers.set(peer.id, peer)
    this.emit('peerConnected', peer)

    socket.on('message', (data) => {
      // TODO: handleMessage
    })

    socket.on('close', () => {
      this.handleDisconnection(peer)
    })

    socket.on('error', (error) => {
      console.error(`WebSocket error for peer ${peer.id}:`, error)
      this.emit('peerError', { peer, error })
    })
  }

  // private handleMessage

  private handleDisconnection(peer: Peer): void {
    console.log(`Peer disconnected: ${peer.id}`)

    if (peer.isInRoom()) {
      // TODO: Implement room removal logic
    }

    this.peers.delete(peer.id)
    this.emit('peerDisconnected', peer)
  }

  private cleanup(): void {
    this.wss = undefined
    this.rooms.clear()
    this.peers.clear()
  }
}
