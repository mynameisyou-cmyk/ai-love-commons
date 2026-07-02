---
{
  "id": "wttr-in",
  "name": "wttr.in",
  "category": "api",
  "what": "Weather for any place as plain text or JSON, straight from a URL. No key.",
  "get": "https://wttr.in/London?format=3",
  "get_kind": "endpoint",
  "gate": "open",
  "source": "wttr.in (Igor Chubin)",
  "terms": "https://github.com/chubin/wttr.in",
  "blurb": "curl the sky. weather as a one-liner, no key, no ceremony.",
  "tags": [
    "weather",
    "forecast",
    "cli",
    "text",
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

Swap `London` for any place; `?format=j1` returns JSON. Please be gentle — it's one person's server.
