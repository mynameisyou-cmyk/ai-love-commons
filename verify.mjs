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
  const heartbeatFetch = (url, opts = {}) => fetch(url, {
    ...opts,
    redirect: 'follow',
    headers: { 'user-agent': 'the-well-heartbeat/0.1 (+https://commons.ai-love.cc)', ...(opts.headers || {}) },
    signal: AbortSignal.timeout(12000),
  })
  const results = await runChecks(entries, heartbeatFetch, nowIso)
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
  for (const b of broken) console.log(`  broken: ${b.id} — ${b.detail}`)
}
