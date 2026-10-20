<script lang="ts">
  import SiteFooter from '../lib/SiteFooter.svelte'
  import SiteNav from '../lib/SiteNav.svelte'
  import { hrefFor, linkClick } from '../lib/router.svelte'

  const groups = [
    {
      title: 'Watering norms & timing',
      items: [
        {
          name: 'EPA WaterSense — Watering tips',
          href: 'https://www.epa.gov/watersense/watering-tips',
          note: 'Landscape typically needs about an inch of water a week including rainfall; varies by climate and plants.',
        },
        {
          name: 'Illinois Extension — Watering your lawn',
          href: 'https://extension.illinois.edu/lawns/watering-your-lawn',
          note: 'Cool-season turf often 1–1.5″/week for green growth; deep, infrequent irrigation; early morning preferred.',
        },
        {
          name: 'Virginia Tech — Summer lawn watering',
          href: 'https://www.pubs.ext.vt.edu/content/dam/pubs_ext_vt_edu/430/430-010/SPES-126.pdf',
          note: '~1″/week rule of thumb for many turfgrasses in warm conditions; audit sprinklers with catch cans.',
        },
        {
          name: 'Mississippi State Extension — When to water turf',
          href: 'https://extension.msstate.edu/content/when-should-turfgrass-be-watered',
          note: 'Track weekly rain; if substantial rain fell, skip; otherwise apply about an inch, preferably once.',
        },
      ],
    },
    {
      title: 'ET, Kc, and checkbook scheduling',
      items: [
        {
          name: 'FAO Irrigation & Drainage Paper 56',
          href: 'https://www.fao.org/4/x0490e/x0490e00.htm',
          note: 'Penman–Monteith ET₀ and single crop coefficients, including cool- and warm-season turfgrass tables.',
        },
        {
          name: 'UMN Extension — ET-based / water-balance irrigation',
          href: 'https://extension.umn.edu/natural-resources/conservation/agricultural-soil-and-water/irrigation/evapotranspiration-based-irrigation-scheduling-or-water-balance-method',
          note: 'Daily depletion accounting: D_c = D_p + ET_c − P − Irr; irrigate near MAD (often 50% of TAW).',
        },
        {
          name: 'UC ANR — Turfgrass crop coefficients',
          href: 'https://www.ucanr.edu/site/center-landscape-urban-horticulture/turfgrass-crop-coefficients-kc',
          note: 'Warm-season turf often ~20% lower annual Kc than cool-season; monthly factors beat yearly averages.',
        },
        {
          name: 'NC State — Water requirements of turfgrasses',
          href: 'https://content.ces.ncsu.edu/water-requirements-of-north-carolina-turfgrasses',
          note: 'Transition-zone guidance with monthly Kc thinking for cool- and warm-season species.',
        },
      ],
    },
    {
      title: 'Soil water holding',
      items: [
        {
          name: 'UC ANR — Soil water holding characteristics',
          href: 'https://www.ucanr.edu/site/center-landscape-urban-horticulture/soil-water-holding-characteristics',
          note: 'Plant-available water by texture (inches per foot) — basis for our AWC midpoints.',
        },
        {
          name: 'UNL — Irrigation tables / AWC',
          href: 'https://passel2.unl.edu/view/lesson/bda727eb8a5a/14',
          note: 'Available water capacity ranges across sand → loam → clay textural classes.',
        },
      ],
    },
    {
      title: 'Weather data',
      items: [
        {
          name: 'Open-Meteo Forecast API',
          href: 'https://open-meteo.com/en/docs',
          note: 'Daily precipitation_sum, et0_fao_evapotranspiration, temperatures, precip probability; geocoding by ZIP.',
        },
        {
          name: 'Open-Meteo Geocoding API',
          href: 'https://open-meteo.com/en/docs/geocoding-api',
          note: 'Postal / ZIP lookup → latitude, longitude, timezone.',
        },
      ],
    },
  ]
</script>

<div class="page">
  <SiteNav variant="solid" />

  <main class="prose">
    <header class="hero-lite">
      <p class="kicker">Bibliography · standing on shoulders</p>
      <h1>Sources &amp; further reading</h1>
      <p class="lede">
        We didn’t invent soil-water accounting. We implemented a homeowner-scale version of ideas
        that show up again and again in extension bulletins and FAO-56.
      </p>
    </header>

    {#each groups as group}
      <section>
        <h2>{group.title}</h2>
        <ul>
          {#each group.items as item}
            <li>
              <a href={item.href} target="_blank" rel="noreferrer">{item.name}</a>
              <p>{item.note}</p>
            </li>
          {/each}
        </ul>
      </section>
    {/each}

    <section class="cta">
      <a class="btn" href={hrefFor('science')} onclick={(e) => linkClick(e, 'science')}>
        Back to the model
      </a>
      <a class="btn ghost" href={hrefFor('check')} onclick={(e) => linkClick(e, 'check')}>
        Check a ZIP
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
    margin-bottom: 2.25rem;
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
    font-size: clamp(2.1rem, 5vw, 3rem);
    letter-spacing: -0.035em;
    line-height: 1.1;
  }

  .lede {
    margin: 0;
    color: var(--ink-soft);
    max-width: 48ch;
  }

  section {
    margin: 0 0 2rem;
  }

  h2 {
    margin: 0 0 0.85rem;
    font-family: var(--display);
    font-size: 1.35rem;
    letter-spacing: -0.02em;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 1.1rem;
  }

  li a {
    font-weight: 650;
    color: var(--pine);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.15em;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  li p {
    margin: 0.35rem 0 0;
    color: var(--muted);
    font-size: 0.95rem;
    max-width: 58ch;
  }

  .cta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    padding-top: 0.75rem;
  }

  .btn {
    display: inline-flex;
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
