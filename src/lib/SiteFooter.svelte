<script lang="ts">
  import { hrefFor, linkClick } from './router.svelte'
</script>

<footer class="foot">
  <div class="inner">
    <p class="tag">
      Water <em>or</em> Wait — soil-water accounting for people who like equations with their
      lawn care.
    </p>
    <div class="links">
      <a href={hrefFor('science')} onclick={(e) => linkClick(e, 'science')}>The science</a>
      <a href={hrefFor('sources')} onclick={(e) => linkClick(e, 'sources')}>Sources</a>
      <a href={hrefFor('check')} onclick={(e) => linkClick(e, 'check')}>Check yard</a>
      <a href="/api/v1/advice?zip=78701" target="_blank" rel="noreferrer">API</a>
    </div>
    <p class="fine">
      Weather via
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
      (CC BY 4.0). Model inspired by EPA WaterSense, FAO-56, and university extension checkbook
      methods. A decision aid — not a soil probe.
    </p>
  </div>
</footer>

<style>
  .foot {
    margin-top: auto;
    border-top: 1px solid color-mix(in srgb, var(--ink) 12%, transparent);
    padding: 2rem 1.1rem 2.5rem;
    max-width: 100%;
    overflow-x: clip;
  }

  .inner {
    max-width: min(920px, 100%);
    margin: 0 auto;
    display: grid;
    gap: 0.9rem;
    min-width: 0;
  }

  .tag {
    margin: 0;
    font-family: var(--display);
    font-size: 1.15rem;
    letter-spacing: -0.02em;
    color: var(--ink);
  }

  .tag em {
    font-style: italic;
    opacity: 0.75;
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.1rem;
  }

  .links a,
  .fine a {
    color: var(--pine);
    font-weight: 550;
  }

  .fine {
    margin: 0;
    color: var(--muted);
    font-size: 0.82rem;
    max-width: 62ch;
  }
</style>
