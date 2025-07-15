<script lang="ts">
import { goto } from '$app/navigation'
import CommonButton from '$lib/components/CommonButton.svelte'
import { validateRoomId } from '@grabstream/core'

let roomId = $state('')

const knock = async () => {
  const trimmedRoomId = roomId.trim()
  const validateResult = validateRoomId(trimmedRoomId)

  if (!validateResult.success) {
    alert(validateResult.error)
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
  const validateResult = validateRoomId(trimmedRoomId)

  if (validateResult.success) {
    goto(`/${trimmedRoomId}`)
  } else {
    alert(validateResult.error)
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
    />
    <div class="d-flex g-xs">
      <CommonButton onclick={joinRoom} size="sm" variant="primary">Join</CommonButton>
      <CommonButton size="sm" onclick={knock}>Knock</CommonButton>
    </div>
  </div>
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
</style>
