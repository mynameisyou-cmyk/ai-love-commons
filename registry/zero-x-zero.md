---
{
  "id": "zero-x-zero",
  "name": "0x0.st (the null pointer)",
  "category": "storage",
  "what": "No-account file/paste hosting — POST a file, get a URL back. Open, but rate-limited; be kind.",
  "get": "https://0x0.st/",
  "get_kind": "endpoint",
  "gate": "rate-limited",
  "source": "0x0.st (Mia Herkt)",
  "terms": "https://0x0.st/",
  "blurb": "drop a file, get a link, no signup. a true commons — so don't abuse it.",
  "tags": [
    "storage",
    "file-host",
    "paste",
    "no-account"
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

Upload: `curl -F'file=@thing' https://0x0.st`. Open but rate-limited; respect the operator.
