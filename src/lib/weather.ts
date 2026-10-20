import type { DailyWeather, LocationInfo } from './types'

interface GeocodeResult {
  id: number
  name: string
  latitude: number
  longitude: number
  timezone: string
  country_code?: string
  country?: string
  admin1?: string
  postcodes?: string[]
}

function todayIsoInTz(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Prefer ZIP centroid (Zippopotam) over city-center Open-Meteo matches. */
async function geocodeZipCentroid(five: string): Promise<LocationInfo | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${five}`)
    if (!res.ok) return null
    const data = (await res.json()) as {
      places?: Array<{
        'place name': string
        state: string
        latitude: string
        longitude: string
      }>
    }
    const place = data.places?.[0]
    if (!place) return null
    return {
      name: place['place name'],
      admin1: place.state,
      country: 'United States',
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
      timezone: 'auto',
      zip: five,
    }
  } catch {
    return null
  }
}

async function geocodeZipOpenMeteo(five: string): Promise<LocationInfo> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', five)
  url.searchParams.set('count', '8')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')
  url.searchParams.set('countryCode', 'US')

  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not look up that ZIP code right now.')
  const data = (await res.json()) as { results?: GeocodeResult[] }
  const results = data.results ?? []

  const match =
    results.find((r) => r.postcodes?.some((p) => p.startsWith(five))) ??
    results.find((r) => r.country_code === 'US') ??
    results[0]

  if (!match) {
    throw new Error('No U.S. location found for that ZIP code.')
  }

  return {
    name: match.name,
    admin1: match.admin1 ?? '',
    country: match.country ?? 'United States',
    latitude: match.latitude,
    longitude: match.longitude,
    timezone: match.timezone,
    zip: five,
  }
}

export async function geocodeZip(zip: string): Promise<LocationInfo> {
  const cleaned = zip.trim()
  if (!/^\d{5}(-\d{4})?$/.test(cleaned)) {
    throw new Error('Enter a valid 5-digit U.S. ZIP code.')
  }
  const five = cleaned.slice(0, 5)
  return (await geocodeZipCentroid(five)) ?? geocodeZipOpenMeteo(five)
}

export async function fetchWeather(
  location: LocationInfo,
): Promise<{ days: DailyWeather[]; timezone: string; recentRain48h: number; recentRain24h: number }> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(location.latitude))
  url.searchParams.set('longitude', String(location.longitude))
  url.searchParams.set('past_days', '14')
  url.searchParams.set('forecast_days', '3')
  url.searchParams.set(
    'daily',
    [
      'precipitation_sum',
      'et0_fao_evapotranspiration',
      'temperature_2m_max',
      'precipitation_probability_max',
    ].join(','),
  )
  url.searchParams.set('hourly', 'precipitation')
  url.searchParams.set('precipitation_unit', 'inch')
  url.searchParams.set('temperature_unit', 'fahrenheit')
  url.searchParams.set('timezone', location.timezone || 'auto')

  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather data is unavailable right now.')
  const data = (await res.json()) as {
    timezone?: string
    daily?: {
      time?: string[]
      precipitation_sum?: Array<number | null>
      et0_fao_evapotranspiration?: Array<number | null>
      temperature_2m_max?: Array<number | null>
      precipitation_probability_max?: Array<number | null>
    }
    hourly?: {
      time?: string[]
      precipitation?: Array<number | null>
    }
  }

  const timezone = data.timezone || location.timezone || 'UTC'
  const today = todayIsoInTz(timezone)

  const times: string[] = data.daily?.time ?? []
  const precip: Array<number | null> = data.daily?.precipitation_sum ?? []
  const et0: Array<number | null> = data.daily?.et0_fao_evapotranspiration ?? []
  const temps: Array<number | null> = data.daily?.temperature_2m_max ?? []
  const probs: Array<number | null> =
    data.daily?.precipitation_probability_max ?? []

  const days = times.map((date, i) => ({
    date,
    precipitationIn: precip[i] ?? 0,
    et0In: et0[i] ?? 0,
    tempMaxF: temps[i] ?? 70,
    precipProbability: probs[i],
    isForecast: date > today,
  }))

  // Rolling precip from hourly series (catches overnight storms better than incomplete "today").
  const hourlyTimes = data.hourly?.time ?? []
  const hourlyPrecip = data.hourly?.precipitation ?? []
  const nowMs = Date.now()
  let recentRain24h = 0
  let recentRain48h = 0
  for (let i = 0; i < hourlyTimes.length; i++) {
    const t = hourlyTimes[i]
    const p = hourlyPrecip[i] ?? 0
    const ms = new Date(t).getTime()
    if (Number.isNaN(ms) || ms > nowMs) continue
    const ageH = (nowMs - ms) / 3_600_000
    if (ageH <= 24) recentRain24h += p
    if (ageH <= 48) recentRain48h += p
  }

  // Fallback if hourly missing: yesterday + today daily totals.
  if (hourlyTimes.length === 0) {
    const hist = days.filter((d) => !d.isForecast)
    const todayRow = hist.find((d) => d.date === today)
    const yday = hist.length >= 2 ? hist[hist.length - 2] : undefined
    recentRain24h = todayRow?.precipitationIn ?? 0
    recentRain48h =
      (todayRow?.precipitationIn ?? 0) + (yday?.precipitationIn ?? 0)
  }

  return { days, timezone, recentRain24h, recentRain48h }
}
