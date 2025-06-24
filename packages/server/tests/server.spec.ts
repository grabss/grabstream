import { GrabstreamServer } from '../src/server'

describe('GrabstreamServer', () => {
  it('should be defined', () => {
    expect(GrabstreamServer).toBeDefined()
  })

  it('should create an instance', () => {
    const server = new GrabstreamServer()
    expect(server).toBeInstanceOf(GrabstreamServer)
  })
})
