// gpt-6 driver: sends a prompt (file or stdin) through the configured model relay.
// Usage: node tools/gpt6.mjs <promptFile> [outFile] [--sys <systemFile>] [--continue <prevReplyFile>] [--auto]
// Env:   relay credentials and model endpoint are read from the local runtime environment,
//        MODEL_RELAY_MODEL (default gpt-6), MODEL_RELAY_ROUTE=auto 等同 --auto
// --auto 分流留痕（前置 laya_router.py @127.0.0.1:8123）：
//   当前口径 = 所有请求一律调 MODEL_RELAY_MODEL（默认 gpt-6），laya 只做 lane 分类与留痕
//   （tools/route-log.jsonl），路由器不可达时静默按 heavy 记。
//   将来要恢复跨档分流：在路由结果处按 lane 改 BASE/MODEL 即可。
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

let BASE = process.env.MODEL_RELAY_BASE || ''
let MODEL = process.env.MODEL_RELAY_MODEL || 'gpt-6'
let KEY = process.env.MODEL_RELAY_KEY

const LAYA_URL = process.env.LAYA_URL || 'http://127.0.0.1:8123'
const ROUTE_LOG = join(dirname(fileURLToPath(import.meta.url)), 'route-log.jsonl')

const args = process.argv.slice(2)
const promptFile = args[0]
const outFile = args[1] && !args[1].startsWith('--') ? args[1] : null
const sysIdx = args.indexOf('--sys')
const sysFile = sysIdx >= 0 ? args[sysIdx + 1] : null
const contIdx = args.indexOf('--continue')
const prevFile = contIdx >= 0 ? args[contIdx + 1] : null
const auto = args.includes('--auto') || process.env.MODEL_RELAY_ROUTE === 'auto'

const messages = []
if (sysFile) messages.push({ role: 'system', content: readFileSync(sysFile, 'utf8') })
const promptText = readFileSync(promptFile === '-' ? 0 : promptFile, 'utf8')
messages.push({ role: 'user', content: promptText })
if (prevFile) {
  messages.push({ role: 'assistant', content: readFileSync(prevFile, 'utf8') })
  messages.push({ role: 'user', content: 'Continue exactly where you stopped. Output only the remaining content, no repetition, no commentary.' })
}

let lane = 'direct'
if (auto) {
  try {
    const r = await fetch(`${LAYA_URL}/route`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: promptText.slice(0, 1500) }),
      signal: AbortSignal.timeout(4000)
    })
    if (r.ok) lane = (await r.json()).lane || 'heavy'
  } catch { lane = 'heavy' }
  // 2026-10-01 CEO 定口径：只调 gpt-6 系，不做跨档分流。
  // laya 分类仍留痕（route-log.jsonl），以后要开快档分组改这里一行即可。
  console.error(`[route] lane=${lane} → ${MODEL} @ ${BASE}`)
}
if (!BASE || !KEY) { console.error('MODEL_RELAY_BASE and MODEL_RELAY_KEY are required in the local runtime environment'); process.exit(2) }

async function call(base, model, key) {
  const body = { model, messages, stream: true }
  return fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

const res = await call(BASE, MODEL, KEY)
if (!res.ok) { console.error(`HTTP ${res.status}: ${await res.text()}`); process.exit(1) }

let out = ''
const dec = new TextDecoder()
let buf = ''
const t0 = Date.now()
for await (const chunk of res.body) {
  buf += dec.decode(chunk, { stream: true })
  const lines = buf.split('\n')
  buf = lines.pop()
  for (const line of lines) {
    const t = line.trim()
    if (!t.startsWith('data:')) continue
    const payload = t.slice(5).trim()
    if (payload === '[DONE]') continue
    try {
      const j = JSON.parse(payload)
      const d = j.choices?.[0]?.delta?.content
      if (d) { out += d; if (!outFile) process.stdout.write(d) }
    } catch { /* partial json */ }
  }
}
if (outFile) { writeFileSync(outFile, out); console.log(`wrote ${outFile} (${out.length} chars)`) }
if (auto) {
  try {
    appendFileSync(ROUTE_LOG, JSON.stringify({
      ts: new Date().toISOString(), lane, model: MODEL,
      prompt_chars: promptText.length, out_chars: out.length, ms: Date.now() - t0
    }) + '\n')
  } catch { /* 留痕失败不阻塞 */ }
}
console.error(`\n[done] ${out.length} chars`)
