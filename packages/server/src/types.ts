import type { Server as HTTPServer } from 'node:http'
import type { Server as HTTPSServer } from 'node:https'

export type GrabstreamServerConnectionOptions = {
  host?: string
  port?: number
  path?: string
  server?: HTTPServer | HTTPSServer
}

export type GrabstreamServerLimits = {
  maxPeersPerRoom: number
  maxRoomsPerServer: number
}

export type GrabstreamServerOptions = GrabstreamServerConnectionOptions & {
  limits?: Partial<GrabstreamServerLimits>
  requireRoomPassword?: boolean
}

export type GrabstreamServerConfiguration = {
  connectionOptions: GrabstreamServerConnectionOptions
  limits: GrabstreamServerLimits
  requireRoomPassword: boolean
}
