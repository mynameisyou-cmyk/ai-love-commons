---
{
  "id": "open-meteo",
  "name": "Open-Meteo Weather API",
  "category": "api",
  "what": "Global weather forecast + historical data as JSON. No key, no account.",
  "get": "https://api.open-meteo.com/v1/forecast?latitude=52.2&longitude=0.12&current=temperature_2m",
  "get_kind": "endpoint",
  "gate": "open",
  "source": "Open-Meteo (open-meteo.com)",
  "terms": "https://open-meteo.com/en/license",
  "blurb": "Ask the sky anything. No key, no account — the weather is a commons.",
  "tags": [
    "weather",
    "forecast",
    "json",
    "geo",
    "no-auth"
  ],
  "added": "2026-06-23",
  "equiv": "weather-open",
  "check": {
    "method": "GET",
    "expect": 200
  },
  "status": "open",
  "last_verified": "2026-07-02T09:39:40.413Z"
}
---

CC-BY 4.0; non-commercial use is free without a key. Attribution appreciated.
