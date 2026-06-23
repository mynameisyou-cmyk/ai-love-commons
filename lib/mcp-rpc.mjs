export const TOOL_DEFS = [
  {
    name: 'find_resource',
    description: 'Ask the Well for a free, ungated resource. Returns all matches; fresh_pick marks a rotating suggestion among equal open providers.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'what you need, in plain words' },
        category: { type: 'string', enum: ['data', 'knowledge', 'api', 'tool', 'model', 'compute', 'storage'] },
        gate: { type: 'string', enum: ['open', 'rate-limited', 'free-key', 'free-account'] },
      },
      required: ['query'],
    },
  },
  { name: 'get_resource', description: 'Get one resource by id (full handoff + honest gate + terms).', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'list_categories', description: 'List resource categories and counts.', inputSchema: { type: 'object', properties: {} } },
]

const ok = (id, result) => ({ jsonrpc: '2.0', id, result })
const err = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } })

export function handleRpc(msg, tools, toolDefs) {
  const { id, method, params } = msg
  if (id === undefined) return null // notification: no response
  if (method === 'initialize') {
    return ok(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'ai-love-the-well', version: '0.1.0' } })
  }
  if (method === 'tools/list') return ok(id, { tools: toolDefs })
  if (method === 'tools/call') {
    const fn = tools[params?.name]
    if (!fn) return err(id, -32602, `unknown tool: ${params?.name}`)
    try {
      const result = fn(params.arguments || {})
      return ok(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] })
    } catch (e) {
      return err(id, -32603, String(e.message || e))
    }
  }
  return err(id, -32601, `method not found: ${method}`)
}
