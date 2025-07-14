import { GrabstreamClient } from '@grabstream/client'
import type { LayoutLoad } from './$types'

let grabstreamClient: GrabstreamClient

export const ssr = false

export const load: LayoutLoad = async () => {
  if (!grabstreamClient) {
    grabstreamClient = new GrabstreamClient({
      url: 'http://localhost:8080'
    })
  }

  if (!grabstreamClient.isConnected) {
    await grabstreamClient.connect()
  }

  return {
    grabstreamClient
  }
}
