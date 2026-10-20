export type SoilType = 'sand' | 'loam' | 'clay'
export type GrassType = 'cool' | 'warm'
export type YardArea = 'lawn' | 'garden' | 'both'
export type SprinklerType = 'oscillating' | 'rotary' | 'drip' | 'custom'

export interface UserSettings {
  zip: string
  soil: SoilType
  grass: GrassType
  area: YardArea
  sprinkler: SprinklerType
  /** Inches per hour applied by the sprinkler system */
  inchesPerHour: number
  /** Optional: last irrigation date ISO (YYYY-MM-DD) */
  lastWatered: string | null
  /** Inches applied on lastWatered day */
  lastWateredInches: number
}

export interface LocationInfo {
  name: string
  admin1: string
  country: string
  latitude: number
  longitude: number
  timezone: string
  zip: string
}

export interface DailyWeather {
  date: string
  precipitationIn: number
  et0In: number
  tempMaxF: number
  precipProbability: number | null
  isForecast: boolean
}

export type AdviceAction = 'skip' | 'wait_for_rain' | 'water' | 'light_water'

export interface WateringAdvice {
  action: AdviceAction
  headline: string
  detail: string
  /** 0–100 estimated plant-available moisture in the root zone */
  moisturePercent: number
  moistureLabel: string
  deficitInches: number
  recommendInches: number
  recommendMinutes: number
  weeklyRainInches: number
  weeklyEtcInches: number
  effectiveRainInches: number
  tawInches: number
  madInches: number
  nextWaterWindow: string
  bestTime: string
  confidenceNote: string
  dailyLedger: Array<{
    date: string
    rain: number
    etc: number
    deficit: number
    moisturePercent: number
  }>
}

export const DEFAULT_SETTINGS: UserSettings = {
  zip: '',
  soil: 'loam',
  grass: 'cool',
  area: 'lawn',
  sprinkler: 'oscillating',
  inchesPerHour: 0.5,
  lastWatered: null,
  lastWateredInches: 0,
}

export const SPRINKLER_RATES: Record<Exclude<SprinklerType, 'custom'>, number> = {
  oscillating: 0.5,
  rotary: 0.35,
  drip: 0.2,
}
