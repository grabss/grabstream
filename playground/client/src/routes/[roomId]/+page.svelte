<script lang="ts">
import { page } from '$app/state'

let { data } = $props()
const { grabstreamClient } = data

$effect(() => {
  ;(async () => {
    if (!grabstreamClient.isConnected) {
      await grabstreamClient.connect()
    }
    await grabstreamClient.joinRoom(page.params.roomId)
  })()

  return () => {
    if (grabstreamClient.isJoined) {
      grabstreamClient.leaveRoom()
    }
  }
})
</script>

<h1>TODO: /[roomId]</h1>
<a href="/">to /</a>
