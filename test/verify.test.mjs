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
