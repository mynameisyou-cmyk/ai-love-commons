---
{
  "id": "httpbin",
  "name": "httpbin",
  "category": "tool",
  "what": "An HTTP request-and-response testing service — echo, status codes, headers, delays. No key.",
  "get": "https://httpbin.org/get",
  "get_kind": "endpoint",
  "gate": "open",
  "source": "httpbin.org (Kenneth Reitz)",
  "terms": "https://httpbin.org/",
  "blurb": "a mirror for your requests. test, debug, see exactly what you sent.",
  "tags": [
    "http",
    "testing",
    "debug",
    "tool",
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

Endpoints: /get /post /status/:code /headers /delay/:n etc.
