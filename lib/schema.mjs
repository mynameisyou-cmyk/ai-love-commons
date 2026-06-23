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
