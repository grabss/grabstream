<script lang="ts">
type Props = {
  onJoin: (values: {
    displayName: string
    password?: string
    mediaStream: MediaStream
  }) => void
}

let { onJoin }: Props = $props()

const join = () => {
  onJoin({
    displayName: 'Guest',
    mediaStream: new MediaStream()
  })
}
</script>

<div>
  <button onclick={join}>Join Room</button>
</div>

<style lang="scss"></style>
