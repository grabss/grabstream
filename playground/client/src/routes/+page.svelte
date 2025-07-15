<script lang="ts">
import { goto } from '$app/navigation'
import CommonButton from '$lib/components/CommonButton.svelte'
import CommonInput from '$lib/components/CommonInput.svelte'

import { validateRoomId } from '@grabstream/core'

let roomId = $state('')

const knock = async () => {
  const trimmedRoomId = roomId.trim()
  const validationResult = validateRoomId(trimmedRoomId)

  if (!validationResult.success) {
    alert(validationResult.error)
    return
  }

  const response = await fetch(
    `http://localhost:8080/rooms/${trimmedRoomId}/knock`
  )
  const knockResult = await response.json()
  alert(`Knock result\n${JSON.stringify(knockResult, null, 2)}`)
}

const joinRoom = () => {
  const trimmedRoomId = roomId.trim()
  const validationResult = validateRoomId(trimmedRoomId)

  if (validationResult.success) {
    goto(`/${trimmedRoomId}`)
  } else {
    alert(validationResult.error)
  }
}
</script>

<section class="mx-md d-flex flex-column items-center justify-center">
  <h1 class="fs-xl fw-bold">Join a Room</h1>
  <div class="w-100 my-lg d-flex justify-center items-center g-sm">
    <div class="input-wrapper">
      <CommonInput
        type="text"
        id="roomId"
        name="roomId"
        placeholder="Room ID"
        bind:value={roomId}
      />
    </div>
    <div class="d-flex g-xs">
      <div class="btn-wrapper">
        <CommonButton size="sm" variant="primary" onclick={joinRoom}>Join</CommonButton>
      </div>
      <div class="btn-wrapper">
        <CommonButton size="sm" onclick={knock}>Knock</CommonButton>
      </div>
    </div>
  </div>
</section>

<style lang="scss">
  section {
    min-height: 100%;
  }

  .input-wrapper {
    width: 100%;
    max-width: 300px;
  }

  .btn-wrapper {
    width: 65px;
    flex-shrink: 0;
  }
</style>
