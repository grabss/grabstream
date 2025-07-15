<script lang="ts">
import type {
  HTMLInputAttributes,
  HTMLInputTypeAttribute
} from 'svelte/elements'

type AllowedInputType = Extract<
  HTMLInputTypeAttribute,
  | 'date'
  | 'datetime-local'
  | 'email'
  | 'file'
  | 'month'
  | 'number'
  | 'password'
  | 'search'
  | 'tel'
  | 'text'
  | 'time'
  | 'url'
  | 'week'
>

type Props = {
  type?: AllowedInputType
  size?: 'sm' | 'md'
} & Omit<HTMLInputAttributes, 'size'>

let {
  type = 'text',
  size = 'md',
  class: className = '',
  value = $bindable(''),
  ...restProps
}: Props = $props()
</script>

<input
  {type}
  class={[className, 'input', `input-${size}`]}
  {...restProps}
  bind:value
/>

<style lang="scss">
  .input {
    width: 100%;
    border-bottom: var(--border-width-default) solid var(--color-border);

    &-sm {
      height: 30px;
      padding: 0 10px;
      font-size: var(--font-size-sm);
    }

    &-md {
      height: 40px;
      padding: 0 15px;
      font-size: var(--font-size-md);
    }

    &:-webkit-autofill {
      box-shadow: 0 0 0px 1000px var(--color-background) inset;
      -webkit-text-fill-color: var(--color-body) !important;
    }

    &::placeholder {
      color: var(--color-muted);
    }

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }
</style>
