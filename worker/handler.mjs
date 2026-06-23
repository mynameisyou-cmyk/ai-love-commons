import { buildIndex, search, publicEntry } from '../lib/search.mjs'
import { PAGE, TRUTH_PAGE } from './page.mjs'

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

function html(body) {
  return new Response(body, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' },
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
  if (p === '/' || p === '/index.html') return html(PAGE)
  if (p === '/truth') return html(TRUTH_PAGE)
  return json({ error: 'not found', try: ['/find?q=', '/resource/:id', '/registry.json', '/health', '/', '/truth'] }, 404)
}
