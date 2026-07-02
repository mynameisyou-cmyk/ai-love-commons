---
{
  "id": "world-bank",
  "name": "World Bank Open Data API",
  "category": "data",
  "what": "Global development indicators — population, GDP, life expectancy and thousands more — as JSON. No key.",
  "get": "https://api.worldbank.org/v2/country/USA?format=json",
  "get_kind": "endpoint",
  "gate": "open",
  "source": "The World Bank",
  "terms": "https://datacatalog.worldbank.org/public-licenses",
  "blurb": "the planet's development data, ungated. swap USA for any country, or query 16k+ indicators.",
  "tags": [
    "datasets",
    "economics",
    "indicators",
    "development",
    "json",
    "no-auth"
  ],
  "added": "2026-06-23",
  "check": {
    "method": "GET",
    "expect": 200
  },
  "status": "open",
  "last_verified": "2026-07-02T09:39:40.413Z"
}
---

Indicators: /v2/country/all/indicator/SP.POP.TOTL?format=json. CC-BY 4.0.
