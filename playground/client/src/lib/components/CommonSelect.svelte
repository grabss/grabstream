<script lang="ts">
import type { Snippet } from 'svelte'
import type { HTMLSelectAttributes } from 'svelte/elements'

type Props = {
  children: Snippet
} & HTMLSelectAttributes

let {
  class: className = '',
  value = $bindable(''),
  children,
  ...restProps
}: Props = $props()
</script>

<select class={[className, 'select']} {...restProps} bind:value>
  {@render children()}
</select>

<style lang="scss">
  .select {
    width: 100%;
    border-bottom: var(--border-width-default) solid var(--color-border);
  }
</style>
