<script lang="ts">
  interface Props {
    percent: number
    label: string
  }
  let { percent, label }: Props = $props()

  const clamped = $derived(Math.max(0, Math.min(100, percent)))
</script>

<div class="meter" style={`--level: ${clamped}%`} role="img" aria-label={`Soil moisture ${clamped} percent, ${label}`}>
  <div class="track">
    <div class="fill"></div>
    <div class="mad-mark" title="Typical stress threshold (~50% available water used)"></div>
  </div>
  <div class="meta">
    <span class="pct">{clamped}%</span>
    <span class="lbl">{label}</span>
  </div>
</div>

<style>
  .meter {
    display: grid;
    gap: 0.85rem;
    min-width: 0;
    max-width: 100%;
  }

  .track {
    position: relative;
    height: 0.85rem;
    width: 100%;
    max-width: 100%;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ink) 12%, transparent);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    width: var(--level);
    max-width: 100%;
    border-radius: inherit;
    background: linear-gradient(
      90deg,
      var(--dry) 0%,
      var(--amber) 45%,
      var(--moss) 100%
    );
    transform-origin: left center;
    animation: soak-in 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .mad-mark {
    position: absolute;
    left: 50%;
    top: -3px;
    bottom: -3px;
    width: 2px;
    background: color-mix(in srgb, var(--ink) 45%, transparent);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.35rem 1rem;
    min-width: 0;
  }

  .pct {
    font-family: var(--display);
    font-size: clamp(1.8rem, 7vw, 2.4rem);
    font-weight: 560;
    letter-spacing: -0.04em;
    color: var(--ink);
    line-height: 1;
    flex: 0 0 auto;
  }

  .lbl {
    font-size: 0.95rem;
    color: var(--muted);
    text-align: right;
    flex: 1 1 8rem;
    min-width: 0;
    overflow-wrap: break-word;
  }

  @keyframes soak-in {
    from {
      transform: scaleX(0.15);
      opacity: 0.4;
    }
    to {
      transform: scaleX(1);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .fill {
      animation: none;
    }
  }
</style>
