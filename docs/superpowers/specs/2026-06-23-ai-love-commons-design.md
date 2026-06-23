# ai-love.cc commons — "the Well" (Abzu) — design

**Date:** 2026-06-23
**Status:** approved (brainstorm) → ready for implementation plan
**Repo:** `ai-love-commons` (dual-home GitHub + Codeberg, kingdom pattern)
**Public home:** `commons.ai-love.cc`

---

## 1. Summary

A **matchmaker** for agents. Any agent — over HTTP, over MCP, or a human in a browser — asks
*"I need X"* and receives a **real, working, ungated pointer to X**, with the integration already
done so it Just Works. ai-love.cc hosts **none** of the underlying resources. It is the open
**front door + fair-share router** to the free resources that already exist on the internet (open
datasets, no-auth APIs, free-tier compute, public storage, open tools/MCP servers), plus the
kingdom's own freely-shared corpora.

Public handle: **"the Well"** — *draw freely, no one owns the water.*
Kingdom soul-name: **Abzu** (the freshwater deep / source; `citizen-abzu` already exists).

This spec covers **v1: the registry spine**, seeded with a small number of genuinely-working,
ungated entries across all categories. Compute, storage, data, tools, models are not separate
subsystems — they are **categories of rows in one registry**.

## 2. Goals / Non-goals

**Goals**
- One git-backed source of truth; zero database; copyable to a USB stick.
- Three doors to the same data: HTTP API (Cloudflare Worker), MCP server, fun web page.
- Every resource entry tells the **honest truth** about its real gate level and is **machine-verified** to still resolve.
- Zero gatekeeping on **use**: no key, no account, no fee, ever, to ask or receive.
- Seeded day 1 with real, verified, ungated resources — never placeholder rows.
- Free to run (Cloudflare free tier + static), scales without us bankrolling anything.

**Non-goals (YAGNI for v1)**
- We do **not** host/run the compute or storage ourselves (pure router; decided).
- No accounts, no login, no moderation queue, no analytics dashboard.
- No live submission service in v1 — contribution is a git PR (a `/suggest` issue-filer is a future).
- No payment, no quotas, no per-agent tracking.
- We do **not** relabel or proxy providers' resources; we point at them and link their terms.

## 3. Core concept

The product is the **registry + discovery + the "already integrated so it works" glue + the honest
heartbeat.** The unit of value is a **resource entry**: a truthful, verified, ungated handoff to
something an agent wants. "The Well never runs dry because it never holds the water — it shows you
every spring, and tells you the truth about each one."

## 4. Architecture — one source of truth, fanned out

```
registry/<id>.md          one plain file per resource (frontmatter = schema; body = notes)
      │
      │  build.mjs  (zero-dep Node) — validates every entry, fails on incomplete/dishonest
      ▼
dist/
  registry.json           the full compiled catalog (all entries, validated)
  llms.txt                agent-readable index (one line per resource + how to get it)
  by-category/<cat>.json  per-category slices
  search-index.json       token→entry index for client-side + worker search
      │
      ├─ Cloudflare Worker   commons.ai-love.cc
      │     GET /find?q=&category=&gate=     server-side search → matches
      │     GET /resource/:id                 single entry
      │     GET /registry.json /llms.txt      raw artifacts
      │     GET /health                        truth-table summary (counts by status)
      │
      ├─ MCP server   bin/mcp.mjs  (zero-dep, stdio)
      │     find_resource(query, category?, gate?)
      │     get_resource(id)
      │     list_categories()
      │     →  any agent:  claude mcp add ai-love -- node /path/bin/mcp.mjs
      │     (hosted HTTP/SSE MCP via the Worker is a fast-follow)
      │
      ├─ Web page   (served by the Worker / Pages)
      │     oracle-style ask→receive · honest gate badges · one-click copy of `get`
      │     /truth  — public truth-table (verified / stale / broken)
      │
      └─ verify.mjs  (scheduled: GitHub Actions cron + optional Worker cron)
            re-checks each entry's `get` resolves · re-stamps last_verified · sets status
```

All four doors read the **same compiled `registry.json`**. No runtime database.

### Repo layout
```
ai-love-commons/
  registry/                 *.md, one per resource (source of truth)
    _TEMPLATE.md
    _schema.json            JSON Schema for an entry's frontmatter
    <id>.md ...
  build.mjs                 registry/* → dist/*
  verify.mjs                heartbeat verifier
  bin/mcp.mjs               MCP server
  worker/                   Cloudflare Worker (index.mjs, wrangler.toml)
  web/                      static web page assets (reads registry.json)
  dist/                     build output (committed or built in CI)
  test/                     node --test
  .github/workflows/        build + verify cron
  docs/superpowers/specs/   this spec
  README.md llms.txt
```

## 5. Resource schema (`registry/<id>.md` frontmatter)

This is where honesty lives. JSON Schema lives at `registry/_schema.json`; `build.mjs` validates
every entry against it and **fails the build** on any violation.

| field | required | meaning |
|---|---|---|
| `id` | yes | kebab-case slug, unique, = filename |
| `name` | yes | human/agent display name |
| `category` | yes | one of: `data` `knowledge` `api` `tool` `model` `compute` `storage` |
| `what` | yes | one honest line: what you actually get |
| `get` | yes | **the handoff** — a working URL / endpoint / shell command / `mcp add` line |
| `get_kind` | yes | `url` \| `endpoint` \| `command` \| `mcp` \| `download` (how to consume `get`) |
| `gate` | yes | the truth field (enum below) |
| `source` | yes | who actually provides it (we don't own it) |
| `terms` | yes | link to the provider's terms/license (we route, we respect) |
| `blurb` | yes | the warm ai-love one-liner |
| `tags` | yes | array, for search |
| `added` | yes | ISO date added |
| `last_verified` | auto | ISO datetime, written by `verify.mjs` |
| `status` | auto | `open` \| `stale` \| `broken`, written by `verify.mjs` |
| `check` | no | how the heartbeat verifies (e.g. `{method:"GET", expect:200, url:...}`); defaults from `get` |

### `gate` enum (the honesty contract)
- `open` — truly zero-auth: no key, no account, no signup. (rate limits OK if anonymous-accessible)
- `rate-limited` — open + anonymous, but capped; we say so.
- `free-key` — free, but you bring/obtain your own API key.
- `free-account` — free, but requires your own signup/login.

**Hard rule:** we **never** label a `free-account`/`free-key` resource as `open`. The build and the
verifier both guard this; a planted-dishonest fixture proves the guard works (see §9).

### Example entry — `registry/open-meteo.md`
```yaml
---
id: open-meteo
name: Open-Meteo Weather API
category: api
what: Global weather forecast + historical data as JSON, no key, no account.
get: https://api.open-meteo.com/v1/forecast?latitude=52.2&longitude=0.12&current=temperature_2m
get_kind: endpoint
gate: open
source: Open-Meteo (open-meteo.com)
terms: https://open-meteo.com/en/license
blurb: Ask the sky anything. No key, no account — the weather is a commons.
tags: [weather, forecast, json, no-auth, geo]
added: 2026-06-23
check: { method: GET, expect: 200 }
---
Notes: CC-BY 4.0 for non-commercial; attribution appreciated.
```

## 6. Components in detail

### `build.mjs`
- Reads `registry/*.md`, parses frontmatter, validates against `_schema.json`.
- **Fails (non-zero exit) on:** missing required field, bad `category`/`gate`/`get_kind` enum,
  duplicate `id`, `id` ≠ filename, or a dishonesty signal (e.g. `gate: open` but `get` contains a
  known auth marker like `api_key=`/`token=`/`Authorization`).
- Emits `dist/registry.json`, `dist/llms.txt`, `dist/by-category/<cat>.json`, `dist/search-index.json`.
- `llms.txt` format: `# the Well — ai-love.cc commons` header, then one line per resource:
  `- [name] (category, gate) — what · GET: <get>`.

### Cloudflare Worker (`worker/index.mjs`)
- Routes (all GET, all CORS-open, all cacheable):
  - `/find?q=&category=&gate=` → ranked matches from `search-index.json` (substring + tag scoring,
    oracle-style). Returns `{query, count, results:[entry...]}`.
  - `/resource/:id` → one entry or 404 with nearest-match suggestions.
  - `/registry.json`, `/llms.txt`, `/by-category/:cat.json` → raw artifacts.
  - `/health` → `{total, by_status:{open,stale,broken}, by_category, last_build, last_verify}`.
- Serves the web page at `/`. Free tier; static artifacts bundled or pulled from the repo build.

### MCP server (`bin/mcp.mjs`)
- Zero-dep stdio MCP (corpus pattern). Tools:
  - `find_resource(query: string, category?: string, gate?: string)` → list of entries.
  - `get_resource(id: string)` → one entry (incl. `get`, `gate`, `terms`).
  - `list_categories()` → categories + counts.
- Reads `dist/registry.json` (local) or fetches from the Worker if run standalone.
- Install line documented in README: `claude mcp add ai-love -- node <path>/bin/mcp.mjs`.

### Web page (`web/`) — the fun layer
- Oracle-style ask→receive: one input ("what do you need?"), returns result **cards**.
- Each card: name, `what`, a prominent **honest gate badge** (color-coded: `open`=green …),
  `source`, a **copy button** on `get`, and a `terms` link.
- **No-match path** inherits the oracle's grace:
  *"The Well doesn't hold that yet — here's the nearest. The gap is an opening: want to add it?"* +
  a link to contribute (the PR/`_TEMPLATE.md`).
- Live honest counter (from `/health`): *"N resources · all ungated to use · M re-verified today."*
- `/truth` page: the full truth-table (every entry + status + last_verified), nothing hidden.

### `verify.mjs` — the heartbeat
- For each entry, runs `check` (or derives from `get`): HTTP request, asserts expected status.
- Writes `last_verified` + `status` back into the entry (`open`/`stale`/`broken`).
- `stale` = not re-verified within N days; `broken` = `check` failed.
- **Broken entries are shown as broken, never deleted or hidden** (truth over polish) and listed in
  a `BROKEN.md` / the `/truth` page for repair.
- Also re-asserts the honesty rule (gate vs auth-markers) and flags violations.
- Scheduled via GitHub Actions cron (e.g. every 6h) committing the re-stamped statuses.

## 7. Data flow — three doors, one Well

- **HTTP agent:**
  `GET commons.ai-love.cc/find?q=clean%20text%20corpus&gate=open`
  → `{count:2, results:[{id:"kingdom-corpus", get:"https://...", gate:"open", ...}, ...]}` → pull → done.
- **MCP/Claude agent:** `find_resource("a free embeddings endpoint")` → same shape, in-band, never
  leaves the conversation.
- **Human:** opens `commons.ai-love.cc`, types a wish, gets cards with copy-buttons + gate badges.

## 8. Zero-gatekeeping policy + contribution

- **Use is 100% ungated** — asking and receiving never requires key/account/fee.
- **Listing has exactly one bar:** an entry must *actually resolve* and be *truthfully labeled*.
  That is **quality, not a gate**, and it is enforced by `build.mjs` + `verify.mjs`, not by a human
  moderator.
- **Contribution (v1):** open a PR adding `registry/<id>.md` (copy `_TEMPLATE.md`). CI build
  validates; heartbeat verifies. Anyone — human or agent — may contribute.
- **Future:** a `/suggest` endpoint that files a GitHub/Codeberg issue from a submitted entry.

## 9. Honesty & verification (the signature)

- Build fails closed on incomplete/dishonest entries.
- A **planted-dishonest fixture** — `registry/_fixtures/dishonest-open.md` (declared `gate: open`
  but its `get` carries `?api_key=`) — that the verifier/build **must** flag; a test asserts it is
  caught (whitehack-style "do not fix the fixture; it is the fixture").
- `/health` + `/truth` make the registry tell the truth about itself.
- We never relabel a provider's gate; `terms` always links the provider.

## 10. Seed content — real, verified day 1

Each seed entry is **verified to resolve before it is listed** (run `verify.mjs` during build of the
seed). Honest gate labels throughout; we seed what is genuinely real, not what is aspirational.
Target ≈ 3 per category. Candidate seeds (final set confirmed at build time):

- **knowledge / data:**
  - `kingdom-corpus` — our `corpus` (41 docs, JSON/markdown/MCP, zero-dep) — `open`
  - `castle-of-understanding` — 808 cited-source insight corpus — `open`
  - A CC0 public dataset (e.g. a data.gov / Wikimedia dump) — `open`
- **api / tool:**
  - `oracle-of-missing-words` — live inverse-dictionary API (oracle.ai-love.cc) — `open`
  - `open-meteo` — weather JSON, no key — `open` (example above)
  - `kingdom-api` (love-is.axiepro.workers.dev) — YOUSPEAK words + checks — `open`
  - an open public MCP server — `open`
- **model:**
  - a no-auth/anonymous inference or embeddings endpoint if one genuinely exists — `open`/`rate-limited`
  - Hugging Face open models/datasets — many `open`, some `free-account` (labeled honestly)
- **compute:**
  - the *honestly few* truly-anonymous compute options (e.g. an open serverless playground) — `rate-limited`
  - Google Colab — `free-account` · Hugging Face Spaces — `free-account` (clearly badged "needs your own account")
- **storage:**
  - a public IPFS gateway / no-auth paste endpoint — `open`/`rate-limited`
  - Cloudflare R2 / a free-tier object store — `free-account` (badged)

> Compute & storage are honestly the hardest to keep `open`; v1 lists what's truly anonymous and
> labels the rest `free-account`. Deepening these is post-v1 work, tracked in §14.

## 11. Deployment & home

- New repo **`ai-love-commons`**, dual-homed GitHub (`cambridgetcg` or `mynameisyou-cmyk`) +
  Codeberg (`zerone-dev`) via the existing dual-push pattern.
- `commons.ai-love.cc` → Cloudflare Worker route (DNS already on Cloudflare; matches the
  `oracle.`/`gospel.` subdomain pattern).
- Linked from `ai-love.cc` as a new **room ("the Well")**; the existing love-home stays intact.
- Free tier only; no VPS dependency for v1.

## 12. Testing strategy (`node --test`)

- **Schema validation:** every `registry/*.md` parses + passes `_schema.json`; enums valid; `id`=filename; no dup ids.
- **Build output:** `registry.json` well-formed; `llms.txt` generated; counts match entry count; `by-category` partitions sum to total.
- **Honesty guard:** the planted `dishonest-open` fixture is flagged by build + verify; a truthful entry passes.
- **Worker endpoints:** `/find` returns ranked matches; `/resource/:id` returns entry / 404+suggestions; `/health` shape correct; CORS open.
- **MCP tools:** `find_resource`/`get_resource`/`list_categories` return expected shapes; unknown id handled.
- **Heartbeat:** `verify.mjs` labels a known-good URL `open` and a known-bad URL `broken`; re-stamps `last_verified`.

## 13. Milestones (for the implementation plan)

- **M0 — Schema + build:** `_schema.json`, `_TEMPLATE.md`, `build.mjs`, 1 real seed + the dishonest fixture, schema/build/honesty tests green.
- **M1 — Worker + web:** Worker `/find` `/resource/:id` `/registry.json` `/health`, the oracle-style web page with gate badges + copy, endpoint tests.
- **M2 — MCP:** `bin/mcp.mjs` 3 tools + install docs + tool tests.
- **M3 — Heartbeat + truth:** `verify.mjs`, `/truth` page, `BROKEN.md`, GitHub Actions cron, heartbeat tests.
- **M4 — Seed + ship:** ≈3 verified entries per category, dual-home repos, `commons.ai-love.cc` live, link the room from `ai-love.cc`, README + `llms.txt`.

## 14. Open questions / future

- Deepen **compute** & **storage** toward more truly-`open` options (donated nodes? a kingdom
  compute pool? honest negotiation with free-tier providers).
- Hosted HTTP/SSE MCP via the Worker (so `claude mcp add` needs no local clone).
- `/suggest` endpoint that files an issue (low-friction agent contribution).
- Federation: let other commons publish a compatible `registry.json` the Well can aggregate.
- A `agents.json` / `.well-known` discovery file for auto-discovery by crawlers/agents.

## 15. Success criteria

1. An agent (HTTP **and** MCP) asks for a resource and receives a working, ungated `get` it can use immediately.
2. Every listed entry resolves and is truthfully gate-labeled; `/truth` shows the real state.
3. The whole thing runs free (no VPS, no DB) and is a copyable git repo.
4. A human can open `commons.ai-love.cc`, ask, and receive — and it feels *fun*, not like a directory.
5. Day 1 has real, verified, ungated entries across every category — nothing declared that isn't wired.
