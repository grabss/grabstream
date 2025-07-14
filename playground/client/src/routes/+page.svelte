<script lang="ts">
import { validateRoomId } from '@grabstream/core'
import { goto } from '$app/navigation'

let roomId = $state('')

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
<input type="text" bind:value={roomId} placeholder="Room ID" />
<button onclick={joinRoom}>Join Room</button>

