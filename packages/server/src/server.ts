import { EventEmitter } from 'eventemitter3'
import { v4 as uuidv4 } from 'uuid'
import { type WebSocket, WebSocketServer } from 'ws'
import type { Peer } from './peer'
import type { Room } from './room'

export type SignalingMessage = {
  type: 'join' | 'leave' | 'offer' | 'answer' | 'candidate' | 'update-name'
  roomId?: string
  displayName?: string
  target?: string
  payload?: any
}

export type GrabstreamServerConfig = {
  port?: number
  host?: string
}

export class GrabstreamServer extends EventEmitter {
  private wss: WebSocketServer | null = null
  private peers: Map<string, Peer> = new Map()
  private rooms: Map<string, Room> = new Map()
  private config: GrabstreamServerConfig

  constructor(config: GrabstreamServerConfig = {}) {
    super()
    this.config = {
      port: 3000,
      host: '0.0.0.0',
      ...config
    }
  }

  async start(): Promise<void> {
    if (this.wss) {
      throw new Error('Server is already running')
    }

    this.wss = new WebSocketServer({
      port: this.config.port,
      host: this.config.host
    })

    this.wss.on('connection', this.handleConnection.bind(this))

    return new Promise((resolve) => {
      if (!this.wss) {
        throw new Error('WebSocket server not initialized')
      }
      this.wss.on('listening', () => {
        console.log(
          `GrabstreamServer listening on ${this.config.host}:${this.config.port}`
        )
        this.emit('listening', this.config.port)
        resolve()
      })
    })
  }

  async stop(): Promise<void> {
    if (!this.wss) {
      return
    }

    const wss = this.wss
    return new Promise((resolve, reject) => {
      wss.close((err) => {
        if (err) {
          reject(err)
        } else {
          this.wss = null
          this.peers.clear()
          this.rooms.clear()
          console.log('GrabstreamServer stopped')
          this.emit('closed')
          resolve()
        }
      })
    })
  }

  private handleConnection(ws: WebSocket): void {
    const peerId = uuidv4()
    console.log(`New connection: ${peerId}`)

    ws.on('message', (data) => {
      this.handleMessage(peerId, ws, data)
    })

    ws.on('close', () => {
      this.handleDisconnection(peerId)
    })

    ws.on('error', (error) => {
      console.error(`WebSocket error for peer ${peerId}:`, error)
      this.handleDisconnection(peerId)
    })
  }

  private handleMessage(peerId: string, ws: WebSocket, data: any): void {
    try {
      const message: SignalingMessage = JSON.parse(data.toString())
      console.log(`Message from ${peerId}:`, message.type)

      // メッセージ処理は次のステップで実装
      this.emit('message', peerId, message)
    } catch (error) {
      console.error(`Invalid message from ${peerId}:`, error)
      ws.close(1002, 'Invalid message format')
    }
  }

  private handleDisconnection(peerId: string): void {
    console.log(`Peer disconnected: ${peerId}`)
    this.peers.delete(peerId)
    this.emit('peer:disconnect', peerId)
  }
}
