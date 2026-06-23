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
