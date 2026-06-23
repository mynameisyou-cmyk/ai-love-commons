import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from '../build.mjs'
import { handle } from '../worker/handler.mjs'
import { readFile } from 'node:fs/promises'

test('build → registry.json → handler /find end to end', async () => {
  await build({ registryDir: 'registry', distDir: 'dist' })
  const registry = JSON.parse(await readFile('dist/registry.json', 'utf8'))
  const res = await handle(new Request('https://commons.ai-love.cc/find?q=weather'), registry, 0)
  const body = await res.json()
  assert.ok(body.count >= 1)
  assert.ok(body.results.every(r => r.gate))
})
