import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const EDITOR_DIR = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(EDITOR_DIR, '..')
const WORKER_SCRIPT = resolve(PROJECT_ROOT, 'tools/gpu-worker.mjs')
const WORKER_URL = 'http://127.0.0.1:8787'

async function workerIsReady() {
  try {
    const response = await fetch(`${WORKER_URL}/health`, { signal: AbortSignal.timeout(500) })
    return response.ok
  } catch {
    return false
  }
}

function autoStartGpuWorker() {
  return {
    name: 'xiyou-auto-start-gpu-worker',
    configureServer(server) {
      if (process.env.XIYOU_DISABLE_AUTO_WORKER === '1') return

      let child = null
      let ownsWorker = false
      let closed = false

      const start = async () => {
        if (closed || await workerIsReady()) return
        child = spawn(process.execPath, [WORKER_SCRIPT, 'serve', '--port', '8787'], {
          cwd: PROJECT_ROOT,
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe']
        })
        ownsWorker = true
        child.stdout?.on('data', data => {
          server.config.logger.info(`[gpu-worker] ${String(data).trim()}`)
        })
        child.stderr?.on('data', data => {
          server.config.logger.warn(`[gpu-worker] ${String(data).trim()}`)
        })
        child.on('error', error => {
          server.config.logger.warn(`[gpu-worker] 启动失败：${error.message}`)
        })
        child.on('exit', (code, signal) => {
          if (!closed && code !== 0) {
            server.config.logger.warn(`[gpu-worker] 已退出（code=${code ?? 'null'}, signal=${signal ?? 'null'}）`)
          }
        })
      }

      void start()
      server.httpServer?.once('close', () => {
        closed = true
        if (ownsWorker && child && !child.killed) child.kill('SIGTERM')
      })
    }
  }
}

export default defineConfig({
  base: '/xiyou/',
  plugins: [autoStartGpuWorker()],
  server: { host: '127.0.0.1', port: 5199 },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: 'index.html',
        show: 'show.html',
        runtime: 'runtime.html'
      },
      external: ['/xiyou/vendor/mindar/mindar-image-three.prod.js']
    }
  }
})
