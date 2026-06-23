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
