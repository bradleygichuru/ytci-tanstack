/**
 * CORS proxy for live verification — ticket #368.
 *
 * The admin contracts client sends `credentials: 'include'`; the contracts
 * mock answers `Access-Control-Allow-Origin: *`, which browsers reject for
 * credentialed requests. This proxy forwards to the mock and returns a
 * single-origin CORS answer plus credentials, so the real app can read the
 * frozen fixtures without changing product code.
 *
 *   node e2e/verify/tools/cors-proxy.mjs --listen 8108 --target 8109 \
 *     --origin http://127.0.0.1:3218
 */
import { createServer } from 'node:http'

const args = new Map()
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1])
}
const LISTEN = Number(args.get('listen') ?? 8108)
const TARGET = Number(args.get('target') ?? 8109)
const ORIGIN = args.get('origin') ?? 'http://127.0.0.1:3218'

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade'])

createServer(async (req, res) => {
  const cors = {
    'access-control-allow-origin': req.headers.origin === ORIGIN ? ORIGIN : ORIGIN,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'Authorization, Content-Type, Idempotency-Key, X-Fixture-State',
    'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'access-control-expose-headers':
      'X-Contract-Version, X-Data-Stale, X-Fixture-Route, X-Fixture-State, X-Fixture-State-Fallback',
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    res.end()
    return
  }

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks)

  try {
    const upstream = await fetch(`http://127.0.0.1:${TARGET}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: body.length ? body : undefined,
    })
    const headers = {}
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key) && key !== 'access-control-allow-origin') headers[key] = value
    })
    const payload = Buffer.from(await upstream.arrayBuffer())
    res.writeHead(upstream.status, { ...headers, ...cors })
    res.end(payload)
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json', ...cors })
    res.end(JSON.stringify({ error: { code: 'UPSTREAM', message: String(error) } }))
  }
}).listen(LISTEN, '127.0.0.1', () => {
  console.log(`cors proxy ${ORIGIN} -> :${LISTEN} -> :${TARGET}`)
})
