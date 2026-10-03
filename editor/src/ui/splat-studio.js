import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { DropInViewer, SceneFormat } from '@mkkellogg/gaussian-splats-3d'
import { store } from '../core/store.js'
import { createReconstructionProviders, makeClientJob } from '../core/reconstruction.js'
import { iconMarkup } from './components/icon.js'
import { log } from './log.js'

const ACCEPTED_SPLATS = '.ply,.sog,.spz,.splat,.ksplat'
const ACCEPTED_VIDEO = 'video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm'
const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
const QUALITY_LABELS = { fast: '快速', balanced: '均衡', high: '精细' }
const STAGES = [
  ['created', '准备'],
  ['analyzing', '分析素材'],
  ['preparing_frames', '准备画面'],
  ['extracting_features', '提取特征'],
  ['matching', '相机匹配'],
  ['reconstructing', '相机重建'],
  ['training_splats', '训练 Gaussian'],
  ['validating', '校验输出'],
  ['ready', '已就绪']
]

function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function formatBytes(value = 0) {
  const bytes = Number(value) || 0
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function isSplatFile(file) {
  return /\.(ply|sog|spz|splat|ksplat)$/i.test(file?.name || '')
}

function sceneFormatFor(name) {
  const extension = String(name || '').split('?')[0].split('#')[0].toLowerCase().split('.').pop()
  return extension === 'ply' ? SceneFormat.Ply : extension === 'splat' ? SceneFormat.Splat : extension === 'ksplat' ? SceneFormat.KSplat : extension === 'spz' ? SceneFormat.Spz : undefined
}

function colorForStatus(status) {
  if (status === 'ready' || status === 'completed' || status === 'ok') return 'ok'
  if (status === 'offline' || status === 'failed' || status === 'danger') return 'danger'
  if (status === 'unconfigured' || status === 'warning' || status === 'warn') return 'warn'
  return 'info'
}

function cropDefaults(kind) {
  return kind === 'sphere'
    ? { kind, center: [0, 0, 0], radius: 1, enabled: true, mode: 'non-destructive' }
    : { kind: 'box', center: [0, 0, 0], size: [1, 1, 1], enabled: true, mode: 'non-destructive' }
}

class StudioPreview {
  constructor(container) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#dce6ee')
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1000)
    this.camera.position.set(4, 3, 6)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(1, 1)
    this.container.appendChild(this.renderer.domElement)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }
    this.group = new THREE.Group()
    this.scene.add(this.group)
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x91a3b5, 1.8))
    const light = new THREE.DirectionalLight(0xffffff, 1.4)
    light.position.set(4, 8, 5)
    this.scene.add(light)
    const grid = new THREE.GridHelper(20, 20, 0xa7b6c5, 0xcbd6df)
    grid.position.y = -0.01
    this.scene.add(grid)
    this.viewer = null
    this.cropHelper = null
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.running = true
    this.frame = requestAnimationFrame(() => this.render())
  }

  render() {
    if (!this.running) return
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.frame = requestAnimationFrame(() => this.render())
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth)
    const height = Math.max(1, this.container.clientHeight)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  async load(url, name, transform = { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }, crop = null) {
    this.clear()
    if (!url) return
    const viewer = new DropInViewer()
    this.group.add(viewer)
    this.viewer = viewer
    try {
      await viewer.addSplatScene(url, { format: sceneFormatFor(name), showLoadingUI: false, progressiveLoad: false })
      this.applyTransform(transform)
      this.applyCrop(crop)
      this.controls.target.set(0, 1, 0)
      this.controls.update()
    } catch (error) {
      this.clear()
      throw error
    }
  }

  applyTransform(transform) {
    this.group.position.fromArray((transform.position || [0, 0, 0]).map(Number))
    this.group.rotation.set(...(transform.rotation || [0, 0, 0]).map(value => Number(value) * Math.PI / 180))
    this.group.scale.setScalar(Math.max(0.001, Number(transform.scale) || 1))
  }

  applyCrop(crop) {
    if (this.cropHelper) {
      this.group.remove(this.cropHelper)
      this.cropHelper.traverse(node => {
        node.geometry?.dispose?.()
        node.material?.dispose?.()
      })
      this.cropHelper = null
    }
    if (!crop?.enabled) return
    const helper = new THREE.Group()
    helper.userData.isHelper = true
    if (crop.kind === 'sphere') {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.001, Number(crop.radius) || 1), 24, 16),
        new THREE.MeshBasicMaterial({ color: '#f97316', wireframe: true, transparent: true, opacity: 0.8 })
      )
      helper.add(mesh)
    } else {
      const size = (crop.size || [1, 1, 1]).map(value => Math.max(0.001, Number(value) || 1))
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...size),
        new THREE.MeshBasicMaterial({ color: '#f97316', wireframe: true, transparent: true, opacity: 0.8 })
      )
      helper.add(mesh)
    }
    helper.position.fromArray((crop.center || [0, 0, 0]).map(Number))
    this.group.add(helper)
    this.cropHelper = helper
  }

  clear() {
    if (this.viewer) {
      this.group.remove(this.viewer)
      Promise.resolve(this.viewer.dispose?.()).catch(() => {})
      this.viewer = null
    }
    if (this.cropHelper) {
      this.group.remove(this.cropHelper)
      this.cropHelper.traverse(node => { node.geometry?.dispose?.(); node.material?.dispose?.() })
      this.cropHelper = null
    }
  }

  dispose() {
    this.running = false
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.clear()
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}

export function mount(root) {
  const providers = createReconstructionProviders()
  const state = {
    step: 'input',
    source: null,
    sources: [],
    inputType: 'video',
    quality: 'balanced',
    provider: 'local',
    sourceMeta: null,
    providerHealth: {},
    job: null,
    outputs: [],
    qualityReport: null,
    asset: null,
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
    crop: null,
    preview: null,
    objectUrl: null,
    persistentUrl: '',
    sceneAssetId: '',
    polling: null,
    busy: false,
    notice: null,
    footerTab: 'logs',
    footerHeight: loadFooterHeight(),
    providerHealthRetry: 0,
    providerHealthTimer: null,
    sourceObjectUrls: []
  }

  const api = { enter, exit, dispose }
  root._studio = api
  root.innerHTML = ''

  function loadFooterHeight() {
    try {
      const value = Number(localStorage.getItem('xiyou.splatStudio.footerHeight'))
      return Number.isFinite(value) ? Math.max(120, Math.min(480, Math.round(value))) : 166
    } catch {
      return 166
    }
  }

  function saveFooterHeight() {
    try { localStorage.setItem('xiyou.splatStudio.footerHeight', String(state.footerHeight)) } catch {}
  }

  function resizeFooter(event) {
    const handle = event.currentTarget
    const startY = Number(handle.dataset.resizeStartY)
    const startHeight = Number(handle.dataset.resizeStartHeight)
    if (!Number.isFinite(startY) || !Number.isFinite(startHeight)) return
    const maxHeight = Math.max(220, Math.min(480, Math.floor(window.innerHeight * 0.68)))
    state.footerHeight = Math.max(120, Math.min(maxHeight, Math.round(startHeight + startY - event.clientY)))
    const footer = root.querySelector('.studio-footer')
    if (footer) footer.style.flexBasis = `${state.footerHeight}px`
  }

  function stopFooterResize(event) {
    const handle = event.currentTarget
    if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId)
    handle.removeEventListener('pointermove', resizeFooter)
    handle.removeEventListener('pointerup', stopFooterResize)
    handle.removeEventListener('pointercancel', stopFooterResize)
    handle.removeAttribute('data-resize-start-y')
    handle.removeAttribute('data-resize-start-height')
    document.body.classList.remove('studio-footer-resizing')
    saveFooterHeight()
  }

  function startFooterResize(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const handle = event.currentTarget
    handle.dataset.resizeStartY = String(event.clientY)
    handle.dataset.resizeStartHeight = String(state.footerHeight)
    handle.setPointerCapture?.(event.pointerId)
    handle.addEventListener('pointermove', resizeFooter)
    handle.addEventListener('pointerup', stopFooterResize)
    handle.addEventListener('pointercancel', stopFooterResize)
    document.body.classList.add('studio-footer-resizing')
    event.preventDefault()
  }

  function enter() {
    render()
    refreshProviders()
    if (state.asset) requestAnimationFrame(() => loadPreview())
  }

  function exit({ apply = false } = {}) {
    if (apply) applyToScene()
    stopPolling()
    state.preview?.dispose()
    state.preview = null
    // 会话数据和本地临时资产保留，返回工作台时可以继续编辑。
  }

  function dispose() {
    exit()
    if (state.providerHealthTimer) window.clearTimeout(state.providerHealthTimer)
    state.providerHealthTimer = null
    releaseSessionUrls()
  }

  function setNotice(message, level = 'info') {
    state.notice = { message, level }
    render()
  }

  function releaseSessionUrls() {
    const referenced = new Set((store.scene?.meta?.assets || []).map(asset => asset?.url).filter(Boolean))
    state.sourceObjectUrls.forEach(({ ref, url }) => {
      if (ref && !referenced.has(ref)) {
        window.__xiyouBlobMap?.delete(ref)
        URL.revokeObjectURL(url)
      }
    })
    state.sourceObjectUrls = []
    if (state.objectUrl && !state.persistentUrl) URL.revokeObjectURL(state.objectUrl)
    state.objectUrl = null
  }

  function resetInput() {
    stopPolling()
    releaseSessionUrls()
    state.step = 'input'
    state.source = null
    state.sources = []
    state.sourceMeta = null
    state.asset = null
    state.sceneAssetId = ''
    state.persistentUrl = ''
    state.job = null
    state.outputs = []
    state.qualityReport = null
    state.crop = null
    state.transform = { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }
    state.notice = null
    state.preview?.clear()
    render()
  }

  function stopPolling() {
    if (state.polling) window.clearInterval(state.polling)
    state.polling = null
  }

  async function refreshProviders({ retry = true } = {}) {
    const entries = await Promise.all(Object.entries(providers).map(async ([key, provider]) => [key, await provider.health()]))
    entries.forEach(([key, health]) => { state.providerHealth[key] = health })
    const local = state.providerHealth.local
    if (local?.ok) {
      state.providerHealthRetry = 0
      if (state.providerHealthTimer) window.clearTimeout(state.providerHealthTimer)
      state.providerHealthTimer = null
    } else if (retry && state.step !== 'edit' && state.providerHealthRetry < 8) {
      state.providerHealthRetry += 1
      if (state.providerHealthTimer) window.clearTimeout(state.providerHealthTimer)
      state.providerHealthTimer = window.setTimeout(() => {
        state.providerHealthTimer = null
        refreshProviders({ retry: true })
      }, 1200)
    }
    render()
  }

  function createLocalRef(file) {
    const ref = `local://splat-studio/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${file.name}`
    const url = URL.createObjectURL(file)
    window.__xiyouBlobMap ||= new Map()
    window.__xiyouBlobMap.set(ref, url)
    state.sourceObjectUrls.push({ ref, url })
    return { ref, url }
  }

  function showAsset(file, { name = file.name } = {}) {
    if (state.objectUrl && !state.persistentUrl) URL.revokeObjectURL(state.objectUrl)
    const local = createLocalRef(file)
    state.objectUrl = local.url
    state.persistentUrl = local.ref
    state.source = file
    state.sources = [file]
    state.asset = { name, url: local.url, persistentUrl: local.ref, format: name.split('.').pop()?.toLowerCase() || '', bytes: file.size || 0, source: 'local-file', temporary: true }
    state.step = 'edit'
    state.notice = null
    render()
    requestAnimationFrame(() => loadPreview())
  }

  async function loadPreview() {
    if (!state.asset || !state.preview) return
    try {
      await state.preview.load(state.asset.url, state.asset.name, state.transform, state.crop)
      state.notice = null
      renderStatusOnly()
    } catch (error) {
      state.notice = { message: `高斯资产加载失败：${error?.message || error}`, level: 'danger' }
      render()
    }
  }

  async function pickSource(event) {
    const files = Array.from(event.target.files || []).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    event.target.value = ''
    if (!files.length) return
    const splats = files.filter(isSplatFile)
    if (splats.length) {
      if (splats.length > 1) setNotice('一次只能预览一个高斯资产，已使用第一个文件。', 'warn')
      showAsset(splats[0])
      return
    }
    state.sources = files
    state.source = files[0]
    state.inputType = files.length > 1 || files.every(file => file.type.startsWith('image/')) ? 'images' : 'video'
    state.sourceMeta = state.inputType === 'video' ? await readVideoMeta(files[0]) : await readImageMeta(files[0])
    state.step = 'input'
    state.notice = null
    render()
  }

  function readVideoMeta(file) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve({ duration: video.duration || 0, width: video.videoWidth || 0, height: video.videoHeight || 0 }) }
      video.onerror = () => { URL.revokeObjectURL(url); resolve({}) }
      video.src = url
    })
  }

  function readImageMeta(file) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }) }
      image.onerror = () => { URL.revokeObjectURL(url); resolve({}) }
      image.src = url
    })
  }

  async function createJob() {
    if (!state.source || !state.sources.length) return
    const provider = providers[state.provider]
    const health = await provider.health()
    state.providerHealth[state.provider] = health
    if (!health.ok) {
      state.notice = {
        message: `${health.message || '重建 Provider 不可用'}。请先重启本地开发服务，或检查本地 Worker 是否运行在 127.0.0.1:8787。`,
        level: 'danger'
      }
      render()
      return
    }
    state.busy = true
    state.job = makeClientJob({ source: state.source, sources: state.sources, inputType: state.inputType, quality: state.quality, provider: state.provider })
    state.job.stage = 'analyzing'
    state.job.status = 'running'
    state.job.message = '正在连接重建 Provider'
    state.job.logs = [{ at: new Date().toISOString(), stage: 'analyzing', message: state.job.message }]
    state.step = 'job'
    state.notice = null
    render()
    try {
      const result = await provider.createJob({
        file: state.source,
        files: state.sources,
        inputType: state.inputType,
        quality: state.quality,
        options: { plannerEnabled: true },
        onProgress: (progress) => {
          if (!state.job || !state.busy) return
          state.job.message = `正在上传素材（${progress}%）`
          state.job.progress = Math.min(8, Math.round(progress / 100 * 8))
          state.job.logs = [...(state.job.logs || []).slice(-20), { at: new Date().toISOString(), stage: 'analyzing', message: state.job.message }]
          renderStatusOnly()
        }
      })
      if (!result || typeof result !== 'object') throw new Error('重建服务返回了无效任务响应')
      state.job = { ...state.job, ...result, id: result.id || result.jobId || state.job.id }
      state.job.message = result.message || '任务已创建，等待 GPU Worker'
      state.polling = window.setInterval(() => pollJob(), 900)
      await pollJob()
    } catch (error) {
      state.busy = false
      state.job.status = 'failed'
      state.job.stage = 'failed'
      state.job.message = error?.message || String(error)
      state.job.logs = [...(state.job.logs || []), { at: new Date().toISOString(), stage: 'failed', message: state.job.message }]
      state.notice = { message: state.job.message, level: 'danger' }
      render()
    }
  }

  async function materializeLocalArtifact(artifact) {
    if (state.provider !== 'local' || !artifact?.url) return artifact
    const response = await fetch(artifact.url)
    if (!response.ok) throw new Error(`本地输出下载失败：${response.status}`)
    const blob = await response.blob()
    const ref = `local://splat-studio/output-${Date.now().toString(36)}-${artifact.name || 'scene.sog'}`
    const url = URL.createObjectURL(blob)
    window.__xiyouBlobMap ||= new Map()
    window.__xiyouBlobMap.set(ref, url)
    state.sourceObjectUrls.push({ ref, url })
    return { ...artifact, url, persistentUrl: ref, bytes: blob.size, temporary: true }
  }

  async function pollJob() {
    if (!state.job?.id) return
    try {
      const next = await providers[state.provider].getJob(state.job.id)
      state.job = { ...state.job, ...next }
      const result = next.result || {}
      state.outputs = (result.artifacts || (result.artifact ? [result.artifact] : [])).map(item => {
        if (item?.url?.startsWith('/')) item.url = `${providers[state.provider].baseUrl || ''}${item.url}`
        return item
      })
      state.qualityReport = result.qualityReport || null
      if (['completed', 'ready', 'done'].includes(next.status)) {
        stopPolling()
        state.busy = false
        const artifact = next.artifact || result.artifact || result.splat || result.output || state.outputs.find(item => item.kind === 'splat' || item.format === 'sog' || item.format === 'ply')
        if (artifact?.url) {
          const resolvedArtifact = await materializeLocalArtifact(artifact)
          state.asset = { name: resolvedArtifact.name || 'scene.sog', url: resolvedArtifact.url, persistentUrl: resolvedArtifact.persistentUrl || resolvedArtifact.url, format: resolvedArtifact.format || 'sog', bytes: resolvedArtifact.bytes || 0, source: 'provider', temporary: state.provider === 'local' }
          state.step = 'edit'
          render()
          requestAnimationFrame(() => loadPreview())
        } else {
          state.notice = { message: '任务完成，但当前 Provider 只返回了输入包；配置 XIYOU_RECONSTRUCTOR_BIN 后才会生成可预览 Gaussian 资产。', level: 'warn' }
          state.footerTab = 'quality'
          render()
        }
      } else if (['failed', 'cancelled'].includes(next.status)) {
        stopPolling()
        state.busy = false
        state.notice = { message: next.error || next.message || '重建任务失败', level: next.status === 'failed' ? 'danger' : 'warn' }
        render()
      } else renderStatusOnly()
    } catch (error) {
      state.notice = { message: `查询任务失败：${error?.message || error}`, level: 'danger' }
      render()
    }
  }

  async function resumeJob() {
    if (!state.job?.id) return
    try {
      await providers[state.provider].resumeJob(state.job.id)
      state.busy = true
      state.job.status = 'running'
      state.notice = null
      state.polling = window.setInterval(() => pollJob(), 900)
      render()
    } catch (error) {
      setNotice(`恢复任务失败：${error?.message || error}`, 'danger')
    }
  }

  async function cancelJob() {
    if (!state.job?.id) return
    try { await providers[state.provider].cancelJob(state.job.id) } catch (error) { state.notice = { message: `取消任务失败：${error?.message || error}`, level: 'danger' } }
    stopPolling()
    state.busy = false
    state.job.status = 'cancelled'
    state.job.stage = 'cancelled'
    state.job.message = '已取消'
    state.job.logs = [...(state.job.logs || []), { at: new Date().toISOString(), stage: 'cancelled', message: '已取消' }]
    state.notice = { message: '已取消重建任务，可恢复或重新提交。', level: 'warn' }
    render()
  }

  function updateTransform(group, index, value) {
    state.transform[group][index] = Number(value) || 0
    state.preview?.applyTransform(state.transform)
    renderStatusOnly()
  }

  function updateScale(value) {
    state.transform.scale = Math.max(0.001, Number(value) || 1)
    state.preview?.applyTransform(state.transform)
    renderStatusOnly()
  }

  function updateCrop(group, index, value) {
    if (!state.crop) return
    state.crop[group][index] = Number(value) || 0
    state.preview?.applyCrop(state.crop)
    renderStatusOnly()
  }

  function updateCropScalar(key, value) {
    if (!state.crop) return
    state.crop[key] = Math.max(0.001, Number(value) || 1)
    state.preview?.applyCrop(state.crop)
    renderStatusOnly()
  }

  function persistentAssetUrl() {
    return state.asset?.persistentUrl || state.asset?.url || ''
  }

  function findOrCreateSceneAsset(url) {
    const existing = state.sceneAssetId && store.scene.meta.assets.find(item => item.id === state.sceneAssetId)
    if (existing) return existing
    const asset = store.addAsset({
      name: state.asset.name || '高斯空间底座',
      kind: 'splat',
      type: 'splat',
      bytes: state.asset.bytes || 0,
      mime: 'application/octet-stream',
      url,
      source: state.asset.source === 'provider' ? 'reconstruction-provider' : 'splat-studio',
      metadata: { format: state.asset.format, provider: state.provider, temporary: Boolean(state.asset.temporary), localPreview: Boolean(state.asset.temporary) }
    })
    state.sceneAssetId = asset.id
    return asset
  }

  function applyToScene() {
    if (!state.asset?.url) {
      setNotice('请先导入或生成一个高斯资产', 'warn')
      return
    }
    const url = persistentAssetUrl()
    const asset = findOrCreateSceneAsset(url)
    const euler = new THREE.Euler(...state.transform.rotation.map(value => Number(value) * Math.PI / 180), 'XYZ')
    const matrix = new THREE.Matrix4().makeRotationFromEuler(euler)
    const r = [matrix.elements[0], matrix.elements[1], matrix.elements[2], matrix.elements[4], matrix.elements[5], matrix.elements[6], matrix.elements[8], matrix.elements[9], matrix.elements[10]]
    const artifacts = Object.fromEntries((state.outputs || []).map(item => [item.kind || item.format || item.name, { name: item.name, url: item.url || '', format: item.format || '', bytes: item.bytes || 0 }]))
    if (state.asset?.format) artifacts.splat ||= { name: state.asset.name, url, format: state.asset.format, bytes: state.asset.bytes || 0 }
    const captureId = store.scene.base.capture_id || `capture_${Date.now().toString(36)}`
    const capture = {
      id: captureId,
      provider: state.provider,
      input_type: state.inputType,
      source_name: state.source?.name || '',
      source_count: state.sources.length || 1,
      quality: state.quality,
      temporary: Boolean(state.asset.temporary),
      created_at: store.scene.base.capture?.created_at || new Date().toISOString()
    }
    const revision = Number(store.scene.base.editing?.revision) || 0
    store.setBase({
      capture_id: captureId,
      capture,
      sog_url: url,
      transform: { s: state.transform.scale, R: r, t: [...state.transform.position], scale_source: 'splat-studio' },
      coordinate_system: { up: 'Y', forward: '-Z', handedness: 'right', units: 'meters', origin: 'capture' },
      artifacts,
      editing: { revision: revision + 1, transform: state.transform, crop: state.crop, deletion_mask: null },
      quality: state.qualityReport || { provider: state.provider, quality: state.quality, warnings: state.job?.warnings || [] },
      splat_editor: { transform: state.transform, crop: state.crop, asset_id: asset.id, revision: revision + 1 }
    })
    log(`已将「${asset.name}」应用为空间底座`)
    state.step = 'apply'
    state.notice = { message: state.asset.temporary ? '已应用为本机临时预览；发布前请上传到持久化资产存储。' : '已应用到底座，可返回场景创作继续布置互动内容。', level: state.asset.temporary ? 'warn' : 'info' }
    store.setEditorMode?.('scene')
  }

  function renderStatusOnly() {
    root.querySelectorAll('[data-studio-progress], [data-studio-notice], [data-transform-status], [data-crop-status]').forEach(node => {
      if (node.matches('[data-studio-progress]')) node.innerHTML = progressMarkup()
      if (node.matches('[data-studio-notice]')) node.innerHTML = noticeMarkup()
      if (node.matches('[data-transform-status]')) node.textContent = `${state.transform.position.map(value => Number(value).toFixed(2)).join(' / ')} · 缩放 ${Number(state.transform.scale).toFixed(2)}`
      if (node.matches('[data-crop-status]')) node.textContent = state.crop ? `${state.crop.kind === 'box' ? '盒形' : '球形'} · 非破坏式修订` : '未启用裁切'
    })
  }

  function noticeMarkup() {
    return state.notice ? `<div class="studio-notice ${colorForStatus(state.notice.level)}" role="status">${iconMarkup(state.notice.level === 'danger' ? 'error-warning-line' : 'information-line')}<span>${esc(state.notice.message)}</span></div>` : ''
  }

  function progressMarkup() {
    const job = state.job
    if (!job) return '<div class="studio-empty-copy">尚未创建生成任务</div>'
    const activeIndex = Math.max(0, STAGES.findIndex(([id]) => id === job.stage))
    const complete = ['completed', 'ready', 'done'].includes(job.status)
    return `<div class="studio-progress-head"><strong>${esc(job.message || '处理中')}</strong><b>${Math.round(Number(job.progress) || 0)}%</b></div><div class="studio-progress-bar"><i style="width:${Math.max(0, Math.min(100, Number(job.progress) || 0))}%"></i></div><div class="studio-stage-list">${STAGES.map(([id, label], index) => `<span class="${index < activeIndex || complete ? 'done' : index === activeIndex ? 'active' : ''}"><i></i>${label}</span>`).join('')}</div>`
  }

  function outputMarkup() {
    if (!state.outputs.length) return '<div class="studio-empty-copy">任务完成后，manifest、质量报告和 Gaussian 输出会出现在这里。</div>'
    return `<div class="studio-output-list">${state.outputs.map(item => `<div class="studio-output-item"><span class="studio-output-kind">${esc(item.kind || item.format || 'asset')}</span><strong>${esc(item.name || '未命名输出')}</strong><span>${esc(item.format || '')}${item.bytes ? ` · ${formatBytes(item.bytes)}` : ''}</span>${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noreferrer">打开</a>` : ''}</div>`).join('')}</div>`
  }

  function qualityMarkup() {
    const report = state.qualityReport
    if (!report) return '<div class="studio-empty-copy">尚未收到质量报告。没有配置真实重建器时，这里会标记为输入准备阶段。</div>'
    const warnings = report.warnings || state.job?.warnings || []
    return `<div class="studio-quality-report"><div><span>Provider</span><b>${esc(report.provider || state.provider)}</b></div><div><span>质量档位</span><b>${esc(QUALITY_LABELS[report.quality] || report.quality || '—')}</b></div><div><span>输入帧</span><b>${esc(report.frameCount ?? '—')}</b></div><div><span>注册率</span><b>${report.registrationRate == null ? '待重建器返回' : `${Math.round(Number(report.registrationRate) * 100)}%`}</b></div><div><span>Gaussian 点数</span><b>${esc(report.pointCount ?? '待重建器返回')}</b></div>${warnings.length ? `<div class="studio-report-warnings">${warnings.map(item => `<span>${iconMarkup('error-warning-line')}${esc(item)}</span>`).join('')}</div>` : '<div class="studio-report-ok">未发现 Provider 警告</div>'}</div>`
  }

  function footerMarkup() {
    const tabs = [['logs', '任务与日志'], ['outputs', '输出资产'], ['quality', '质量报告']]
    const content = state.footerTab === 'outputs' ? outputMarkup() : state.footerTab === 'quality' ? qualityMarkup() : `<div data-studio-progress>${progressMarkup()}</div><div class="studio-log-list">${(state.job?.logs || []).slice(-12).map(item => `<div><time>${esc(item.at ? new Date(item.at).toLocaleTimeString('zh-CN', { hour12: false }) : '')}</time><span>${esc(item.message || '')}</span></div>`).join('') || '<div class="studio-empty-copy">任务日志会显示在这里。</div>'}</div>${noticeMarkup() ? `<div data-studio-notice>${noticeMarkup()}</div>` : '<div data-studio-notice></div>'}`
    return `<footer class="studio-footer" style="flex-basis:${state.footerHeight}px"><button class="studio-footer-resize" type="button" data-studio-footer-resize aria-label="调整任务日志高度" title="拖动调整任务日志高度"><i></i></button><div class="studio-footer-tabs">${tabs.map(([id, label]) => `<button class="${state.footerTab === id ? 'active' : ''}" data-footer-tab="${id}">${label}${id === 'outputs' && state.outputs.length ? ` <em>${state.outputs.length}</em>` : ''}</button>`).join('')}</div><div class="studio-footer-content">${content}</div></footer>`
  }

  function render() {
    const step = state.step
    root.innerHTML = `
      <div class="splat-studio-shell">
        <header class="studio-header">
          <div class="studio-title"><span class="studio-title-icon">${iconMarkup('sparkling-2-line')}</span><div><strong>场景工作台</strong><span>Gaussian Splat 场景创建与编辑</span></div></div>
          <div class="studio-header-center"><span class="studio-step ${step === 'input' ? 'active' : ''}">1 输入素材</span><span class="studio-step ${step === 'job' ? 'active' : ''}">2 生成任务</span><span class="studio-step ${step === 'edit' ? 'active' : ''}">3 编辑场景</span><span class="studio-step ${step === 'apply' ? 'active' : ''}">4 应用场景</span></div>
          <div class="studio-actions"><button class="btn" data-studio-back>${iconMarkup('arrow-left-line')} 返回场景创作</button>${step === 'edit' ? `<button class="btn primary" data-studio-apply>${iconMarkup('check-line')} 应用到底座</button>` : ''}</div>
        </header>
        <div class="studio-body">
          <aside class="studio-workflow">${workflowMarkup()}</aside>
          <main class="studio-viewport"><div class="studio-viewport-toolbar"><span class="studio-viewport-label">${state.asset ? esc(state.asset.name) : '未加载高斯资产'}</span><span class="studio-renderer-chip">${state.asset ? 'GSPLAT PREVIEW' : '等待输入'}</span></div><div class="studio-canvas" data-studio-canvas></div><div class="studio-canvas-empty" data-studio-empty ${state.asset ? 'hidden' : ''}><div>${iconMarkup('landscape-line')}</div><strong>高斯场景预览</strong><span>${state.sources.length ? '完成生成任务后会在此加载 Gaussian 资产。' : '导入 PLY / SOG，或选择视频 / 序列帧开始生成。'}</span></div></main>
          <aside class="studio-inspector">${inspectorMarkup()}</aside>
        </div>
        ${footerMarkup()}
      </div>
    `
    bind()
    if (!state.preview) {
      state.preview = new StudioPreview(root.querySelector('[data-studio-canvas]'))
      if (state.asset) loadPreview()
    }
  }

  function workflowMarkup() {
    const health = state.providerHealth[state.provider]
    const countLabel = state.sources.length > 1 ? `${state.sources.length} 帧` : state.source ? formatBytes(state.source.size) : '从真实空间素材开始'
    return `<div class="studio-section-title"><span>工作流</span><span class="studio-live-dot"></span></div>
      <div class="studio-mini-stepper" aria-label="场景工作流程">${[['input','输入素材'],['job','生成任务'],['edit','编辑场景'],['apply','应用场景']].map(([id,label], index) => `<span class="studio-mini-step ${state.step === id ? 'active' : state.step === 'edit' && index < 3 || state.step === 'apply' && index < 4 ? 'done' : ''}"><i>${index + 1}</i>${label}</span>`).join('')}</div>
      <div class="studio-source-card"><div class="studio-source-icon">${iconMarkup(state.source && state.inputType === 'video' ? 'video-line' : 'image-2-line')}</div><div><strong>${state.source ? esc(state.source.name) : '选择视频或序列帧'}</strong><span>${state.source ? `${countLabel} · ${state.inputType === 'video' ? '视频' : '图片序列'}` : '从真实空间素材开始'}</span></div></div>
      <div class="studio-workflow-actions"><div class="studio-input-actions"><label class="btn btn-secondary">${iconMarkup('upload-2-line')} <span>选择视频 / 文件</span><input hidden type="file" accept="${ACCEPTED_VIDEO},${ACCEPTED_IMAGES},${ACCEPTED_SPLATS}" data-studio-file></label><label class="btn">${iconMarkup('folder-upload-line')} <span>选择序列帧目录</span><input hidden type="file" multiple webkitdirectory accept="${ACCEPTED_IMAGES}" data-studio-directory></label></div><button class="btn studio-reset-action" data-studio-reset ${state.source || state.asset ? '' : 'disabled'}>${iconMarkup('refresh-line')} <span>重新开始</span></button></div>
      ${state.source && !state.asset ? `<div class="studio-source-meta">${metaMarkup()}</div>` : ''}
      <div class="studio-quality"><div class="studio-label-row"><strong>生成质量</strong><span>Provider</span></div><div class="quality-segments">${Object.entries(QUALITY_LABELS).map(([id, label]) => `<button class="${state.quality === id ? 'active' : ''}" data-quality="${id}">${label}</button>`).join('')}</div><label class="studio-select-row"><span>重建 Provider</span><select data-provider>${Object.entries(providers).map(([id, provider]) => `<option value="${id}" ${state.provider === id ? 'selected' : ''}>${provider.label}</option>`).join('')}</select></label><div class="provider-health ${health ? colorForStatus(health.status) : 'info'}"><i></i><span>${esc(health?.message || '正在检测 Provider')}</span></div></div>
      ${state.source && !state.asset ? `<button class="studio-generate-btn" data-studio-generate ${state.busy ? 'disabled' : ''}>${iconMarkup(state.busy ? 'loader-4-line' : 'sparkling-2-line')} ${state.busy ? '生成中…' : '开始生成高斯场景'}</button>` : ''}
      ${state.step === 'job' && state.busy ? `<button class="btn studio-cancel-btn" data-studio-cancel>${iconMarkup('close-line')} 取消重建</button>` : ''}
      ${state.job && !state.busy && ['cancelled', 'failed'].includes(state.job.status) ? `<div class="studio-job-actions"><button class="btn" data-studio-resume>${iconMarkup('play-line')} 恢复任务</button><button class="btn" data-studio-retry>${iconMarkup('refresh-line')} 重新提交</button></div>` : ''}
      <div class="studio-workflow-note" tabindex="0" role="note" title="查看 Provider 说明"><i>${iconMarkup('information-line')}</i><span>本地 Companion 接收浏览器 multipart 文件；远程 Provider 使用同一任务契约。未配置真实重建器时只生成输入包，不会伪装成已完成 Gaussian 训练。</span></div>`
  }

  function metaMarkup() {
    const meta = state.sourceMeta || {}
    const items = state.inputType === 'video' ? [['时长', `${Number(meta.duration || 0).toFixed(1)} s`], ['分辨率', `${meta.width || '—'} × ${meta.height || '—'}`]] : [['帧数', `${state.sources.length || 1}`], ['首帧', `${meta.width || '—'} × ${meta.height || '—'}`]]
    return items.map(([label, value]) => `<span><small>${label}</small><b>${value}</b></span>`).join('')
  }

  function inspectorMarkup() {
    if (state.step !== 'edit' || !state.asset) return `<div class="studio-inspector-empty"><div>${iconMarkup('settings-3-line')}</div><strong>编辑属性</strong><span>生成或导入高斯资产后，这里会显示 Transform、裁切和 Capture Package 状态。</span></div>`
    const t = state.transform
    const c = state.crop
    return `<div class="studio-section-title"><span>编辑属性</span><span class="studio-status-chip ok">已加载</span></div>
      <div class="studio-inspector-card"><h3>Transform</h3>${vectorMarkup('位置', 'position', t.position, 0.01)}${vectorMarkup('旋转', 'rotation', t.rotation, 1)}<label class="studio-number-row"><span>等比缩放</span><input type="number" min="0.001" max="10000" step="0.01" value="${esc(t.scale)}" data-transform-scale></label><div class="studio-transform-status" data-transform-status>${t.position.map(value => Number(value).toFixed(2)).join(' / ')} · 缩放 ${Number(t.scale).toFixed(2)}</div></div>
      <div class="studio-inspector-card"><div class="studio-card-heading"><h3>裁切区域</h3><span class="studio-status-chip ${c ? 'warn' : ''}">${c ? '已启用' : '未启用'}</span></div><div class="studio-crop-actions"><button class="btn ${c?.kind === 'box' ? 'active' : ''}" data-crop="box">${iconMarkup('box-3-line')} 盒形</button><button class="btn ${c?.kind === 'sphere' ? 'active' : ''}" data-crop="sphere">${iconMarkup('checkbox-blank-circle-line')} 球形</button><button class="btn" data-crop="clear">清除</button></div>${c ? `${vectorMarkup('中心', 'center', c.center, 0.01)}${c.kind === 'box' ? vectorMarkup('尺寸', 'size', c.size, 0.01) : `<label class="studio-number-row"><span>半径</span><input type="number" min="0.001" step="0.01" value="${esc(c.radius)}" data-crop-radius></label>`}` : ''}<div class="studio-transform-status" data-crop-status>${c ? `${c.kind === 'box' ? '盒形' : '球形'} · 非破坏式修订` : '未启用裁切'}</div><p class="studio-help">裁切框会进入 Capture Package 的 editing.crop；逐点 bake / edit.ply 由 Provider 的编辑能力决定，不在浏览器端伪造。</p></div>
      <div class="studio-inspector-card"><h3>Capture Package</h3><div class="studio-output-row"><span>Capture ID</span><b>${esc(store.scene.base.capture_id || '未应用')}</b></div><div class="studio-output-row"><span>坐标系</span><b>Y-up · 米制</b></div><div class="studio-output-row"><span>Provider</span><b>${esc(state.provider)}</b></div><div class="studio-output-row"><span>临时资产</span><b class="${state.asset.temporary ? 'studio-warning-text' : ''}">${state.asset.temporary ? '是，不能直接发布' : '否'}</b></div></div>
      <div class="studio-inspector-card"><h3>输出</h3><div class="studio-output-row"><span>格式</span><b>${esc(String(state.asset.format || 'splat').toUpperCase())}</b></div><div class="studio-output-row"><span>文件大小</span><b>${formatBytes(state.asset.bytes)}</b></div><div class="studio-output-row"><span>来源</span><b>${state.asset.source === 'provider' ? '重建 Provider' : '本地导入'}</b></div></div>`
  }

  function vectorMarkup(label, group, values, step) {
    return `<div class="studio-vector-row"><span>${label}</span>${values.map((value, index) => `<label><i>${['X', 'Y', 'Z'][index]}</i><input type="number" step="${step}" value="${esc(value)}" data-${group === 'position' || group === 'rotation' ? 'transform' : 'crop'}-group="${group}" data-${group === 'position' || group === 'rotation' ? 'transform' : 'crop'}-index="${index}"></label>`).join('')}</div>`
  }

  function bind() {
    root.querySelector('[data-studio-back]')?.addEventListener('click', () => store.setEditorMode?.('scene'))
    root.querySelector('[data-studio-apply]')?.addEventListener('click', () => applyToScene())
    root.querySelector('[data-studio-file]')?.addEventListener('change', pickSource)
    root.querySelector('[data-studio-directory]')?.addEventListener('change', pickSource)
    root.querySelector('[data-studio-reset]')?.addEventListener('click', resetInput)
    root.querySelector('[data-studio-generate]')?.addEventListener('click', createJob)
    root.querySelector('[data-studio-cancel]')?.addEventListener('click', cancelJob)
    root.querySelector('[data-studio-resume]')?.addEventListener('click', resumeJob)
    root.querySelector('[data-studio-retry]')?.addEventListener('click', createJob)
    root.querySelector('[data-provider]')?.addEventListener('change', event => { state.provider = event.target.value; state.providerHealthRetry = 0; refreshProviders() })
    root.querySelectorAll('[data-quality]').forEach(button => button.addEventListener('click', () => { state.quality = button.dataset.quality; render() }))
    root.querySelectorAll('[data-footer-tab]').forEach(button => button.addEventListener('click', () => { state.footerTab = button.dataset.footerTab; render() }))
    root.querySelector('[data-studio-footer-resize]')?.addEventListener('pointerdown', startFooterResize)
    root.querySelectorAll('[data-transform-group]').forEach(input => input.addEventListener('change', () => updateTransform(input.dataset.transformGroup, Number(input.dataset.transformIndex), input.value)))
    root.querySelector('[data-transform-scale]')?.addEventListener('change', event => updateScale(event.target.value))
    root.querySelectorAll('[data-crop-group]').forEach(input => input.addEventListener('change', () => updateCrop(input.dataset.cropGroup, Number(input.dataset.cropIndex), input.value)))
    root.querySelector('[data-crop-radius]')?.addEventListener('change', event => updateCropScalar('radius', event.target.value))
    root.querySelectorAll('[data-crop]').forEach(button => button.addEventListener('click', () => {
      state.crop = button.dataset.crop === 'clear' ? null : cropDefaults(button.dataset.crop)
      state.preview?.applyCrop(state.crop)
      render()
    }))
  }

  render()
  return api
}
