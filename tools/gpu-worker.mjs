#!/usr/bin/env node
/**
 * 西游·虚境离线 GPU/媒体 Worker。
 *
 * 目标：把高耗时媒体任务统一成可重试的 job；真正的 Gaussian Splat 重建
 * 可通过 XIYOU_RECONSTRUCTOR_BIN 接入外部 GPU 重建器，当前内置的 prepare
 * 任务负责抽帧、生成序列清单和重建输入包，保证没有 GPU SDK 时也能跑通前处理。
 */
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, existsSync, promises as fs } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const ROOT = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = dirname(ROOT)
const jobs = new Map()
const queue = []
const cancelled = new Set()
let running = 0
const concurrency = Math.max(1, Number(process.env.XIYOU_WORKER_CONCURRENCY || 1))

function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

function has(name) { return process.argv.includes(`--${name}`) }
function help() {
  console.log(`用法：
  node tools/gpu-worker.mjs analyze --input <file>
  node tools/gpu-worker.mjs convert-alpha --input <video> --output <webm> [--color-key 0x00ff00]
  node tools/gpu-worker.mjs prepare-reconstruction --input <video|目录> --output <目录> [--fps 2] [--max-frames 120]
  node tools/gpu-worker.mjs reconstruct --input <video|目录> --output <目录> [--quality balanced]
  node tools/gpu-worker.mjs run --job <analyze|convert-alpha|prepare-reconstruction> ...
  node tools/gpu-worker.mjs serve --port 8787

环境变量：
  XIYOU_ENGINE_DIR 本地 FFmpeg / COLMAP / Brush 引擎根目录
  XIYOU_ENABLE_BUNDLED_ENGINES=1 使用本地 COLMAP + Brush 完成重建
  XIYOU_RECONSTRUCTOR_BIN 兼容重建器可执行文件路径（优先于本地内置引擎）
  XIYOU_WORKER_CONCURRENCY 任务并发数，默认 1`)
}

function json(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,accept' })
  res.end(body)
}


async function parseMultipart(req) {
  const contentType = String(req.headers['content-type'] || '')
  const match = contentType.match(/boundary=(?:\"([^\"]+)\"|([^;]+))/i)
  if (!match) throw new Error('multipart 请求缺少 boundary')
  const boundary = Buffer.from(`--${match[1] || match[2]}`)
  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const buffer = Buffer.concat(chunks)
  const parts = []
  let offset = 0
  while (offset < buffer.length) {
    const start = buffer.indexOf(boundary, offset)
    if (start < 0) break
    const headerStart = start + boundary.length + 2
    if (buffer.slice(start + boundary.length, start + boundary.length + 2).equals(Buffer.from('--'))) break
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart)
    if (headerEnd < 0) break
    const headers = buffer.slice(headerStart, headerEnd).toString('utf8')
    const nextBoundary = buffer.indexOf(boundary, headerEnd + 4)
    if (nextBoundary < 0) break
    const bodyEnd = nextBoundary - 2
    const disposition = headers.match(/content-disposition:.*?name=\"([^\"]+)\"(?:;\s*filename=\"([^\"]*)\")?/i)
    if (disposition) parts.push({ name: disposition[1], filename: disposition[2] || '', data: buffer.slice(headerEnd + 4, bodyEnd) })
    offset = nextBoundary
  }
  return parts
}

async function parseJobRequest(req) {
  const contentType = String(req.headers['content-type'] || '')
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) return { body: await parseBody(req), files: [] }
  const parts = await parseMultipart(req)
  const fields = {}
  const files = []
  for (const part of parts) {
    if (part.filename) files.push(part)
    else fields[part.name] = part.data.toString('utf8')
  }
  const dir = await fs.mkdtemp(join(tmpdir(), 'xiyou-worker-'))
  const paths = []
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const safeName = basename(file.filename || `input_${index}`) || `input_${index}`
    const path = join(dir, `${String(index).padStart(3, '0')}_${safeName}`)
    await fs.writeFile(path, file.data)
    paths.push(path)
  }
  let options = {}
  try { options = fields.options ? JSON.parse(fields.options) : {} } catch {}
  return {
    body: { type: 'reconstruct', payload: {
      input: paths.length > 1 && (fields.inputType || '').toLowerCase() === 'images' ? dir : paths[0],
      inputs: paths,
      inputType: fields.inputType || 'video',
      quality: fields.quality || 'balanced',
      options
    } },
    files: paths,
    tempDir: dir
  }
}

function parseBody(req) {
  return new Promise((resolveBody, reject) => {
    let raw = ''
    req.setEncoding('utf8')
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => { try { resolveBody(raw ? JSON.parse(raw) : {}) } catch (error) { reject(error) } })
    req.on('error', reject)
  })
}

function engineCandidates() {
  const configured = process.env.XIYOU_ENGINE_DIR || process.env.OOOSPLAT_ENGINE_DIR || arg('engine-dir')
  const roots = configured
    ? [resolve(configured)]
    : [
        join(PROJECT_ROOT, 'engines'),
        join(ROOT, '..', 'engines'),
        '/Applications/OOOSplat.app/Contents/Resources/engines',
        '/Applications/OOOSplat.app/Contents/Resources/engines/macos/arm64'
      ]
  const expanded = roots.flatMap(root => [root, join(root, 'macos', 'arm64')])
  return [...new Set(expanded)]
}

function findEngine(name) {
  const envName = name === 'brush' ? 'XIYOU_BRUSH' : name === 'colmap' ? 'XIYOU_COLMAP' : name === 'ffmpeg' ? 'XIYOU_FFMPEG' : 'XIYOU_FFPROBE'
  if (process.env[envName]) return process.env[envName]
  const fileName = process.platform === 'win32' ? `${name === 'brush' ? 'brush_app' : name}.exe` : name === 'brush' ? 'brush_app' : name
  const pathEntries = String(process.env.PATH || '').split(process.platform === 'win32' ? ';' : ':').filter(Boolean)
  const pathMatch = pathEntries.map(directory => join(directory, fileName)).find(candidate => existsSync(candidate))
  if ((name === 'ffmpeg' || name === 'ffprobe') && pathMatch && process.env.XIYOU_ENABLE_BUNDLED_ENGINES !== '1') return pathMatch
  for (const root of engineCandidates()) {
    const candidates = name === 'brush'
      ? [join(root, 'bin', fileName), join(root, 'brush', fileName), join(root, 'linux', 'brush', fileName)]
      : [join(root, 'bin', fileName), join(root, 'ffmpeg', fileName), join(root, 'colmap', 'bin', fileName)]
    const match = candidates.find(candidate => existsSync(candidate))
    if (match) return match
  }
  return pathMatch || fileName
}

function runCommand(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options })
    let stdout = ''; let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk; options.onStdout?.(String(chunk)) })
    child.stderr.on('data', chunk => { stderr += chunk; options.onStderr?.(String(chunk)) })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolveRun({ stdout, stderr }) : reject(new Error(`${command} 退出码 ${code}\n${stderr.slice(-2000)}`)))
  })
}

async function ffprobe(input) {
  const result = await runCommand(findEngine('ffprobe'), ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', input])
  return JSON.parse(result.stdout || '{}')
}

async function analyze(input) {
  const stat = await fs.stat(input)
  const extension = extname(input).toLowerCase()
  const result = { input: resolve(input), name: basename(input), bytes: stat.size, extension, kind: 'file' }
  if (['.mp4', '.mov', '.webm', '.mkv', '.avi'].includes(extension)) {
    const probe = await ffprobe(input)
    const stream = (probe.streams || []).find(item => item.codec_type === 'video')
    result.kind = 'video'
    result.video = { codec: stream?.codec_name || '', width: stream?.width || 0, height: stream?.height || 0, fps: stream?.r_frame_rate || '', duration: Number(stream?.duration || probe.format?.duration || 0) || 0, frames: Number(stream?.nb_frames || 0) || 0, pixFmt: stream?.pix_fmt || '' }
  } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    result.kind = 'image'
  } else if (['.glb', '.gltf', '.ply', '.sog', '.spz', '.splat', '.ksplat'].includes(extension)) {
    result.kind = extension.slice(1)
  }
  return result
}

async function convertAlpha(input, output, colorKey = '0x00ff00') {
  await fs.mkdir(dirname(resolve(output)), { recursive: true })
  const filter = `colorkey=${colorKey}:0.22:0.08,format=yuva420p`
  await runCommand(findEngine('ffmpeg'), ['-y', '-i', input, '-vf', filter, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '30', '-b:v', '0', '-an', output])
  return { input: resolve(input), output: resolve(output), mode: 'colorkey', colorKey, format: 'webm-vp9-alpha' }
}

async function inputFrames(input, output, fps, maxFrames) {
  await fs.mkdir(output, { recursive: true })
  const pattern = join(output, 'frame_%05d.jpg')
  const args = ['-y', '-i', input, '-vf', `fps=${fps},scale='min(1920,iw)':-2`, '-q:v', '3']
  if (maxFrames > 0) args.push('-frames:v', String(maxFrames))
  args.push(pattern)
  await runCommand(findEngine('ffmpeg'), args)
  return (await fs.readdir(output)).filter(name => name.endsWith('.jpg')).sort().map(name => join(output, name))
}

async function hashFile(file) {
  const hash = createHash('sha1')
  const stream = createReadStream(file)
  for await (const chunk of stream) hash.update(chunk)
  return hash.digest('hex')
}

async function prepareReconstruction(input, output, fps = 2, maxFrames = 120, quality = 'balanced', progress = () => {}, inputType = 'video', inputs = [], options = {}, allowLocalEngines = false) {
  const source = resolve(input); const out = resolve(output)
  await fs.mkdir(out, { recursive: true })
  progress('preparing_frames', 10, '正在准备画面')
  let frames
  const stat = await fs.stat(source)
  const frameDir = join(out, 'frames')
  await fs.mkdir(frameDir, { recursive: true })
  if (stat.isDirectory()) {
    const names = (await fs.readdir(source))
      .filter(name => /\.(jpg|jpeg|png|webp)$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .slice(0, maxFrames || undefined)
    frames = []
    for (const name of names) {
      const target = join(frameDir, name)
      await fs.copyFile(join(source, name), target)
      frames.push(target)
    }
  } else if (inputType === 'images' || /\.(jpg|jpeg|png|webp)$/i.test(source)) {
    const target = join(frameDir, basename(source))
    await fs.copyFile(source, target)
    frames = [target]
  } else frames = await inputFrames(source, frameDir, fps, maxFrames)
  const items = []
  for (let i = 0; i < frames.length; i += 1) {
    const file = frames[i]
    items.push({ index: i, file: file.startsWith(out) ? file.slice(out.length + 1) : file, name: basename(file), sha1: await hashFile(file) })
    progress('extracting_features', 15 + Math.round((i + 1) / Math.max(frames.length, 1) * 20), `已准备 ${i + 1}/${frames.length} 帧`)
  }
  const metadata = {
    schemaVersion: 'xiyou-reconstruction-1.0',
    source,
    inputType,
    inputCount: inputs.length || (stat.isDirectory() ? frames.length : 1),
    createdAt: new Date().toISOString(),
    fps,
    maxFrames,
    quality,
    frameCount: items.length,
    frames: items,
    next: '将 frames/manifest.json 交给 XIYOU_RECONSTRUCTOR_BIN 或外部 COLMAP/3DGS GPU pipeline'
  }
  const manifestPath = join(out, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(metadata, null, 2))
  const bundledColmap = findEngine('colmap')
  const bundledBrush = findEngine('brush')
  const localEnginesAvailable = existsSync(bundledColmap) && existsSync(bundledBrush)
  const binary = process.env.XIYOU_RECONSTRUCTOR_BIN || (allowLocalEngines && (process.env.XIYOU_ENABLE_BUNDLED_ENGINES === '1' || localEnginesAvailable) ? bundledBrush : '')
  if (binary) {
    progress('extracting_features', 40, '正在提取空间特征')
    progress('matching', 48, '正在匹配相机画面')
    progress('reconstructing', 55, '正在执行相机重建')
    const outputPath = join(out, 'final.ply')
    const bundledBrush = !process.env.XIYOU_RECONSTRUCTOR_BIN
    if (bundledBrush) {
      const colmap = bundledColmap
      const database = join(out, 'colmap.db')
      const imageRoot = join(out, 'frames')
      const sparse = join(out, 'sparse')
      await runCommand(colmap, ['feature_extractor', '--database_path', database, '--image_path', imageRoot, '--ImageReader.single_camera', '1', '--FeatureExtraction.use_gpu', '0'])
      await runCommand(colmap, ['exhaustive_matcher', '--database_path', database, '--FeatureMatching.use_gpu', '0'])
      await fs.mkdir(sparse, { recursive: true })
      await runCommand(colmap, ['mapper', '--database_path', database, '--image_path', imageRoot, '--output_path', sparse])
      const model = join(sparse, '0')
      const dataset = join(out, 'brush', 'dataset')
      await fs.mkdir(join(dataset, 'images'), { recursive: true })
      await fs.mkdir(join(dataset, 'sparse', '0'), { recursive: true })
      for (const file of await fs.readdir(imageRoot)) await fs.copyFile(join(imageRoot, file), join(dataset, 'images', file))
      for (const name of ['cameras.bin', 'images.bin', 'points3D.bin']) await fs.copyFile(join(model, name), join(dataset, 'sparse', '0', name))
      const steps = String(options.totalSteps || (quality === 'fast' ? '8000' : quality === 'high' ? '30000' : '15000'))
      const resolution = String(options.maxResolution || (quality === 'high' ? '3200' : quality === 'fast' ? '1600' : '1920'))
      const brushOutput = join(out, 'brush')
      const brushName = 'final.ply.tmp'
      await runCommand(binary, ['--total-steps', steps, '--max-resolution', resolution, '--refine-every', '100', '--export-every', steps, '--export-path', brushOutput, '--export-name', brushName, dataset])
      const candidate = join(brushOutput, brushName)
      await fs.copyFile(candidate, outputPath)
      metadata.mode = 'bundled-local-gpu-reconstructor'
      metadata.engine = { ffmpeg: findEngine('ffmpeg'), ffprobe: findEngine('ffprobe'), colmap, brush: binary }
    } else {
      await runCommand(binary, ['--input', out, '--output', outputPath, '--quality', quality])
      metadata.mode = 'external-gpu-reconstructor'
    }
    metadata.output = outputPath
    metadata.artifact = { name: 'final.ply', path: outputPath, format: 'ply', kind: 'splat' }
  } else {
    metadata.mode = 'prepared-input'
    metadata.warning = '未配置重建器；已完成重建输入准备。设置 XIYOU_ENABLE_BUNDLED_ENGINES=1 使用本地 FFmpeg / COLMAP / Brush，或设置 XIYOU_RECONSTRUCTOR_BIN 使用兼容重建器'
  }
  const qualityReport = {
    schemaVersion: 'xiyou-quality-1.0',
    provider: binary ? (process.env.XIYOU_RECONSTRUCTOR_BIN ? 'external-gpu-reconstructor' : 'bundled-local-gpu-reconstructor') : 'prepared-input',
    quality,
    frameCount: items.length,
    registeredFrames: binary ? null : 0,
    registrationRate: binary && items.length ? null : 0,
    pointCount: null,
    warnings: metadata.warning ? [metadata.warning] : [],
    createdAt: new Date().toISOString()
  }
  const qualityPath = join(out, 'quality-report.json')
  await fs.writeFile(qualityPath, JSON.stringify(qualityReport, null, 2))
  metadata.qualityReport = qualityReport
  metadata.artifacts = [
    { name: 'manifest.json', path: manifestPath, format: 'json', kind: 'manifest' },
    { name: 'quality-report.json', path: qualityPath, format: 'json', kind: 'quality-report' },
    ...(metadata.artifact ? [metadata.artifact] : [])
  ]
  await fs.writeFile(manifestPath, JSON.stringify(metadata, null, 2))
  progress(binary ? 'validating' : 'validating', 95, binary ? '正在校验输出' : '输入包已准备完成')
  return metadata
}

async function execute(type, payload) {
  if (type === 'analyze') return analyze(payload.input)
  if (type === 'convert-alpha') return convertAlpha(payload.input, payload.output, payload.colorKey || '0x00ff00')
  if (type === 'prepare-reconstruction' || type === 'reconstruct') {
    const output = payload.output || join(tmpdir(), `xiyou-reconstruction-${randomUUID()}`)
    return prepareReconstruction(payload.input, output, Number(payload.fps || 2), Number(payload.maxFrames || 120), payload.quality || 'balanced', payload.progress, payload.inputType || 'video', payload.inputs || [], payload.options || {}, type === 'reconstruct')
  }
  throw new Error(`未知任务类型：${type}`)
}

function enqueue(type, payload) {
  const id = randomUUID()
  const job = { id, type, payload, status: 'queued', stage: 'created', message: '排队中', createdAt: new Date().toISOString(), progress: 0, warnings: [], logs: [] }
  jobs.set(id, job); queue.push(job); pump(); return job
}

function pump() {
  while (running < concurrency && queue.length) {
    const job = queue.shift(); running += 1; job.status = 'running'; job.startedAt = new Date().toISOString()
    const progress = (stage, value, message) => {
      if (cancelled.has(job.id)) throw new Error('任务已取消')
      job.stage = stage; job.progress = value; job.message = message
      job.logs.push({ at: new Date().toISOString(), stage, progress: value, message })
    }
    execute(job.type, { ...job.payload, progress }).then(result => {
      job.status = 'ready'; job.stage = 'ready'; job.progress = 100; job.message = result?.artifact ? '重建任务完成' : '输入准备完成'
      job.result = result
      if (result?.warning) job.warnings.push(result.warning)
    }).catch(error => {
      job.status = cancelled.has(job.id) ? 'cancelled' : 'failed'; job.stage = job.status; job.error = error.message
      job.logs.push({ at: new Date().toISOString(), stage: job.stage, message: error.message })
    }).finally(() => { job.finishedAt = new Date().toISOString(); running -= 1; pump() })
  }
}

function engineStatus(name) {
  const path = findEngine(name)
  const exists = existsSync(path)
  return { name, path, exists }
}

function localEngineHealth() {
  const engines = ['ffmpeg', 'ffprobe', 'colmap', 'brush'].map(engineStatus)
  const external = process.env.XIYOU_RECONSTRUCTOR_BIN
    ? { name: 'reconstructor', path: resolve(process.env.XIYOU_RECONSTRUCTOR_BIN), exists: existsSync(resolve(process.env.XIYOU_RECONSTRUCTOR_BIN)) }
    : null
  const missing = engines.filter(item => item.name === 'ffmpeg' || item.name === 'ffprobe' || !external).filter(item => !item.exists).map(item => item.name)
  const ready = missing.length === 0 && (Boolean(external?.exists) || engines.every(item => item.name === 'ffmpeg' || item.name === 'ffprobe' || item.exists))
  return { ready, mode: external?.exists ? 'external-reconstructor' : 'bundled-colmap-brush', engines, external, missing }
}

function serve(port) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    if (req.method === 'OPTIONS') { json(res, 204, {}); return }
    if (req.method === 'GET' && url.pathname === '/health') {
      const local = localEngineHealth()
      return json(res, 200, { ok: true, running, queued: queue.length, concurrency, local })
    }
    if (req.method === 'GET' && url.pathname === '/jobs') return json(res, 200, [...jobs.values()])
    if (req.method === 'GET' && url.pathname.startsWith('/jobs/')) {
      const match = url.pathname.match(/^\/jobs\/([^/]+)(?:\/(assets))?$/)
      const jobId = match?.[1] || ''
      if (match?.[2] === 'assets') {
        const job = jobs.get(jobId)
        const result = job?.result
        const artifacts = result?.artifacts || (result?.artifact ? [result.artifact] : [])
        return json(res, job ? 200 : 404, job ? Object.fromEntries(artifacts.map(item => [item.kind || item.format || item.name, { url: `/jobs/${jobId}/assets/${encodeURIComponent(item.name)}`, name: item.name, format: item.format, kind: item.kind, bytes: item.bytes || 0 }])) : { error: 'not found' })
      }
      const artifactMatch = url.pathname.match(/^\/jobs\/([^/]+)\/assets\/(.+)$/)
      if (artifactMatch) {
        const job = jobs.get(artifactMatch[1])
        const artifacts = job?.result?.artifacts || (job?.result?.artifact ? [job.result.artifact] : [])
        const requested = decodeURIComponent(artifactMatch[2])
        const artifact = artifacts.find(item => item.name === requested)
        if (!artifact) return json(res, 404, { error: 'artifact not found' })
        res.writeHead(200, { 'content-type': artifact.format === 'json' ? 'application/json; charset=utf-8' : 'application/octet-stream', 'cache-control': 'no-store', 'access-control-allow-origin': '*' })
        createReadStream(artifact.path).on('error', () => res.end()).pipe(res)
        return
      }
      return json(res, jobs.has(jobId) ? 200 : 404, jobs.get(jobId) || { error: 'not found' })
    }
    if (req.method === 'POST' && /^\/jobs\/[^/]+\/(cancel|resume)$/.test(url.pathname)) {
      const [, jobId, action] = url.pathname.split('/')
      const job = jobs.get(jobId)
      if (!job) return json(res, 404, { error: 'not found' })
      if (action === 'cancel') { cancelled.add(jobId); job.status = 'cancelled'; job.stage = 'cancelled'; job.message = '已取消'; return json(res, 200, job) }
      if (job.status === 'paused' || job.status === 'cancelled') { cancelled.delete(jobId); job.status = 'queued'; queue.push(job); pump() }
      return json(res, 200, job)
    }
    if (req.method === 'POST' && url.pathname === '/jobs') {
      try { const request = await parseJobRequest(req); return json(res, 202, enqueue(request.body.type, request.body.payload || {})) } catch (error) { return json(res, 400, { error: error.message }) }
    }
    json(res, 404, { error: 'not found' })
  })
  server.listen(port, '127.0.0.1', () => console.log(`gpu-worker listening on http://127.0.0.1:${port}`))
}

const command = process.argv[2]
if (command === 'help' || command === '--help' || !command) help()
else if (command === 'serve') serve(Number(arg('port', '8787')))
else {
  const type = command === 'run' ? arg('job') : command
  const payload = { input: arg('input'), output: arg('output'), colorKey: arg('color-key', '0x00ff00'), fps: arg('fps', '2'), maxFrames: arg('max-frames', '120'), inputType: arg('input-type', 'video'), options: {} }
  if (!payload.input) { help(); process.exitCode = 2 } else execute(type, payload).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1 })
}
