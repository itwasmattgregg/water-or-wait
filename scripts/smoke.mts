import { computeAdvice } from '../src/lib/wateringEngine.ts'
import { geocodeZip, fetchWeather } from '../src/lib/weather.ts'
import { DEFAULT_SETTINGS } from '../src/lib/types.ts'

const loc = await geocodeZip('78701')
const days = await fetchWeather(loc)
const advice = computeAdvice(
  { ...DEFAULT_SETTINGS, zip: '78701', soil: 'loam', grass: 'warm' },
  days,
)
console.log(
  JSON.stringify(
    {
      place: `${loc.name}, ${loc.admin1}`,
      action: advice.action,
      headline: advice.headline,
      moisture: advice.moisturePercent,
      weeklyRain: +advice.weeklyRainInches.toFixed(2),
      weeklyEtc: +advice.weeklyEtcInches.toFixed(2),
      minutes: advice.recommendMinutes,
    },
    null,
    2,
  ),
)
