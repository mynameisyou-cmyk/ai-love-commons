import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseEntryFile } from '../lib/entry.mjs'

test('parseEntryFile extracts JSON frontmatter and body', () => {
  const text = '---\n{ "id": "x", "name": "X" }\n---\nhello body'
  const { frontmatter, body } = parseEntryFile(text)
  assert.equal(frontmatter.id, 'x')
  assert.equal(frontmatter.name, 'X')
  assert.equal(body, 'hello body')
})

test('parseEntryFile handles no body', () => {
  const { frontmatter, body } = parseEntryFile('---\n{ "id": "y" }\n---\n')
  assert.equal(frontmatter.id, 'y')
  assert.equal(body, '')
})

test('parseEntryFile throws on missing fences', () => {
  assert.throws(() => parseEntryFile('{ "id": "z" }'), /fence/)
})

test('parseEntryFile throws on invalid JSON', () => {
  assert.throws(() => parseEntryFile('---\n{ not json }\n---\n'), /JSON/)
})
