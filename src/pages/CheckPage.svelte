<script lang="ts">
  import { onMount } from 'svelte'
  import MoistureMeter from '../lib/MoistureMeter.svelte'
  import RainChart from '../lib/RainChart.svelte'
  import SiteFooter from '../lib/SiteFooter.svelte'
  import SiteNav from '../lib/SiteNav.svelte'
  import type { AdviceResponse } from '../lib/adviceService'
  import { hrefFor, linkClick } from '../lib/router.svelte'
  import { loadSettings, saveSettings } from '../lib/storage'
  import {
    DEFAULT_SETTINGS,
    SPRINKLER_RATES,
    type DailyWeather,
    type LocationInfo,
    type UserSettings,
    type WateringAdvice,
  } from '../lib/types'
  import { soilBlurb } from '../lib/wateringEngine'

  let settings = $state<UserSettings>({ ...DEFAULT_SETTINGS })
  let zipInput = $state('')
  let location = $state<LocationInfo | null>(null)
  let days = $state<DailyWeather[]>([])
  let advice = $state<WateringAdvice | null>(null)
  let loading = $state(false)
  let error = $state<string | null>(null)
  let hasChecked = $state(false)

  onMount(() => {
    settings = loadSettings()
    zipInput = settings.zip
    if (settings.zip) void runCheck(settings.zip)
  })

  function persist(next: UserSettings) {
    settings = next
    saveSettings(next)
  }

  function onSprinklerChange(value: UserSettings['sprinkler']) {
    const inchesPerHour =
      value === 'custom' ? settings.inchesPerHour : SPRINKLER_RATES[value]
    persist({ ...settings, sprinkler: value, inchesPerHour })
  }

  function adviceUrl(zip: string, s: UserSettings): string {
    const url = new URL('/api/v1/advice', window.location.origin)
    url.searchParams.set('zip', zip.trim())
    url.searchParams.set('soil', s.soil)
    url.searchParams.set('grass', s.grass)
    url.searchParams.set('area', s.area)
    url.searchParams.set('sprinkler', s.sprinkler)
    url.searchParams.set('inches_per_hour', String(s.inchesPerHour))
    if (s.lastWatered) {
      url.searchParams.set('last_watered', s.lastWatered)
      url.searchParams.set('last_watered_inches', String(s.lastWateredInches))
    }
    return url.toString()
  }

  async function runCheck(zip = zipInput) {
    error = null
    loading = true
    try {
      const res = await fetch(adviceUrl(zip, settings))
      const data = (await res.json()) as AdviceResponse | { ok: false; error: string }
      if (!res.ok || !('ok' in data) || data.ok !== true) {
        throw new Error(
          'error' in data && data.error ? data.error : 'Could not get watering advice.',
        )
      }
      const nextSettings = { ...settings, zip: data.location.zip }
      persist(nextSettings)
      location = data.location
      advice = data.advice
      days = data.weather.map((d) => ({
        date: d.date,
        precipitationIn: d.precipitation_inches,
        et0In: d.et0_inches,
        tempMaxF: d.temp_max_f,
        precipProbability: d.precip_probability,
        isForecast: d.is_forecast,
      }))
      hasChecked = true
    } catch (e) {
      error = e instanceof Error ? e.message : 'Something went wrong.'
      advice = null
    } finally {
      loading = false
    }
  }

  function recompute() {
    saveSettings(settings)
    if (hasChecked && zipInput) void runCheck(zipInput)
  }

  function markWatered() {
    if (!advice || advice.recommendInches <= 0) return
    const today =
      days.find((d) => !d.isForecast)?.date ?? new Date().toISOString().slice(0, 10)
    persist({
      ...settings,
      lastWatered: today,
      lastWateredInches: advice.recommendInches,
    })
    void runCheck(zipInput)
  }

  function onSubmit(e: Event) {
    e.preventDefault()
    void runCheck()
  }

  const actionClass = $derived(advice?.action ?? 'idle')
</script>

<div class="page">
  <SiteNav variant="solid" />

  <main class="result">
    {#if !hasChecked && !loading}
      <section class="intro">
        <h1>Check your yard</h1>
        <p>
          Enter a ZIP. We’ll fetch nearby rain + ET<sub>0</sub>, run the soil-water ledger, and
          return a skip / wait / water call.
        </p>
        <form class="zip-form" onsubmit={onSubmit}>
          <label class="sr" for="zip">ZIP code</label>
          <input id="zip" bind:value={zipInput} maxlength="10" placeholder="ZIP code" required />
          <button type="submit" disabled={loading}>
            {loading ? 'Checking…' : 'Run the balance'}
          </button>
        </form>
        {#if error}
          <p class="error" role="alert">{error}</p>
        {/if}
        <p class="hint">
          Curious how it works?
          <a href={hrefFor('science')} onclick={(e) => linkClick(e, 'science')}>Read the science</a>.
        </p>
      </section>
    {:else if loading && !hasChecked}
      <section class="intro">
        <h1>Solving the balance…</h1>
        <p>Pulling precipitation, ET<sub>0</sub>, and writing today’s ledger.</p>
      </section>
    {:else}
      <section class="verdict {actionClass}">
        <div class="verdict-copy">
          <p class="place">
            {#if location}
              {location.name}{#if location.admin1}, {location.admin1}{/if}
              <span>· {location.zip}</span>
            {/if}
          </p>
          {#if advice}
            <h1>{advice.headline}</h1>
            <p class="detail">{advice.detail}</p>
            {#if advice.recommendMinutes > 0}
              <p class="duration">
                Run sprinklers about
                <strong>{advice.recommendMinutes} minutes</strong>
                (~{advice.recommendInches.toFixed(2)}" at your rate).
                {#if advice.recommendMinutes > 40}
                  Split into 2–3 cycles with soak-in pauses if you see runoff.
                {/if}
              </p>
            {/if}
            <p class="window">{advice.nextWaterWindow}</p>
          {/if}
          <form class="zip-form compact" onsubmit={onSubmit}>
            <label class="sr" for="zip2">ZIP code</label>
            <input id="zip2" bind:value={zipInput} maxlength="10" />
            <button type="submit" disabled={loading}>{loading ? '…' : 'Refresh'}</button>
          </form>
          {#if error}
            <p class="error" role="alert">{error}</p>
          {/if}
        </div>
        {#if advice}
          <div class="verdict-meter">
            <h2>Estimated lawn moisture</h2>
            <MoistureMeter percent={advice.moisturePercent} label={advice.moistureLabel} />
            <p class="meter-note">
              Based on a {settings.soil} soil profile holding about
              {advice.tawInches.toFixed(1)}" of plant-available water in the root zone. The tick
              marks the usual “time to water” point (~50% used).
            </p>
          </div>
        {/if}
      </section>

      <section class="setup" aria-label="Yard setup">
        <h2>Yard setup</h2>
        <p class="setup-lede">Soil, grass, and sprinkler rate — saved in this browser only.</p>
        <div class="fields">
          <label>
            <span>Soil</span>
            <select
              bind:value={settings.soil}
              onchange={() => {
                persist(settings)
                recompute()
              }}
            >
              <option value="sand">Sandy</option>
              <option value="loam">Loam (typical)</option>
              <option value="clay">Clay</option>
            </select>
            <small>{soilBlurb(settings.soil)}</small>
          </label>
          <label>
            <span>Grass</span>
            <select
              bind:value={settings.grass}
              onchange={() => {
                persist(settings)
                recompute()
              }}
            >
              <option value="cool">Cool-season turf</option>
              <option value="warm">Warm-season turf</option>
            </select>
          </label>
          <label>
            <span>Focus</span>
            <select
              bind:value={settings.area}
              onchange={() => {
                persist(settings)
                recompute()
              }}
            >
              <option value="lawn">Lawn</option>
              <option value="garden">Garden beds</option>
              <option value="both">Lawn + garden</option>
            </select>
          </label>
          <label>
            <span>Sprinkler</span>
            <select
              value={settings.sprinkler}
              onchange={(e) => {
                onSprinklerChange(
                  (e.currentTarget as HTMLSelectElement).value as UserSettings['sprinkler'],
                )
                recompute()
              }}
            >
              <option value="oscillating">Oscillating · 0.50″/hr</option>
              <option value="rotary">Rotary · 0.35″/hr</option>
              <option value="drip">Drip · 0.20″/hr</option>
              <option value="custom">Custom rate</option>
            </select>
          </label>
          {#if settings.sprinkler === 'custom'}
            <label>
              <span>Inches per hour</span>
              <input
                type="number"
                min="0.05"
                max="2"
                step="0.05"
                bind:value={settings.inchesPerHour}
                onchange={() => {
                  persist(settings)
                  recompute()
                }}
              />
            </label>
          {/if}
        </div>
        {#if advice && advice.recommendInches > 0}
          <button class="secondary" type="button" onclick={markWatered}>
            I watered as recommended
          </button>
        {/if}
      </section>

      {#if advice}
        <section class="panel">
          <h2>Last 7 days of rain</h2>
          <p class="panel-lede">
            {advice.weeklyRainInches.toFixed(2)}" fell · ~{advice.effectiveRainInches.toFixed(2)}"
            likely reached the root zone · plants used ~{advice.weeklyEtcInches.toFixed(2)}"
          </p>
          <RainChart {days} />
        </section>

        <section class="panel tips">
          <h2>How to water well</h2>
          <p>{advice.bestTime}</p>
          <p>
            Prefer deep, infrequent soaks over daily sprinkles — shallow watering trains shallow
            roots.
          </p>
          <p class="fine">
            {advice.confidenceNote}
            <a href={hrefFor('science')} onclick={(e) => linkClick(e, 'science')}>Model details</a>
          </p>
        </section>
      {/if}
    {/if}
  </main>

  <SiteFooter />
</div>

<style>
  .page {
    min-height: 100svh;
    width: 100%;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    overflow-x: clip;
  }

  .result {
    flex: 1;
    padding: 1.25rem 1rem 2rem;
    max-width: 920px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
    display: grid;
    gap: 1.5rem;
    min-width: 0;
    overflow-x: clip;
  }

  .result > * {
    min-width: 0;
    max-width: 100%;
  }

  .intro h1 {
    margin: 0 0 0.7rem;
    font-family: var(--display);
    font-size: clamp(2rem, 4vw, 2.8rem);
    letter-spacing: -0.03em;
  }

  .intro p {
    margin: 0 0 1.2rem;
    color: var(--ink-soft);
    max-width: 46ch;
  }

  .hint {
    margin-top: 1rem !important;
    font-size: 0.92rem;
    color: var(--muted) !important;
  }

  .hint a {
    color: var(--pine);
    font-weight: 600;
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
    border-radius: 0.7rem;
    padding: 0.95rem 1rem;
    font: inherit;
    background: color-mix(in srgb, var(--paper) 55%, white);
    border: 1px solid color-mix(in srgb, var(--ink) 14%, transparent);
    color: var(--ink);
  }

  .zip-form button,
  .secondary {
    border: 0;
    border-radius: 0.7rem;
    padding: 0.95rem 1.2rem;
    font: inherit;
    font-weight: 650;
    cursor: pointer;
    background: var(--amber);
    color: #1d1408;
  }

  .zip-form button:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .zip-form.compact {
    margin-top: 1.25rem;
    max-width: 22rem;
  }

  .zip-form.compact input,
  .zip-form.compact button {
    padding: 0.7rem 0.9rem;
  }

  .error {
    margin: 0.85rem 0 0;
    color: #9b2c1a;
  }

  .verdict {
    display: grid;
    gap: 1.75rem;
    min-width: 0;
    max-width: 100%;
    animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .verdict-copy,
  .verdict-meter {
    min-width: 0;
    max-width: 100%;
  }

  @media (min-width: 800px) {
    .verdict {
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
      align-items: end;
      gap: 2.5rem;
    }
  }

  .place {
    margin: 0 0 0.55rem;
    color: var(--muted);
    font-size: 0.92rem;
    overflow-wrap: anywhere;
  }

  .verdict-copy > h1 {
    margin: 0 0 0.8rem;
    font-family: var(--display);
    font-size: clamp(1.85rem, 8vw, 3.4rem);
    line-height: 1.05;
    letter-spacing: -0.035em;
    color: var(--ink);
    overflow-wrap: break-word;
  }

  .verdict.skip .verdict-copy > h1,
  .verdict.wait_for_rain .verdict-copy > h1 {
    color: var(--pine);
  }

  .verdict.water .verdict-copy > h1 {
    color: var(--amber-deep);
  }

  .detail,
  .duration,
  .window {
    margin: 0 0 0.7rem;
    color: var(--ink-soft);
    max-width: min(42ch, 100%);
    overflow-wrap: break-word;
  }

  .duration strong {
    color: var(--ink);
  }

  .window {
    font-weight: 600;
    color: var(--moss);
  }

  .verdict-meter h2,
  .panel h2,
  .setup h2 {
    margin: 0 0 0.85rem;
    font-family: var(--display);
    font-size: 1.45rem;
    letter-spacing: -0.02em;
    color: var(--ink);
  }

  .meter-note,
  .panel-lede,
  .setup-lede,
  .tips p,
  .fine {
    margin: 0.85rem 0 0;
    color: var(--muted);
    font-size: 0.92rem;
    max-width: 100%;
    overflow-wrap: break-word;
  }

  .panel,
  .setup {
    padding: 1.35rem 0 0.25rem;
    border-top: 1px solid color-mix(in srgb, var(--ink) 12%, transparent);
    min-width: 0;
    max-width: 100%;
  }

  .fields {
    display: grid;
    gap: 1rem;
    min-width: 0;
    max-width: 100%;
  }

  @media (min-width: 700px) {
    .fields {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
  }

  .fields label {
    display: grid;
    gap: 0.35rem;
    color: var(--ink);
    font-weight: 560;
    min-width: 0;
    max-width: 100%;
    overflow: hidden; /* native <select> min-width follows longest option */
  }

  .fields small {
    font-weight: 450;
    color: var(--muted);
    overflow-wrap: break-word;
  }

  .fields select,
  .fields input {
    display: block;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    font: inherit;
    font-size: 1rem;
    border-radius: 0.65rem;
    border: 1px solid color-mix(in srgb, var(--ink) 16%, transparent);
    background: color-mix(in srgb, var(--paper) 70%, white);
    padding: 0.7rem 0.8rem;
    color: var(--ink);
  }

  .fields select {
    /* Long option labels must not expand the page past the viewport. */
    text-overflow: ellipsis;
  }

  .secondary {
    margin-top: 1.1rem;
    max-width: 100%;
    background: var(--moss);
    color: var(--cream);
  }

  .tips p + p {
    margin-top: 0.65rem;
  }

  .fine {
    font-size: 0.82rem;
    max-width: 60ch;
  }

  .fine a {
    color: var(--pine);
    font-weight: 600;
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .verdict {
      animation: none;
    }
  }
</style>
