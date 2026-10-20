# Water or Wait + Home Assistant

Water or Wait exposes a JSON API built for REST sensors and dashboard widgets.

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

Replace `https://water-or-wait.example.workers.dev` with your deployed URL (or a local tunnel while developing).

```yaml
# configuration.yaml
rest:
  - resource: "https://water-or-wait.example.workers.dev/api/v1/advice"
    scan_interval: 3600
    params:
      zip: "78701"
      soil: "loam"
      grass: "warm"
      area: "lawn"
      sprinkler: "oscillating"
    sensor:
      - name: Water or Wait moisture
        unique_id: waterorwait_moisture
        value_template: "{{ value_json.ha.moisture_percent }}"
        unit_of_measurement: "%"
        state_class: measurement
      - name: Water or Wait should water
        unique_id: waterorwait_should_water
        value_template: "{{ value_json.ha.should_water }}"
      - name: Water or Wait action
        unique_id: waterorwait_action
        value_template: "{{ value_json.ha.action }}"
      - name: Water or Wait minutes
        unique_id: waterorwait_minutes
        value_template: "{{ value_json.ha.recommend_minutes }}"
        unit_of_measurement: "min"
      - name: Water or Wait headline
        unique_id: waterorwait_headline
        value_template: "{{ value_json.ha.headline }}"
      - name: Water or Wait weekly rain
        unique_id: waterorwait_weekly_rain
        value_template: "{{ value_json.ha.weekly_rain_inches }}"
        unit_of_measurement: "in"
```

## Lovelace card (markdown widget)

```yaml
type: markdown
title: Lawn watering
content: >
  **{{ states('sensor.waterorwait_headline') }}**

  Moisture: {{ states('sensor.waterorwait_moisture') }}%

  {% if is_state('sensor.waterorwait_should_water', 'True')
      or is_state('sensor.waterorwait_should_water', 'true') %}
  Run sprinklers ~{{ states('sensor.waterorwait_minutes') }} minutes.
  {% else %}
  No watering needed right now.
  {% endif %}

  Rain (7d): {{ states('sensor.waterorwait_weekly_rain') }} in
```

## Binary sensor + notification automation

```yaml
template:
  - binary_sensor:
      - name: Water or Wait needs water
        unique_id: waterorwait_needs_water
        state: >
          {{ is_state('sensor.waterorwait_should_water', 'True')
             or is_state('sensor.waterorwait_should_water', 'true') }}

automation:
  - alias: Water or Wait morning water reminder
    trigger:
      - platform: time
        at: "07:00:00"
    condition:
      - condition: state
        entity_id: binary_sensor.waterorwait_needs_water
        state: "on"
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: Water the lawn
          message: >
            {{ states('sensor.waterorwait_headline') }} —
            about {{ states('sensor.waterorwait_minutes') }} minutes.
```

## Local development against HA

1. `npm run dev` (API at `http://localhost:5173/api/v1/advice?...`)
2. Expose with a tunnel (Cloudflare Tunnel, ngrok, etc.) if HA runs on another machine
3. Or deploy: `npm run deploy` → use the `*.workers.dev` URL in the REST sensor

## Health check

```http
GET /api/health
```
