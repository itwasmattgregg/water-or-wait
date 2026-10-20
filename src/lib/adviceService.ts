import {
  DEFAULT_SETTINGS,
  SPRINKLER_RATES,
  type GrassType,
  type SoilType,
  type SprinklerType,
  type UserSettings,
  type WateringAdvice,
  type YardArea,
  type LocationInfo,
} from './types'
import { computeAdvice } from './wateringEngine'
import { fetchWeather, geocodeZip } from './weather'

export interface AdviceQuery {
  zip: string
  soil?: string
  grass?: string
  area?: string
  sprinkler?: string
  inchesPerHour?: string | number
  lastWatered?: string | null
  lastWateredInches?: string | number
  /** Also accept lat/lon instead of zip for HA weather entities */
  latitude?: string | number
  longitude?: string | number
  timezone?: string
  locationName?: string
}

export interface AdviceResponse {
  ok: true
  generatedAt: string
  location: LocationInfo
  settings: Pick<
    UserSettings,
    'soil' | 'grass' | 'area' | 'sprinkler' | 'inchesPerHour' | 'lastWatered' | 'lastWateredInches'
  >
  advice: WateringAdvice
  /** Recent history + short forecast for charts / HA history graphs */
  weather: Array<{
    date: string
    precipitation_inches: number
    et0_inches: number
    temp_max_f: number
    precip_probability: number | null
    is_forecast: boolean
  }>
  /** Compact fields for Home Assistant sensors / templates */
  ha: {
    action: WateringAdvice['action']
    should_water: boolean
    moisture_percent: number
    moisture_label: string
    recommend_inches: number
    recommend_minutes: number
    weekly_rain_inches: number
    weekly_etc_inches: number
    headline: string
    next_water_window: string
  }
}

export class AdviceError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

function asSoil(v: string | undefined): SoilType {
  if (v === 'sand' || v === 'loam' || v === 'clay') return v
  if (v) throw new AdviceError(`Invalid soil "${v}". Use sand, loam, or clay.`)
  return DEFAULT_SETTINGS.soil
}

function asGrass(v: string | undefined): GrassType {
  if (v === 'cool' || v === 'warm') return v
  if (v) throw new AdviceError(`Invalid grass "${v}". Use cool or warm.`)
  return DEFAULT_SETTINGS.grass
}

function asArea(v: string | undefined): YardArea {
  if (v === 'lawn' || v === 'garden' || v === 'both') return v
  if (v) throw new AdviceError(`Invalid area "${v}". Use lawn, garden, or both.`)
  return DEFAULT_SETTINGS.area
}

function asSprinkler(v: string | undefined): SprinklerType {
  if (v === 'oscillating' || v === 'rotary' || v === 'drip' || v === 'custom') return v
  if (v) {
    throw new AdviceError(
      `Invalid sprinkler "${v}". Use oscillating, rotary, drip, or custom.`,
    )
  }
  return DEFAULT_SETTINGS.sprinkler
}

function settingsFromQuery(q: AdviceQuery): UserSettings {
  const sprinkler = asSprinkler(q.sprinkler)
  let inchesPerHour =
    q.inchesPerHour === undefined || q.inchesPerHour === ''
      ? sprinkler === 'custom'
        ? DEFAULT_SETTINGS.inchesPerHour
        : SPRINKLER_RATES[sprinkler]
      : Number(q.inchesPerHour)

  if (!Number.isFinite(inchesPerHour) || inchesPerHour <= 0) {
    throw new AdviceError('inches_per_hour must be a positive number.')
  }

  const lastWateredInches =
    q.lastWateredInches === undefined || q.lastWateredInches === ''
      ? 0
      : Number(q.lastWateredInches)

  if (!Number.isFinite(lastWateredInches) || lastWateredInches < 0) {
    throw new AdviceError('last_watered_inches must be a non-negative number.')
  }

  return {
    zip: (q.zip ?? '').trim(),
    soil: asSoil(q.soil),
    grass: asGrass(q.grass),
    area: asArea(q.area),
    sprinkler,
    inchesPerHour,
    lastWatered: q.lastWatered || null,
    lastWateredInches,
  }
}

async function resolveLocation(q: AdviceQuery): Promise<LocationInfo> {
  const lat = q.latitude === undefined || q.latitude === '' ? NaN : Number(q.latitude)
  const lon = q.longitude === undefined || q.longitude === '' ? NaN : Number(q.longitude)

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return {
      name: q.locationName?.trim() || 'Custom location',
      admin1: '',
      country: 'United States',
      latitude: lat,
      longitude: lon,
      timezone: q.timezone?.trim() || 'auto',
      zip: (q.zip ?? '').trim() || 'coords',
    }
  }

  if (!q.zip?.trim()) {
    throw new AdviceError('Provide zip, or latitude and longitude.')
  }

  return geocodeZip(q.zip)
}

export async function buildAdvice(q: AdviceQuery): Promise<AdviceResponse> {
  const settings = settingsFromQuery(q)
  const location = await resolveLocation(q)
  const { days, timezone, recentRain24h, recentRain48h } =
    await fetchWeather(location)
  location.timezone = timezone
  const advice = computeAdvice({ ...settings, zip: location.zip }, days, {
    recentRain24h,
    recentRain48h,
  })

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    location,
    settings: {
      soil: settings.soil,
      grass: settings.grass,
      area: settings.area,
      sprinkler: settings.sprinkler,
      inchesPerHour: settings.inchesPerHour,
      lastWatered: settings.lastWatered,
      lastWateredInches: settings.lastWateredInches,
    },
    advice,
    weather: days.map((d) => ({
      date: d.date,
      precipitation_inches: d.precipitationIn,
      et0_inches: d.et0In,
      temp_max_f: d.tempMaxF,
      precip_probability: d.precipProbability,
      is_forecast: d.isForecast,
    })),
    ha: {
      action: advice.action,
      should_water: advice.action === 'water' || advice.action === 'light_water',
      moisture_percent: advice.moisturePercent,
      moisture_label: advice.moistureLabel,
      recommend_inches: Number(advice.recommendInches.toFixed(3)),
      recommend_minutes: advice.recommendMinutes,
      weekly_rain_inches: Number(advice.weeklyRainInches.toFixed(3)),
      weekly_etc_inches: Number(advice.weeklyEtcInches.toFixed(3)),
      headline: advice.headline,
      next_water_window: advice.nextWaterWindow,
    },
  }
}

/** Parse query params from a URL, accepting snake_case aliases for HA. */
export function queryFromUrl(url: URL): AdviceQuery {
  const g = (a: string, b?: string) => url.searchParams.get(a) ?? (b ? url.searchParams.get(b) : null)

  return {
    zip: g('zip') ?? '',
    soil: g('soil') ?? undefined,
    grass: g('grass') ?? undefined,
    area: g('area') ?? undefined,
    sprinkler: g('sprinkler') ?? undefined,
    inchesPerHour: g('inches_per_hour', 'inchesPerHour') ?? undefined,
    lastWatered: g('last_watered', 'lastWatered'),
    lastWateredInches: g('last_watered_inches', 'lastWateredInches') ?? undefined,
    latitude: g('latitude', 'lat') ?? undefined,
    longitude: g('longitude', 'lon') ?? undefined,
    timezone: g('timezone') ?? undefined,
    locationName: g('location_name', 'locationName') ?? undefined,
  }
}
