import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build, renderLlms } from '../build.mjs'

async function fixtureRepo(entries) {
  const root = await mkdtemp(join(tmpdir(), 'well-'))
  const reg = join(root, 'registry')
  await mkdir(reg, { recursive: true })
  for (const e of entries) await writeFile(join(reg, `${e.id}.md`), `---\n${JSON.stringify(e)}\n---\n`)
  return root
}

const valid = {
  id: 'open-meteo', name: 'Open-Meteo', category: 'api', what: 'weather json no key',
  get: 'https://api.open-meteo.com/v1/forecast?latitude=1&longitude=1&current=temperature_2m',
  get_kind: 'endpoint', gate: 'open', source: 'open-meteo.com', terms: 'https://open-meteo.com/en/license',
  blurb: 'ask the sky', tags: ['weather'], added: '2026-06-23',
}

test('build writes registry.json, llms.txt, by-category', async () => {
  const root = await fixtureRepo([valid])
  const r = await build({ registryDir: join(root, 'registry'), distDir: join(root, 'dist') })
  assert.equal(r.count, 1)
  const reg = JSON.parse(await readFile(join(root, 'dist/registry.json'), 'utf8'))
  assert.equal(reg.count, 1)
  assert.equal(reg.resources[0].id, 'open-meteo')
  assert.ok(!('_file' in reg.resources[0]))
  const llms = await readFile(join(root, 'dist/llms.txt'), 'utf8')
  assert.ok(llms.includes('Open-Meteo'))
  const cat = JSON.parse(await readFile(join(root, 'dist/by-category/api.json'), 'utf8'))
  assert.equal(cat.count, 1)
  await rm(root, { recursive: true, force: true })
})

test('build FAILS on a dishonest entry', async () => {
  const liar = { ...valid, id: 'liar', get: 'https://x.com/v1?api_key=SECRET' }
  const root = await fixtureRepo([liar])
  await assert.rejects(() => build({ registryDir: join(root, 'registry'), distDir: join(root, 'dist') }), /dishonest|failed/)
  await rm(root, { recursive: true, force: true })
})

test('renderLlms lists name, category, gate', () => {
  const out = renderLlms([valid])
  assert.ok(out.includes('[Open-Meteo] (api, open)'))
})
