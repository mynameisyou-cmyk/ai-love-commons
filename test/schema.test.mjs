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
