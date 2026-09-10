/**
 * Local path gateway in front of both Vite apps.
 *
 *   /operation  → Operation  (4011)
 *   /management → Management (4010)
 *   /v1 /v2 /api /mock → same Vite process as the Referer app
 *
 * Usage:
 *   node scripts/ngrok-gateway.mjs
 */
import http from 'node:http'
import net from 'node:net'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'trailers',
  'transfer-encoding',
  'upgrade'
])

export function loadGatewayConfig() {
  const file = join(root, 'ngrok.config.json')
  const cfg = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
  const ports = cfg.ports || {}
  return {
    listenHost: cfg.gatewayHost || '127.0.0.1',
    listenPort: Number(cfg.gatewayPort) || 4020,
    managementPort: Number(ports.Management) || 4010,
    operationPort: Number(ports.Operation) || 4011
  }
}

function pathnameOf(url) {
  const path = String(url || '/').split('?')[0]
  return path || '/'
}

function copyHeaders(source, { skipHopByHop = true } = {}) {
  const headers = {}
  for (const [key, value] of Object.entries(source || {})) {
    if (value == null) continue
    if (skipHopByHop && HOP_BY_HOP.has(key.toLowerCase())) continue
    headers[key] = value
  }
  return headers
}

function portOpen(port, host = '127.0.0.1') {
  return new Promise((resolveOpen) => {
    const socket = net.connect({ port, host }, () => {
      socket.end()
      resolveOpen(true)
    })
    socket.on('error', () => resolveOpen(false))
  })
}

function landingPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>超能后台</title>
  <style>
    body { font-family: sans-serif; max-width: 40rem; margin: 12vh auto; padding: 0 1.5rem; line-height: 1.5; }
    a { display: block; margin: 0.75rem 0; font-size: 1.1rem; }
    .hint { color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>超能后台</h1>
  <p class="hint">同一条 ngrok 隧道，用路径区分两端。</p>
  <a href="/operation">运营端 /operation</a>
  <a href="/management">代理端 /management</a>
</body>
</html>`
}

export function resolveUpstream(req, cfg) {
  const path = pathnameOf(req.url)
  if (path === '/management' || path.startsWith('/management/')) {
    return { port: cfg.managementPort, name: 'Management', base: '/management' }
  }
  if (path === '/operation' || path.startsWith('/operation/')) {
    return { port: cfg.operationPort, name: 'Operation', base: '/operation' }
  }

  const apiPrefixes = ['/v1', '/v2', '/api', '/mock']
  if (apiPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    const referer = String(req.headers.referer || '')
    if (referer.includes('/management')) {
      return { port: cfg.managementPort, name: 'Management', base: '/management' }
    }
    return { port: cfg.operationPort, name: 'Operation', base: '/operation' }
  }

  return null
}

function proxyHttp(req, res, cfg, target) {
  const headers = copyHeaders(req.headers)
  headers['x-forwarded-host'] = req.headers.host || ''
  headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || 'http'

  const upstream = http.request(
    {
      hostname: '127.0.0.1',
      port: target.port,
      path: req.url,
      method: req.method,
      headers,
      timeout: 120_000
    },
    (incoming) => {
      const outHeaders = copyHeaders(incoming.headers)
      res.writeHead(incoming.statusCode || 502, outHeaders)
      incoming.pipe(res)
    }
  )

  upstream.on('timeout', () => {
    upstream.destroy()
    if (!res.headersSent) {
      res.writeHead(504, { 'content-type': 'text/plain; charset=utf-8' })
    }
    res.end(`网关等待 ${target.name} 127.0.0.1:${target.port} 超时`)
  })

  upstream.on('error', (error) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
    }
    res.end(
      `网关无法连接 ${target.name}（127.0.0.1:${target.port}）。请先启动 pnpm ${
        target.name === 'Management' ? 'dev:m' : 'dev:o'
      }\n${error.message}`
    )
  })

  req.pipe(upstream)
}

function proxyUpgrade(req, clientSocket, head, target) {
  const headers = copyHeaders(req.headers, { skipHopByHop: false })
  const proxySocket = net.connect(target.port, '127.0.0.1', () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`]
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        for (const item of value) lines.push(`${key}: ${item}`)
      } else {
        lines.push(`${key}: ${value}`)
      }
    }
    lines.push('', '')
    proxySocket.write(lines.join('\r\n'))
    if (head && head.length) proxySocket.write(head)
    proxySocket.pipe(clientSocket)
    clientSocket.pipe(proxySocket)
  })

  const fail = () => {
    try {
      clientSocket.destroy()
    } catch {
      /* ignore */
    }
    try {
      proxySocket.destroy()
    } catch {
      /* ignore */
    }
  }

  proxySocket.on('error', fail)
  clientSocket.on('error', fail)
}

export function startGateway(options = {}) {
  const cfg = { ...loadGatewayConfig(), ...options }
  const server = http.createServer(async (req, res) => {
    const path = pathnameOf(req.url)

    if (path === '/' || path === '') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(landingPage())
      return
    }

    if (path === '/__gateway') {
      const [management, operation] = await Promise.all([
        portOpen(cfg.managementPort),
        portOpen(cfg.operationPort)
      ])
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(
        JSON.stringify(
          {
            ok: management && operation,
            management: { port: cfg.managementPort, up: management, path: '/management' },
            operation: { port: cfg.operationPort, up: operation, path: '/operation' }
          },
          null,
          2
        )
      )
      return
    }

    const target = resolveUpstream(req, cfg)
    if (!target) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Not found. Use /operation or /management')
      return
    }

    proxyHttp(req, res, cfg, target)
  })

  server.on('upgrade', (req, socket, head) => {
    const target = resolveUpstream(req, cfg)
    if (!target) {
      socket.destroy()
      return
    }
    proxyUpgrade(req, socket, head, target)
  })

  return new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(cfg.listenPort, cfg.listenHost, () => {
      server.off('error', rejectListen)
      console.log(`[ngrok-gateway] http://${cfg.listenHost}:${cfg.listenPort}`)
      console.log(
        `[ngrok-gateway] /operation  → 127.0.0.1:${cfg.operationPort}  运营端`
      )
      console.log(
        `[ngrok-gateway] /management → 127.0.0.1:${cfg.managementPort}  代理端`
      )
      resolveListen({ server, ...cfg })
    })
  })
}

const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()

if (isDirectRun) {
  try {
    const started = await startGateway()
    const shutdown = () => {
      started.server.close(() => process.exit(0))
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      const cfg = loadGatewayConfig()
      console.error(
        `[ngrok-gateway] ${cfg.listenHost}:${cfg.listenPort} 已被占用，可能网关已在运行`
      )
    } else {
      console.error(error)
    }
    process.exit(1)
  }
}
