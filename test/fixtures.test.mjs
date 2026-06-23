import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { loadEntries, parseEntryFile } from '../lib/entry.mjs'
import { validateEntry } from '../lib/schema.mjs'

test('registry loads and every real entry is valid', async () => {
  const entries = await loadEntries('registry')
  assert.ok(entries.length >= 1)
  for (const e of entries) {
    const r = validateEntry(e, e._file)
    assert.equal(r.ok, true, `${e._file}: ${r.errors.join('; ')}`)
  }
})

test('the dishonest fixture is rejected', async () => {
  const text = await readFile('registry/_fixtures/dishonest-open.md', 'utf8')
  const { frontmatter } = parseEntryFile(text)
  const r = validateEntry(frontmatter, 'dishonest-open.md')
  assert.equal(r.ok, false)
  assert.ok(r.errors.some(e => e.includes('dishonest')))
})
