<script lang="ts">
import type { Action } from 'svelte/action'

const loading: Action<HTMLDialogElement> = (node) => {
  const show = () => {
    document.body.style.overflow = 'hidden'
    node.showModal()
  }

  const close = () => {
    document.body.style.overflow = ''
    node.close()
  }

  $effect(() => {
    show()

    return close
  })
}
</script>

<dialog class="loading" use:loading>
  <div class="loader"></div>
</dialog>

<style lang="scss">
  .loading {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100dvh;

    &::backdrop {
      opacity: 0.8;
      background-color: var(--color-background);
    }

    .loader::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 5em;
      height: 5em;
      margin-top: -2.5em;
      margin-left: -2.5em;
      border-radius: 50%;
      border: 0.25em solid var(--color-secondary);
      border-top-color: var(--color-primary);
      animation: spinner 1.5s linear infinite;
    }

    @keyframes spinner {
      to {
        transform: rotate(360deg);
      }
    }
  }
</style>
