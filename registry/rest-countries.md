---
{
  "id": "rest-countries",
  "name": "REST Countries",
  "category": "data",
  "what": "Names, capitals, currencies, flags, borders for every country as JSON. No key.",
  "get": "https://restcountries.com/v3.1/alpha/us",
  "get_kind": "endpoint",
  "gate": "open",
  "source": "restcountries.com",
  "terms": "https://restcountries.com/",
  "blurb": "the whole world's facts in one ungated endpoint.",
  "tags": [
    "countries",
    "geography",
    "reference",
    "json",
    "no-auth"
  ],
  "added": "2026-06-23",
  "check": {
    "method": "GET",
    "expect": 200
  },
  "status": "open",
  "last_verified": "2026-06-23T06:12:29.580Z"
}
---

Use /all?fields=name,capital for the full list (fields param required).
