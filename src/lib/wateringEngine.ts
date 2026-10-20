/**
 * Soil-water checkbook model for lawn/garden irrigation advice.
 *
 * Based on extension / FAO guidance:
 * - EPA WaterSense & university extensions: ~1"/week including rainfall for active turf
 * - Checkbook / ET scheduling (UMN, Virginia Tech, NDSU): daily deficit tracking
 * - ETc = ET0 × Kc (FAO-56; UC / NC State turf coefficients)
 * - Irrigate near 50% management-allowed depletion (MAD) of total available water (TAW)
 * - Deep, infrequent watering; prefer early morning
 *
 * This is a decision aid, not a soil moisture sensor.
 */

import type {
  DailyWeather,
  GrassType,
  SoilType,
  UserSettings,
  WateringAdvice,
  YardArea,
} from './types'

/** Plant-available water capacity, inches per foot of soil depth (UCANR / UNL midpoints). */
const AWC_IN_PER_FT: Record<SoilType, number> = {
  sand: 1.0,
  loam: 1.9,
  clay: 2.0,
}

/** Effective root-zone depth in feet. Lawns often concentrate roots in top 6–12". */
const ROOT_DEPTH_FT: Record<YardArea, number> = {
  lawn: 0.75, // ~9"
  garden: 1.0, // ~12"
  both: 0.85,
}

/**
 * Mid-season turf/garden crop coefficients.
 * Cool-season lawns ~0.80–0.95 (FAO / UC); warm-season ~0.60–0.85.
 * Garden beds treated like mixed ornamentals (~0.9).
 */
function cropCoefficient(grass: GrassType, area: YardArea): number {
  if (area === 'garden') return 0.9
  const lawnKc = grass === 'cool' ? 0.85 : 0.7
  if (area === 'both') return (lawnKc + 0.9) / 2
  return lawnKc
}

/** Management allowed depletion — irrigate near 50% of TAW (common turf MAD). */
const MAD_FRACTION = 0.5

/**
 * Effective rainfall: light rains infiltrate well; very heavy events lose more to runoff.
 * Negligible traces (<0.05") are ignored. Cap per day at TAW so surplus doesn't stack.
 */
function effectiveRain(precipIn: number, soil: SoilType, taw: number): number {
  if (precipIn < 0.05) return 0
  // Sandy soils infiltrate faster; clay runoff rises sooner on intense storms.
  const runoffStart = soil === 'sand' ? 1.0 : soil === 'loam' ? 0.75 : 0.5
  let effective = precipIn
  if (precipIn > runoffStart) {
    const excess = precipIn - runoffStart
    effective = runoffStart + excess * (soil === 'clay' ? 0.35 : 0.55)
  }
  return Math.min(effective, taw)
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function moistureLabel(pct: number): string {
  if (pct >= 75) return 'Quite moist'
  if (pct >= 55) return 'Comfortably moist'
  if (pct >= 40) return 'Drying — watch closely'
  if (pct >= 25) return 'Dry — plants will stress soon'
  return 'Very dry — stress likely'
}

function formatInches(n: number): string {
  return `${n.toFixed(2)}"`
}

function bestWateringTime(tempMaxF: number): string {
  if (tempMaxF >= 85) {
    return 'Water before 8 a.m. — midday heat wastes water and evening wet foliage invites disease.'
  }
  return 'Early morning (roughly 5–9 a.m.) is best: cooler air, less wind, leaves dry by night.'
}

export interface AdviceExtras {
  /** Rolling precip from hourly series, inches */
  recentRain24h?: number
  recentRain48h?: number
}

export function computeAdvice(
  settings: UserSettings,
  days: DailyWeather[],
  extras: AdviceExtras = {},
): WateringAdvice {
  const taw =
    AWC_IN_PER_FT[settings.soil] * ROOT_DEPTH_FT[settings.area]
  const mad = taw * MAD_FRACTION
  const kc = cropCoefficient(settings.grass, settings.area)

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const history = sorted.filter((d) => !d.isForecast)
  const forecast = sorted.filter((d) => d.isForecast)

  // Start ~halfway through available water (unknown prior state).
  let deficit = taw * 0.35
  const ledger: WateringAdvice['dailyLedger'] = []

  for (const day of history) {
    const etc = day.et0In * kc
    const rain = effectiveRain(day.precipitationIn, settings.soil, taw)
    deficit = clamp(deficit + etc - rain, 0, taw)

    // A soaking day (≥ ~0.5″, or enough to fill the root zone) means the
    // surface is at/near field capacity — don't keep a pre-storm drought deficit.
    if (day.precipitationIn >= Math.min(0.5, taw * 0.45)) {
      deficit = 0
    } else if (day.precipitationIn >= 0.3) {
      deficit = Math.min(deficit, mad * 0.35)
    }

    if (
      settings.lastWatered === day.date &&
      settings.lastWateredInches > 0
    ) {
      // Assume ~80% of applied irrigation reaches the root zone.
      deficit = clamp(deficit - settings.lastWateredInches * 0.8, 0, taw)
    }

    ledger.push({
      date: day.date,
      rain: day.precipitationIn,
      etc,
      deficit,
      moisturePercent: Math.round((1 - deficit / taw) * 100),
    })
  }

  const last7 = history.slice(-7)
  const last2 = history.slice(-2)
  const weeklyRain = last7.reduce((s, d) => s + d.precipitationIn, 0)
  const weeklyEtc = last7.reduce((s, d) => s + d.et0In * kc, 0)
  const weeklyEffective = last7.reduce(
    (s, d) => s + effectiveRain(d.precipitationIn, settings.soil, taw),
    0,
  )
  const rainLast2Days = last2.reduce((s, d) => s + d.precipitationIn, 0)
  const wettestRecentDay = last2.reduce(
    (m, d) => Math.max(m, d.precipitationIn),
    0,
  )

  const recentRain24h = extras.recentRain24h ?? last2.at(-1)?.precipitationIn ?? 0
  const recentRain48h = extras.recentRain48h ?? rainLast2Days

  // After a clear wetting event, don't trust a leftover drought deficit for display.
  if (recentRain48h >= 0.35 || wettestRecentDay >= 0.3) {
    deficit = Math.min(deficit, mad * 0.25)
  }
  if (recentRain24h >= 0.25 || recentRain48h >= 0.5 || wettestRecentDay >= 0.5) {
    deficit = Math.min(deficit, mad * 0.1)
  }

  let moisturePercent = Math.round((1 - deficit / taw) * 100)
  const today = history[history.length - 1]
  const todayTempF = today?.tempMaxF ?? 75

  const rainTomorrow = forecast[0]
  const rainDay2 = forecast[1]
  const meaningfulRainComing =
    (rainTomorrow &&
      rainTomorrow.precipitationIn >= 0.25 &&
      (rainTomorrow.precipProbability ?? 50) >= 45) ||
    (rainDay2 &&
      rainDay2.precipitationIn >= 0.35 &&
      (rainDay2.precipProbability ?? 50) >= 50)

  /**
   * Homeowner override: if it just rained enough to wet the yard, never tell
   * someone to water — even if the multi-day deficit ledger still looks dry.
   * Matches extension guidance (e.g. skip after ~½″) and the puddle test.
   */
  const recentlyWet =
    recentRain24h >= 0.2 ||
    recentRain48h >= 0.35 ||
    wettestRecentDay >= 0.3 ||
    rainLast2Days >= 0.4

  const rate = Math.max(settings.inchesPerHour, 0.05)
  let action: WateringAdvice['action']
  let headline: string
  let detail: string
  let recommendInches = 0
  let nextWaterWindow: string

  if (recentlyWet) {
    action = 'skip'
    recommendInches = 0
    moisturePercent = Math.max(moisturePercent, 72)
    deficit = Math.min(deficit, taw * (1 - moisturePercent / 100))
    const shown = Math.max(recentRain48h, rainLast2Days, wettestRecentDay)
    headline = "You shouldn't water today"
    detail = `It just rained about ${formatInches(shown)} over the last day or two near your ZIP. When the yard is still wet (puddles count), skip irrigation and let that soak in — watering now wastes water and can hurt roots.`
    nextWaterWindow = 'Recheck in 2–3 dry days'
  } else if (meaningfulRainComing) {
    action = 'wait_for_rain'
    headline = 'Hold off — rain is on the way'
    const when =
      rainTomorrow && rainTomorrow.precipitationIn >= 0.25
        ? 'tomorrow'
        : 'in the next couple of days'
    detail = `A meaningful rain looks likely ${when}. Skipping irrigation now avoids overwatering and lets the soil take the free drink.`
    nextWaterWindow = 'Recheck after the storm passes'
  } else if (deficit < mad * 0.65) {
    action = 'skip'
    headline = "You shouldn't water today"
    detail = `The root zone still looks ${moistureLabel(moisturePercent).toLowerCase()}. Recent weather supplied about ${formatInches(weeklyEffective)} of effective rain against roughly ${formatInches(weeklyEtc)} of plant water use over the past week.`
    const daysUntil =
      weeklyEtc > 0
        ? Math.max(1, Math.ceil((mad - deficit) / (weeklyEtc / 7)))
        : 3
    nextWaterWindow = `Likely in about ${daysUntil} day${daysUntil === 1 ? '' : 's'} if it stays dry`
  } else if (deficit < mad) {
    action = 'light_water'
    recommendInches = clamp(deficit * 0.85, 0.25, taw * 0.6)
    headline = 'A light watering would help'
    detail = `Soil moisture is sliding toward the stress zone (${formatInches(deficit)} deficit of ${formatInches(taw)} capacity). A modest soak now is better than waiting until the lawn wilts.`
    nextWaterWindow = 'Water this morning if no rain arrives'
  } else {
    action = 'water'
    // Refill toward field capacity but leave a little room for rain (~10% of TAW).
    recommendInches = clamp(deficit - taw * 0.1, 0.4, taw * 0.75)
    headline = 'Water today'
    detail = `Plant-available moisture is low enough that turf and garden beds will stress. Aim for a deep soak of about ${formatInches(recommendInches)} — enough to recharge the root zone without flooding it.`
    nextWaterWindow = 'Water this morning, then wait several days'
  }

  // Rule-of-thumb sanity: if weekly rain already kept pace with use, don't push water.
  if (
    weeklyEffective >= weeklyEtc * 0.85 &&
    (action === 'water' || action === 'light_water')
  ) {
    action = 'skip'
    recommendInches = 0
    headline = "You shouldn't water today"
    detail = `Rainfall has roughly kept pace with plant water use this week (${formatInches(weeklyRain)} measured rain vs ${formatInches(weeklyEtc)} estimated use).`
  }

  const recommendMinutes =
    recommendInches > 0 ? Math.round((recommendInches / rate) * 60) : 0

  const confidenceNote =
    'Estimate from weather-based soil-water accounting (ET₀ × crop coefficient, effective rainfall, and soil holding capacity). A soil probe or footprint test always beats a model.'

  return {
    action,
    headline,
    detail,
    moisturePercent,
    moistureLabel: moistureLabel(moisturePercent),
    deficitInches: deficit,
    recommendInches,
    recommendMinutes,
    weeklyRainInches: weeklyRain,
    weeklyEtcInches: weeklyEtc,
    effectiveRainInches: weeklyEffective,
    tawInches: taw,
    madInches: mad,
    nextWaterWindow,
    bestTime: bestWateringTime(todayTempF),
    confidenceNote,
    dailyLedger: ledger.slice(-10),
  }
}

export function soilBlurb(soil: SoilType): string {
  switch (soil) {
    case 'sand':
      return 'Sandy soils drain fast and hold less water — expect more frequent, shorter soaks.'
    case 'clay':
      return 'Clay holds more water but absorbs slowly — water longer with pauses if you see runoff.'
    default:
      return 'Loam is the sweet spot: good storage and infiltration for deep, infrequent watering.'
  }
}
