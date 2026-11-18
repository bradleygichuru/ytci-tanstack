#!/usr/bin/env node
/**
 * Static fixture server for the Playwright verification smoke.
 *
 * Owns a single, explicit port. Refuses to start if the port is taken rather
 * than attaching to whatever else is listening there.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { extname, join, normalize, sep } from 'node:path'

const PORT = Number(process.env.VERIFY_PORT ?? 3210)
const HOST = process.env.VERIFY_HOST ?? '127.0.0.1'
const ROOT = fileURLToPath(new URL('./fixture/', import.meta.url))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', ...headers })
  res.end(body)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`)

  if (url.pathname === '/health') {
    return send(res, 200, 'ok', { 'content-type': 'application/json' })
  }

  const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1))
  const filePath = normalize(join(ROOT, relative))

  if (!filePath.startsWith(ROOT.endsWith(sep) ? ROOT : `${ROOT}${sep}`)) {
    return send(res, 403, 'forbidden')
  }

  try {
    const body = await readFile(filePath)
    res.writeHead(200, {
      'content-type': MIME[extname(filePath)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    })
    res.end(body)
  } catch (error) {
    if (error && error.code === 'ENOENT') return send(res, 404, 'not found')
    return send(res, 500, 'fixture server error')
  }
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `verify fixture: ${HOST}:${PORT} is already in use. Another verification run owns it; ` +
        'do not reuse it. Stop that run or choose VERIFY_PORT.',
    )
  } else {
    console.error('verify fixture: server error', error)
  }
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  console.log(`verify fixture: http://${HOST}:${PORT}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
