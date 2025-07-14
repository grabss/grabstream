<script lang="ts">
import { goto } from '$app/navigation'
import { validateRoomId } from '@grabstream/core'
import { appState } from '$lib/states'

type KnockResult = {
  roomId: string
  exists: boolean
  hasPassword: boolean
  peerCount: number
  isFull: boolean
}

let { data } = $props()
let roomId = $state('')
let knockResult = $state<KnockResult | null>(null)

const { grabstreamClient } = data

const knock = async () => {
  knockResult = null

  const trimmedRoomId = roomId.trim()
  if (!validateRoomId(trimmedRoomId).success) {
    return
  }

  const response = await fetch(
    `http://localhost:8080/rooms/${trimmedRoomId}/knock`
  )
  const result = await response.json()

  if (result.roomId === roomId.trim()) {
    knockResult = result
  }
}

const joinRoom = () => {
  const trimmedRoomId = roomId.trim()
  const result = validateRoomId(trimmedRoomId)

  if (result.success) {
    goto(`/${trimmedRoomId}`)
  } else {
    alert(result.error)
  }
}

$effect(() => {
  ;(async () => {
    if (!grabstreamClient.isConnected) {
      appState.isLoading = true
      try {
        await grabstreamClient.connect()
      } catch (error) {
        console.error(error)
        alert('Failed to connect to grabstream server.')
      } finally {
        appState.isLoading = false
      }
    }
  })()
})
</script>

<section class="h-100 d-flex flex-column items-center justify-center">
  <h1 class="fs-xl fw-bold">Join a Room</h1>
  <div class="mt-lg d-flex">
    <input
      type="text"
      id="roomId"
      name="roomId"
      placeholder="Room ID"
      bind:value={roomId}
      oninput={knock}
    />
    <button onclick={joinRoom}>Join</button>
  </div>
  <!-- <div>{JSON.stringify(knockResult)}</div> -->
</section>

<style lang="scss">
  input {
    width: 100%;
    border-bottom: 1px solid var(--color-primary);

    &::placeholder {
      color: var(--color-muted);
    }

    @include mediaquery.mq(md) {
      width: 300px;
    }
  }
</style>
