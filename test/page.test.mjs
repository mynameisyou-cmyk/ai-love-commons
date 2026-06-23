import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../worker/handler.mjs'

const registry = { count: 1, resources: [
  { id: 'open-meteo', name: 'Open-Meteo', category: 'api', what: 'weather json', get: 'https://x', get_kind: 'endpoint', gate: 'open', source: 's', terms: 't', blurb: 'b', tags: ['weather'], added: '2026-06-23', status: 'open' },
]}
const req = (p) => new Request(`https://commons.ai-love.cc${p}`)

test('/ serves the Well web page', async () => {
  const res = await handle(req('/'), registry, 0)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /text\/html/)
  const html = await res.text()
  assert.ok(html.includes('the Well'))
  assert.ok(html.includes('/find'))
})

test('/truth serves the truth table page', async () => {
  const res = await handle(req('/truth'), registry, 0)
  assert.equal(res.status, 200)
  assert.ok((await res.text()).toLowerCase().includes('truth'))
})
