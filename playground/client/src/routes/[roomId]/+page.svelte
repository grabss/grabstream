<script lang="ts">
import { page } from '$app/state'
import { GrabstreamClient } from '@grabstream/client'
import CommonLoading from '$lib/components/CommonLoading.svelte';

const grabstreamClient = new GrabstreamClient({
  url: 'http://localhost:8080'
})

const joinRoom = async () => {
  await new Promise(resolve => setTimeout(resolve, 3000))
  if (!grabstreamClient.isConnected) {
    await grabstreamClient.connect()
  }
  await grabstreamClient.joinRoom(page.params.roomId)
  // TODO: joinedRoom or Error handling
}

$effect(() => {
  return () => {
    if (grabstreamClient.isJoined) grabstreamClient.leaveRoom()
    if (grabstreamClient.isConnected) grabstreamClient.disconnect()
  }
})
</script>

<section class="h-100 mx-md d-flex flex-column items-center justify-center">
  {#await joinRoom()}
    <CommonLoading />
  {:then}
    <h1>Joined Room: {page.params.roomId}</h1>
  {:catch error}
    <h1 class="fs-lg fw-bold text-muted">Error: {error.message}</h1>
    <a href="/">Go back</a>
  {/await}
</section>
