import type { Server as HTTPServer } from 'node:http'
import type { Server as HTTPSServer } from 'node:https'

import { EventEmitter } from 'eventemitter3'
import { WebSocketServer } from 'ws'

export type GrabstreamServerOptions = {
  host?: string
  port?: number
  server?: HTTPServer | HTTPSServer
}

export class GrabstreamServer extends EventEmitter {
  private wss?: WebSocketServer
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
  }

  async stop(): Promise<void> {
    if (!this.wss) {
      throw new Error('GrabstreamServer is not running')
    }

    return new Promise((resolve, reject) => {
      this.wss?.close((err) => {
        if (err) {
          reject(err)
        } else {
          this.wss = undefined
          resolve()
        }
      })
    })
  }
}
