<script lang="ts">
import type { Snippet } from 'svelte'
import type { HTMLButtonAttributes } from 'svelte/elements'

type Props = {
  variant?: 'default' | 'primary'
  size?: 'sm' | 'md'
  children: Snippet
} & HTMLButtonAttributes

let {
  type = 'button',
  variant = 'default',
  size = 'md',
  class: className = '',
  children,
  ...restProps
}: Props = $props()
</script>

<button
  {type}
  class={[className, 'btn', `btn-${variant} btn-${size}`]}
  {...restProps}
>
  {@render children()}
</button>

<style lang="scss">
  .btn {
    display: block;
    width: 100%;
    border: var(--border-width-default) solid;
    border-radius: var(--border-radius-md);
    text-align: center;

    &-sm {
      height: 30px;
      padding: 0 10px;
      font-size: var(--font-size-sm);
    }

    &-md {
      height: 40px;
      padding: 0 30px;
      font-size: var(--font-size-md);
    }

    &-default {
      color: var(--color-body);
      background-color: var(--color-background);
      border-color: var(--color-border);
    }

    &-primary {
      color: var(--color-secondary);
      background-color: var(--color-primary);
      border-color: var(--color-primary);
    }
  }
</style>
