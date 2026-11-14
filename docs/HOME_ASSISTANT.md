# Water or Wait + Home Assistant

Water or Wait is **not** a Home Assistant add-on or UI integration. You wire it with YAML **RESTful** sensors that poll the JSON API. Those show up as **entities** (under the RESTful integration), not as a “Water or Wait” device.

## Endpoint

```http
GET /api/v1/advice?zip=78701&soil=loam&grass=cool&area=lawn&sprinkler=oscillating
```

Aliases: `/api/advice` works the same.

### Query parameters

| Param | Required | Notes |
| --- | --- | --- |
| `zip` | yes\* | U.S. 5-digit ZIP |
| `latitude` + `longitude` | yes\* | Alternative to ZIP (HA weather coords) |
| `soil` | no | `sand` \| `loam` \| `clay` (default `loam`) |
| `grass` | no | `cool` \| `warm` (default `cool`) |
| `area` | no | `lawn` \| `garden` \| `both` |
| `sprinkler` | no | `oscillating` \| `rotary` \| `drip` \| `custom` |
| `inches_per_hour` | no | Overrides sprinkler preset |
| `last_watered` | no | `YYYY-MM-DD` |
| `last_watered_inches` | no | Depth applied that day |
| `timezone` | no | Used with lat/lon |

\* Provide either `zip` or both `latitude` and `longitude`.

### Useful response fields

Prefer the compact `ha` object in templates:

```json
{
  "ok": true,
  "ha": {
    "action": "water",
    "should_water": true,
    "moisture_percent": 12,
    "moisture_label": "Very dry — stress likely",
    "recommend_inches": 1.07,
    "recommend_minutes": 128,
    "weekly_rain_inches": 0.45,
    "weekly_etc_inches": 1.03,
    "headline": "Water today",
    "next_water_window": "Water this morning, then wait several days"
  }
}
```

## REST sensors

1. Confirm the API in a browser first (you should see `"ok": true` and an `ha` object).
2. Put **one** top-level `rest:` block in `configuration.yaml` (or merge into an existing `rest:` list — a second `rest:` key silently overwrites the first).
3. Replace the URL with your real Worker URL.
4. **Fully restart Home Assistant** the first time you add `rest:` (YAML reload alone is not enough for a new integration domain).
5. Look under **Developer tools → States** and search `water_or_wait` (entity ids come from the sensor **name**, not `unique_id`).

```yaml
# configuration.yaml
rest:
  - resource: "https://YOUR_WORKER.workers.dev/api/v1/advice"
    scan_interval: 3600
    params:
      zip: "78701"
      soil: "loam"
      grass: "warm"
      area: "lawn"
      sprinkler: "oscillating"
    sensor:
      - name: "Water or Wait moisture"
        unique_id: water_or_wait_moisture
        value_template: "{{ value_json.ha.moisture_percent }}"
        unit_of_measurement: "%"
        state_class: measurement
      - name: "Water or Wait should water"
        unique_id: water_or_wait_should_water
        value_template: "{{ value_json.ha.should_water }}"
      - name: "Water or Wait action"
        unique_id: water_or_wait_action
        value_template: "{{ value_json.ha.action }}"
      - name: "Water or Wait minutes"
        unique_id: water_or_wait_minutes
        value_template: "{{ value_json.ha.recommend_minutes }}"
        unit_of_measurement: "min"
      - name: "Water or Wait headline"
        unique_id: water_or_wait_headline
        value_template: "{{ value_json.ha.headline }}"
      - name: "Water or Wait weekly rain"
        unique_id: water_or_wait_weekly_rain
        value_template: "{{ value_json.ha.weekly_rain_inches }}"
        unit_of_measurement: "in"
```

Expected entity ids after restart:

- `sensor.water_or_wait_moisture`
- `sensor.water_or_wait_should_water`
- `sensor.water_or_wait_action`
- `sensor.water_or_wait_minutes`
- `sensor.water_or_wait_headline`
- `sensor.water_or_wait_weekly_rain`

Also check **Settings → Devices & services → RESTful** (not a “Water or Wait” integration).

### Minimal smoke test

If nothing appears, temporarily replace the block with this, restart, then search States for `wow_test`:

```yaml
rest:
  - resource: "https://YOUR_WORKER.workers.dev/api/v1/advice"
    params:
      zip: "78701"
    sensor:
      - name: "WOW test"
        unique_id: wow_test
        value_template: "{{ value_json.ha.headline }}"
```

If `sensor.wow_test` still does not exist after a full restart, the YAML is not being loaded (wrong file, duplicate `rest:` key, or Check Configuration failed).

### Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| No entities at all | Need a **full HA restart**; or `rest:` not in the active `configuration.yaml`; or a duplicate `rest:` key elsewhere |
| Searching `waterorwait` finds nothing | Entity ids use underscores from the name: search `water_or_wait` |
| Entity exists but state is `unavailable` / `unknown` | Bad URL, missing query params, or template path — open the API URL in a browser and confirm `ha` is present |
| Check Configuration errors | Indentation under `rest:` / `sensor:`; quote `name` values |

After editing: **Developer tools → YAML → Check configuration**, then **Settings → System → Restart**.

## Lovelace card (markdown widget)

```yaml
type: markdown
title: Lawn watering
content: >
  **{{ states('sensor.water_or_wait_headline') }}**

  Moisture: {{ states('sensor.water_or_wait_moisture') }}%

  {% if is_state('sensor.water_or_wait_should_water', 'True')
      or is_state('sensor.water_or_wait_should_water', 'true') %}
  Run sprinklers ~{{ states('sensor.water_or_wait_minutes') }} minutes.
  {% else %}
  No watering needed right now.
  {% endif %}

  Rain (7d): {{ states('sensor.water_or_wait_weekly_rain') }} in
```

## Binary sensor + notification automation

```yaml
template:
  - binary_sensor:
      - name: "Water or Wait needs water"
        unique_id: water_or_wait_needs_water
        state: >
          {{ is_state('sensor.water_or_wait_should_water', 'True')
             or is_state('sensor.water_or_wait_should_water', 'true') }}

automation:
  - alias: Water or Wait morning water reminder
    trigger:
      - platform: time
        at: "07:00:00"
    condition:
      - condition: state
        entity_id: binary_sensor.water_or_wait_needs_water
        state: "on"
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: Water the lawn
          message: >
            {{ states('sensor.water_or_wait_headline') }} —
            about {{ states('sensor.water_or_wait_minutes') }} minutes.
```

## Local development against HA

1. `npm run dev` (API at `http://localhost:5173/api/v1/advice?...`)
2. Expose with a tunnel (Cloudflare Tunnel, ngrok, etc.) if HA runs on another machine
3. Or deploy: `npm run deploy` → use the `*.workers.dev` URL in the REST sensor

## Health check

```http
GET /api/health
```
