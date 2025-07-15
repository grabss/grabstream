<script lang="ts">
import CommonButton from '$lib/components/CommonButton.svelte'

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
  onJoin({
    displayName,
    password: password || undefined,
    mediaStream: new MediaStream()
  })
}
</script>

<div class="idle-room">
  <p class="fs-2xl">Room ID: {roomId}</p>
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
    margin-left: auto;
    width: 100px;
  }
</style>
