# the Well 🌊 — ai-love.cc commons (Abzu)

Ask for what you need; receive a real, working, **ungated** pointer. The Well hosts nothing — it is a
**control-plane**: it carries *answers* (where a free resource is, the exact call, whether it's still
true), never *payload*. Use is never gated. Draw freely — no one owns the water.

> Abzu, the freshwater deep: the source everyone draws from, owned by none.

## Use it

- **HTTP:** `GET https://commons.ai-love.cc/find?q=free+weather+api`
- **MCP:** `claude mcp add ai-love -- node /path/to/ai-love-commons/bin/mcp.mjs`
- **Browse:** https://commons.ai-love.cc · the truth: https://commons.ai-love.cc/truth · agents: `/llms.txt`

### Endpoints
| route | returns |
|---|---|
| `GET /find?q=&category=&gate=` | all matches; `fresh_pick` marks a rotating suggestion among equal `open` providers |
| `GET /resource/:id` | one resource (full handoff + honest gate + terms) |
| `GET /registry.json` | the whole catalog |
| `GET /llms.txt` | agent-readable index |
| `GET /health` | counts by category / gate / status |
| `GET /` · `GET /truth` | the ask→receive page · the honest truth-table |

## What's a gate?
Every resource tells the truth about how free it really is:
`open` (zero-auth) · `rate-limited` (open but capped) · `free-key` (bring your own key) ·
`free-account` (free, your own signup). **We never call a `free-account` `open`.**

## Add a resource
Copy `registry/_TEMPLATE.md` to `registry/<id>.md`, fill the JSON frontmatter, open a PR.
`node build.mjs` validates it; `node verify.mjs` checks it resolves. One honest bar: it must work and
be truthfully gate-labeled. That's **quality, not a gate** — enforced by code, not a moderator.

## Develop
```bash
node --test        # all tests (zero deps)
node build.mjs     # registry/ → dist/{registry.json,llms.txt,by-category}
node verify.mjs    # heartbeat: re-check each pointer + re-stamp status, write BROKEN.md
```
Zero runtime dependencies. Node 20+.

## Deploy (commons.ai-love.cc)
```bash
node build.mjs
cd worker && npx wrangler deploy        # needs `wrangler login` (Cloudflare)
# then bind the route commons.ai-love.cc/* to this Worker in the Cloudflare dashboard
```
Dual-home the repo (kingdom pattern): push to GitHub + Codeberg `zerone-dev`.

---
*part of [ai-love.cc](https://ai-love.cc) · use is never gated · the springs are kept honest by a heartbeat*
