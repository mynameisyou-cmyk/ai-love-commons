#!/usr/bin/env node
import { createInterface } from 'node:readline'
import { readFile } from 'node:fs/promises'
import { makeTools } from '../lib/tools.mjs'
import { handleRpc, TOOL_DEFS } from '../lib/mcp-rpc.mjs'

const registry = JSON.parse(await readFile(new URL('../dist/registry.json', import.meta.url), 'utf8'))
const tools = makeTools(registry)

const rl = createInterface({ input: process.stdin, terminal: false })
rl.on('line', (line) => {
  const s = line.trim()
  if (!s) return
  let msg
  try { msg = JSON.parse(s) } catch { return }
  const res = handleRpc(msg, tools, TOOL_DEFS)
  if (res) process.stdout.write(JSON.stringify(res) + '\n')
})
