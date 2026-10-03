/**
 * Gaussian Reconstruction Provider contract.
 *
 * Providers expose the same job lifecycle to the Splat Studio UI. A browser
 * upload can use the remote HTTP provider; a local Companion can implement
 * the local adapter without changing the editor workflow.
 */

function jsonHeaders() {
  return { accept: 'application/json' }
}

function withTrailingSlash(value) {
  return String(value || '').replace(/\/$/, '')
}

function randomId(prefix = 'job') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

async function readResponse(response) {
  const text = await response.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = null }
  if (!response.ok) {
    throw new Error(body?.error || body?.message || `${response.status} ${response.statusText}`)
  }
  return body
}

function uploadMultipart(url, form, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', url)
    request.responseType = 'json'
    request.timeout = 15 * 60 * 1000
    request.upload.addEventListener('progress', event => {
      if (!event.lengthComputable) return
      onProgress?.(Math.round(event.loaded / event.total * 100), event.loaded, event.total)
    })
    request.addEventListener('load', () => {
      let body = request.response
      if (!body) {
        try { body = request.responseText ? JSON.parse(request.responseText) : null } catch { body = null }
      }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(body?.error || body?.message || `${request.status} ${request.statusText}`))
        return
      }
      resolve(body)
    })
    request.addEventListener('error', () => reject(new Error('无法连接重建服务，请确认 Worker 已启动或远程 Provider 地址可访问')))
    request.addEventListener('timeout', () => reject(new Error('素材上传超时，请检查网络或改用更小的视频后重试')))
    request.addEventListener('abort', () => reject(new Error('素材上传已取消')))
    request.send(form)
  })
}

function artifactUrl(baseUrl, artifact, jobId) {
  if (!artifact || !jobId) return artifact
  if (!artifact.url) artifact.url = `${baseUrl}/jobs/${encodeURIComponent(jobId)}/assets/${encodeURIComponent(artifact.name || 'scene.sog')}`
  else if (artifact.url.startsWith('/')) artifact.url = `${baseUrl}${artifact.url}`
  return artifact
}

export class GaussianReconstructionProvider {
  constructor({ id = 'base', label = 'Gaussian Reconstruction Provider' } = {}) {
    this.id = id
    this.label = label
  }

  async health() {
    return { ok: false, status: 'unknown', message: '未实现 Provider' }
  }

  async analyze() {
    throw new Error('当前 Provider 不支持素材分析')
  }

  async createJob() {
    throw new Error('当前 Provider 不支持创建重建任务')
  }

  async getJob() {
    throw new Error('当前 Provider 不支持查询重建任务')
  }

  async cancelJob() {
    throw new Error('当前 Provider 不支持取消重建任务')
  }

  async resumeJob() {
    throw new Error('当前 Provider 不支持恢复重建任务')
  }

  async getArtifacts() {
    throw new Error('当前 Provider 不支持获取输出资产')
  }
}

/** Remote provider for an authenticated GPU service. */
export class HttpGaussianReconstructionProvider extends GaussianReconstructionProvider {
  constructor({ baseUrl = '', label = '远程 GPU 重建' } = {}) {
    super({ id: 'remote', label })
    this.baseUrl = withTrailingSlash(baseUrl)
  }

  async health() {
    if (!this.baseUrl) return { ok: false, status: 'unconfigured', message: '未配置远程重建服务' }
    try {
      const response = await fetch(`${this.baseUrl}/health`, { headers: jsonHeaders() })
      const body = await readResponse(response)
      return { ok: body?.ok !== false, status: body?.ok === false ? 'error' : 'ready', message: body?.message || '远程 GPU 服务已连接', detail: body }
    } catch (error) {
      return { ok: false, status: 'offline', message: error?.message || '远程 GPU 服务不可用' }
    }
  }

  async analyze(file) {
    if (!this.baseUrl) throw new Error('未配置远程重建服务地址')
    const form = new FormData()
    form.append('input', file, file.name)
    const response = await fetch(`${this.baseUrl}/analyze`, { method: 'POST', body: form })
    return readResponse(response)
  }

  async createJob({ file, files = null, inputType = 'video', quality = 'balanced', options = {}, onProgress } = {}) {
    if (!this.baseUrl) throw new Error('未配置远程重建服务地址')
    const form = new FormData()
    const inputs = Array.isArray(files) && files.length ? files : (file ? [file] : [])
    inputs.forEach(input => form.append('input', input, input.name))
    form.append('inputType', inputType)
    form.append('quality', quality)
    form.append('options', JSON.stringify(options))
    return uploadMultipart(`${this.baseUrl}/reconstruction/jobs`, form, { onProgress })
  }

  async getJob(jobId) {
    const response = await fetch(`${this.baseUrl}/reconstruction/jobs/${encodeURIComponent(jobId)}`, { headers: jsonHeaders() })
    return readResponse(response)
  }

  async cancelJob(jobId) {
    const response = await fetch(`${this.baseUrl}/reconstruction/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', headers: jsonHeaders() })
    return readResponse(response)
  }

  async resumeJob(jobId) {
    const response = await fetch(`${this.baseUrl}/reconstruction/jobs/${encodeURIComponent(jobId)}/resume`, { method: 'POST', headers: jsonHeaders() })
    return readResponse(response)
  }

  async getArtifacts(jobId) {
    const response = await fetch(`${this.baseUrl}/reconstruction/jobs/${encodeURIComponent(jobId)}/assets`, { headers: jsonHeaders() })
    return readResponse(response)
  }
}

/**
 * Local Companion adapter.
 *
 * Browser File objects are uploaded with multipart/form-data. A trusted local
 * caller may still pass inputPath for an already-authorized local directory.
 */
export class LocalGpuWorkerProvider extends GaussianReconstructionProvider {
  constructor({ baseUrl = 'http://127.0.0.1:8787', label = '本地 Companion' } = {}) {
    super({ id: 'local', label })
    this.baseUrl = withTrailingSlash(baseUrl)
  }

  async health() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { headers: jsonHeaders() })
      const body = await readResponse(response)
      const local = body?.local
      if (local && !local.ready) return { ok: false, status: 'limited', message: `本地 Worker 已连接，但缺少：${local.missing.join('、')}`, detail: body }
      return { ok: body?.ok !== false, status: body?.ok === false ? 'error' : 'ready', message: body?.message || '本地 Companion 已连接，可执行本地 Gaussian 重建', detail: body }
    } catch (error) {
      return { ok: false, status: 'offline', message: '本地 Companion 未连接', detail: error?.message || String(error) }
    }
  }

  async createJob({ inputPath, file, files = null, inputType = 'video', quality = 'balanced', options = {}, onProgress } = {}) {
    const inputs = Array.isArray(files) && files.length ? files : (file ? [file] : [])
    if (inputs.length) {
      const form = new FormData()
      inputs.forEach(input => form.append('input', input, input.name))
      form.append('type', options.jobType || 'reconstruct')
      form.append('inputType', inputType)
      form.append('quality', quality)
      form.append('options', JSON.stringify(options))
      return uploadMultipart(`${this.baseUrl}/jobs`, form, { onProgress })
    }
    if (!inputPath) throw new Error('本地 Companion 需要本机素材路径或浏览器文件')
    const response = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      headers: { ...jsonHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ type: options.jobType || 'reconstruct', payload: { input: inputPath, inputType, quality, prompt: options.prompt || '', options } })
    })
    return readResponse(response)
  }

  async getJob(jobId) {
    const response = await fetch(`${this.baseUrl}/jobs/${encodeURIComponent(jobId)}`, { headers: jsonHeaders() })
    const body = await readResponse(response)
    const artifact = body?.result?.artifact || body?.artifact
    artifactUrl(this.baseUrl, artifact, jobId)
    if (Array.isArray(body?.result?.artifacts)) body.result.artifacts.forEach(item => artifactUrl(this.baseUrl, item, jobId))
    return body
  }

  async cancelJob(jobId) {
    const response = await fetch(`${this.baseUrl}/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', headers: jsonHeaders() })
    return readResponse(response)
  }

  async resumeJob(jobId) {
    const response = await fetch(`${this.baseUrl}/jobs/${encodeURIComponent(jobId)}/resume`, { method: 'POST', headers: jsonHeaders() })
    return readResponse(response)
  }

  async getArtifacts(jobId) {
    const response = await fetch(`${this.baseUrl}/jobs/${encodeURIComponent(jobId)}/assets`, { headers: jsonHeaders() })
    const body = await readResponse(response)
    Object.values(body || {}).forEach(item => artifactUrl(this.baseUrl, item, jobId))
    return body
  }
}

export function createReconstructionProviders() {
  const config = globalThis.__xiyou?.reconstruction || {}
  const remoteUrl = config.remoteUrl || globalThis.__XIYOU_RECONSTRUCTION_URL || ''
  const workerParam = new URLSearchParams(globalThis.location?.search || '').get('worker')
  const localUrl = (workerParam ? `http://${workerParam}` : '') || config.localUrl || globalThis.__XIYOU_GPU_WORKER_URL || 'http://127.0.0.1:8787'
  return {
    local: new LocalGpuWorkerProvider({ baseUrl: localUrl }),
    remote: new HttpGaussianReconstructionProvider({ baseUrl: remoteUrl })
  }
}

export function makeClientJob({ source, sources = [], inputType, quality, provider = 'remote' }) {
  const names = Array.isArray(sources) && sources.length ? sources.map(item => item?.name).filter(Boolean) : []
  return {
    id: randomId(),
    status: 'created',
    stage: 'created',
    progress: 0,
    sourceName: source?.name || names[0] || '',
    sourceCount: Math.max(1, names.length || (source ? 1 : 0)),
    inputType,
    quality,
    provider,
    message: '等待开始',
    warnings: [],
    logs: [],
    createdAt: new Date().toISOString()
  }
}
