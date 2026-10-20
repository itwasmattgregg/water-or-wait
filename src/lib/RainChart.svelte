<script lang="ts">
  import type { DailyWeather } from './types'

  interface Props {
    days: DailyWeather[]
  }
  let { days }: Props = $props()

  const recent = $derived(days.filter((d) => !d.isForecast).slice(-7))
  const maxRain = $derived(Math.max(0.25, ...recent.map((d) => d.precipitationIn)))

  function shortDay(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    return dt.toLocaleDateString(undefined, { weekday: 'short' })
  }
</script>

<div class="chart" aria-label="Rainfall over the past seven days">
  {#each recent as day, i (day.date)}
    <div class="col" style={`--h: ${(day.precipitationIn / maxRain) * 100}%; --delay: ${i * 60}ms`}>
      <div class="bar-wrap">
        <div class="bar" title={`${day.precipitationIn.toFixed(2)} inches`}></div>
      </div>
      <span class="val">{day.precipitationIn.toFixed(2)}</span>
      <span class="day">{shortDay(day.date)}</span>
    </div>
  {/each}
</div>

<style>
  .chart {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.35rem;
    align-items: end;
    min-height: 9.5rem;
    max-width: 100%;
    min-width: 0;
  }

  .col {
    display: grid;
    grid-template-rows: 1fr auto auto;
    gap: 0.25rem;
    justify-items: center;
    height: 100%;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
  }

  .bar-wrap {
    width: 100%;
    height: 100%;
    min-height: 5.5rem;
    display: flex;
    align-items: end;
    justify-content: center;
  }

  .bar {
    width: 70%;
    max-width: 2.2rem;
    height: max(4px, var(--h));
    border-radius: 0.35rem 0.35rem 0.15rem 0.15rem;
    background: linear-gradient(180deg, var(--sky) 0%, var(--moss) 100%);
    animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: var(--delay);
  }

  .val {
    font-size: clamp(0.62rem, 2.4vw, 0.72rem);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .day {
    font-size: clamp(0.68rem, 2.6vw, 0.78rem);
    color: var(--ink-soft);
    font-weight: 560;
  }

  @keyframes rise {
    from {
      transform: scaleY(0.2);
      opacity: 0;
    }
    to {
      transform: scaleY(1);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bar {
      animation: none;
    }
  }
</style>
