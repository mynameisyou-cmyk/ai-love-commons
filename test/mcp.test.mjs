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
