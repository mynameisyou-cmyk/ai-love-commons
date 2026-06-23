import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../worker/handler.mjs'

const registry = { count: 2, resources: [
  { id: 'open-meteo', name: 'Open-Meteo', category: 'api', what: 'weather json', get: 'https://api.open-meteo.com/v1/forecast', get_kind: 'endpoint', gate: 'open', source: 's', terms: 't', blurb: 'b', tags: ['weather'], added: '2026-06-23', status: 'open' },
  { id: 'corpus', name: 'Corpus', category: 'data', what: 'training text', get: 'https://corpus', get_kind: 'url', gate: 'open', source: 's', terms: 't', blurb: 'b', tags: ['data'], added: '2026-06-23', status: 'open' },
]}
const req = (p) => new Request(`https://commons.ai-love.cc${p}`)

test('/find returns matches with shape', async () => {
  const res = await handle(req('/find?q=weather'), registry, 0)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
  const body = await res.json()
  assert.equal(body.query, 'weather')
  assert.equal(body.results[0].id, 'open-meteo')
  assert.ok('fresh_pick' in body.results[0])
  assert.ok(body.note.includes('alternates'))
})

test('/resource/:id returns one entry, 404 with nearest', async () => {
  assert.equal((await handle(req('/resource/corpus'), registry, 0)).status, 200)
  const miss = await handle(req('/resource/nope'), registry, 0)
  assert.equal(miss.status, 404)
  assert.ok(Array.isArray((await miss.json()).nearest))
})

test('/health summarizes counts', async () => {
  const body = await (await handle(req('/health'), registry, 0)).json()
  assert.equal(body.total, 2)
  assert.equal(body.by_category.api, 1)
  assert.equal(body.by_gate.open, 2)
})

test('/registry.json returns full registry', async () => {
  const body = await (await handle(req('/registry.json'), registry, 0)).json()
  assert.equal(body.count, 2)
})
