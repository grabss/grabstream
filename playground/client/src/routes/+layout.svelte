<script lang="ts">
import '$styles/app.scss'

let { children } = $props()
</script>

<svelte:head>
  <title>grabstream Playground - A minimal, extensible WebRTC P2P library</title>
</svelte:head>

<div class="layout">
  <main>
    {@render children()}
  </main>
</div>

<style lang="scss">
  .layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  main {
    flex: 1;
    overflow: auto;
  }
</style>
