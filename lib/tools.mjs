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
