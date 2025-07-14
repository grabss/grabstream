import { createServer } from 'node:http'
import { GrabstreamServer } from '@grabstream/server'
import express from 'express'

const PORT = process.env.PORT || 8080

async function bootstrap() {
  const app = express()
  const httpServer = createServer(app)
  const grabstreamServer = new GrabstreamServer({
    server: httpServer,
    limits: {
      maxPeersPerRoom: 4,
      maxRoomsPerServer: 0
    },
    requireRoomPassword: false
  })

  app.use(express.json())

  await grabstreamServer.start()
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })

  const gracefulShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`)

    try {
      httpServer.close(() => {
        console.log('Server closed')
      })

      await grabstreamServer.stop()
      process.exit(0)
    } catch (error) {
      console.error('Error during shutdown:', error)
      process.exit(1)
    }
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
}

bootstrap()
