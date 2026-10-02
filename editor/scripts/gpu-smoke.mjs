import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = join(tmpdir(), `xiyou-gpu-smoke-${process.pid}`)
const input = join(root, 'input.mp4')
const alpha = join(root, 'alpha.webm')
const prepared = join(root, 'prepared')
const worker = join(process.cwd(), '../tools/gpu-worker.mjs')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function parse(stdout) {
  try { return JSON.parse(stdout) } catch (error) { throw new Error(`Worker 输出不是 JSON：${error.message}`) }
}

try {
  await fs.mkdir(root, { recursive: true })
  await run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=green:s=160x90:r=4:d=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', input])
  const analyzed = parse((await run(process.execPath, [worker, 'analyze', '--input', input])).stdout)
  assert(analyzed.kind === 'video' && analyzed.video.width === 160, 'GPU worker analyze failed')
  const converted = parse((await run(process.execPath, [worker, 'convert-alpha', '--input', input, '--output', alpha])).stdout)
  assert(converted.format === 'webm-vp9-alpha' && (await fs.stat(alpha)).size > 0, 'alpha conversion failed')
  const preparedResult = parse((await run(process.execPath, [worker, 'prepare-reconstruction', '--input', input, '--output', prepared, '--fps', '2', '--max-frames', '2'])).stdout)
  assert(preparedResult.frameCount === 2, 'reconstruction preparation frame count failed')
  const manifest = JSON.parse(await fs.readFile(join(prepared, 'manifest.json'), 'utf8'))
  assert(manifest.frames.length === 2, 'reconstruction manifest failed')
  console.log('gpu-smoke: OK')
} finally {
  await fs.rm(root, { recursive: true, force: true })
}
