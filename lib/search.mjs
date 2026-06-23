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
