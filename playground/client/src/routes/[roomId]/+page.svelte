<script lang="ts">
import { page } from '$app/state'

import { appState } from '$lib/states'

let { data } = $props()
const { grabstreamClient } = data

$effect(() => {
  ;(async () => {
    appState.isLoading = true
    if (!grabstreamClient.isConnected) {
      try {
        await grabstreamClient.connect()
      } catch (error) {
        console.error(error)
        alert('Failed to connect to grabstream server.')
        appState.isLoading = false
        return
      }
    }

    try {
      await grabstreamClient.joinRoom(page.params.roomId)
    } catch (error) {
      console.error(error)
      alert('Failed to join the room.')
    } finally {
      appState.isLoading = false
    }
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
