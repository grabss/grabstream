export function createServer() {
  console.log('grabstream server created')
  return {
    port: 3000,
    start: () => {
      console.log('Server started on port 3000')
    }
  }
}

export default createServer
