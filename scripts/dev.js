/**
 * dev.js - Custom dev script that starts Vite + Electron together
 *
 * Replaces electronmon (which has compatibility issues with Node.js v22).
 * - Starts Vite dev server
 * - Waits for Vite to be ready
 * - Starts Electron with VITE_DEV_SERVER_URL set
 * - Restarts Electron on file changes (simple polling)
 */

import { spawn, execSync } from 'child_process'
import { createServer } from 'vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

// ── 1. Check blivechat Python dependencies ──
async function checkBlivechatDeps() {
  const blivechatPath = 'D:/project/blivechat'
  if (!fs.existsSync(blivechatPath)) {
    console.log('[dev] blivechat not found at', blivechatPath, '- skipping dependency check')
    return
  }

  try {
    execSync('python -c "import tornado; import blivedm; import aiohttp"', {
      cwd: blivechatPath,
      stdio: 'ignore',
      timeout: 10000,
    })
    console.log('[dev] blivechat Python dependencies OK')
  } catch {
    console.log('[dev] Installing blivechat Python dependencies...')
    try {
      execSync('pip install tornado blivedm aiohttp', {
        cwd: blivechatPath,
        stdio: 'inherit',
        timeout: 120000,
      })
      console.log('[dev] blivechat Python dependencies installed')
    } catch (err) {
      console.error('[dev] Failed to install blivechat dependencies:', err.message)
      console.error('[dev] Please run: pip install tornado blivedm aiohttp')
    }
  }
}

// ── 2. Start Vite dev server ──
async function startVite() {
  const server = await createServer({
    root,
    server: {
      port: 5173,
      strictPort: true,
    },
  })
  await server.listen()
  const addr = server.httpServer.address()
  const url = typeof addr === 'object' ? `http://localhost:${addr.port}` : 'http://localhost:5173'
  console.log(`[dev] Vite ready at ${url}`)
  return { server, url }
}

// ── 3. Start Electron ──
function startElectron(viteUrl) {
  // Direct path to Electron binary (bypass .cmd shim)
  const electronExe = path.resolve(root, 'node_modules', 'electron', 'dist', 'electron.exe')
  const mainPath = path.resolve(root, 'electron', 'main.js')

  const env = {
    ...process.env,
    VITE_DEV_SERVER_URL: viteUrl,
  }

  const proc = spawn(
    electronExe,
    [mainPath],
    {
      cwd: root,
      stdio: 'inherit',
      env,
    }
  )

  proc.on('exit', (code) => {
    console.log(`[dev] Electron exited with code ${code}`)
    // Don't exit on crash - let user see the error
  })

  return proc
}

// ── 4. Watch for file changes and restart Electron ──
function watchAndRestart(viteUrl) {
  let electronProc = startElectron(viteUrl)
  let debounceTimer = null

  const watchDirs = [
    path.resolve(root, 'electron'),
    path.resolve(root, 'src'),
  ]

  watchDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return
      // Ignore .vue?ts=... temp files and node_modules
      if (filename.includes('node_modules') || filename.includes('?')) return

      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        console.log(`[dev] File changed: ${filename}, restarting Electron...`)
        if (electronProc) {
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', String(electronProc.pid), '/f', '/t'], { stdio: 'ignore' })
          } else {
            electronProc.kill('SIGTERM')
          }
        }
        // Small delay to ensure port is freed
        setTimeout(() => {
          electronProc = startElectron(viteUrl)
        }, 500)
      }, 300)
    })
  })

  process.on('SIGINT', () => {
    if (electronProc) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(electronProc.pid), '/f', '/t'], { stdio: 'ignore' })
      } else {
        electronProc.kill('SIGTERM')
      }
    }
    process.exit(0)
  })
}

// ── Main ──
async function main() {
  console.log('[dev] Starting development environment...')

  await checkBlivechatDeps()

  const { url } = await startVite()
  watchAndRestart(url)
}

main().catch((err) => {
  console.error('[dev] Fatal error:', err)
  process.exit(1)
})
