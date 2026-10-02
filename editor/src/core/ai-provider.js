const STORAGE_KEY = 'xiyou.ai.provider'
let sessionApiKey = ''

const DEFAULT_CONFIG = {
  protocol: 'relay',
  endpoint: 'https://agentpay.xx.kg/xiyou-ai/chat',
  model: '',
  apiKey: '',
  timeoutMs: 120000
}

function clone(value) {
  return value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value
}

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (!value || typeof value !== 'object') return {}
    delete value.apiKey
    return value
  } catch {
    return {}
  }
}

function fromRuntime() {
  const runtime = globalThis.__xiyou?.ai || globalThis.__XIYOU_AI_PROVIDER || {}
  const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null
  return {
    ...(runtime && typeof runtime === 'object' ? runtime : {}),
    ...(params?.get('ai') ? { endpoint: params.get('ai'), protocol: params.get('aiProtocol') || 'relay' } : {})
  }
}

export function getAiConfig() {
  const runtime = fromRuntime()
  return { ...DEFAULT_CONFIG, ...readSaved(), ...runtime, apiKey: runtime.apiKey || sessionApiKey || '' }
}

export function saveAiConfig(patch = {}) {
  const next = { ...getAiConfig(), ...(patch || {}) }
  sessionApiKey = typeof next.apiKey === 'string' ? next.apiKey : ''
  const persisted = { ...next }
  delete persisted.apiKey
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  } catch {}
  return next
}

export function resetAiConfig() {
  sessionApiKey = ''
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
  return getAiConfig()
}

function assertEndpoint(endpoint) {
  try {
    const url = new URL(endpoint)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('AI 服务地址必须使用 HTTP 或 HTTPS')
    return url.toString()
  } catch (error) {
    throw new Error(error?.message || 'AI 服务地址无效')
  }
}

function headers(config) {
  const result = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (config.apiKey && config.protocol === 'openai') result.Authorization = `Bearer ${config.apiKey}`
  return result
}

function bodyFor(config, messages) {
  if (config.protocol === 'openai') {
    return {
      model: config.model || 'gpt-4o-mini',
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' }
    }
  }
  return { messages, ...(config.model ? { model: config.model } : {}) }
}

function extractContent(data) {
  if (data?.content !== undefined) return data.content
  if (data?.reply !== undefined || data?.ops !== undefined) return data
  return data?.choices?.[0]?.message?.content ?? data?.output_text ?? data?.output?.[0]?.content?.[0]?.text ?? ''
}

export async function requestAi({ messages = [], signal, config = null } = {}) {
  const active = { ...getAiConfig(), ...(config || {}) }
  const endpoint = assertEndpoint(active.endpoint)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Number(active.timeoutMs) || 120000)
  const abort = () => controller.abort()
  signal?.addEventListener?.('abort', abort, { once: true })
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers(active),
      body: JSON.stringify(bodyFor(active, messages)),
      signal: controller.signal
    })
    const text = await response.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = { content: text } }
    if (!response.ok) throw new Error(data?.error || data?.message || `AI 服务响应异常（${response.status}）`)
    return { content: extractContent(data), raw: data, config: active }
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new Error(error?.message || 'AI 服务连接失败')
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener?.('abort', abort)
  }
}
