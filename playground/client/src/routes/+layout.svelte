<script lang="ts">
import '$styles/app.scss'

let { children } = $props()
</script>

<svelte:head>
  <title>grabstream Playground - A minimal, extensible WebRTC P2P library</title>
</svelte:head>

<div class="layout">
  <header class="p-md">
    <h1 class="fs-md sm:fs-lg fw-bold text-primary">grabstream</h1>
  </header>
  <main>
    {@render children()}
  </main>
  <footer class="p-md lg:p-xl text-muted">
    <div class="d-flex flex-column md:flex-row md:justify-space-between md:items-end g-sm">
      <div>
        <p>Built with <strong class="fw-bold">@grabstream/client v{__GRABSTREAM_CLIENT_VERSION__}</strong></p>
        <p class="fs-sm mt-xs">A minimal, extensible WebRTC P2P library</p>
      </div>
      <div class="md:text-right">
        <p class="fs-xs">Copyright © {new Date().getFullYear()} grabss Inc.</p>
      </div>
    </div>
  </footer>
</div>

<style lang="scss">
  .layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  header, footer {
    position: fixed;
    left: 0;
    right: 0;
  }

  header {
    top: 0;
  }

  footer {
    bottom: 0;
  }

  main {
    flex: 1;
    overflow: auto;
    z-index: calc(infinity);
  }
</style>
