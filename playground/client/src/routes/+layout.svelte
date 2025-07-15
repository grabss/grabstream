<script lang="ts">
import '$styles/app.scss'

import TheFooter from '$lib/components/TheFooter.svelte'
import TheHeader from '$lib/components/TheHeader.svelte'

let { children } = $props()
</script>

<svelte:head>
  <title>grabstream Playground - A minimal, extensible WebRTC P2P library</title>
</svelte:head>

<div class="layout">
  <TheHeader/>
  <main>
    {@render children()}
  </main>
  <TheFooter/>
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
    z-index: calc(infinity);
  }
</style>
