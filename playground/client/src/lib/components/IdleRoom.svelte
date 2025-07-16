<script lang="ts">
import CommonButton from '$lib/components/CommonButton.svelte'
import { validateDisplayName } from '@grabstream/core'
import CommonInput from '$lib/components/CommonInput.svelte'

type Props = {
  roomId: string
  onJoin: (values: {
    displayName: string
    password?: string
    mediaStream: MediaStream
  }) => void
}

let { roomId, onJoin }: Props = $props()
let displayName = $state('')
let password = $state('')

const join = () => {
  const trimmedDisplayName = displayName.trim()
  const validateDisplayNameResult = validateDisplayName(trimmedDisplayName)

  if (!validateDisplayNameResult.success) {
    alert(validateDisplayNameResult.error)
    return
  }

  onJoin({
    displayName: trimmedDisplayName,
    password: password || undefined,
    mediaStream: new MediaStream()
  })
}
</script>

<div class="idle-room">
  <p class="fs-2xl">Room ID: {roomId}</p>
  <!-- TODO: password -->
   <CommonInput
      type="text"
      id="displayName"
      name="displayName"
      placeholder="Display Name"
      bind:value={displayName}
    />
  <div class="btn-wrapper">
    <CommonButton variant="primary" onclick={join}>Join</CommonButton>
  </div>
</div>

<style lang="scss">
  .idle-room {
    width: 100%;
    max-width: 800px;
    padding: 10px 20px;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-md);
  }

  .btn-wrapper {
    margin: 20px 0 0 auto;
    width: 100px;
  }
</style>
