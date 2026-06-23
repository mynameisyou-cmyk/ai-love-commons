import registry from '../dist/registry.json'
import llms from '../dist/llms.txt'
import { handle } from './handler.mjs'

export default {
  fetch: (request) => {
    const url = new URL(request.url)
    if (url.pathname === '/llms.txt') {
      return new Response(llms, { headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' } })
    }
    return handle(request, registry, Date.now())
  },
}
