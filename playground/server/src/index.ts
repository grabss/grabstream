import { createServer } from 'node:http'
import express from 'express'

const app = express()
const httpServer = createServer(app)

app.use(express.json())

httpServer.listen(8000, () => {
  console.log(`🚀 Server running on http://localhost:${8000}`)
})
