<script lang="ts">
  import BrandMark from '../lib/BrandMark.svelte'
  import SiteFooter from '../lib/SiteFooter.svelte'
  import SiteNav from '../lib/SiteNav.svelte'
  import { hrefFor, linkClick, navigate } from '../lib/router.svelte'
  import { loadSettings, saveSettings } from '../lib/storage'

  let zipInput = $state(loadSettings().zip || '')
  let error = $state<string | null>(null)

  function onSubmit(e: Event) {
    e.preventDefault()
    const zip = zipInput.trim()
    if (!/^\d{5}(-\d{4})?$/.test(zip)) {
      error = 'Enter a valid 5-digit U.S. ZIP code.'
      return
    }
    error = null
    const settings = loadSettings()
    saveSettings({ ...settings, zip: zip.slice(0, 5) })
    navigate('check')
  }
</script>

<div class="page">
  <SiteNav variant="hero" />

  <section class="hero">
    <div class="hero-media" aria-hidden="true"></div>
    <div class="hero-veil" aria-hidden="true"></div>
    <div class="hero-copy">
      <BrandMark size="lg" light />
      <h1>Rain is an input. Soil is a ledger.</h1>
      <p class="lede">
        We balance recent precipitation against FAO reference evapotranspiration for your ZIP —
        then tell you whether to water, wait, or skip.
      </p>
      <form class="zip-form" onsubmit={onSubmit}>
        <label class="sr" for="zip">ZIP code</label>
        <input
          id="zip"
          name="zip"
          inputmode="numeric"
          autocomplete="postal-code"
          maxlength="10"
          placeholder="ZIP code"
          bind:value={zipInput}
          required
        />
        <button type="submit">Run the balance</button>
      </form>
      {#if error}
        <p class="error" role="alert">{error}</p>
      {/if}
      <p class="hero-eq" aria-hidden="true">
        <code>D<sub>t</sub> = D<sub>t−1</sub> + ET<sub>c</sub> − P<sub>eff</sub> − I</code>
      </p>
    </div>
  </section>

  <main class="below">
    <section class="block">
      <p class="kicker">Why this exists</p>
      <h2>Most watering advice ignores yesterday’s weather.</h2>
      <p>
        “An inch a week” is a useful rule of thumb — until a storm dumps 0.8″ on Tuesday and you
        still run the timer on Thursday. Water or Wait keeps a running soil-water checkbook:
        withdrawals from plant use, deposits from rain (and any irrigation you log).
      </p>
    </section>

    <section class="equation-panel" aria-label="Core water balance">
      <div>
        <p class="kicker">The daily update</p>
        <h2>One equation, every day</h2>
        <p>
          Deficit grows when the lawn drinks. It shrinks when rain (or your hose) arrives. When
          deficit approaches half the root zone’s plant-available water, we say: water.
        </p>
      </div>
      <pre class="eq-block"><code>D<sub>t</sub> = clamp( D<sub>t−1</sub> + ET<sub>c</sub> − P<sub>eff</sub> − I )</code>
<code>ET<sub>c</sub> = ET<sub>0</sub> × K<sub>c</sub></code>
<code>irrigate near D ≈ 0.5 × TAW</code></pre>
    </section>

    <section class="trio">
      <article>
        <h3>ET<sub>0</sub></h3>
        <p>
          FAO Penman–Monteith reference evapotranspiration — how thirsty a well-watered reference
          surface is, given sun, wind, humidity, and heat. We pull daily ET<sub>0</sub> from
          Open-Meteo for your coordinates.
        </p>
      </article>
      <article>
        <h3>K<sub>c</sub></h3>
        <p>
          Crop coefficient. Cool-season turf (~0.85) drinks more than warm-season (~0.70). Garden
          beds sit near ~0.90. Same weather, different demand.
        </p>
      </article>
      <article>
        <h3>TAW &amp; MAD</h3>
        <p>
          Total available water depends on soil texture × root depth. Management-allowed depletion
          is typically ~50% for turf — water before the plant hits hard stress.
        </p>
      </article>
    </section>

    <section class="block split">
      <div>
        <p class="kicker">Not every inch counts</p>
        <h2>Effective rainfall, not gauge totals</h2>
        <p>
          Trace events under 0.05″ barely wet the canopy. Intense storms on clay lose more to
          runoff. We discount and cap deposits so the ledger doesn’t pretend your root zone is a
          bottomless tank.
        </p>
      </div>
      <div>
        <p class="kicker">Then the decision</p>
        <h2>Skip · wait · light soak · water</h2>
        <p>
          If meaningful rain is forecast, we hold. If the root zone is still comfortable, we skip.
          If you’re sliding toward the MAD threshold, we recommend inches — and minutes at your
          sprinkler rate.
        </p>
      </div>
    </section>

    <section class="cta-band">
      <h2>Ready to query your microclimate?</h2>
      <p>ZIP in, physics out. Tweak soil and grass type anytime — stored only in this browser.</p>
      <div class="cta-row">
        <a class="btn" href={hrefFor('check')} onclick={(e) => linkClick(e, 'check')}>
          Check my yard
        </a>
        <a class="btn ghost" href={hrefFor('science')} onclick={(e) => linkClick(e, 'science')}>
          Read the full model
        </a>
      </div>
    </section>
  </main>

  <SiteFooter />
</div>

<style>
  .page {
    min-height: 100svh;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    overflow-x: clip;
  }

  .hero {
    position: relative;
    min-height: 100svh;
    max-width: 100%;
    display: grid;
    place-items: end stretch;
    color: var(--cream);
    overflow: hidden;
  }

  .hero-media {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(120deg, rgba(18, 42, 28, 0.2), transparent 50%),
      url('/hero.jpg') center / cover no-repeat;
    transform: scale(1.04);
    animation: drift 18s ease-in-out infinite alternate;
  }

  .hero-veil {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(
        180deg,
        rgba(12, 28, 18, 0.28) 0%,
        rgba(12, 28, 18, 0.52) 42%,
        rgba(8, 18, 12, 0.92) 100%
      ),
      radial-gradient(ellipse at 18% 8%, rgba(126, 182, 201, 0.22), transparent 42%);
  }

  .hero-copy {
    position: relative;
    z-index: 1;
    padding: clamp(1.25rem, 4vw, 3.5rem);
    padding-bottom: clamp(2.4rem, 6vw, 4.2rem);
    max-width: min(42rem, 100%);
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
    animation: rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .hero h1 {
    margin: 0.9rem 0 0.75rem;
    font-family: var(--sans);
    font-size: clamp(1.35rem, 3.5vw, 1.9rem);
    font-weight: 500;
    letter-spacing: -0.025em;
    max-width: 22ch;
  }

  .lede {
    margin: 0 0 1.35rem;
    color: color-mix(in srgb, var(--cream) 84%, transparent);
    max-width: 38ch;
    font-size: 1.05rem;
  }

  .zip-form {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    max-width: min(28rem, 100%);
    min-width: 0;
  }

  .zip-form input {
    flex: 1 1 8rem;
    min-width: 0;
    border: 0;
    border-radius: 0.7rem;
    padding: 0.95rem 1rem;
    font: inherit;
    background: color-mix(in srgb, var(--cream) 94%, white);
    color: var(--ink);
  }

  .zip-form button,
  .btn {
    border: 0;
    border-radius: 0.7rem;
    padding: 0.95rem 1.2rem;
    font: inherit;
    font-weight: 650;
    cursor: pointer;
    background: var(--amber);
    color: #1d1408;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }

  .hero-eq {
    margin: 1.15rem 0 0;
    font-family: var(--mono);
    font-size: 0.78rem;
    letter-spacing: 0.01em;
    color: color-mix(in srgb, var(--cream) 70%, var(--sky));
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .hero-eq code {
    font-family: inherit;
    white-space: nowrap;
    display: inline-block;
    max-width: none;
  }

  .error {
    margin: 0.85rem 0 0;
    color: #ffb4a8;
  }

  .below {
    width: 100%;
    max-width: min(920px, 100%);
    margin: 0 auto;
    padding: 3rem 1.1rem 1rem;
    display: grid;
    gap: 2.75rem;
    min-width: 0;
    box-sizing: border-box;
  }

  .kicker {
    margin: 0 0 0.45rem;
    font-family: var(--mono);
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--moss);
  }

  .block h2,
  .equation-panel h2,
  .cta-band h2 {
    margin: 0 0 0.75rem;
    font-family: var(--display);
    font-size: clamp(1.7rem, 3.5vw, 2.35rem);
    letter-spacing: -0.03em;
    line-height: 1.15;
    color: var(--ink);
  }

  .block p,
  .equation-panel p,
  .trio p,
  .cta-band p {
    margin: 0;
    color: var(--ink-soft);
    max-width: 58ch;
  }

  .equation-panel {
    display: grid;
    gap: 1.25rem;
    padding: 1.5rem 0;
    border-top: 1px solid color-mix(in srgb, var(--ink) 12%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--ink) 12%, transparent);
    min-width: 0;
    max-width: 100%;
  }

  .equation-panel > * {
    min-width: 0;
    max-width: 100%;
  }

  @media (min-width: 800px) {
    .equation-panel {
      grid-template-columns: 1fr 1fr;
      align-items: end;
      gap: 2rem;
    }
  }

  .eq-block {
    margin: 0;
    padding: 1rem 1rem;
    border-radius: 0.85rem;
    background: var(--pine);
    color: color-mix(in srgb, var(--cream) 92%, var(--sky));
    font-family: var(--mono);
    font-size: clamp(0.72rem, 2.8vw, 0.92rem);
    line-height: 1.7;
    max-width: 100%;
    min-width: 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    animation: rise 1s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .eq-block code {
    display: block;
    font-family: inherit;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .trio {
    display: grid;
    gap: 1.5rem;
  }

  @media (min-width: 760px) {
    .trio {
      grid-template-columns: repeat(3, 1fr);
      gap: 1.75rem;
    }
  }

  .trio h3 {
    margin: 0 0 0.45rem;
    font-family: var(--mono);
    font-size: 1.05rem;
    color: var(--pine);
  }

  .split {
    display: grid;
    gap: 1.75rem;
  }

  @media (min-width: 760px) {
    .split {
      grid-template-columns: 1fr 1fr;
      gap: 2.5rem;
    }
  }

  .cta-band {
    padding: 0.5rem 0 1rem;
  }

  .cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    margin-top: 1.15rem;
  }

  .btn.ghost {
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
    color: var(--ink);
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }

  @keyframes drift {
    from {
      transform: scale(1.04);
    }
    to {
      transform: scale(1.08) translate3d(-1.2%, -0.8%, 0);
    }
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-media,
    .hero-copy,
    .eq-block {
      animation: none;
    }
  }
</style>
