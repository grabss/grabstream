<script lang="ts">
type Props = {
  roomId: string
  onJoin: (values: {
    displayName: string
    password?: string
    mediaStream: MediaStream
  }) => void
}

let { onJoin }: Props = $props()
let displayName = $state('')

const join = () => {
  onJoin({
    displayName,
    mediaStream: new MediaStream()
  })
}
</script>

<div>
  <button onclick={join}>Join Room</button>
</div>

<style lang="scss"></style>
