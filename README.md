# Water or Wait

A Svelte web app (installable PWA) that answers: **should you water your lawn or garden today?**

Enter a U.S. ZIP code. Water or Wait pulls recent rainfall and reference evapotranspiration nearby, runs a soil-water “checkbook,” and recommends whether to skip, wait for rain, or water — and for how long.

Settings (ZIP, soil, grass type, sprinkler rate, last watering) stay in **browser `localStorage`**.

Routes: `/` (science-forward landing), `/check` (yard advisor), `/science` (full model write-up), `/sources` (citations).

The same logic is available as a **JSON API** (`GET /api/v1/advice`) for Home Assistant REST sensors and widgets — see [docs/HOME_ASSISTANT.md](docs/HOME_ASSISTANT.md).

## Run locally

```bash
npm install
npm run dev
```

API example while the dev server is running:

```bash
curl "http://localhost:5173/api/v1/advice?zip=78701&soil=loam&grass=warm"
```

```bash
npm run build
npm run preview
npm run deploy   # Cloudflare Workers (requires wrangler login)
```

## How the advice works

This is a weather-based soil moisture **estimate**, not a sensor.

1. **Geocode** the ZIP with [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api).
2. **Fetch** 14 days of history + a short forecast from the [Open-Meteo Forecast API](https://open-meteo.com/): daily `precipitation_sum`, FAO `et0_fao_evapotranspiration`, temps, and precip probability.
3. **Crop water use**  
   \(ET_c = ET_0 \times K_c\)  
   Default \(K_c\): cool-season lawn ~0.85, warm-season ~0.70, garden beds ~0.90 (FAO-56 / UC turf guidance).
4. **Soil reservoir (TAW)**  
   Available water capacity × root-zone depth (sand/loam/clay × ~9–12").
5. **Daily checkbook**  
   Deficit grows with \(ET_c\), shrinks with effective rainfall (and logged irrigation). Heavy storms count less on clay (runoff). Very light traces (&lt;0.05") are ignored.
6. **Decision**  
   - Moisture still comfortable → **skip**  
   - Meaningful rain likely soon → **wait**  
   - Approaching ~50% management-allowed depletion → **light water** or **water**  
   - Runtime = recommended inches ÷ sprinkler inches/hour  

### Research anchors

| Idea | Sources |
| --- | --- |
| ~1"/week including rain as a rough turf rule | [EPA WaterSense](https://www.epa.gov/watersense/watering-tips), Illinois / Virginia Tech / Mississippi State extension |
| Deep, infrequent watering; early morning | Same extension guidance; USDA NRCS lawn watering notes |
| ET-based / checkbook scheduling | [UMN Extension](https://extension.umn.edu/natural-resources/conservation/agricultural-soil-and-water/irrigation/evapotranspiration-based-irrigation-scheduling-or-water-balance-method), Virginia Tech checkbook pubs, NDSU-style ledgers |
| \(ET_c = ET_0 \times K_c\) for turf | FAO-56; UC Riverside / UCANR turf coefficients; NC State turf water-use pubs |
| Soil AWC & ~50% MAD | UCANR soil water holding; Utah / UNL irrigation tables |

## PWA vs native mobile — assessment

**Verdict: ship as a PWA first. A native app is optional later, not required for the core value.**

### Why the PWA is a strong fit

- **Job-to-be-done is occasional.** Most people check “should I water?” a few times a week in season — not dozens of times a day. A home-screen web app is enough.
- **State is local and tiny.** ZIP + yard prefs in `localStorage` need no account backend.
- **Live weather already works in the browser** via Open-Meteo; no device APIs required for v1.
- **Install + offline shell** via the service worker covers the “feels like an app” bar for many users.

### When notifications help — and when they don’t

Useful notification ideas:

- “Rain covered your week — skip the sprinklers.”
- “Soil deficit crossed your water threshold — soak this morning.”
- Optional quiet seasonal digest (e.g. Sunday plan).

Why they may be **unnecessary** at first:

- Watering is **highly contextual** (travel, HOA rules, brown-lawn-is-fine preferences, local restrictions). Bad alerts train people to ignore the app.
- iOS web push exists but is still clunkier than native; Android is better. A dual-platform notification promise often becomes the reason teams go native too early.
- The highest-value moment is often **standing at the faucet** — open app, get answer — not a push at 6 a.m.

**Recommendation:** launch without push. Add **optional** web push only after people return on their own and ask for reminders. Measure retention first.

### When native *would* be worth it

Consider React Native / native if you later want:

- Reliable cross-platform push with rich scheduling
- Background fetch of weather without opening the app
- Home-screen widgets (“moisture 62% — skip”)
- Bluetooth soil probes / smart-hose integrations
- App Store discovery as a growth channel

Until those matter, native cost (store review, two platforms, push infra, privacy nutrition labels) outweighs benefit for this product.

## API (Home Assistant–friendly)

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness |
| `GET /api/v1/advice?zip=78701&…` | Full advice JSON + compact `ha` object |

CORS is open for GET so browser widgets can call it. HA usually polls server-side via the `rest` integration — YAML examples in [docs/HOME_ASSISTANT.md](docs/HOME_ASSISTANT.md).

## GitHub

This project started as a local Cloud Agent workspace. Push it to your own repo:

```bash
cd water-or-wait
gh auth login
gh repo create water-or-wait --private --source=. --remote=origin --push
```

Or add a remote manually: `git remote add origin git@github.com:YOU/water-or-wait.git && git push -u origin HEAD`.

## Attribution

Weather data © Open-Meteo (CC BY 4.0). Hero photo via Unsplash.
