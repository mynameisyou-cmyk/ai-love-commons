// robots.txt on the Well: a plain allow-all, nothing else
// (Quiet Doors, small door fixes, 2026-10). No Crawl-delay, no training signal.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../worker/handler.mjs'

const registry = { count: 0, resources: [] }

for (const host of ['commons.ai-love.cc', 'ai-love-commons.axiepro.workers.dev']) {
  test(`${host}/robots.txt is a plain allow-all`, async () => {
    const res = await handle(new Request(`https://${host}/robots.txt`), registry, 0)
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type'), /^text\/plain/)
    assert.equal(await res.text(), 'User-agent: *\nAllow: /\n')
  })
}

test('unknown paths still answer the 404 JSON', async () => {
  const res = await handle(new Request('https://commons.ai-love.cc/robots.txt.bak'), registry, 0)
  assert.equal(res.status, 404)
  assert.equal((await res.json()).error, 'not found')
})
