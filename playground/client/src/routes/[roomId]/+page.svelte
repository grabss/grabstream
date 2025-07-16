<script lang="ts">
import { goto } from '$app/navigation'
import { page } from '$app/state'
import CommonLoading from '$lib/components/CommonLoading.svelte'
import IdleRoom from '$lib/components/IdleRoom.svelte'
import { GrabstreamClient } from '@grabstream/client'
import { validateRoomId } from '@grabstream/core'

let status = $state<'IDLE' | 'JOINING' | 'JOINED' | 'ERROR'>('IDLE')
let error = $state<string | null>(null)

const roomId = page.params.roomId.trim()

const grabstreamClient = new GrabstreamClient({
  url: 'http://localhost:8080'
})

const joinRoom = async (values: {
  displayName: string
  password?: string
  mediaStream: MediaStream
}) => {
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

  grabstreamClient.on('room:joined', async () => {
    status = 'JOINED'
  })

  grabstreamClient.on('server:error', (e) => {
    status = 'ERROR'
    error = e.message
  })

  await grabstreamClient.addLocalStream({
    type: 'AUDIO_VIDEO',
    stream: values.mediaStream
  })

  try {
    await grabstreamClient.joinRoom(roomId, {
      displayName: values.displayName,
      password: values.password
    })
  } catch (e) {
    status = 'ERROR'
    error = e instanceof Error ? e.message : String(e)
    return
  }
}

$effect(() => {
  const validationResult = validateRoomId(roomId)
  if (!validationResult.success) {
    alert(validationResult.error)
    goto('/')
  }

  return () => {
    if (grabstreamClient.isJoined) grabstreamClient.leaveRoom()
    if (grabstreamClient.isConnected) grabstreamClient.disconnect()
    if (grabstreamClient.localStreams) {
      grabstreamClient.localStreams.forEach((localStream) => {
        localStream.stream.getTracks().forEach((track) => track.stop())
      })
    }
  }
})
</script>

<section class="mx-md d-flex flex-column items-center justify-center">
  {#if status === 'IDLE'}
    <IdleRoom {roomId} onJoin={joinRoom} />
  {:else if status === 'JOINING'}
    <CommonLoading />
  {:else if status === 'JOINED'}
    <p>Joined Room: {roomId}</p>
  {:else if status === 'ERROR'}
    <h1 class="fs-lg fw-bold text-muted">Error: {error}</h1>
    <a href="/">Go back</a>
  {/if}
</section>

<style lang="scss">
  section {
    min-height: 100%;
  }
</style>
