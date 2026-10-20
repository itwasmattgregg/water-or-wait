<script lang="ts">
  import SiteFooter from '../lib/SiteFooter.svelte'
  import SiteNav from '../lib/SiteNav.svelte'
  import { hrefFor, linkClick } from '../lib/router.svelte'
</script>

<div class="page">
  <SiteNav variant="solid" />

  <main class="prose">
    <header class="hero-lite">
      <p class="kicker">Field notes · v1 model</p>
      <h1>The science behind Water <em>or</em> Wait</h1>
      <p class="lede">
        A weather-based soil-water checkbook for lawns and gardens — the same family of methods
        irrigation engineers use when they don’t have a probe in every bed.
      </p>
    </header>

    <section>
      <h2>1. Soil as a bank account</h2>
      <p>
        Plants don’t drink from the sky in real time. They drink from the
        <strong>root zone</strong>: a thin sponge of soil that stores plant-available water between
        field capacity (full but drained) and the permanent wilting point (so dry roots can’t pull
        more).
      </p>
      <p>
        Extension services often call the bookkeeping a
        <strong>checkbook</strong> or <strong>water-balance</strong> method. Deposits are rain and
        irrigation. Withdrawals are crop evapotranspiration. The running balance is a
        <strong>deficit</strong> — how far you’ve slipped from a full root zone.
      </p>
      <pre class="eq"><code>D<sub>t</sub> = clamp<sub>0…TAW</sub>( D<sub>t−1</sub> + ET<sub>c,t</sub> − P<sub>eff,t</sub> − I<sub>t</sub> )</code></pre>
      <p>
        We initialize with a modest unknown-state deficit (~35% of capacity) and then let two weeks
        of weather overwrite that guess. It’s not a lab measurement — it’s a physically motivated
        prior that updates daily.
      </p>
    </section>

    <section>
      <h2>2. ET<sub>0</sub>: what the atmosphere demands</h2>
      <p>
        <strong>Reference evapotranspiration (ET<sub>0</sub>)</strong> answers: how much water
        would a standardized, well-watered reference surface use today? The FAO-56 Penman–Monteith
        formulation combines net radiation, air temperature, humidity, and wind into a depth of
        water (inches or mm per day).
      </p>
      <p>
        Open-Meteo exposes daily <code>et0_fao_evapotranspiration</code> at your geocoded
        coordinates. Hot, windy, dry days raise ET<sub>0</sub>. Cool, humid, calm days lower it.
        That’s why “an inch a week” is sometimes too much and sometimes not enough.
      </p>
    </section>

    <section>
      <h2>3. K<sub>c</sub>: your plants aren’t the reference crop</h2>
      <p>
        Actual plant water use is <strong>ET<sub>c</sub> = ET<sub>0</sub> × K<sub>c</sub></strong>,
        where K<sub>c</sub> is an empirically derived <strong>crop coefficient</strong>.
      </p>
      <ul>
        <li>
          <strong>Cool-season lawns</strong> (fescue, Kentucky bluegrass, rye): mid-season K<sub
            >c</sub
          >
          ≈ 0.85–0.95 (FAO-56 / UC turf guidance). We use <code>0.85</code>.
        </li>
        <li>
          <strong>Warm-season lawns</strong> (bermuda, zoysia, St. Augustine): often ~20% less —
          we use <code>0.70</code>.
        </li>
        <li><strong>Garden beds</strong> (mixed ornamentals proxy): <code>0.90</code>.</li>
      </ul>
      <p>
        Same ZIP, same rain — different K<sub>c</sub>, different answer. That’s a feature, not a
        bug.
      </p>
    </section>

    <section>
      <h2>4. TAW: how big is the sponge?</h2>
      <p>
        <strong>Total available water</strong> in the managed root zone is roughly:
      </p>
      <pre class="eq"><code>TAW = AWC × z<sub>root</sub></code></pre>
      <p>
        <strong>AWC</strong> (available water capacity) depends on texture — sand holds less per
        foot than loam or clay. We use midpoints from university soil tables:
      </p>
      <ul>
        <li>Sand ≈ 1.0 in/ft</li>
        <li>Loam ≈ 1.9 in/ft</li>
        <li>Clay ≈ 2.0 in/ft</li>
      </ul>
      <p>
        Effective root depth defaults to ~9″ for lawns and ~12″ for gardens. Sandy yards drain
        faster and hit stress sooner; clay holds more but infiltrates slowly (runoff matters).
      </p>
    </section>

    <section>
      <h2>5. MAD: when do we actually turn the valve?</h2>
      <p>
        You rarely irrigate to keep the soil permanently at field capacity. Turf managers usually
        allow the root zone to dry to about
        <strong>50% of TAW</strong> — the <strong>management-allowed depletion (MAD)</strong> —
        before irrigating. Waiting longer risks wilt; watering earlier wastes water and can push
        disease.
      </p>
      <pre class="eq"><code>if D ≥ 0.5 × TAW  →  recommend irrigation</code>
<code>depth ≈ D − 0.1 × TAW   (leave a little room for the next storm)</code></pre>
      <p>
        Runtime in minutes is just depth divided by your sprinkler’s inches-per-hour (oscillating ~
        0.5″/hr, rotary ~ 0.35″/hr, drip ~ 0.20″/hr — or your custom catch-can rate).
      </p>
    </section>

    <section>
      <h2>6. Effective precipitation</h2>
      <p>Not every drop on the rain gauge becomes root-zone storage:</p>
      <ul>
        <li>Events &lt; 0.05″ are ignored (interception / noise).</li>
        <li>
          Intense storms above a soil-dependent threshold lose a fraction to runoff — more
          aggressively on clay than sand.
        </li>
        <li>Daily effective rain is capped at TAW so surplus doesn’t invent infinite credit.</li>
      </ul>
      <p>
        If the forecast shows a meaningful rain pulse with decent probability, we prefer
        <strong>wait</strong> over watering into a wet front.
      </p>
    </section>

    <section>
      <h2>7. Decision policy (the product)</h2>
      <ol>
        <li><strong>Wait for rain</strong> — useful storm likely in the next day or two.</li>
        <li><strong>Skip</strong> — deficit still comfortably below the MAD band.</li>
        <li><strong>Light water</strong> — approaching stress; a modest soak helps.</li>
        <li><strong>Water</strong> — at or past MAD; refill most of the deficit.</li>
      </ol>
      <p>
        We also sanity-check against weekly P<sub>eff</sub> vs weekly ET<sub>c</sub>: if rain has
        roughly paid the week’s bill and deficit isn’t severe, we won’t yell “water” just because
        a single dry afternoon feels ominous.
      </p>
    </section>

    <section>
      <h2>8. Honesty box</h2>
      <p>This is an atmospheric + soil-physics <em>estimate</em>. It does not know:</p>
      <ul>
        <li>shade from your neighbor’s maple</li>
        <li>compaction, thatch, or a buried patio</li>
        <li>HOA rules, watering restrictions, or “brown is beautiful”</li>
        <li>exactly how uniform your sprinkler really is</li>
      </ul>
      <p>
        A screwdriver soil probe, a footprint that springs back slowly, or a cheap moisture sensor
        still beats a model when they disagree. We optimize for
        <strong>better than a blind timer</strong>, not omniscience.
      </p>
    </section>

    <section class="cta">
      <a class="btn" href={hrefFor('check')} onclick={(e) => linkClick(e, 'check')}>
        Run it on your ZIP
      </a>
      <a class="btn ghost" href={hrefFor('sources')} onclick={(e) => linkClick(e, 'sources')}>
        See the citations
      </a>
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

  .prose {
    flex: 1;
    width: 100%;
    max-width: min(720px, 100%);
    margin: 0 auto;
    padding: 2rem 1.1rem 3rem;
    min-width: 0;
    box-sizing: border-box;
    overflow-wrap: break-word;
  }

  .hero-lite {
    margin-bottom: 2.5rem;
    padding-bottom: 1.75rem;
    border-bottom: 1px solid color-mix(in srgb, var(--ink) 12%, transparent);
  }

  .kicker {
    margin: 0 0 0.55rem;
    font-family: var(--mono);
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--moss);
  }

  h1 {
    margin: 0 0 0.85rem;
    font-family: var(--display);
    font-size: clamp(2.1rem, 5vw, 3.1rem);
    letter-spacing: -0.035em;
    line-height: 1.1;
  }

  h1 em {
    font-style: italic;
    font-weight: 500;
    opacity: 0.75;
  }

  .lede {
    margin: 0;
    font-size: 1.08rem;
    color: var(--ink-soft);
    max-width: 46ch;
  }

  section {
    margin: 0 0 2.25rem;
  }

  h2 {
    margin: 0 0 0.7rem;
    font-family: var(--display);
    font-size: 1.45rem;
    letter-spacing: -0.02em;
  }

  p,
  li {
    color: var(--ink-soft);
    max-width: 62ch;
  }

  p + p {
    margin-top: 0.85rem;
  }

  ul,
  ol {
    padding-left: 1.2rem;
  }

  li + li {
    margin-top: 0.45rem;
  }

  code {
    font-family: var(--mono);
    font-size: 0.9em;
    background: color-mix(in srgb, var(--moss) 12%, transparent);
    padding: 0.1em 0.35em;
    border-radius: 0.3em;
  }

  .eq {
    margin: 1rem 0;
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--pine);
    color: color-mix(in srgb, var(--cream) 92%, var(--sky));
    font-family: var(--mono);
    font-size: clamp(0.72rem, 2.8vw, 0.92rem);
    line-height: 1.65;
    max-width: 100%;
    min-width: 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }

  .eq code {
    background: none;
    color: inherit;
    padding: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
    display: block;
  }

  .cta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    padding-top: 0.5rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    border-radius: 0.7rem;
    padding: 0.85rem 1.15rem;
    font-weight: 650;
    background: var(--amber);
    color: #1d1408;
  }

  .btn.ghost {
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--ink) 18%, transparent);
    color: var(--ink);
  }
</style>
