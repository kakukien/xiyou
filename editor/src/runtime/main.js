import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DropInViewer } from '@mkkellogg/gaussian-splats-3d'
import { defaults } from '../core/schema.js'

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
  stream: null,
  orientation: false,
  yaw: 0,
  pitch: 0,
  drag: null,
  last: performance.now(),
  cardTimer: 0,
  anchorMode: '等待定位',
  started: false
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
      <header class="runtime-header"><div><strong>造梦 · 故事空间</strong><span class="runtime-project"></span></div><span class="runtime-anchor">定位中</span></header>
      <div class="runtime-card" hidden></div>
      <div class="runtime-start"><div class="runtime-start-brand"><img src="/xiyou/xj-logo.svg" alt=""><span>造梦 · 故事空间</span></div><div class="runtime-start-visual" aria-hidden="true"><span class="runtime-start-orbit runtime-start-orbit-a"></span><span class="runtime-start-orbit runtime-start-orbit-b"></span><div class="runtime-start-logo"><img src="/xiyou/xj-logo.svg" alt=""></div><span class="runtime-start-visual-label">XJ · 01</span></div><div class="runtime-start-kicker">SPATIAL ENTRY / AR EXPERIENCE</div><h1>进入虚境</h1><p>允许相机与方向权限，体验发布后的空间互动。</p><div class="runtime-start-actions"><button class="runtime-primary" data-start>开始体验</button><button class="runtime-secondary" data-demo>无相机预览</button></div><small>定位策略：VPS → QR/条码 → GPS → 手动参考点</small></div>
      <footer class="runtime-footer"><button data-reset>重新定位</button><span class="runtime-progress">节点 0/0</span><button data-exit>返回编辑器</button></footer>
      <div class="runtime-error" hidden></div>
    </div>`
  return {
    shell: root.querySelector('.runtime-shell'), stage: root.querySelector('.runtime-stage'), canvas: root.querySelector('.runtime-canvas'), camera: root.querySelector('.runtime-camera'),
    start: root.querySelector('.runtime-start'), startButton: root.querySelector('[data-start]'), demoButton: root.querySelector('[data-demo]'),
    anchor: root.querySelector('.runtime-anchor'), project: root.querySelector('.runtime-project'), card: root.querySelector('.runtime-card'), progress: root.querySelector('.runtime-progress'), error: root.querySelector('.runtime-error')
  }
}

const elements = ui()

elements.project.textContent = room === 'demo' ? '游客体验' : room

document.querySelector('[data-exit]').addEventListener('click', () => {
  location.href = `./?room=${encodeURIComponent(room)}`
})
document.querySelector('[data-reset]').addEventListener('click', () => locate())
elements.startButton.addEventListener('click', () => start(true))
elements.demoButton.addEventListener('click', () => start(false))

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
  const group = new THREE.Group()
  group.userData.id = def.id
  group.userData.definition = def
  const asset = (state.scene.meta?.assets || []).find(item => item?.id === def.asset)
  const url = resolveUrl(asset?.url || def.asset)
  if (def.type === 'glb' && url) {
    const placeholderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.7), new THREE.MeshNormalMaterial({ wireframe: true }))
    group.add(placeholderMesh)
    new GLTFLoader().load(url, gltf => {
      group.clear()
      group.add(gltf.scene)
      applyTransform(group, def.transform)
    }, undefined, () => {})
  } else if (def.type === 'light') {
    group.add(new THREE.PointLight(def.material?.color || '#ffb26b', Number(def.material?.intensity || 2), 8))
    group.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: def.material?.color || '#ffb26b' })))
  } else if (def.type === 'compound') {
    ;(def.parts || []).forEach(part => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: part.color || '#ffb26b', roughness: 0.7 }))
      applyTransform(mesh, { p: part.p, r: part.r, s: part.s })
      group.add(mesh)
    })
  } else if (def.type === 'video_quad' && url) {
    const video = document.createElement('video'); video.src = url; video.loop = true; video.muted = true; video.playsInline = true; video.preload = 'auto'
    const texture = new THREE.VideoTexture(video); texture.colorSpace = THREE.SRGBColorSpace
    group.userData.video = video
    group.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5625), objectMaterial(def, texture)))
  } else {
    const texture = makeTexture(url, () => placeholder(def.name || def.id))
    group.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), objectMaterial(def, texture)))
  }
  applyTransform(group, def.transform)
  group.visible = def.visible !== false
  return group
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

function fire(when, targetId) {
  ;(state.scene.triggers || []).filter(trigger => trigger.when === when && trigger.target === targetId).forEach(trigger => {
    const onceKey = `${trigger.id}:${when}`
    if (trigger.once !== false && state.fired.has(onceKey) && when === 'enter') return
    if (when === 'enter') state.fired.add(onceKey)
    ;(trigger.do || []).forEach(action => {
      const args = action.args || {}
      if (action.action === 'play_seq') sequence(args.seqId || args.sequenceId)
      else if (action.action === 'card') showCard(args.text || args.copy)
      else if (action.action === 'reward') showCard(`获得奖励：${args.text || args.reward || ''}`)
      else if (action.action === 'highlight') { const node = state.nodes.get(args.targetId || args.objectId || targetId); if (node) node.scale.multiplyScalar(1.12); setTimeout(() => node?.scale.multiplyScalar(1 / 1.12), 700) }
      else if (action.action === 'show' || action.action === 'hide') { const node = state.nodes.get(args.targetId || args.objectId || targetId); if (node) node.visible = action.action === 'show' }
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
      state.enter.set(trigger.id, inside)
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
    buildWorld(); setupRenderer(); state.started = true; elements.start.hidden = true; elements.error.hidden = true; updateProgress()
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
  if (state.started) { tickSequences(dt); tickTriggers(dt); state.renderer.render(state.world, state.camera) }
  requestAnimationFrame(loop)
}

