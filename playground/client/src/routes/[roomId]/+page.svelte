<script lang="ts">
import { page } from '$app/state'
import { GrabstreamClient } from '@grabstream/client'

const grabstreamClient = new GrabstreamClient({
  url: 'http://localhost:8080'
})

$effect(() => {
  ;(async () => {
    if (!grabstreamClient.isConnected) {
      try {
        await grabstreamClient.connect()
      } catch (error) {
        console.error(error)
        alert('Failed to connect to grabstream server.')
        return
      }
    }

    try {
      await grabstreamClient.joinRoom(page.params.roomId)
    } catch (error) {
      console.error(error)
      alert('Failed to join the room.')
    }
  })()

  return () => {
    if (grabstreamClient.isJoined) {
      grabstreamClient.leaveRoom()
    }
    grabstreamClient.disconnect()
  }
})
</script>

<h1>TODO: /[roomId]</h1>
<a href="/">to /</a>
