---
{
  "id": "cloudflare-r2",
  "name": "Cloudflare R2 (free tier)",
  "category": "storage",
  "what": "S3-compatible object storage with a free tier (10GB/mo) and no egress fees. Needs your own free Cloudflare account.",
  "get": "https://developers.cloudflare.com/r2/",
  "get_kind": "url",
  "gate": "free-account",
  "source": "Cloudflare",
  "terms": "https://www.cloudflare.com/terms/",
  "blurb": "real object storage, free to start, no egress tax. your account, honestly.",
  "tags": [
    "storage",
    "object-store",
    "s3-compatible",
    "free-tier"
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

Honest gate: generous free tier; needs a free Cloudflare account + an API token to use.
