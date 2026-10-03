import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = await mkdtemp(join(tmpdir(), 'xiyou-release-smoke-'))
const port = 8791
const server = spawn(process.execPath, [join(process.cwd(), '../tools/release-server.mjs'), '--dir', dir, '--port', String(port), '--host', '127.0.0.1'], { stdio: 'pipe' })

function assert(condition, message) { if (!condition) throw new Error(message) }
async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try { const response = await fetch(`http://127.0.0.1:${port}/health`); if (response.ok) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error('release server did not start')
}

try {
  await waitForServer()
  const payload = { releaseId: 'release_smoke', version: 1, scene: { objects: [] } }
  const upload = await fetch(`http://127.0.0.1:${port}/release/release_smoke.json`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
  assert(upload.status === 201, `release upload failed: ${upload.status}`)
  const download = await fetch(`http://127.0.0.1:${port}/release/release_smoke.json`)
  assert(download.ok, 'release download failed')
  const received = await download.json()
  assert(received.releaseId === 'release_smoke', 'release payload mismatch')
  console.log('release-smoke: OK')
} finally {
  server.kill('SIGTERM')
  await rm(dir, { recursive: true, force: true })
}
