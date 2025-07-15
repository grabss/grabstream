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

<section class="h-100 mx-md d-flex flex-column items-center justify-center">
  <h1 class="fs-xl fw-bold">Join a Room</h1>
  <div class="w-100 my-lg d-flex justify-center items-center g-sm">
    <input
      type="text"
      id="roomId"
      name="roomId"
      placeholder="Room ID"
      bind:value={roomId}
      oninput={knock}
    />
    <button class="px-sm py-2xs border rounded-md" onclick={joinRoom}>Join</button>
  </div>
  <table class="fs-xs md:fs-sm">
    <thead>
      <tr>
        <th>Room ID</th>
        <th>Exists</th>
        <th>Has Password</th>
        <th>Peer Count</th>
        <th>Is Full</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>{knockResult?.roomId ?? '-'}</td>
        <td>{knockResult?.exists ?? '-'}</td>
        <td>{knockResult?.hasPassword ?? '-'}</td>
        <td>{knockResult?.peerCount ?? '-'}</td>
        <td>{knockResult?.isFull ?? '-'}</td>
      </tr>
    </tbody>
  </table>
</section>

<style lang="scss">
  input {
    width: 100%;
    max-width: 300px;
    padding: 5px 10px;
    border-bottom: 1px solid var(--color-muted);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &::placeholder {
      color: var(--color-muted);
    }

    &:-webkit-autofill {
      box-shadow: 0 0 0px 1000px var(--color-background) inset;
      -webkit-text-fill-color: var(--color-body) !important;
    }
  }

  table {
    width: 100%;
    max-width: 600px;

    th, td {
      padding: 5px;
      border-bottom: 1px solid var(--color-border);
    }

    th {
      font-weight: bold;
    }
  }
</style>
