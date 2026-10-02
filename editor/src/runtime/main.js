import './style.css'
import * as THREE from 'three'
import { DropInViewer } from '@mkkellogg/gaussian-splats-3d'
import { defaults } from '../core/schema.js'
import { createNode } from '../core/objects.js'
import { elementVoiceSummary, elementObjectProps } from '../core/elements.js'
import { requestAi } from '../core/ai-provider.js'

const params = new URLSearchParams(location.search)
const room = params.get('room') || 'demo'
const sceneUrl = params.get('scene') || ''
const root = document.querySelector('#runtime')
const state = {
  scene: null,
  renderer: null,
  camera: null,
  world: null,
  base: null,
  nodes: new Map(),
  zones: new Map(),
  triggers: [],
  activeSequences: [],
  fired: new Set(),
  gaze: new Map(),
  hold: new Map(),
  enter: new Map(),
  collision: new Map(),
  stream: null,
  orientation: false,
  yaw: 0,
  pitch: 0,
  drag: null,
  last: performance.now(),
  cardTimer: 0,
  anchorMode: '等待定位',
  started: false,
  aiHistory: [],
  aiPending: null,
  runtimeStates: new Map(),
  score: 0,
  cameraShake: null
}

const esc = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

function sceneKey() {
  return `xiyou.scene.v2.${room}`
}

function readScene() {
  const parsePublished = scene => {
    if (scene?.scene && typeof scene.scene === 'object') scene = scene.scene
    const releaseQuery = params.get('release')
    const release = (scene?.meta?.releases || []).find(item => String(item.id) === releaseQuery || String(item.version) === releaseQuery)
    if (!release?.snapshot) return scene
    try { return JSON.parse(release.snapshot) } catch { return scene }
  }
  if (sceneUrl) return fetch(sceneUrl).then(response => {
    if (!response.ok) throw new Error(`场景加载失败：${response.status}`)
    return response.json().then(parsePublished)
  })
  try {
    const raw = localStorage.getItem(sceneKey())
    if (raw) return Promise.resolve(parsePublished(JSON.parse(raw)))
  } catch {}
  return Promise.resolve(defaults())
}

function ui() {
  root.innerHTML = `
    <div class="runtime-shell">
      <div class="runtime-stage"><video class="runtime-camera" muted autoplay playsinline></video><canvas class="runtime-canvas"></canvas><div class="runtime-reticle">＋</div></div>
      <header class="runtime-header"><div><strong>空间互动预览</strong><span class="runtime-project"></span></div><span class="runtime-anchor">定位中</span></header>
      <div class="runtime-card" hidden></div>
      <div class="runtime-start"><div class="runtime-start-brand"><img src="/xiyou/xj-logo.svg" alt=""><span>造梦 · 故事空间</span></div><div class="runtime-start-visual" aria-hidden="true"><span class="runtime-start-orbit runtime-start-orbit-a"></span><span class="runtime-start-orbit runtime-start-orbit-b"></span><div class="runtime-start-logo"><img src="/xiyou/xj-logo.svg" alt=""></div><span class="runtime-start-visual-label">XJ · 01</span></div><div class="runtime-start-kicker">SPATIAL ENTRY / AR EXPERIENCE</div><h1>进入虚境</h1><p>允许相机与方向权限，体验发布后的空间互动。</p><div class="runtime-start-actions"><button class="runtime-primary" data-start>开始体验</button><button class="runtime-secondary" data-demo>无相机预览</button></div><small>定位策略：VPS → QR/条码 → GPS → 手动参考点</small></div>
      <footer class="runtime-footer"><button data-reset>重新定位</button><span class="runtime-progress">节点 0/0</span><button data-exit>返回编辑器</button></footer>
      <button class="runtime-ai-fab" data-ai-toggle type="button" aria-expanded="false">AI</button>
      <section class="runtime-ai-panel" data-ai-panel hidden aria-label="游客 AI 场景助手">
        <header><strong>AI 场景助手</strong><button data-ai-close type="button" aria-label="关闭">×</button></header>
        <div class="runtime-ai-messages" data-ai-messages><div class="runtime-ai-note">这里只修改本次体验中的临时对象，不会改写已发布版本。</div></div>
        <div class="runtime-ai-input"><textarea data-ai-input rows="1" placeholder="例如：在我面前加一个发光箱子"></textarea><button data-ai-mic type="button" title="语音输入">🎙</button><button data-ai-send type="button">发送</button></div>
      </section>
      <div class="runtime-error" hidden></div>
    </div>`
  return {
    shell: root.querySelector('.runtime-shell'), stage: root.querySelector('.runtime-stage'), canvas: root.querySelector('.runtime-canvas'), camera: root.querySelector('.runtime-camera'),
    start: root.querySelector('.runtime-start'), startButton: root.querySelector('[data-start]'), demoButton: root.querySelector('[data-demo]'),
    anchor: root.querySelector('.runtime-anchor'), project: root.querySelector('.runtime-project'), card: root.querySelector('.runtime-card'), progress: root.querySelector('.runtime-progress'), error: root.querySelector('.runtime-error'),
    aiToggle: root.querySelector('[data-ai-toggle]'), aiPanel: root.querySelector('[data-ai-panel]'), aiClose: root.querySelector('[data-ai-close]'), aiMessages: root.querySelector('[data-ai-messages]'), aiInput: root.querySelector('[data-ai-input]'), aiMic: root.querySelector('[data-ai-mic]'), aiSend: root.querySelector('[data-ai-send]')
  }
}

const elements = ui()

elements.project.textContent = room === 'demo' ? '游客体验' : room

document.querySelector('[data-exit]').addEventListener('click', () => {
  location.href = `./?room=${encodeURIComponent(room)}`
})
document.querySelector('[data-reset]').addEventListener('click', () => { resetRuntimeState(); locate() })
elements.startButton.addEventListener('click', () => start(true))
elements.demoButton.addEventListener('click', () => start(false))
setupRuntimeAi()

function runtimeAiMessage(role, text) {
  const item = document.createElement('div')
  item.className = `runtime-ai-message ${role}`
  item.textContent = text
  elements.aiMessages.appendChild(item)
  elements.aiMessages.scrollTop = elements.aiMessages.scrollHeight
  return item
}

function parseRuntimeAi(content) {
  if (content && typeof content === 'object') return { reply: content.reply || content.message || '', ops: Array.isArray(content.ops) ? content.ops : [] }
  const text = String(content || '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return { reply: text, ops: [] }
  try {
    const parsed = JSON.parse(text.slice(start, end + 1))
    return { reply: parsed.reply || parsed.message || '', ops: Array.isArray(parsed.ops) ? parsed.ops : [] }
  } catch { return { reply: text, ops: [] } }
}

function runtimeFrontPosition() {
  const direction = new THREE.Vector3()
  state.camera.getWorldDirection(direction)
  return state.camera.position.clone().add(direction.multiplyScalar(2)).setY(Math.max(0, state.camera.position.y - 0.7)).toArray().map(value => Number(value.toFixed(2)))
}

function runtimePlanLabel(op) {
  return op?.op === 'add_element' ? `添加${op.name || op.element_id || '固定元素'}` : `添加${op?.name || '临时对象'}`
}

function appendRuntimePlan(plan) {
  const box = document.createElement('div')
  box.className = 'runtime-ai-plan'
  box.innerHTML = `<strong>待应用到本次体验</strong><ul>${plan.ops.slice(0, 3).map(op => `<li>${esc(runtimePlanLabel(op))}</li>`).join('')}</ul><div><button data-runtime-ai-cancel type="button">取消</button><button data-runtime-ai-apply type="button">应用</button></div>`
  elements.aiMessages.appendChild(box)
  elements.aiMessages.scrollTop = elements.aiMessages.scrollHeight
  box.querySelector('[data-runtime-ai-cancel]').addEventListener('click', () => box.remove())
  box.querySelector('[data-runtime-ai-apply]').addEventListener('click', () => {
    box.remove()
    applyRuntimeAiOps(plan.ops)
  })
}

function applyRuntimeAiOps(ops = []) {
  if (!state.scene || !state.world) return
  const applied = []
  for (const op of ops.slice(0, 3)) {
    try {
      const id = `runtime_${Math.random().toString(36).slice(2, 9)}`
      const position = Array.isArray(op.transform?.p) ? op.transform.p : runtimeFrontPosition()
      let def
      if (op.op === 'add_element' && op.element_id) {
        def = elementObjectProps(op.element_id, { id, name: op.name || '', transform: { ...(op.transform || {}), p: position }, interaction: op.interaction || {} })
      } else if (op.op === 'add_object' && ['compound', 'quad', 'light'].includes(op.type)) {
        def = { ...op, id, transform: { ...(op.transform || {}), p: position } }
      } else continue
      const node = makeObject(def)
      state.scene.objects = [...(state.scene.objects || []), def]
      state.nodes.set(id, node)
      state.world.add(node)
      if (def.interaction?.profile === 'tap_feedback' || /点击|触碰|打开/.test(String(op.name || ''))) {
        state.scene.triggers = [...(state.scene.triggers || []), { id: `runtime_trigger_${id}`, target: id, when: 'tap', params: {}, do: [{ action: 'highlight', args: { targetId: id } }, { action: 'card', args: { text: `${def.name || '对象'}已触发` } }] }]
      }
      applied.push(def.name || def.element_id || def.id)
    } catch (error) {
      runtimeAiMessage('error', `未能添加：${error?.message || '元素不存在'}`)
    }
  }
  if (applied.length) runtimeAiMessage('ai', `已在本次体验中添加：${applied.join('、')}。发布版本不会被修改。`)
}

async function sendRuntimeAi() {
  const text = elements.aiInput.value.trim()
  if (!text || !state.scene || state.aiPending) return
  elements.aiInput.value = ''
  runtimeAiMessage('user', text)
  state.aiPending = true
  elements.aiSend.disabled = true
  const controller = new AbortController()
  const summary = (state.scene.objects || []).slice(0, 80).map(item => `${item.id}|${item.element_id || item.type}|${item.name || ''}|p(${(item.transform?.p || []).join(',')})`).join('\n') || '无对象'
  const timeout = setTimeout(() => controller.abort(), 120000)
  const messages = [{ role: 'system', content: `你是游客端临时场景助手。只允许返回 JSON：{"reply":"≤60字","ops":[]}。只能使用 add_element（固定元素）或 add_object（compound/quad/light），最多3项。不要修改发布版本、底座、资源库、触发器或权限。没有明确位置时使用用户面前。固定元素目录：\n${elementVoiceSummary({ limit: 124 })}\n当前对象：\n${summary}` }, ...state.aiHistory, { role: 'user', content: text }]
  try {
    const result = await requestAi({ messages, signal: controller.signal })
    const parsed = parseRuntimeAi(result.content)
    runtimeAiMessage('ai', parsed.reply || '我准备了一组临时场景修改。')
    state.aiHistory.push({ role: 'user', content: text }, { role: 'assistant', content: parsed.reply || '' })
    state.aiHistory = state.aiHistory.slice(-10)
    if (parsed.ops.length) appendRuntimePlan(parsed)
  } catch (error) {
    runtimeAiMessage('error', error?.name === 'AbortError' ? 'AI 请求超时，请重试。' : `AI 暂时不可用：${error?.message || '连接失败'}`)
  } finally {
    clearTimeout(timeout)
    state.aiPending = false
    elements.aiSend.disabled = false
  }
}

function setupRuntimeAi() {
  elements.aiToggle.addEventListener('click', () => {
    elements.aiPanel.hidden = !elements.aiPanel.hidden
    elements.aiToggle.setAttribute('aria-expanded', String(!elements.aiPanel.hidden))
    if (!elements.aiPanel.hidden) elements.aiInput.focus()
  })
  elements.aiClose.addEventListener('click', () => { elements.aiPanel.hidden = true; elements.aiToggle.setAttribute('aria-expanded', 'false') })
  elements.aiSend.addEventListener('click', sendRuntimeAi)
  elements.aiInput.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendRuntimeAi() } })
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) { elements.aiMic.hidden = true; return }
  const recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'; recognition.continuous = false; recognition.interimResults = false
  recognition.onresult = event => { elements.aiInput.value = event.results[0]?.[0]?.transcript || ''; if (elements.aiInput.value) sendRuntimeAi() }
  elements.aiMic.addEventListener('click', () => { try { recognition.start() } catch {} })
}

function showError(error) {
  elements.error.hidden = false
  elements.error.textContent = error?.message || String(error)
  elements.start.hidden = false
}

function resolveUrl(value) {
  if (!value || typeof value !== 'string') return ''
  if (value.startsWith('local://')) return ''
  return value
}

function makeTexture(url, fallback) {
  const loader = new THREE.TextureLoader()
  if (!url) return fallback()
  const texture = loader.load(url, undefined, undefined, () => {})
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function placeholder(text) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#e8edf2'; ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = '#cbd5df'; ctx.fillRect(0, 0, 256, 128)
  ctx.fillStyle = '#ef6c16'; ctx.font = 'bold 24px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(text || 'AR').slice(0, 16), 128, 158)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function objectMaterial(def, texture) {
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
  material.opacity = Number.isFinite(Number(def.material?.opacity)) ? Number(def.material.opacity) : 1
  material.blending = def.material?.blend === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending
  material.depthWrite = def.material?.blend !== 'additive'
  if (def.material?.color) material.color.set(def.material.color)
  return material
}

function applyTransform(node, transform = {}) {
  const p = transform.p || [0, 0, 0]
  const r = transform.r || [0, 0, 0]
  const s = transform.s || [1, 1, 1]
  node.position.fromArray(p.map(Number))
  node.rotation.set(...r.map(value => Number(value) * Math.PI / 180))
  node.scale.fromArray(s.map(value => Number(value) || 1))
}

function makeObject(def) {
  const assets = state.scene.meta?.assets || []
  const node = createNode(def, assets)
  node.userData.id = def.id
  node.userData.definition = def
  node.visible = def.visible !== false && def.visibleInRuntime !== false
  node.traverse(child => {
    if (child.userData?.isHelper) child.visible = false
  })
  return node
}

function buildWorld() {
  state.world = new THREE.Scene()
  state.world.background = null
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9caaba, 1.8); state.world.add(hemi)
  const light = new THREE.DirectionalLight(0xffffff, 1.2); light.position.set(4, 8, 4); state.world.add(light)
  state.nodes.clear(); state.zones.clear()
  ;(state.scene.objects || []).forEach(def => { const node = makeObject(def); state.nodes.set(def.id, node); state.world.add(node) })
  ;(state.scene.zones || []).forEach(zone => {
    const group = new THREE.Group(); group.userData.zoneId = zone.id; applyTransform(group, zone.transform)
    const color = zone.kind === 'forbidden' ? '#dc2626' : zone.kind === 'trigger' ? '#d97706' : '#2563eb'
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.05, depthWrite: false }))
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25 }))
    group.add(mesh, edge); group.visible = false; state.zones.set(zone.id, group); state.world.add(group)
  })

  const base = state.scene.base || {}
  const urls = []
  const lod = base.lod?.current || 'high'
  ;(base.chunks || []).forEach(chunk => { const url = resolveUrl(chunk?.lod?.[lod] || chunk?.url); if (url) urls.push(url) })
  if (!urls.length && resolveUrl(base.lod?.urls?.[lod] || base.sog_url)) urls.push(resolveUrl(base.lod?.urls?.[lod] || base.sog_url))
  if (urls.length) {
    state.base = new DropInViewer(); state.world.add(state.base)
    urls.reduce((promise, url) => promise.then(() => state.base.addSplatScene(url, { showLoadingUI: false, progressiveLoad: false })), Promise.resolve()).catch(() => {})
  }
}

function setupRenderer() {
  state.renderer = new THREE.WebGLRenderer({ canvas: elements.canvas, alpha: true, antialias: true })
  state.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
  state.camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 300)
  state.camera.position.set(0, 1.6, 0.4)
  resize()
  addInteractionHandlers()
}

function resize() {
  if (!state.renderer || !state.camera) return
  state.renderer.setSize(innerWidth, innerHeight, false); state.camera.aspect = innerWidth / innerHeight; state.camera.updateProjectionMatrix()
}

function orient(e) {
  if (e.alpha == null) return
  state.orientation = true
  const euler = new THREE.Euler(e.beta * Math.PI / 180, e.alpha * Math.PI / 180, -e.gamma * Math.PI / 180, 'YXZ')
  state.camera.quaternion.setFromEuler(euler)
}

function hitAtCenter() {
  const ray = new THREE.Raycaster()
  ray.setFromCamera(new THREE.Vector2(0, 0), state.camera)
  const hit = ray.intersectObjects([...state.nodes.values()].filter(node => node.visible), true)[0]
  let node = hit?.object
  while (node && !node.userData?.id) node = node.parent
  return node?.userData?.id || ''
}

function addInteractionHandlers() {
  elements.stage.addEventListener('pointerdown', event => {
    state.drag = { x: event.clientX, y: event.clientY, yaw: state.yaw, pitch: state.pitch }
    state.holdTarget = hitAtCenter()
  })
  elements.stage.addEventListener('pointermove', event => {
    if (!state.drag || state.orientation) return
    state.yaw = state.drag.yaw - (event.clientX - state.drag.x) * 0.005; state.pitch = Math.max(-1.2, Math.min(1.2, state.drag.pitch - (event.clientY - state.drag.y) * 0.005))
    state.camera.quaternion.setFromEuler(new THREE.Euler(state.pitch, state.yaw, 0, 'YXZ'))
  })
  elements.stage.addEventListener('pointerup', event => {
    const drag = state.drag; state.drag = null
    if (state.holdTarget) { fire('hold', state.holdTarget); state.holdTarget = '' }
    if (drag && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) tap(event)
  })
  window.addEventListener('deviceorientation', orient)
}

function tap(event) {
  const ndc = new THREE.Vector2(event.clientX / innerWidth * 2 - 1, -(event.clientY / innerHeight) * 2 + 1)
  const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, state.camera)
  const hit = ray.intersectObjects([...state.nodes.values()].filter(node => node.visible), true)[0]
  let node = hit?.object
  while (node && !node.userData?.id) node = node.parent
  if (node?.userData?.id) fire('tap', node.userData.id)
}

function cameraPosition() { return state.camera?.position || null }
function pointInZone(zone, point) { const node = state.zones.get(zone.id); return node ? new THREE.Box3().setFromObject(node).containsPoint(point) : false }
function showCard(text) { elements.card.hidden = false; elements.card.textContent = text || '…'; clearTimeout(state.cardTimer); state.cardTimer = setTimeout(() => { elements.card.hidden = true }, 3000) }
function currentNodes() { return (state.scene.story?.chapters || []).flatMap(chapter => chapter.nodes || []) }
function updateProgress() { const nodes = currentNodes(); elements.progress.textContent = `节点 ${Math.max(0, nodes.findIndex(node => node.id === state.scene.story?.start) + 1)}/${nodes.length}` }

function stateOf(id) {
  if (!state.runtimeStates.has(id)) state.runtimeStates.set(id, { state: 'default', collected: false, destroyed: false })
  return state.runtimeStates.get(id)
}

function setState(id, value, patch = {}) {
  const next = { ...stateOf(id), state: value, ...patch }
  state.runtimeStates.set(id, next)
  return next
}

function pulseParticles(id, args = {}) {
  const node = state.nodes.get(args.targetId || id)
  if (!node) return
  node.userData.particlePulseUntil = performance.now() / 1000 + Math.max(0.1, Number(args.duration) || 0.8)
}

function resetRuntimeState() {
  state.fired.clear(); state.gaze.clear(); state.hold.clear(); state.enter.clear(); state.collision.clear(); state.runtimeStates.clear(); state.activeSequences = []; state.score = 0; state.cameraShake = null
  ;(state.scene?.objects || []).forEach(def => { const node = state.nodes.get(def.id); if (node) node.visible = def.visible !== false && def.visibleInRuntime !== false })
}

function tickVisuals(time) {
  state.world?.traverse(node => {
    const uniforms = node.userData?.shaderUniforms
    if (uniforms?.uTime) uniforms.uTime.value = time
    if (typeof node.userData?.animate === 'function') node.userData.animate(time)
  })
}

function sequence(id) {
  const seq = (state.scene.sequences || []).find(item => item.id === id); if (!seq) return
  state.activeSequences.push({ seq, time: 0 })
}
function tickSequences(dt) {
  state.activeSequences = state.activeSequences.filter(active => {
    active.time += dt
    active.seq.tracks?.forEach(track => {
      const node = state.nodes.get(track.target); if (!node) return
      const keys = [...(track.keys || [])].sort((a, b) => Number(a.t) - Number(b.t)); if (!keys.length) return
      const key = keys.reduce((prev, current) => Number(current.t) <= active.time ? current : prev, keys[0])
      if (track.kind === 'transform' && key.v) applyTransform(node, key.v)
      if (track.kind === 'opacity') node.traverse(child => { if (child.material) child.material.opacity = Number(key.v) })
    })
    return active.time < Number(active.seq.duration || 1)
  })
}

function fire(when, targetId, extra = {}) {
  ;(state.scene.triggers || []).filter(trigger => trigger.when === when && trigger.target === targetId).forEach(trigger => {
    const onceKey = `${trigger.id}:${when}`
    if (trigger.once !== false && state.fired.has(onceKey) && (when === 'enter' || when === 'collect')) return
    if (when === 'enter' || when === 'collect') state.fired.add(onceKey)
    ;(trigger.do || []).forEach(action => {
      const args = action.args || {}
      const objectId = args.targetId || args.objectId || targetId
      const node = state.nodes.get(objectId)
      if (action.action === 'play_seq') sequence(args.seqId || args.sequenceId)
      else if (action.action === 'card') showCard(args.text || args.copy)
      else if (action.action === 'reward') showCard(`获得奖励：${args.text || args.reward || ''}`)
      else if (action.action === 'highlight') { if (node) node.scale.multiplyScalar(1.12); setTimeout(() => node?.scale.multiplyScalar(1 / 1.12), 700) }
      else if (action.action === 'show' || action.action === 'hide') { if (node) node.visible = action.action === 'show'; setState(objectId, action.action === 'show' ? 'visible' : 'hidden') }
      else if (action.action === 'set_state') { const current = stateOf(objectId).state; const next = args.state === 'toggle' ? (['on', 'open', 'active'].includes(current) ? 'off' : 'on') : String(args.state || 'default'); setState(objectId, next); if (node) node.userData.runtimeState = stateOf(objectId) }
      else if (action.action === 'emit_particles') pulseParticles(objectId, args)
      else if (action.action === 'collect') { if (!stateOf(objectId).collected) { if (node) node.visible = false; setState(objectId, 'collected', { collected: true }); state.score += Number(args.score) || 1; showCard(args.text || `已收集 ${state.scene.objects.find(item => item.id === objectId)?.name || '对象'} · ${state.score}`); fire('collect', objectId, { score: Number(args.score) || 1 }) } }
      else if (action.action === 'destroy') { if (node) node.visible = false; setState(objectId, 'destroyed', { destroyed: true }) }
      else if (action.action === 'add_score') { state.score += Number(args.score ?? args.value ?? args.amount) || 0 }
      else if (action.action === 'spawn_element') {
        const elementId = args.elementId || args.element_id || args.voiceToken
        if (elementId) applyRuntimeAiOps([{ op: 'add_element', element_id: elementId, name: args.name || '', transform: { p: Array.isArray(args.position) ? args.position : runtimeFrontPosition() } }])
      }
      else if (action.action === 'teleport') {
        const position = Array.isArray(args.position) ? args.position : Array.isArray(args.p) ? args.p : null
        if (position?.length === 3) state.camera.position.fromArray(position.map(Number))
      }
      else if (action.action === 'vibrate') { if (navigator.vibrate) navigator.vibrate(Math.min(1000, Math.max(0, Number(args.duration) || 80))) }
      else if (action.action === 'camera_shake') {
        state.cameraShake = { time: Number(args.duration) || 250, intensity: Math.min(0.2, Math.max(0, Number(args.intensity) || 0.05)) }
      }
      else if (action.action === 'goto_node') { state.scene.story.current = args.nodeId || args.id; updateProgress() }
    })
  })
}

function tickTriggers(dt) {
  const point = cameraPosition(); if (!point) return
  ;(state.scene.triggers || []).forEach(trigger => {
    const targetNode = state.nodes.get(trigger.target); const targetZone = state.scene.zones?.find(zone => zone.id === trigger.target)
    if (!targetNode && !targetZone) return
    if (trigger.when === 'enter') {
      const inside = targetZone ? pointInZone(targetZone, point) : point.distanceTo(targetNode.getWorldPosition(new THREE.Vector3())) < Number(trigger.params?.radius || 2)
      const previous = state.enter.get(trigger.id) || false
      if (inside && !previous) fire('enter', trigger.target)
      if (!inside && previous) fire('leave', trigger.target)
      state.enter.set(trigger.id, inside)
    }
    if (trigger.when === 'collision') {
      const radius = Math.max(0.1, Number(trigger.params?.radius) || 0.8)
      const worldPosition = targetNode?.getWorldPosition?.(new THREE.Vector3())
      const inside = Boolean(worldPosition && point.distanceTo(worldPosition) <= radius)
      const previous = state.collision.get(trigger.id) || false
      if (inside && !previous) fire('collision', trigger.target)
      state.collision.set(trigger.id, inside)
    }
    if (trigger.when === 'gaze' || trigger.when === 'hold') {
      const active = targetNode && targetNode.visible && hitAtCenter() === trigger.target
      const map = trigger.when === 'gaze' ? state.gaze : state.hold
      const elapsed = active ? (map.get(trigger.id) || 0) + dt : 0
      map.set(trigger.id, elapsed)
      if (elapsed >= Number(trigger.params?.secs || 1)) { fire(trigger.when, trigger.target); map.set(trigger.id, 0) }
    }
  })
}

async function start(withCamera) {
  try {
    state.scene = await readScene()
    buildWorld(); setupRenderer(); resetRuntimeState(); state.started = true; elements.start.hidden = true; elements.error.hidden = true; updateProgress()
    if (withCamera && navigator.mediaDevices?.getUserMedia) {
      try { state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); elements.camera.srcObject = state.stream } catch { elements.anchor.textContent = '无相机预览' }
    } else elements.anchor.textContent = '预览模式'
    await locate()
    elements.error.hidden = true
    requestAnimationFrame(loop)
  } catch (error) { showError(error) }
}

async function locate() {
  elements.anchor.textContent = '定位中'
  const localizeUrl = params.get('localize')
  if (localizeUrl) {
    try {
      const response = await fetch(localizeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room, scene: state.scene.siteId || state.scene.projectId || '', latitude: null, longitude: null }) })
      if (response.ok) {
        const result = await response.json()
        state.anchorMode = result.anchor || 'VPS /localize'
        if (Array.isArray(result.position)) state.camera.position.fromArray(result.position)
        elements.anchor.textContent = state.anchorMode
        return
      }
    } catch {}
  }
  if (navigator.xr) {
    try { if (await navigator.xr.isSessionSupported?.('immersive-ar')) { state.anchorMode = 'WebXR AR'; elements.anchor.textContent = state.anchorMode; return } } catch {}
  }
  if ('BarcodeDetector' in window && state.stream) {
    try { const detector = new BarcodeDetector({ formats: ['qr_code'] }); const codes = await detector.detect(elements.camera); if (codes.length) { state.anchorMode = 'QR 锚点'; elements.anchor.textContent = state.anchorMode; return } } catch {}
  }
  if (navigator.geolocation) {
    await new Promise(resolve => navigator.geolocation.getCurrentPosition(() => { state.anchorMode = 'GPS 粗定位'; elements.anchor.textContent = state.anchorMode; resolve() }, () => resolve(), { timeout: 2500 }))
  }
  if (state.anchorMode === '等待定位') { state.anchorMode = '手动参考点'; elements.anchor.textContent = state.anchorMode }
}

function loop(now) {
  const dt = Math.min((now - state.last) / 1000, 0.1); state.last = now
  if (state.started) {
    tickSequences(dt)
    tickTriggers(dt)
    tickVisuals(now / 1000)
    if (state.cameraShake?.time > 0) {
      state.cameraShake.time -= dt * 1000
      state.camera.position.x += (Math.random() - 0.5) * state.cameraShake.intensity
      state.camera.position.y += (Math.random() - 0.5) * state.cameraShake.intensity
    }
    state.renderer.render(state.world, state.camera)
  }
  requestAnimationFrame(loop)
}

