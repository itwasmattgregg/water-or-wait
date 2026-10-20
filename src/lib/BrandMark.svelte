<script lang="ts">
  interface Props {
    size?: 'sm' | 'md' | 'lg'
    light?: boolean
  }
  let { size = 'md', light = false }: Props = $props()
</script>

<span class="brand-mark size-{size}" class:light aria-hidden="false">
  <span class="orb" aria-hidden="true"></span>
  <span class="word">
    Water <em>or</em> Wait
  </span>
</span>

<style>
  .brand-mark {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    font-family: var(--display);
    font-weight: 600;
    letter-spacing: -0.03em;
    color: var(--ink);
    line-height: 1;
  }

  .brand-mark.light {
    color: var(--cream);
  }

  .size-sm {
    font-size: 1.05rem;
  }
  .size-md {
    font-size: 1.2rem;
  }
  .size-lg {
    font-size: clamp(2.2rem, 9.5vw, 4.6rem);
    gap: 0.55rem;
    letter-spacing: -0.045em;
    max-width: 100%;
  }

  .orb {
    width: 0.72em;
    height: 0.72em;
    border-radius: 50%;
    flex: 0 0 auto;
    background:
      radial-gradient(circle at 32% 30%, #e7f5d8 0%, var(--moss) 42%, var(--pine) 78%),
      var(--moss);
    box-shadow: 0 0 0 0.18em color-mix(in srgb, var(--sky) 35%, transparent);
  }

  .word {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .word em {
    font-style: italic;
    font-weight: 500;
    opacity: 0.78;
    padding: 0 0.06em;
  }
</style>
