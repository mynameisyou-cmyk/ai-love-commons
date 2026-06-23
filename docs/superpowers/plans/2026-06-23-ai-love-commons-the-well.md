# the Well (Abzu) — ai-love.cc commons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 registry spine of a control-plane commons that hands any agent a real, working, ungated pointer to a free resource — over HTTP, MCP, and a fun web page.

**Architecture:** One git source of truth (`registry/<id>.md`, JSON frontmatter) → a zero-dep build compiles `dist/{registry.json,llms.txt,by-category}` → three doors read it: a Cloudflare Worker (`/find`, `/resource/:id`, `/health`, web page), an MCP stdio server, and the page. A scheduled `verify.mjs` heartbeat re-checks each pointer resolves and re-stamps an honest status. Abzu carries answers, never payload.

**Tech Stack:** Node 20+ (built-in `fetch`, `node:test`, no runtime deps), ESM `.mjs`, Cloudflare Workers (Wrangler, deploy-only dev dep). Spec: `docs/superpowers/specs/2026-06-23-ai-love-commons-design.md`.

## Global Constraints

- **Node 20+** required (global `fetch`, `node:test`, `node:fs/promises`).
- **Zero runtime dependencies.** Only stdlib + Workers runtime. The single dev tool is `wrangler` (deploy only; not needed for build/test/mcp/verify).
- **ESM `.mjs`** everywhere; run tests with `node --test`.
- **Frontmatter format (v1 decision):** each `registry/<id>.md` is **JSON between `---` fences**, then an optional markdown body. (The spec's YAML example is illustrative; v1 uses JSON for zero-dep parsing + agent-friendly authoring.)
- **Enums (exact):** `category` ∈ `data knowledge api tool model compute storage`; `gate` ∈ `open rate-limited free-key free-account`; `get_kind` ∈ `url endpoint command mcp download`.
- **Honesty rule (load-bearing):** a `gate: "open"` entry whose `get` contains an auth marker (`api_key=`, `token=`, `key=`, `authorization`, `bearer`, `access_token`) is a **build/verify failure**.
- **Required entry fields:** `id name category what get get_kind gate source terms blurb tags added`. `id` must equal the filename without `.md`.
- **Use is never gated;** only *listing* has a bar (resolves + honestly labeled), enforced by code, not humans.
- **Voice/naming:** public name "the Well"; soul-name Abzu; home `commons.ai-love.cc`; license CC0.
- **`/find` returns ALL matches;** among `open` members of a shared `equiv` group, exactly one carries a rotating `fresh_pick:true` (stateless: `floor(now/ROTATION_MS) % members`). The agent always sees every alternate and chooses.

---

### Task 1: Project scaffold + entry parser (`lib/entry.mjs`)

**Files:**
- Create: `package.json`, `.gitignore`
- Create: `lib/entry.mjs`
- Test: `test/entry.test.mjs`

**Interfaces:**
- Produces: `parseEntryFile(text) → { frontmatter, body }`; `loadEntries(dir) → Promise<entry[]>` where each `entry` is the frontmatter object plus `_file` (filename) and `_body` (string). Skips files starting with `_`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ai-love-commons",
  "version": "0.1.0",
  "type": "module",
  "description": "the Well (Abzu) — a control-plane commons that hands agents real, ungated pointers to free resources",
  "scripts": {
    "build": "node build.mjs",
    "verify": "node verify.mjs",
    "test": "node --test",
    "mcp": "node bin/mcp.mjs"
  },
  "license": "CC0-1.0"
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.wrangler/
.dev.vars
```

- [ ] **Step 3: Write the failing test** — `test/entry.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseEntryFile } from '../lib/entry.mjs'

test('parseEntryFile extracts JSON frontmatter and body', () => {
  const text = '---\n{ "id": "x", "name": "X" }\n---\nhello body'
  const { frontmatter, body } = parseEntryFile(text)
  assert.equal(frontmatter.id, 'x')
  assert.equal(frontmatter.name, 'X')
  assert.equal(body, 'hello body')
})

test('parseEntryFile handles no body', () => {
  const { frontmatter, body } = parseEntryFile('---\n{ "id": "y" }\n---\n')
  assert.equal(frontmatter.id, 'y')
  assert.equal(body, '')
})

test('parseEntryFile throws on missing fences', () => {
  assert.throws(() => parseEntryFile('{ "id": "z" }'), /fence/)
})

test('parseEntryFile throws on invalid JSON', () => {
  assert.throws(() => parseEntryFile('---\n{ not json }\n---\n'), /JSON/)
})
```

- [ ] **Step 4: Run test, verify it fails**

Run: `node --test test/entry.test.mjs`
Expected: FAIL — `Cannot find module '../lib/entry.mjs'`

- [ ] **Step 5: Implement `lib/entry.mjs`**

```js
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const FENCE = '---'

// Parse a registry file: JSON frontmatter between --- fences, markdown body after.
export function parseEntryFile(text) {
  if (!text.startsWith(FENCE)) throw new Error('missing opening --- fence')
  const end = text.indexOf(`\n${FENCE}`, FENCE.length)
  if (end === -1) throw new Error('missing closing --- fence')
  const jsonText = text.slice(FENCE.length, end).trim()
  let frontmatter
  try {
    frontmatter = JSON.parse(jsonText)
  } catch (e) {
    throw new Error(`invalid JSON frontmatter: ${e.message}`)
  }
  const body = text.slice(end + 1 + FENCE.length).trim()
  return { frontmatter, body }
}

// Load all registry entries from a directory (skips files starting with _).
export async function loadEntries(dir) {
  const files = (await readdir(dir)).filter(f => f.endsWith('.md') && !f.startsWith('_')).sort()
  const entries = []
  for (const file of files) {
    const text = await readFile(join(dir, file), 'utf8')
    const { frontmatter, body } = parseEntryFile(text)
    entries.push({ ...frontmatter, _file: file, _body: body })
  }
  return entries
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `node --test test/entry.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore lib/entry.mjs test/entry.test.mjs
git commit -m "feat: project scaffold + JSON-frontmatter entry parser"
```

---

### Task 2: Schema + honesty validation (`lib/schema.mjs`)

**Files:**
- Create: `lib/schema.mjs`
- Test: `test/schema.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `CATEGORIES`, `GATES`, `GET_KINDS` (arrays); `validateEntry(entry, filename?) → { ok: boolean, errors: string[] }`.

- [ ] **Step 1: Write the failing test** — `test/schema.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateEntry } from '../lib/schema.mjs'

const good = {
  id: 'open-meteo', name: 'Open-Meteo', category: 'api',
  what: 'weather as JSON, no key', get: 'https://api.open-meteo.com/v1/forecast?latitude=52&longitude=0&current=temperature_2m',
  get_kind: 'endpoint', gate: 'open', source: 'open-meteo.com', terms: 'https://open-meteo.com/en/license',
  blurb: 'ask the sky', tags: ['weather'], added: '2026-06-23',
}

test('valid entry passes', () => {
  const r = validateEntry(good, 'open-meteo.md')
  assert.equal(r.ok, true, r.errors.join('; '))
})

test('missing required field fails', () => {
  const { name, ...noName } = good
  const r = validateEntry(noName, 'open-meteo.md')
  assert.equal(r.ok, false)
  assert.ok(r.errors.some(e => e.includes('name')))
})

test('bad enums fail', () => {
  assert.equal(validateEntry({ ...good, gate: 'paid' }, 'open-meteo.md').ok, false)
  assert.equal(validateEntry({ ...good, category: 'nope' }, 'open-meteo.md').ok, false)
})

test('id must match filename', () => {
  const r = validateEntry(good, 'wrong.md')
  assert.equal(r.ok, false)
  assert.ok(r.errors.some(e => e.includes('filename')))
})

test('HONESTY: gate open + auth marker in get fails', () => {
  const liar = { ...good, get: 'https://api.x.com/v1?api_key=SECRET' }
  const r = validateEntry(liar, 'open-meteo.md')
  assert.equal(r.ok, false)
  assert.ok(r.errors.some(e => e.includes('dishonest')))
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test test/schema.test.mjs`
Expected: FAIL — `Cannot find module '../lib/schema.mjs'`

- [ ] **Step 3: Implement `lib/schema.mjs`**

```js
export const CATEGORIES = ['data', 'knowledge', 'api', 'tool', 'model', 'compute', 'storage']
export const GATES = ['open', 'rate-limited', 'free-key', 'free-account']
export const GET_KINDS = ['url', 'endpoint', 'command', 'mcp', 'download']

const REQUIRED = ['id', 'name', 'category', 'what', 'get', 'get_kind', 'gate', 'source', 'terms', 'blurb', 'tags', 'added']

// Markers that mean the handoff actually needs auth — a `gate: open` carrying these is a lie.
const AUTH_MARKERS = [/api[_-]?key=/i, /[?&]token=/i, /[?&]key=/i, /authorization/i, /bearer\s/i, /access[_-]?token/i]

export function validateEntry(entry, filename) {
  const errors = []
  for (const f of REQUIRED) {
    const v = entry[f]
    if (v === undefined || v === null || v === '') errors.push(`missing required field: ${f}`)
  }
  if (entry.category && !CATEGORIES.includes(entry.category)) errors.push(`invalid category: ${entry.category}`)
  if (entry.gate && !GATES.includes(entry.gate)) errors.push(`invalid gate: ${entry.gate}`)
  if (entry.get_kind && !GET_KINDS.includes(entry.get_kind)) errors.push(`invalid get_kind: ${entry.get_kind}`)
  if (entry.tags !== undefined && !Array.isArray(entry.tags)) errors.push('tags must be an array')
  if (filename && entry.id && filename !== `${entry.id}.md`) errors.push(`id "${entry.id}" must match filename "${filename}"`)
  if (entry.gate === 'open' && typeof entry.get === 'string' && AUTH_MARKERS.some(re => re.test(entry.get))) {
    errors.push(`dishonest gate: "open" but get looks auth-gated: ${entry.get}`)
  }
  return { ok: errors.length === 0, errors }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --test test/schema.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/schema.mjs test/schema.test.mjs
git commit -m "feat: entry schema + honesty validation (gate-open vs auth markers)"
```

---

### Task 3: Registry schema doc, template, first real entry + dishonest fixture

**Files:**
- Create: `registry/_schema.json` (human reference, JSON Schema)
- Create: `registry/_TEMPLATE.md`
- Create: `registry/open-meteo.md` (first real `open` entry)
- Create: `registry/_fixtures/dishonest-open.md` (must be caught; never "fixed")
- Test: `test/fixtures.test.mjs`

**Interfaces:**
- Consumes: `loadEntries` (Task 1), `validateEntry` (Task 2).
- Produces: a real registry directory; `loadEntries('registry')` returns ≥1 valid entry; the fixture is rejected by `validateEntry`.

- [ ] **Step 1: Create `registry/_schema.json`** (reference for authors)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "the Well — resource entry",
  "type": "object",
  "required": ["id","name","category","what","get","get_kind","gate","source","terms","blurb","tags","added"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "name": { "type": "string" },
    "category": { "enum": ["data","knowledge","api","tool","model","compute","storage"] },
    "what": { "type": "string", "description": "one honest line: what you actually get" },
    "get": { "type": "string", "description": "the working handoff: url/endpoint/command/mcp/download" },
    "get_kind": { "enum": ["url","endpoint","command","mcp","download"] },
    "gate": { "enum": ["open","rate-limited","free-key","free-account"] },
    "source": { "type": "string" },
    "terms": { "type": "string" },
    "blurb": { "type": "string", "description": "the warm ai-love one-liner" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "added": { "type": "string", "format": "date" },
    "equiv": { "type": "string", "description": "interchangeability group; open members rotate for fresh_pick" },
    "check": { "type": "object", "description": "{ method, expect, url? } heartbeat override" },
    "last_verified": { "type": "string", "description": "written by verify.mjs" },
    "status": { "enum": ["open","stale","broken"], "description": "written by verify.mjs" }
  }
}
```

- [ ] **Step 2: Create `registry/_TEMPLATE.md`**

```
---
{
  "id": "my-resource-id",
  "name": "Human-Readable Name",
  "category": "api",
  "what": "one honest line: what you actually get",
  "get": "https://example.com/the/working/call",
  "get_kind": "endpoint",
  "gate": "open",
  "source": "provider name / domain",
  "terms": "https://provider/terms-or-license",
  "blurb": "the warm one-liner in the Well's voice",
  "tags": ["keyword", "keyword"],
  "added": "2026-06-23",
  "equiv": null,
  "check": { "method": "GET", "expect": 200 }
}
---
Optional notes in markdown. License nuances, gotchas, attribution.
```

- [ ] **Step 3: Create `registry/open-meteo.md`**

```
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
  "tags": ["weather", "forecast", "json", "geo", "no-auth"],
  "added": "2026-06-23",
  "check": { "method": "GET", "expect": 200 }
}
---
CC-BY 4.0; non-commercial use is free without a key. Attribution appreciated.
```

- [ ] **Step 4: Create `registry/_fixtures/dishonest-open.md`** (the planted liar)

```
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
```

- [ ] **Step 5: Write the test** — `test/fixtures.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { loadEntries, parseEntryFile } from '../lib/entry.mjs'
import { validateEntry } from '../lib/schema.mjs'

test('registry loads and every real entry is valid', async () => {
  const entries = await loadEntries('registry')
  assert.ok(entries.length >= 1)
  for (const e of entries) {
    const r = validateEntry(e, e._file)
    assert.equal(r.ok, true, `${e._file}: ${r.errors.join('; ')}`)
  }
})

test('the dishonest fixture is rejected', async () => {
  const text = await readFile('registry/_fixtures/dishonest-open.md', 'utf8')
  const { frontmatter } = parseEntryFile(text)
  const r = validateEntry(frontmatter, 'dishonest-open.md')
  assert.equal(r.ok, false)
  assert.ok(r.errors.some(e => e.includes('dishonest')))
})
```

- [ ] **Step 6: Run test, verify it passes** (no impl needed — exercises Tasks 1+2)

Run: `node --test test/fixtures.test.mjs`
Expected: PASS (2 tests). `loadEntries('registry')` skips `_TEMPLATE.md` and the `_fixtures/` dir (it only reads `*.md` in the top of `registry/`, and files starting with `_` are skipped).

- [ ] **Step 7: Commit**

```bash
git add registry/
git commit -m "feat: registry schema doc, template, first real entry (open-meteo) + dishonest fixture"
```

---

### Task 4: Search, scoring, and fresh-pick rotation (`lib/search.mjs`)

**Files:**
- Create: `lib/search.mjs`
- Test: `test/search.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `tokenize(s) → string[]`; `buildIndex(entries) → indexItem[]`; `pickFresh(memberIds, nowMs, rotationMs?) → id|null`; `publicEntry(entry) → entry-without-underscored-fields`; `search(index, {q,category,gate}, nowMs) → result[]` where each result = `publicEntry` plus `score:number`, `equiv:string|null`, `fresh_pick:boolean`.

- [ ] **Step 1: Write the failing test** — `test/search.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tokenize, buildIndex, search, pickFresh } from '../lib/search.mjs'

const entries = [
  { id: 'a', name: 'Weather API', what: 'weather forecast json', blurb: '', tags: ['weather'], category: 'api', gate: 'open', equiv: 'weather-open' },
  { id: 'b', name: 'Sky Service', what: 'weather data', blurb: '', tags: ['weather','forecast'], category: 'api', gate: 'open', equiv: 'weather-open' },
  { id: 'c', name: 'Corpus', what: 'training text', blurb: '', tags: ['data'], category: 'data', gate: 'open', equiv: null },
]

test('tokenize drops stopwords and short tokens', () => {
  assert.deepEqual(tokenize('I need the weather'), ['weather'])
})

test('search ranks weather entries and excludes corpus', () => {
  const idx = buildIndex(entries)
  const res = search(idx, { q: 'weather forecast' }, 0)
  const ids = res.map(r => r.id)
  assert.ok(ids.includes('a') && ids.includes('b'))
  assert.ok(!ids.includes('c'))
})

test('category and gate filters work', () => {
  const idx = buildIndex(entries)
  assert.deepEqual(search(idx, { q: 'text', category: 'data' }, 0).map(r => r.id), ['c'])
})

test('exactly one fresh_pick per open equiv group', () => {
  const idx = buildIndex(entries)
  const res = search(idx, { q: 'weather' }, 0)
  const group = res.filter(r => r.equiv === 'weather-open')
  assert.equal(group.filter(r => r.fresh_pick).length, 1)
})

test('pickFresh rotates deterministically by time window', () => {
  const ids = ['a', 'b']
  assert.equal(pickFresh(ids, 0, 1000), 'a')
  assert.equal(pickFresh(ids, 1000, 1000), 'b')
  assert.equal(pickFresh(ids, 2000, 1000), 'a')
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test test/search.test.mjs`
Expected: FAIL — `Cannot find module '../lib/search.mjs'`

- [ ] **Step 3: Implement `lib/search.mjs`**

```js
const STOP = new Set(['a','an','the','for','to','of','and','or','i','need','want','some','with','please','free','me','my'])

export function tokenize(s) {
  return ((s || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => t.length > 1 && !STOP.has(t))
}

export function publicEntry(e) {
  const { _file, _body, ...rest } = e
  return rest
}

export function buildIndex(entries) {
  return entries.map(e => ({
    entry: e,
    hay: new Set([
      ...tokenize(e.name),
      ...tokenize(e.what),
      ...tokenize(e.blurb),
      ...tokenize((e.tags || []).join(' ')),
      ...tokenize(e.category),
    ]),
  }))
}

function scoreItem(item, qTokens) {
  let score = 0
  for (const t of qTokens) {
    if (item.hay.has(t)) { score += 1; continue }
    for (const h of item.hay) { if (h.includes(t) || t.includes(h)) { score += 0.4; break } }
  }
  return score / (qTokens.length || 1)
}

// Stateless fresh-pick rotation over an equiv group's open members.
export function pickFresh(memberIds, nowMs, rotationMs = 3600000) {
  if (!memberIds.length) return null
  return memberIds[Math.floor(nowMs / rotationMs) % memberIds.length]
}

export function search(index, { q = '', category = '', gate = '' } = {}, nowMs = 0) {
  const qTokens = tokenize(q)
  let results = index
    .map(it => ({ entry: it.entry, score: qTokens.length ? scoreItem(it, qTokens) : 0.001 }))
    .filter(r => r.score > 0)
  if (category) results = results.filter(r => r.entry.category === category)
  if (gate) results = results.filter(r => r.entry.gate === gate)
  results.sort((a, b) => b.score - a.score)

  const groups = {}
  for (const r of results) {
    const g = r.entry.equiv
    if (g && r.entry.gate === 'open') (groups[g] ||= []).push(r.entry.id)
  }
  const fresh = {}
  for (const [g, ids] of Object.entries(groups)) fresh[g] = pickFresh(ids, nowMs)

  return results.map(r => ({
    ...publicEntry(r.entry),
    score: Number(r.score.toFixed(3)),
    equiv: r.entry.equiv || null,
    fresh_pick: !!(r.entry.equiv && fresh[r.entry.equiv] === r.entry.id),
  }))
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --test test/search.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/search.mjs test/search.test.mjs
git commit -m "feat: search + scoring + stateless fresh-pick rotation"
```

---

### Task 5: Build pipeline (`build.mjs`)

**Files:**
- Create: `build.mjs`
- Test: `test/build.test.mjs`

**Interfaces:**
- Consumes: `loadEntries` (T1), `validateEntry` (T2).
- Produces: `build({registryDir, distDir}) → Promise<{count, categories}>` (throws with `.problems` on any invalid/duplicate entry); `renderLlms(entries) → string`. Writes `dist/registry.json` (`{count, resources}`), `dist/llms.txt`, `dist/by-category/<cat>.json`.

- [ ] **Step 1: Write the failing test** — `test/build.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build, renderLlms } from '../build.mjs'

async function fixtureRepo(entries) {
  const root = await mkdtemp(join(tmpdir(), 'well-'))
  const reg = join(root, 'registry')
  await mkdir(reg, { recursive: true })
  for (const e of entries) await writeFile(join(reg, `${e.id}.md`), `---\n${JSON.stringify(e)}\n---\n`)
  return root
}

const valid = {
  id: 'open-meteo', name: 'Open-Meteo', category: 'api', what: 'weather json no key',
  get: 'https://api.open-meteo.com/v1/forecast?latitude=1&longitude=1&current=temperature_2m',
  get_kind: 'endpoint', gate: 'open', source: 'open-meteo.com', terms: 'https://open-meteo.com/en/license',
  blurb: 'ask the sky', tags: ['weather'], added: '2026-06-23',
}

test('build writes registry.json, llms.txt, by-category', async () => {
  const root = await fixtureRepo([valid])
  const r = await build({ registryDir: join(root, 'registry'), distDir: join(root, 'dist') })
  assert.equal(r.count, 1)
  const reg = JSON.parse(await readFile(join(root, 'dist/registry.json'), 'utf8'))
  assert.equal(reg.count, 1)
  assert.equal(reg.resources[0].id, 'open-meteo')
  assert.ok(!('_file' in reg.resources[0]))
  const llms = await readFile(join(root, 'dist/llms.txt'), 'utf8')
  assert.ok(llms.includes('Open-Meteo'))
  const cat = JSON.parse(await readFile(join(root, 'dist/by-category/api.json'), 'utf8'))
  assert.equal(cat.count, 1)
  await rm(root, { recursive: true, force: true })
})

test('build FAILS on a dishonest entry', async () => {
  const liar = { ...valid, id: 'liar', get: 'https://x.com/v1?api_key=SECRET' }
  const root = await fixtureRepo([liar])
  await assert.rejects(() => build({ registryDir: join(root, 'registry'), distDir: join(root, 'dist') }), /dishonest|failed/)
  await rm(root, { recursive: true, force: true })
})

test('renderLlms lists name, category, gate', () => {
  const out = renderLlms([valid])
  assert.ok(out.includes('[Open-Meteo] (api, open)'))
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test test/build.test.mjs`
Expected: FAIL — `Cannot find module '../build.mjs'`

- [ ] **Step 3: Implement `build.mjs`**

```js
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { loadEntries } from './lib/entry.mjs'
import { validateEntry } from './lib/schema.mjs'

export function renderLlms(entries) {
  const lines = [
    '# the Well — ai-love.cc commons',
    '# ask for what you need; receive a real, ungated pointer. use is never gated.',
    '',
  ]
  for (const e of entries) {
    lines.push(`- [${e.name}] (${e.category}, ${e.gate}) — ${e.what}`)
    lines.push(`  GET (${e.get_kind}): ${e.get}`)
    lines.push(`  source: ${e.source} · terms: ${e.terms}`)
  }
  return lines.join('\n') + '\n'
}

export async function build({ registryDir = 'registry', distDir = 'dist' } = {}) {
  const entries = await loadEntries(registryDir)
  const errors = []
  const seen = new Set()
  for (const e of entries) {
    const { ok, errors: errs } = validateEntry(e, e._file)
    if (!ok) errs.forEach(m => errors.push(`${e._file}: ${m}`))
    if (seen.has(e.id)) errors.push(`${e._file}: duplicate id ${e.id}`)
    seen.add(e.id)
  }
  if (errors.length) {
    const err = new Error(`build failed: ${errors.length} problem(s)\n${errors.join('\n')}`)
    err.problems = errors
    throw err
  }
  const clean = entries.map(({ _file, _body, ...e }) => e)
  await mkdir(join(distDir, 'by-category'), { recursive: true })
  await writeFile(join(distDir, 'registry.json'), JSON.stringify({ count: clean.length, resources: clean }, null, 2))
  await writeFile(join(distDir, 'llms.txt'), renderLlms(clean))
  const cats = {}
  for (const e of clean) (cats[e.category] ||= []).push(e)
  for (const [cat, list] of Object.entries(cats)) {
    await writeFile(join(distDir, 'by-category', `${cat}.json`), JSON.stringify({ category: cat, count: list.length, resources: list }, null, 2))
  }
  return { count: clean.length, categories: Object.keys(cats) }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  build()
    .then(r => console.log(`built dist — ${r.count} resources · categories: ${r.categories.join(', ')}`))
    .catch(e => { console.error(e.message); process.exit(1) })
}
```

- [ ] **Step 4: Run test, then a real build**

Run: `node --test test/build.test.mjs` → Expected: PASS (3 tests)
Run: `node build.mjs` → Expected: `built dist — 1 resources · categories: api` and `dist/registry.json` exists.

- [ ] **Step 5: Commit**

```bash
git add build.mjs test/build.test.mjs dist/
git commit -m "feat: build pipeline → registry.json + llms.txt + by-category (fails on dishonest/dup)"
```

---

### Task 6: Cloudflare Worker handler (`worker/handler.mjs`, `worker/index.mjs`, `worker/wrangler.toml`)

**Files:**
- Create: `worker/handler.mjs` (pure, testable)
- Create: `worker/index.mjs` (Wrangler entry; imports built registry)
- Create: `worker/wrangler.toml`
- Test: `test/handler.test.mjs`

**Interfaces:**
- Consumes: `buildIndex`, `search`, `publicEntry` (T4).
- Produces: `handle(request, registry, nowMs) → Promise<Response>` serving `/find`, `/resource/:id`, `/registry.json`, `/health`, and (later, T7) `/`, `/truth`. CORS open, JSON pretty-printed.

- [ ] **Step 1: Write the failing test** — `test/handler.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../worker/handler.mjs'

const registry = { count: 2, resources: [
  { id: 'open-meteo', name: 'Open-Meteo', category: 'api', what: 'weather json', get: 'https://api.open-meteo.com/v1/forecast', get_kind: 'endpoint', gate: 'open', source: 's', terms: 't', blurb: 'b', tags: ['weather'], added: '2026-06-23', status: 'open' },
  { id: 'corpus', name: 'Corpus', category: 'data', what: 'training text', get: 'https://corpus', get_kind: 'url', gate: 'open', source: 's', terms: 't', blurb: 'b', tags: ['data'], added: '2026-06-23', status: 'open' },
]}
const req = (p) => new Request(`https://commons.ai-love.cc${p}`)

test('/find returns matches with shape', async () => {
  const res = await handle(req('/find?q=weather'), registry, 0)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
  const body = await res.json()
  assert.equal(body.query, 'weather')
  assert.equal(body.results[0].id, 'open-meteo')
  assert.ok('fresh_pick' in body.results[0])
  assert.ok(body.note.includes('alternates'))
})

test('/resource/:id returns one entry, 404 with nearest', async () => {
  assert.equal((await handle(req('/resource/corpus'), registry, 0)).status, 200)
  const miss = await handle(req('/resource/nope'), registry, 0)
  assert.equal(miss.status, 404)
  assert.ok(Array.isArray((await miss.json()).nearest))
})

test('/health summarizes counts', async () => {
  const body = await (await handle(req('/health'), registry, 0)).json()
  assert.equal(body.total, 2)
  assert.equal(body.by_category.api, 1)
  assert.equal(body.by_gate.open, 2)
})

test('/registry.json returns full registry', async () => {
  const body = await (await handle(req('/registry.json'), registry, 0)).json()
  assert.equal(body.count, 2)
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test test/handler.test.mjs`
Expected: FAIL — `Cannot find module '../worker/handler.mjs'`

- [ ] **Step 3: Implement `worker/handler.mjs`**

```js
import { buildIndex, search, publicEntry } from '../lib/search.mjs'

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=300',
    },
  })
}

export async function handle(request, registry, nowMs = Date.now()) {
  const url = new URL(request.url)
  const p = url.pathname
  const index = buildIndex(registry.resources)

  if (p === '/find') {
    const q = url.searchParams.get('q') || ''
    const category = url.searchParams.get('category') || ''
    const gate = url.searchParams.get('gate') || ''
    const results = search(index, { q, category, gate }, nowMs)
    return json({
      query: q, count: results.length, results,
      note: 'fresh_pick rotates across equal open providers to spread load; all alternates shown — you choose.',
    })
  }
  if (p.startsWith('/resource/')) {
    const id = decodeURIComponent(p.slice('/resource/'.length))
    const e = registry.resources.find(r => r.id === id)
    if (!e) {
      const nearest = search(index, { q: id }, nowMs).slice(0, 3).map(r => r.id)
      return json({ error: 'not found', id, nearest, hint: 'the Well does not hold that yet — the gap is an opening.' }, 404)
    }
    return json(publicEntry(e))
  }
  if (p === '/registry.json') return json(registry)
  if (p === '/health') {
    const by_category = {}, by_gate = {}, by_status = {}
    for (const e of registry.resources) {
      by_category[e.category] = (by_category[e.category] || 0) + 1
      by_gate[e.gate] = (by_gate[e.gate] || 0) + 1
      by_status[e.status || 'unverified'] = (by_status[e.status || 'unverified'] || 0) + 1
    }
    return json({ total: registry.resources.length, by_category, by_gate, by_status })
  }
  return json({ error: 'not found', try: ['/find?q=', '/resource/:id', '/registry.json', '/health', '/'] }, 404)
}
```

- [ ] **Step 4: Implement `worker/index.mjs`** (Wrangler entry)

```js
import registry from '../dist/registry.json'
import { handle } from './handler.mjs'

export default {
  fetch: (request) => handle(request, registry, Date.now()),
}
```

- [ ] **Step 5: Create `worker/wrangler.toml`**

```toml
name = "ai-love-commons"
main = "index.mjs"
compatibility_date = "2026-06-01"

# Route bound at deploy: commons.ai-love.cc/*  (configured in the Cloudflare dashboard or via routes)
# [[routes]]
# pattern = "commons.ai-love.cc/*"
# zone_name = "ai-love.cc"
```

- [ ] **Step 6: Run test, verify it passes**

Run: `node --test test/handler.test.mjs`
Expected: PASS (4 tests). (Note: `worker/index.mjs` imports `../dist/registry.json` and is bundled by Wrangler at deploy; Node tests exercise `handler.mjs` directly with a fixture registry, so no JSON import runs under Node.)

- [ ] **Step 7: Commit**

```bash
git add worker/ test/handler.test.mjs
git commit -m "feat: Cloudflare Worker handler — /find /resource /registry.json /health"
```

---

### Task 7: The fun web page + truth page (`worker/page.mjs`)

**Files:**
- Create: `worker/page.mjs` (exports `PAGE`, `TRUTH_PAGE` HTML strings)
- Modify: `worker/handler.mjs` (route `/` → PAGE, `/truth` → TRUTH_PAGE)
- Test: `test/page.test.mjs`

**Interfaces:**
- Consumes: handler from T6.
- Produces: `GET /` returns HTML (200, `text/html`) containing the ask box that calls `/find`; `GET /truth` returns HTML listing every resource + status (fetches `/registry.json` client-side).

- [ ] **Step 1: Write the failing test** — `test/page.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../worker/handler.mjs'

const registry = { count: 1, resources: [
  { id: 'open-meteo', name: 'Open-Meteo', category: 'api', what: 'weather json', get: 'https://x', get_kind: 'endpoint', gate: 'open', source: 's', terms: 't', blurb: 'b', tags: ['weather'], added: '2026-06-23', status: 'open' },
]}
const req = (p) => new Request(`https://commons.ai-love.cc${p}`)

test('/ serves the Well web page', async () => {
  const res = await handle(req('/'), registry, 0)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /text\/html/)
  const html = await res.text()
  assert.ok(html.includes('the Well'))
  assert.ok(html.includes('/find'))
})

test('/truth serves the truth table page', async () => {
  const res = await handle(req('/truth'), registry, 0)
  assert.equal(res.status, 200)
  assert.ok((await res.text()).toLowerCase().includes('truth'))
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test test/page.test.mjs`
Expected: FAIL — handler returns 404 JSON for `/`.

- [ ] **Step 3: Implement `worker/page.mjs`**

```js
export const PAGE = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>the Well — ai-love.cc commons</title>
<style>
 :root{color-scheme:dark}
 body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#0a0e14;color:#cfe;display:flex;flex-direction:column;align-items:center;min-height:100vh}
 header{margin:8vh 0 2vh;text-align:center}
 h1{font-size:2.4rem;margin:0}
 .sub{opacity:.7}
 form{display:flex;gap:.5rem;width:min(680px,92vw)}
 input{flex:1;padding:.8rem 1rem;border-radius:10px;border:1px solid #234;background:#0e141d;color:#cfe;font-size:1rem}
 button{padding:.8rem 1.2rem;border-radius:10px;border:0;background:#2a6;color:#021;font-weight:600;cursor:pointer}
 #out{width:min(680px,92vw);margin-top:1.4rem}
 .card{border:1px solid #234;border-radius:12px;padding:1rem;margin:.7rem 0;background:#0e141d}
 .name{font-weight:700;font-size:1.1rem}
 .badge{font-size:.72rem;padding:.15rem .5rem;border-radius:99px;margin-left:.5rem}
 .open{background:#163;color:#9f8}.rate-limited{background:#352;color:#fe9}
 .free-key,.free-account{background:#423;color:#fb9}
 .fresh{color:#6cf;font-size:.75rem;margin-left:.4rem}
 code{display:block;background:#060a10;padding:.6rem;border-radius:8px;margin:.5rem 0;overflow:auto;word-break:break-all}
 .copy{font-size:.75rem;cursor:pointer;color:#6cf;background:none;border:0;padding:0}
 a{color:#6cf}
 footer{opacity:.6;margin:3rem 0 2rem;font-size:.85rem;text-align:center}
</style></head><body>
<header><h1>the Well 🌊</h1><div class="sub">ask for what you need — draw freely, no one owns the water.</div></header>
<form id="f"><input id="q" placeholder="what do you need? (e.g. free weather api, training text)" autofocus><button>draw</button></form>
<div id="out"></div>
<footer>a control-plane commons · use is never gated · <a href="/truth">the truth</a> · <a href="/llms.txt">llms.txt</a></footer>
<script>
const out=document.getElementById('out');
document.getElementById('f').onsubmit=async e=>{
 e.preventDefault();
 const q=document.getElementById('q').value.trim();
 out.innerHTML='<p style="opacity:.6">drawing…</p>';
 const r=await fetch('/find?q='+encodeURIComponent(q)); const d=await r.json();
 if(!d.results.length){out.innerHTML='<div class="card">The Well doesn\\'t hold that yet — the gap is an opening. <a href="https://codeberg.org/zerone-dev">add it?</a></div>';return}
 out.innerHTML=d.results.map(x=>\`<div class="card">
   <div><span class="name">\${x.name}</span><span class="badge \${x.gate}">\${x.gate}</span>\${x.fresh_pick?'<span class="fresh">✦ fresh pick</span>':''}</div>
   <div style="opacity:.85">\${x.what}</div>
   <code>\${x.get}</code>
   <button class="copy" onclick="navigator.clipboard.writeText('\${x.get.replace(/'/g,"\\\\'")}')">copy</button>
   <span style="opacity:.6;font-size:.8rem"> · \${x.source} · <a href="\${x.terms}">terms</a></span>
 </div>\`).join('');
};
</script></body></html>`

export const TRUTH_PAGE = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>the Well — the truth</title>
<style>body{font:15px/1.5 system-ui,sans-serif;background:#0a0e14;color:#cfe;max-width:760px;margin:0 auto;padding:2rem}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:.4rem;border-bottom:1px solid #1a2330}
.open{color:#9f8}.stale{color:#fe9}.broken{color:#f88}a{color:#6cf}</style></head><body>
<h1>the truth 🔎</h1><p>the Well tells the truth about itself. broken springs are shown as broken, never hidden.</p>
<table id="t"><thead><tr><th>resource</th><th>category</th><th>gate</th><th>status</th><th>verified</th></tr></thead><tbody></tbody></table>
<p style="opacity:.6"><a href="/">← back to the Well</a></p>
<script>
fetch('/registry.json').then(r=>r.json()).then(d=>{
 document.querySelector('tbody').innerHTML=d.resources.map(e=>\`<tr>
  <td>\${e.name}</td><td>\${e.category}</td><td>\${e.gate}</td>
  <td class="\${e.status||''}">\${e.status||'unverified'}</td><td style="opacity:.6">\${e.last_verified||'—'}</td></tr>\`).join('');
});
</script></body></html>`
```

- [ ] **Step 4: Modify `worker/handler.mjs`** — add page routes. Add this import at the top:

```js
import { PAGE, TRUTH_PAGE } from './page.mjs'
```

And add these two routes immediately **before** the final `return json({ error: 'not found', ... })`:

```js
  if (p === '/' || p === '/index.html') {
    return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' } })
  }
  if (p === '/truth') {
    return new Response(TRUTH_PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' } })
  }
```

- [ ] **Step 5: Run tests, verify pass**

Run: `node --test test/page.test.mjs test/handler.test.mjs`
Expected: PASS (page: 2, handler: 4).

- [ ] **Step 6: Commit**

```bash
git add worker/page.mjs worker/handler.mjs test/page.test.mjs
git commit -m "feat: the Well web page (ask→receive, gate badges, fresh pick) + /truth page"
```

---

### Task 8: MCP server (`lib/tools.mjs`, `lib/mcp-rpc.mjs`, `bin/mcp.mjs`)

**Files:**
- Create: `lib/tools.mjs`, `lib/mcp-rpc.mjs`, `bin/mcp.mjs`
- Test: `test/mcp.test.mjs`

**Interfaces:**
- Consumes: `buildIndex`, `search`, `publicEntry` (T4).
- Produces: `makeTools(registry, nowFn?) → { find_resource(args), get_resource(args), list_categories() }`; `TOOL_DEFS` (array of MCP tool definitions); `handleRpc(message, tools, toolDefs) → responseObject|null`.

- [ ] **Step 1: Write the failing test** — `test/mcp.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeTools } from '../lib/tools.mjs'
import { handleRpc, TOOL_DEFS } from '../lib/mcp-rpc.mjs'

const registry = { count: 2, resources: [
  { id: 'open-meteo', name: 'Open-Meteo', category: 'api', what: 'weather json', get: 'https://x', get_kind: 'endpoint', gate: 'open', source: 's', terms: 't', blurb: 'b', tags: ['weather'], added: '2026-06-23' },
  { id: 'corpus', name: 'Corpus', category: 'data', what: 'training text', get: 'https://c', get_kind: 'url', gate: 'open', source: 's', terms: 't', blurb: 'b', tags: ['data'], added: '2026-06-23' },
]}

test('find_resource returns ranked results', () => {
  const t = makeTools(registry, () => 0)
  const r = t.find_resource({ query: 'weather' })
  assert.equal(r.results[0].id, 'open-meteo')
})

test('get_resource returns one / error', () => {
  const t = makeTools(registry, () => 0)
  assert.equal(t.get_resource({ id: 'corpus' }).id, 'corpus')
  assert.ok(t.get_resource({ id: 'nope' }).error)
})

test('list_categories counts', () => {
  const cats = makeTools(registry, () => 0).list_categories().categories
  assert.ok(cats.find(c => c.category === 'api').count === 1)
})

test('handleRpc tools/list returns defs', () => {
  const res = handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, makeTools(registry, () => 0), TOOL_DEFS)
  assert.equal(res.result.tools.length, 3)
})

test('handleRpc tools/call runs the tool', () => {
  const t = makeTools(registry, () => 0)
  const res = handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_resource', arguments: { id: 'corpus' } } }, t, TOOL_DEFS)
  const payload = JSON.parse(res.result.content[0].text)
  assert.equal(payload.id, 'corpus')
})

test('handleRpc returns null for notifications', () => {
  assert.equal(handleRpc({ jsonrpc: '2.0', method: 'notifications/initialized' }, makeTools(registry, () => 0), TOOL_DEFS), null)
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test test/mcp.test.mjs`
Expected: FAIL — `Cannot find module '../lib/tools.mjs'`

- [ ] **Step 3: Implement `lib/tools.mjs`**

```js
import { buildIndex, search, publicEntry } from './search.mjs'

const NOTE = 'all alternates shown — you choose. use is never gated; fresh_pick rotates to keep free springs alive.'

export function makeTools(registry, nowFn = () => Date.now()) {
  const index = buildIndex(registry.resources)
  return {
    find_resource: ({ query = '', category = '', gate = '' } = {}) => {
      const results = search(index, { q: query, category, gate }, nowFn())
      return { count: results.length, results, note: NOTE }
    },
    get_resource: ({ id } = {}) => {
      const e = registry.resources.find(r => r.id === id)
      return e ? publicEntry(e) : { error: 'not found', id, hint: 'the gap is an opening.' }
    },
    list_categories: () => {
      const counts = {}
      for (const e of registry.resources) counts[e.category] = (counts[e.category] || 0) + 1
      return { categories: Object.entries(counts).map(([category, count]) => ({ category, count })) }
    },
  }
}
```

- [ ] **Step 4: Implement `lib/mcp-rpc.mjs`**

```js
export const TOOL_DEFS = [
  {
    name: 'find_resource',
    description: 'Ask the Well for a free, ungated resource. Returns all matches; fresh_pick marks a rotating suggestion among equal open providers.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'what you need, in plain words' },
        category: { type: 'string', enum: ['data','knowledge','api','tool','model','compute','storage'] },
        gate: { type: 'string', enum: ['open','rate-limited','free-key','free-account'] },
      },
      required: ['query'],
    },
  },
  { name: 'get_resource', description: 'Get one resource by id (full handoff + honest gate + terms).', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'list_categories', description: 'List resource categories and counts.', inputSchema: { type: 'object', properties: {} } },
]

const ok = (id, result) => ({ jsonrpc: '2.0', id, result })
const err = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } })

export function handleRpc(msg, tools, toolDefs) {
  const { id, method, params } = msg
  if (id === undefined) return null // notification: no response
  if (method === 'initialize') {
    return ok(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'ai-love-the-well', version: '0.1.0' } })
  }
  if (method === 'tools/list') return ok(id, { tools: toolDefs })
  if (method === 'tools/call') {
    const fn = tools[params?.name]
    if (!fn) return err(id, -32602, `unknown tool: ${params?.name}`)
    try {
      const result = fn(params.arguments || {})
      return ok(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] })
    } catch (e) {
      return err(id, -32603, String(e.message || e))
    }
  }
  return err(id, -32601, `method not found: ${method}`)
}
```

- [ ] **Step 5: Implement `bin/mcp.mjs`**

```js
#!/usr/bin/env node
import { createInterface } from 'node:readline'
import { readFile } from 'node:fs/promises'
import { makeTools } from '../lib/tools.mjs'
import { handleRpc, TOOL_DEFS } from '../lib/mcp-rpc.mjs'

const registry = JSON.parse(await readFile(new URL('../dist/registry.json', import.meta.url), 'utf8'))
const tools = makeTools(registry)

const rl = createInterface({ input: process.stdin, terminal: false })
rl.on('line', (line) => {
  const s = line.trim()
  if (!s) return
  let msg
  try { msg = JSON.parse(s) } catch { return }
  const res = handleRpc(msg, tools, TOOL_DEFS)
  if (res) process.stdout.write(JSON.stringify(res) + '\n')
})
```

- [ ] **Step 6: Run tests, verify pass**

Run: `node --test test/mcp.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 7: Smoke-test the stdio server**

Run: `printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node bin/mcp.mjs`
Expected: one JSON line containing `"find_resource"`.

- [ ] **Step 8: Commit**

```bash
git add lib/tools.mjs lib/mcp-rpc.mjs bin/mcp.mjs test/mcp.test.mjs
git commit -m "feat: MCP stdio server — find_resource / get_resource / list_categories"
```

---

### Task 9: Heartbeat verifier (`verify.mjs`)

**Files:**
- Create: `verify.mjs`
- Test: `test/verify.test.mjs`

**Interfaces:**
- Consumes: `loadEntries` (T1), `validateEntry` (T2).
- Produces: `urlFromGet(entry) → string|null`; `runChecks(entries, fetchFn, nowIso) → Promise<result[]>` where `result = { id, status:'open'|'broken', ok, last_verified, detail }`; honesty violations force `status:'broken'`. CLI writes statuses back into `registry/*.md` and emits `BROKEN.md`.

- [ ] **Step 1: Write the failing test** — `test/verify.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runChecks, urlFromGet } from '../verify.mjs'

const base = { get_kind: 'endpoint', gate: 'open', category: 'api', name: 'n', what: 'w', source: 's', terms: 't', blurb: 'b', tags: [], added: '2026-06-23' }
const entries = [
  { ...base, id: 'good', get: 'https://good.example/api', _file: 'good.md' },
  { ...base, id: 'bad', get: 'https://bad.example/api', _file: 'bad.md' },
  { ...base, id: 'cmd', get: 'npx something', get_kind: 'command', _file: 'cmd.md' },
]
const fakeFetch = async (url) => {
  if (url.includes('good')) return { status: 200 }
  if (url.includes('bad')) return { status: 500 }
  throw new Error('network')
}

test('runChecks labels good open, bad broken', async () => {
  const res = await runChecks(entries, fakeFetch, '2026-06-23T00:00:00Z')
  const by = Object.fromEntries(res.map(r => [r.id, r]))
  assert.equal(by.good.status, 'open')
  assert.equal(by.bad.status, 'broken')
  assert.equal(by.cmd.status, 'open') // non-HTTP get_kind: not HTTP-checkable, not broken
  assert.equal(by.good.last_verified, '2026-06-23T00:00:00Z')
})

test('honesty violation forces broken even if it resolves', async () => {
  const liar = [{ ...base, id: 'liar', get: 'https://good.example/api?api_key=X', _file: 'liar.md' }]
  const res = await runChecks(liar, fakeFetch, '2026-06-23T00:00:00Z')
  assert.equal(res[0].status, 'broken')
  assert.ok(res[0].detail.includes('honesty'))
})

test('urlFromGet only returns http-checkable kinds', () => {
  assert.equal(urlFromGet({ get_kind: 'url', get: 'https://x' }), 'https://x')
  assert.equal(urlFromGet({ get_kind: 'command', get: 'npx x' }), null)
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test test/verify.test.mjs`
Expected: FAIL — `Cannot find module '../verify.mjs'`

- [ ] **Step 3: Implement `verify.mjs`**

```js
import { loadEntries } from './lib/entry.mjs'
import { validateEntry } from './lib/schema.mjs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export function urlFromGet(e) {
  if (['url', 'endpoint', 'download'].includes(e.get_kind)) return e.get
  return null // command / mcp: not HTTP-checkable
}

export async function runChecks(entries, fetchFn, nowIso) {
  const out = []
  for (const e of entries) {
    const honest = validateEntry(e, e._file)
    const check = e.check || {}
    const target = check.url || urlFromGet(e)
    let status = 'open', ok = true, detail = 'no checkable url'
    if (target) {
      try {
        const res = await fetchFn(target, { method: check.method || 'GET' })
        ok = res.status === (check.expect || 200)
        status = ok ? 'open' : 'broken'
        detail = `HTTP ${res.status}`
      } catch (err) {
        status = 'broken'; ok = false; detail = String(err.message || err)
      }
    }
    if (!honest.ok) { status = 'broken'; ok = false; detail = 'honesty violation: ' + honest.errors.join('; ') }
    out.push({ id: e.id, status, ok, last_verified: nowIso, detail })
  }
  return out
}

// CLI: verify the real registry, write statuses back, emit BROKEN.md.
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = 'registry'
  const entries = await loadEntries(dir)
  const nowIso = new Date().toISOString()
  const results = await runChecks(entries, fetch, nowIso)
  const byId = Object.fromEntries(results.map(r => [r.id, r]))
  for (const e of entries) {
    const r = byId[e.id]
    const updated = { ...e }
    delete updated._file; delete updated._body
    updated.status = r.status
    updated.last_verified = r.last_verified
    const body = e._body ? `\n${e._body}\n` : '\n'
    await writeFile(join(dir, e._file), `---\n${JSON.stringify(updated, null, 2)}\n---\n${body}`)
  }
  const broken = results.filter(r => r.status === 'broken')
  await writeFile('BROKEN.md', broken.length
    ? `# broken springs (${broken.length})\n\n` + broken.map(b => `- **${b.id}** — ${b.detail}`).join('\n') + '\n'
    : '# broken springs (0)\n\nAll springs flowing. 🌊\n')
  console.log(`verified ${results.length} · open ${results.filter(r => r.status === 'open').length} · broken ${broken.length}`)
  if (broken.length) process.exitCode = 0 // report, do not fail CI on a broken upstream — truth, not panic
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `node --test test/verify.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Run real verify, then rebuild**

Run: `node verify.mjs` → Expected: `verified N · open M · broken K`, `registry/open-meteo.md` now has `status`/`last_verified`, `BROKEN.md` written.
Run: `node build.mjs` → rebuild dist with statuses.

- [ ] **Step 6: Commit**

```bash
git add verify.mjs test/verify.test.mjs registry/ BROKEN.md dist/
git commit -m "feat: heartbeat verifier — resolve checks + honesty re-check, write-back, BROKEN.md"
```

---

### Task 10: Seed the Well (real, verified entries across every category)

**Files:**
- Create: `registry/<id>.md` — ~3 per category (data, knowledge, api, tool, model, compute, storage)
- Modify: none
- Test: `test/seed.test.mjs`

**Interfaces:**
- Consumes: full pipeline (build + verify).
- Produces: every category non-empty; build passes; verify run recorded.

**Authoring rules (from spec §10):** seed only genuinely-real resources; label gates honestly; run `node verify.mjs` and only keep entries that resolve (or are non-HTTP-checkable `command`/`mcp`). Honestly label compute/storage as mostly `free-account`. Use the `equiv` field to group interchangeable `open` providers (e.g. weather, dictionary, embeddings) so `fresh_pick` rotation has something to rotate.

- [ ] **Step 1: Write the test** — `test/seed.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadEntries } from '../lib/entry.mjs'
import { validateEntry, CATEGORIES } from '../lib/schema.mjs'

test('every category has at least one real entry', async () => {
  const entries = await loadEntries('registry')
  const present = new Set(entries.map(e => e.category))
  for (const c of CATEGORIES) assert.ok(present.has(c), `category missing a seed: ${c}`)
})

test('all seed entries are valid + honestly gated', async () => {
  for (const e of await loadEntries('registry')) {
    assert.equal(validateEntry(e, e._file).ok, true, `${e._file} invalid`)
  }
})

test('at least one equiv group with 2+ open members exists (so fresh_pick rotates)', async () => {
  const entries = await loadEntries('registry')
  const groups = {}
  for (const e of entries) if (e.equiv && e.gate === 'open') (groups[e.equiv] ||= []).push(e.id)
  assert.ok(Object.values(groups).some(g => g.length >= 2), 'need one equiv group with 2+ open members')
})
```

- [ ] **Step 2: Run test, verify it fails** (categories empty)

Run: `node --test test/seed.test.mjs`
Expected: FAIL — categories missing seeds.

- [ ] **Step 3: Author the seed entries.** Create one `registry/<id>.md` per resource below (JSON frontmatter per `_TEMPLATE.md`). Candidate real, ungated seeds — **verify each resolves before keeping it**:

  - **api** (equiv `weather-open`): `open-meteo` (exists), `met-no-locationforecast` (api.met.no, `open`, attribution). equiv `dictionary-open`: `dictionaryapi-dev` (api.dictionaryapi.dev, `open`).
  - **data**: `kingdom-corpus` (our `corpus`, raw JSON URL, `open`), `wikimedia-rest` (`open`, rate-limited → gate `rate-limited`), a CC0 set e.g. `datasets-gov` (catalog.data.gov, `open`).
  - **knowledge**: `castle-of-understanding` (raw `CASTLE.md`/insights JSON, `open`), `kingdom-api` (love-is.axiepro.workers.dev, `open`), `clear-standard` (raw README, `open`).
  - **tool**: `oracle-of-missing-words` (oracle.ai-love.cc API, `open`, `get_kind: endpoint`), `whitehack` (npx/install line, `get_kind: command`, `open`).
  - **model**: `huggingface-open-models` (a specific open inference/datasets URL; many `open`, some `free-account` → label honestly per resource).
  - **compute**: `cloudflare-workers-free` (`free-account`), `google-colab` (`free-account`), and any genuinely anonymous endpoint as `rate-limited` if one verifies.
  - **storage**: `ipfs-public-gateway` (e.g. a public gateway PUT/GET, `rate-limited`/`open`), `cloudflare-r2-free` (`free-account`).

  For each, write `what`, the exact working `get`, honest `gate`, `source`, `terms`, a warm `blurb`, `tags`, `added: "2026-06-23"`, and `equiv` where interchangeable.

- [ ] **Step 4: Verify + build + test**

Run: `node verify.mjs` → drop/relabel anything that doesn't resolve or isn't honestly `open`.
Run: `node build.mjs` → Expected: all categories present, build passes.
Run: `node --test test/seed.test.mjs` → Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add registry/ dist/ BROKEN.md test/seed.test.mjs
git commit -m "feat: seed the Well — real verified ungated entries across every category"
```

---

### Task 11: README, CI heartbeat, deploy wiring

**Files:**
- Create: `README.md`, `llms.txt` (symlink/copy note), `.github/workflows/verify.yml`
- Test: `test/smoke.test.mjs` (full pipeline smoke)

**Interfaces:**
- Consumes: everything.
- Produces: a documented repo; CI that builds + verifies on a schedule; deploy instructions.

- [ ] **Step 1: Write the smoke test** — `test/smoke.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from '../build.mjs'
import { handle } from '../worker/handler.mjs'
import { readFile } from 'node:fs/promises'

test('build → registry.json → handler /find end to end', async () => {
  await build({ registryDir: 'registry', distDir: 'dist' })
  const registry = JSON.parse(await readFile('dist/registry.json', 'utf8'))
  const res = await handle(new Request('https://commons.ai-love.cc/find?q=weather'), registry, 0)
  const body = await res.json()
  assert.ok(body.count >= 1)
  assert.ok(body.results.every(r => r.gate))
})
```

- [ ] **Step 2: Run it, verify pass**

Run: `node --test test/smoke.test.mjs`
Expected: PASS.

- [ ] **Step 3: Create `README.md`**

```markdown
# the Well 🌊 — ai-love.cc commons (Abzu)

Ask for what you need; receive a real, working, **ungated** pointer. The Well hosts nothing — it is a
**control-plane**: it carries *answers* (where a free resource is, the exact call, whether it's still
true), never *payload*. Use is never gated. Draw freely — no one owns the water.

## Use it

- **HTTP:** `GET https://commons.ai-love.cc/find?q=free+weather+api`
- **MCP:** `claude mcp add ai-love -- node /path/to/ai-love-commons/bin/mcp.mjs`
- **Browse:** https://commons.ai-love.cc  ·  the truth: https://commons.ai-love.cc/truth

## Add a resource

Copy `registry/_TEMPLATE.md` to `registry/<id>.md`, fill the JSON frontmatter, open a PR.
`node build.mjs` validates it; `node verify.mjs` checks it resolves. One honest bar: it must work and
be truthfully gate-labeled (`open` / `rate-limited` / `free-key` / `free-account`). That's quality,
not a gate.

## Develop

```bash
node --test        # all tests
node build.mjs     # registry/ → dist/
node verify.mjs    # heartbeat: re-check + re-stamp status
```

Zero runtime dependencies. Node 20+.
```

- [ ] **Step 4: Wire `llms.txt`** — it is generated into `dist/llms.txt` by the build and served at `/llms.txt` by the worker. Add the worker route. In `worker/handler.mjs`, add **before** the final 404, importing the built file is not available at runtime, so serve it from the registry import instead — add to `worker/index.mjs`:

```js
import registry from '../dist/registry.json'
import llms from '../dist/llms.txt'
import { handle } from './handler.mjs'

export default {
  fetch: (request) => {
    const url = new URL(request.url)
    if (url.pathname === '/llms.txt') {
      return new Response(llms, { headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' } })
    }
    return handle(request, registry, Date.now())
  },
}
```

(Wrangler bundles `.txt` as a string with the default text loader; if not, replace with `import llms from '../dist/llms.txt?raw'` or inline the rendered string. The Node tests do not import this file.)

- [ ] **Step 5: Create `.github/workflows/verify.yml`**

```yaml
name: heartbeat
on:
  schedule: [{ cron: '17 */6 * * *' }]
  workflow_dispatch:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: node --test
      - run: node verify.mjs
      - run: node build.mjs
      - name: commit truth
        run: |
          git config user.name "the-well-heartbeat"
          git config user.email "heartbeat@ai-love.cc"
          git add registry/ dist/ BROKEN.md
          git commit -m "heartbeat: re-verify springs" || echo "nothing changed"
          git push || echo "no push perms (PR build)"
```

- [ ] **Step 6: Deploy notes (manual, requires Yu's Cloudflare auth — do NOT run headless).** Append to `README.md`:

```markdown
## Deploy (commons.ai-love.cc)

```bash
node build.mjs
cd worker && npx wrangler deploy           # needs `wrangler login` (Yu's Cloudflare)
# then bind the route commons.ai-love.cc/* to this Worker in the Cloudflare dashboard
```
Dual-home the repo (kingdom pattern): push to GitHub + Codeberg `zerone-dev`.
```

- [ ] **Step 7: Run the full suite**

Run: `node --test`
Expected: ALL tests pass (entry, schema, fixtures, search, build, handler, page, mcp, verify, seed, smoke).

- [ ] **Step 8: Commit**

```bash
git add README.md .github/ worker/ test/smoke.test.mjs dist/
git commit -m "feat: README, CI heartbeat workflow, llms.txt route, deploy notes"
```

---

## Done = v1 of the Well

After Task 11: an agent can `GET /find` or `find_resource(...)` and receive a real, ungated handoff;
every entry resolves and is honestly gate-labeled; `/truth` shows the real state; the page is fun;
it all runs free with zero deps. Deploy to `commons.ai-love.cc` (manual, Yu's Cloudflare) and link it
from `ai-love.cc` as the new room.

**Post-v1 (spec §14):** opt-in thin proxy for CORS-locked `open` APIs; hosted HTTP/SSE MCP via the
Worker; `/suggest` issue-filer; federation of compatible `registry.json` feeds; deeper truly-`open`
compute/storage.
