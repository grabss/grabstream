<script lang="ts">
import { goto } from '$app/navigation'
import { validateRoomId } from '@grabstream/core'

type KnockResult = {
  roomId: string
  exists: boolean
  hasPassword: boolean
  peerCount: number
  isFull: boolean
}

let roomId = $state('')
let knockResult = $state<KnockResult | null>(null)

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
</script>

<h1>Enter Room</h1>
<input type="text" placeholder="Room ID" bind:value={roomId} oninput={knock} />
<button onclick={joinRoom}>Join Room</button>
<div>{JSON.stringify(knockResult)}</div>

