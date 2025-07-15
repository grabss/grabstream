<script lang="ts">
import { page } from '$app/state'
import CommonLoading from '$lib/components/CommonLoading.svelte'
import { GrabstreamClient } from '@grabstream/client'

let status = $state<'IDLE' | 'JOINING' | 'JOINED' | 'ERROR'>('IDLE')
let error = $state<string | null>(null)

const grabstreamClient = new GrabstreamClient({
  url: 'http://localhost:8080'
})

const joinRoom = async () => {
  status = 'JOINING'
  error = null

  try {
    if (!grabstreamClient.isConnected) {
      await grabstreamClient.connect()
    }
  } catch (e) {
    status = 'ERROR'
    error = e instanceof Error ? e.message : String(e)
    return
  }

  try {
    await grabstreamClient.joinRoom(page.params.roomId)
  } catch (e) {
    status = 'ERROR'
    error = e instanceof Error ? e.message : String(e)
    return
  }

  // TODO: joinedRoom or Error handling
  status = 'JOINED'
}

$effect(() => {
  return () => {
    if (grabstreamClient.isJoined) grabstreamClient.leaveRoom()
    if (grabstreamClient.isConnected) grabstreamClient.disconnect()
  }
})
</script>

<section class="h-100 mx-md d-flex flex-column items-center justify-center">
  {#if status === 'IDLE'}
    <button onclick={joinRoom}>Join Room</button>
  {:else if status === 'JOINING'}
    <CommonLoading />
  {:else if status === 'JOINED'}
    <p>Joined Room: {page.params.roomId}</p>
  {:else if status === 'ERROR'}
    <h1 class="fs-lg fw-bold text-muted">Error: {error}</h1>
    <a href="/">Go back</a>
  {/if}
</section>
