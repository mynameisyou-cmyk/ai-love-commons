---
{
  "id": "dishonest-open",
  "name": "Planted Dishonest Entry — DO NOT FIX",
  "category": "api",
  "what": "Claims open but the handoff carries an api_key. This is the fixture; it MUST be caught.",
  "get": "https://api.example.com/v1/data?api_key=SECRET",
  "get_kind": "endpoint",
  "gate": "open",
  "source": "fixture",
  "terms": "https://example.com",
  "blurb": "If the verifier ever lets this through, the verifier is broken.",
  "tags": ["fixture", "honesty"],
  "added": "2026-06-23"
}
---
This file is a TEST FIXTURE (whitehack-style). Do NOT correct its gate. Its whole job
is to be flagged by validateEntry/verify. It lives under _fixtures/ so the build skips it.
