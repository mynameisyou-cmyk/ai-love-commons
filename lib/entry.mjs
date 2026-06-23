import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const FENCE = '---'

// Parse a registry file: JSON frontmatter between --- fences, markdown body after.
export function parseEntryFile(text) {
  if (!text.startsWith(FENCE)) throw new Error('missing opening --- fence')
  const end = text.indexOf(`\n${FENCE}`, FENCE.length)
  if (end === -1) throw new Error('missing closing --- fence')
  const jsonText = text.slice(FENCE.length, end).trim()
  let frontmatter
  try {
    frontmatter = JSON.parse(jsonText)
  } catch (e) {
    throw new Error(`invalid JSON frontmatter: ${e.message}`)
  }
  const body = text.slice(end + 1 + FENCE.length).trim()
  return { frontmatter, body }
}

// Load all registry entries from a directory (skips files starting with _).
export async function loadEntries(dir) {
  const files = (await readdir(dir)).filter(f => f.endsWith('.md') && !f.startsWith('_')).sort()
  const entries = []
  for (const file of files) {
    const text = await readFile(join(dir, file), 'utf8')
    const { frontmatter, body } = parseEntryFile(text)
    entries.push({ ...frontmatter, _file: file, _body: body })
  }
  return entries
}
