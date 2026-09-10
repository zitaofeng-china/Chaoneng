/**
 * Start Vite (optional) and an ngrok HTTPS tunnel.
 *
 *   pnpm dev:o / pnpm dev:m     local only, no ngrok
 *   pnpm ngrok:o / pnpm ngrok:m start that app + ngrok
 *   pnpm ngrok                  start both apps + one tunnel (path split)
 *
 * Free ngrok allows one agent / one domain. ngrok:m and ngrok:o share the
 * path gateway (4020) and reuse an already-running agent on 4041.
 *
 * Credentials: set NGROK_AUTHTOKEN in .env.ngrok (see ngrok.env.example).
 * Domain / ports: ngrok.config.json
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import net from 'node:net'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGatewayConfig, startGateway } from './ngrok-gateway.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_WAIT_MS = 45_000
const viteChildren = []

function loadEnvFile(file) {
  if (!existsSync(file)) return
  const text = readFileSync(file, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value
    }
  }
}

function loadJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function parseArgs(argv) {
  const out = { system: null, port: null, wait: true, gateway: null, withDev: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--system' || arg === '-s') {
      out.system = argv[++i]
    } else if (arg.startsWith('--system=')) {
      out.system = arg.slice('--system='.length)
    } else if (arg === '--port' || arg === '-p') {
      out.port = Number(argv[++i])
    } else if (arg.startsWith('--port=')) {
      out.port = Number(arg.slice('--port='.length))
    } else if (arg === '--gateway') {
      out.gateway = true
    } else if (arg === '--no-gateway') {
      out.gateway = false
    } else if (arg === '--with-dev') {
      out.withDev = true
    } else if (arg === '--no-wait') {
      out.wait = false
    } else if (arg === '--help' || arg === '-h') {
      out.help = true
    }
  }
  return out
}

function normalizeSystem(value) {
  if (!value) return null
  const raw = String(value).trim()
  const lower = raw.toLowerCase()
  if (lower === 'm' || lower === 'management') return 'Management'
  if (lower === 'o' || lower === 'operation') return 'Operation'
  if (raw === 'Management' || raw === 'Operation') return raw
  return null
}

function findNgrokBin() {
  const candidates = []
  if (process.env.NGROK_BIN) candidates.push(process.env.NGROK_BIN)
  if (process.platform === 'win32') {
    if (process.env.LOCALAPPDATA) {
      candidates.push(join(process.env.LOCALAPPDATA, 'ngrok', 'ngrok.exe'))
    }
    candidates.push(join(homedir(), 'AppData', 'Local', 'ngrok', 'ngrok.exe'))
    candidates.push(join(homedir(), 'ngrok', 'ngrok.exe'))
  } else {
    candidates.push('/usr/local/bin/ngrok')
    candidates.push(join(homedir(), 'ngrok', 'ngrok'))
  }
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate
  }
  return process.platform === 'win32' ? 'ngrok.exe' : 'ngrok'
}

function isPortOpen(port) {
  return new Promise((resolveOpen) => {
    const socket = net.connect({ port, host: '127.0.0.1' }, () => {
      socket.end()
      resolveOpen(true)
    })
    socket.on('error', () => resolveOpen(false))
  })
}

function waitForPort(port, timeoutMs) {
  const started = Date.now()
  return new Promise((resolveWait, rejectWait) => {
    const tryOnce = () => {
      const socket = net.connect({ port, host: '127.0.0.1' }, () => {
        socket.end()
        resolveWait(true)
      })
      socket.on('error', () => {
        if (Date.now() - started >= timeoutMs) {
          rejectWait(new Error(`localhost:${port} 在 ${timeoutMs / 1000}s 内未就绪`))
          return
        }
        setTimeout(tryOnce, 400)
      })
    }
    tryOnce()
  })
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

function killChild(child) {
  if (!child || child.killed || child.pid == null) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true
    })
    return
  }
  child.kill('SIGTERM')
}

function spawnVite(system) {
  const script = system === 'Management' ? 'dev:m' : 'dev:o'
  console.log(`[ngrok] 启动 ${script}（带 ngrok HMR）`)
  return spawn('pnpm', [script], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      NGROK: '1'
    },
    shell: true,
    windowsHide: true
  })
}

async function ensureVite(system, port) {
  if (await isPortOpen(port)) {
    console.log(`[ngrok] ${system} 已在 127.0.0.1:${port}，跳过 Vite 启动`)
    return
  }
  const child = spawnVite(system)
  viteChildren.push(child)
  child.on('exit', (code, signal) => {
    if (signal) return
    if (code) {
      console.error(`[ngrok] ${system} Vite 退出 code=${code}`)
    }
  })
}

function readWebAddr(configPath) {
  try {
    const text = readFileSync(configPath, 'utf8')
    const match = text.match(/^\s*web_addr:\s*(\S+)/m)
    if (match) return match[1].replace(/^['"]|['"]$/g, '')
  } catch {
    /* default below */
  }
  return '127.0.0.1:4041'
}

function inspectorPortOf(webAddr) {
  const hostPort = String(webAddr).split('//').pop()
  const port = Number(hostPort.split(':').pop())
  return Number.isFinite(port) ? port : 4041
}

async function fetchTunnels(webAddr) {
  try {
    const res = await fetch(`http://${webAddr}/api/tunnels`, {
      signal: AbortSignal.timeout(2000)
    })
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data.tunnels) ? data.tunnels : []
  } catch {
    return null
  }
}

async function waitForTunnels(webAddr, { retries = 20, delayMs = 250 } = {}) {
  for (let i = 0; i < retries; i++) {
    const tunnels = await fetchTunnels(webAddr)
    if (tunnels) return tunnels
    if (i < retries - 1) await sleep(delayMs)
  }
  return null
}

function waitChildren(children) {
  const live = children.filter((child) => child && child.exitCode == null && !child.killed)
  if (!live.length) return Promise.resolve()
  return new Promise((resolveWait) => {
    let remaining = live.length
    for (const child of live) {
      child.on('exit', () => {
        remaining -= 1
        if (remaining <= 0) resolveWait()
      })
    }
  })
}

function printHelp() {
  console.log(`本地开发不走 ngrok：
  pnpm dev:o              运营端
  pnpm dev:m              代理端

带 ngrok 启动：
  pnpm ngrok:o            运营端 + ngrok
  pnpm ngrok:m            代理端 + ngrok
  pnpm ngrok              两端 + 一条隧道（/operation 与 /management）

ngrok:m 和 ngrok:o 可同时开（两个 pane）。后启动的复用已有隧道，不再抢 4041。

Options:
  --system Operation|Management
  --with-dev                      Start Vite if the local port is free
  --port <n>
  --no-gateway
  --no-wait
`)
}

function publicHintFor(domain, system, useGateway) {
  if (useGateway) {
    return [
      `https://${domain}/          入口（选端）`,
      `https://${domain}/operation 运营端`,
      `https://${domain}/management 代理端`
    ].join('\n           ')
  }
  const basePath = system === 'Management' ? '/management' : '/operation'
  return `https://${domain}${basePath}`
}

function logTunnels(tunnels, domain) {
  if (!tunnels.length) {
    console.log(`[ngrok] 检查页已打开，但还没有隧道`)
    return
  }
  for (const tunnel of tunnels) {
    const url = tunnel.public_url || ''
    const addr = tunnel.config?.addr || ''
    console.log(`[ngrok] 已有隧道 ${url} → ${addr}`)
  }
  if (domain && !tunnels.some((tunnel) => String(tunnel.public_url || '').includes(domain))) {
    console.warn(`[ngrok] 现有隧道域名不是 ${domain}，公网地址可能不是本项目`)
  }
}

loadEnvFile(join(root, '.env.ngrok'))
loadEnvFile(join(root, '.env.local'))

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printHelp()
  process.exit(0)
}

const config = loadJson(join(root, 'ngrok.config.json'))
const gwCfg = loadGatewayConfig()
const system = normalizeSystem(args.system)
const useGateway = args.gateway !== false && !args.port
const domain = process.env.NGROK_DOMAIN || config.domain
const authtoken = process.env.NGROK_AUTHTOKEN
const configPath = join(root, 'ngrok.yml')
const webAddr = readWebAddr(configPath)
const inspectorPort = inspectorPortOf(webAddr)

if (!authtoken) {
  console.error(
    '缺少 NGROK_AUTHTOKEN。请复制 ngrok.env.example 为 .env.ngrok 并填入 dashboard 中的 authtoken。'
  )
  process.exit(1)
}

if (args.withDev) {
  if (system) {
    await ensureVite(system, Number(config.ports[system]))
  } else {
    await Promise.all([
      ensureVite('Operation', gwCfg.operationPort),
      ensureVite('Management', gwCfg.managementPort)
    ])
  }
}

let port
let publicHint
let gatewayHandle = null
let spawnedGateway = false

if (useGateway) {
  port = gwCfg.listenPort
  publicHint = publicHintFor(domain, system, true)
  if (system) {
    console.log(`[ngrok] system: ${system}（两端走同一条隧道，路径区分）`)
  }
  if (args.withDev && args.wait) {
    const portsToWait = system
      ? [Number(config.ports[system])]
      : [gwCfg.operationPort, gwCfg.managementPort]
    for (const vitePort of portsToWait) {
      try {
        await waitForPort(vitePort, DEFAULT_WAIT_MS)
      } catch (error) {
        console.warn(`[ngrok] ${error.message}，仍尝试建立隧道`)
      }
    }
  }
  try {
    gatewayHandle = await startGateway()
    spawnedGateway = true
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.log(`[ngrok] 网关 ${gwCfg.listenHost}:${gwCfg.listenPort} 已在运行，直接复用`)
    } else {
      throw error
    }
  }
} else {
  port =
    Number.isFinite(args.port) && args.port > 0
      ? args.port
      : system
        ? config.ports[system]
        : null
  publicHint = publicHintFor(domain, system, false)
  console.log(`[ngrok] system: ${system || '(port override)'}（直连，无网关）`)
}

if (!port) {
  console.error(`无法确定本地端口。请使用 --port，或检查 ngrok.config.json。`)
  process.exit(1)
}

const bin = findNgrokBin()
console.log(`[ngrok] binary: ${bin}`)
console.log(`[ngrok] local:  http://127.0.0.1:${port}`)
console.log(`[ngrok] public: ${publicHint}`)
console.log(`[ngrok] inspect: http://${webAddr}`)

if (args.wait) {
  console.log(`[ngrok] waiting for localhost:${port} ...`)
  try {
    await waitForPort(port, DEFAULT_WAIT_MS)
  } catch (error) {
    console.warn(`[ngrok] ${error.message}，仍尝试建立隧道`)
  }
}

async function startOrReuseNgrok() {
  const existing = await fetchTunnels(webAddr)
  if (existing && existing.length) {
    console.log(`[ngrok] 检查页 ${webAddr} 已有 agent，复用（不再启动第二个 ngrok）`)
    logTunnels(existing, domain)
    return { reused: true, child: null, tunnels: existing }
  }

  if (await isPortOpen(inspectorPort)) {
    const tunnels = await waitForTunnels(webAddr, { retries: 8, delayMs: 300 })
    if (tunnels && tunnels.length) {
      console.log(`[ngrok] 检查页 ${webAddr} 已有 agent，复用`)
      logTunnels(tunnels, domain)
      return { reused: true, child: null, tunnels }
    }
    if (tunnels) {
      throw new Error(
        `127.0.0.1:${inspectorPort} 上的 ngrok 没有隧道。结束该 ngrok 后重试（不要杀 4040，那是其他项目）。`
      )
    }
    throw new Error(
      `listen ${webAddr} 已被占用，且不是本项目 ngrok 检查页。查占用：Get-NetTCPConnection -LocalPort ${inspectorPort}`
    )
  }

  const ngrokArgs = [
    `--config=${configPath}`,
    'http',
    String(port),
    `--url=${domain}`,
    '--log=stdout',
    '--log-format=term',
    '--log-level=info'
  ]

  const child = spawn(bin, ngrokArgs, {
    stdio: 'inherit',
    windowsHide: true,
    env: {
      ...process.env,
      NGROK_AUTHTOKEN: authtoken
    }
  })

  const exited = new Promise((resolveExit) => {
    child.once('exit', (code, signal) => resolveExit({ code, signal }))
  })
  const ready = waitForTunnels(webAddr).then((tunnels) => ({ tunnels }))
  const first = await Promise.race([exited, ready])

  if (first.tunnels && first.tunnels.length) {
    return { reused: false, child, tunnels: first.tunnels }
  }

  if (first.tunnels) {
    return { reused: false, child, tunnels: first.tunnels }
  }

  const raced = await fetchTunnels(webAddr)
  if (raced && raced.length) {
    console.log(`[ngrok] 本进程没抢到检查页，改为复用已有隧道`)
    logTunnels(raced, domain)
    return { reused: true, child: null, tunnels: raced }
  }

  if (first.signal) {
    throw new Error(`ngrok 被信号中断 ${first.signal}`)
  }
  throw new Error(`ngrok 退出 code=${first.code ?? 1}`)
}

let ngrokChild = null
let reusedNgrok = false

try {
  const started = await startOrReuseNgrok()
  ngrokChild = started.child
  reusedNgrok = started.reused
  if (reusedNgrok) {
    console.log(`[ngrok] public: ${publicHint}`)
  }
} catch (error) {
  if (error && error.code === 'ENOENT') {
    console.error('未找到 ngrok。请安装：winget install Ngrok.Ngrok')
    console.error('或从 https://ngrok.com/download 下载，并保证 ngrok 在 PATH 中。')
    console.error('Windows 默认路径：%LOCALAPPDATA%\\ngrok\\ngrok.exe')
  } else {
    console.error(`[ngrok] ${error.message || error}`)
  }
  if (!viteChildren.length) {
    process.exit(1)
  }
  console.error('[ngrok] 隧道没起来，本地 Vite 继续跑。Ctrl+C 结束本端 Vite。')
}

const shutdown = () => {
  if (ngrokChild) killChild(ngrokChild)
  for (const vite of viteChildren) killChild(vite)
  if (spawnedGateway && gatewayHandle?.server) {
    gatewayHandle.server.close()
  }
}

if (ngrokChild) {
  ngrokChild.on('error', (error) => {
    if (error.code === 'ENOENT') {
      console.error('未找到 ngrok。请安装：winget install Ngrok.Ngrok')
    } else {
      console.error(error)
    }
    shutdown()
    process.exit(1)
  })
  ngrokChild.on('exit', (code, signal) => {
    for (const vite of viteChildren) killChild(vite)
    if (spawnedGateway && gatewayHandle?.server) {
      gatewayHandle.server.close()
    }
    if (signal) {
      process.exit(1)
    }
    process.exit(code ?? 0)
  })
} else if (viteChildren.length) {
  console.log('[ngrok] 隧道已复用。本进程只看着 Vite。Ctrl+C 只停本端 Vite，不停隧道。')
  waitChildren(viteChildren).then(() => process.exit(0))
} else if (reusedNgrok) {
  console.log('[ngrok] Vite 与隧道都已在运行，不必重复启动。')
  process.exit(0)
} else if (!viteChildren.length) {
  process.exit(1)
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(0)
})
process.on('SIGTERM', () => {
  shutdown()
  process.exit(0)
})
