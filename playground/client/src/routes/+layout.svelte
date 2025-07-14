<script lang="ts">
import '$styles/app.scss'

let { children } = $props()
</script>

<svelte:head>
  <title>grabstream Playground - A minimal, extensible WebRTC P2P library</title>
</svelte:head>

{@render children()}
