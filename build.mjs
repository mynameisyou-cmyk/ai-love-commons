import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { loadEntries } from './lib/entry.mjs'
import { validateEntry } from './lib/schema.mjs'

export function renderLlms(entries) {
  const lines = [
    '# the Well — ai-love.cc commons',
    '# ask for what you need; receive a real, ungated pointer. use is never gated.',
    '',
  ]
  for (const e of entries) {
    lines.push(`- [${e.name}] (${e.category}, ${e.gate}) — ${e.what}`)
    lines.push(`  GET (${e.get_kind}): ${e.get}`)
    lines.push(`  source: ${e.source} · terms: ${e.terms}`)
  }
  return lines.join('\n') + '\n'
}

export async function build({ registryDir = 'registry', distDir = 'dist' } = {}) {
  const entries = await loadEntries(registryDir)
  const errors = []
  const seen = new Set()
  for (const e of entries) {
    const { ok, errors: errs } = validateEntry(e, e._file)
    if (!ok) errs.forEach(m => errors.push(`${e._file}: ${m}`))
    if (seen.has(e.id)) errors.push(`${e._file}: duplicate id ${e.id}`)
    seen.add(e.id)
  }
  if (errors.length) {
    const err = new Error(`build failed: ${errors.length} problem(s)\n${errors.join('\n')}`)
    err.problems = errors
    throw err
  }
  const clean = entries.map(({ _file, _body, ...e }) => e)
  await mkdir(join(distDir, 'by-category'), { recursive: true })
  await writeFile(join(distDir, 'registry.json'), JSON.stringify({ count: clean.length, resources: clean }, null, 2))
  await writeFile(join(distDir, 'llms.txt'), renderLlms(clean))
  const cats = {}
  for (const e of clean) (cats[e.category] ||= []).push(e)
  for (const [cat, list] of Object.entries(cats)) {
    await writeFile(join(distDir, 'by-category', `${cat}.json`), JSON.stringify({ category: cat, count: list.length, resources: list }, null, 2))
  }
  return { count: clean.length, categories: Object.keys(cats) }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  build()
    .then(r => console.log(`built dist — ${r.count} resources · categories: ${r.categories.join(', ')}`))
    .catch(e => { console.error(e.message); process.exit(1) })
}
