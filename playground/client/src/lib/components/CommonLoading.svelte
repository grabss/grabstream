<div class="loader"></div>

<style lang="scss">
  .loader {
    position: relative;
    width: 30px;
    height: 30px;

    &::before {
      content: '';
      position: absolute;
      top: -3px;
      left: -3px;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 0.25em solid var(--color-border);
      border-top-color: var(--color-primary);
      animation: spinner 1.5s linear infinite;
    }
  }

  @keyframes spinner {
    to {
      transform: rotate(360deg);
    }
  }
</style>
