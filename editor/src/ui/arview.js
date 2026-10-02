// 游客视角（AR 模拟）：相机底 + 陀螺仪/拖拽看向 + 点击触发
import * as THREE from 'three'
import { store } from '../core/store.js'
import { triggers } from '../core/playback.js'

let state = null

function orientQuat(alpha, beta, gamma, orient) {
  // 设备方向 → 相机四元数（标准 zxy 补偿）
  const _z = new THREE.Quaternion(), _x = new THREE.Quaternion(), _y = new THREE.Quaternion()
  const e = new THREE.Euler(beta * Math.PI / 180, alpha * Math.PI / 180, -gamma * Math.PI / 180, 'YXZ')
  const q = new THREE.Quaternion().setFromEuler(e)
  const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  q.multiply(q1)
  if (orient) {
    const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -orient * Math.PI / 180)
    q.multiply(q2)
  }
  return q
}

export function openAR() {
  if (state) return
  const { viewport } = window.__xiyou || {}
  if (!viewport || !viewport.scene) return

  const overlay = document.createElement('div')
  overlay.className = 'ar-overlay'

  const video = document.createElement('video')
  video.className = 'ar-video'
  video.autoplay = true
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')

  const canvas = document.createElement('canvas')
  canvas.className = 'ar-canvas'

  const hud = document.createElement('div')
  hud.className = 'ar-hud'
  hud.innerHTML = '<div class="ar-title">造梦 · 故事空间 · 游客视角</div><div class="ar-hint">转动手机或拖动画面查看 · 点击发光物触发剧情</div><div class="ar-geo"></div>'

  const card = document.createElement('div')
  card.className = 'ar-card'
  card.style.display = 'none'

  const exitBtn = document.createElement('button')
  exitBtn.className = 'ar-exit'
  exitBtn.textContent = '退出'
  exitBtn.type = 'button'

  overlay.append(video, canvas, hud, card, exitBtn)
  document.body.appendChild(overlay)

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200)
  camera.position.set(0, 1.6, 0.5)

  const s = {
    overlay, video, renderer, camera, raf: 0,
    yaw: 0, pitch: 0, useGyro: false,
    cardOff: null, dragStart: null
  }
  state = s

  function resize() {
    renderer.setSize(innerWidth, innerHeight)
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
  }
  resize()

  // 相机底
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(stream => { video.srcObject = stream; s.stream = stream })
      .catch(() => { hud.querySelector('.ar-hint').textContent = '摄像头不可用 · 拖动查看场景' })
  } else {
    hud.querySelector('.ar-hint').textContent = '拖动查看场景'
  }

  // 定位示意（GPS 粗定位；VPS 现场再接）
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => { hud.querySelector('.ar-geo').textContent = `定位 ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} · 模拟锚点` },
      () => { hud.querySelector('.ar-geo').textContent = '模拟锚点模式' },
      { timeout: 4000 }
    )
  }

  // 陀螺仪
  function onOrient(e) {
    if (e.alpha == null) return
    s.useGyro = true
    camera.quaternion.copy(orientQuat(e.alpha, e.beta, e.gamma, screen.orientation?.angle || 0))
  }
  window.addEventListener('deviceorientation', onOrient)
  s.onOrient = onOrient

  // 拖拽看向（无陀螺仪的兜底）
  function onDown(e) {
    s.dragStart = { x: e.clientX ?? e.touches?.[0]?.clientX, y: e.clientY ?? e.touches?.[0]?.clientY, yaw: s.yaw, pitch: s.pitch }
  }
  function onMove(e) {
    if (!s.dragStart || s.useGyro) return
    const x = e.clientX ?? e.touches?.[0]?.clientX
    const y = e.clientY ?? e.touches?.[0]?.clientY
    s.yaw = s.dragStart.yaw - (x - s.dragStart.x) * 0.005
    s.pitch = Math.max(-1.2, Math.min(1.2, s.dragStart.pitch - (y - s.dragStart.y) * 0.005))
    camera.quaternion.setFromEuler(new THREE.Euler(s.pitch, s.yaw, 0, 'YXZ'))
  }
  function onUp() { s.dragStart = null }
  overlay.addEventListener('pointerdown', onDown)
  overlay.addEventListener('pointermove', onMove)
  overlay.addEventListener('pointerup', onUp)

  // 点击 → 触发
  const ray = new THREE.Raycaster()
  function onTap(e) {
    const dx = Math.abs((e.clientX) - (s.dragStart?.x ?? e.clientX))
    if (dx > 8) return
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hits = ray.intersectObjects(viewport.scene.children, true)
    const hit = hits.find(h => {
      let n = h.object
      while (n) { if (n.userData?.id) return true; n = n.parent }
      return false
    })
    if (!hit) return
    let n = hit.object
    while (n && !n.userData?.id) n = n.parent
    if (n?.userData?.id) {
      triggers.fire('tap', n.userData.id, { from: 'ar' })
      pulseAt(e.clientX, e.clientY)
    }
  }
  overlay.addEventListener('click', onTap)
  s.onTap = onTap; s.onDown = onDown; s.onMove = onMove; s.onUp = onUp

  function pulseAt(x, y) {
    const p = document.createElement('div')
    p.className = 'ar-pulse'
    p.style.left = x + 'px'; p.style.top = y + 'px'
    overlay.appendChild(p)
    setTimeout(() => p.remove(), 650)
  }

  // 卡片弹窗
  s.cardOff = store.on('card', ({ text }) => {
    card.textContent = text || '…'
    card.style.display = ''
    card.classList.remove('in')
    void card.offsetWidth
    card.classList.add('in')
    clearTimeout(s.cardTimer)
    s.cardTimer = setTimeout(() => { card.style.display = 'none' }, 2600)
  })

  // 渲染循环：场景在原 viewport.scene 里，这里只换相机/渲染目标
  function loop() {
    s.raf = requestAnimationFrame(loop)
    renderer.render(viewport.scene, camera)
  }
  loop()

  window.addEventListener('resize', resize)
  s.resize = resize

  exitBtn.addEventListener('click', closeAR)
}

export function closeAR() {
  if (!state) return
  const s = state
  cancelAnimationFrame(s.raf)
  window.removeEventListener('deviceorientation', s.onOrient)
  window.removeEventListener('resize', s.resize)
  s.overlay.removeEventListener('click', s.onTap)
  s.cardOff && s.cardOff()
  if (s.stream) s.stream.getTracks().forEach(t => t.stop())
  s.renderer.dispose()
  s.overlay.remove()
  state = null
}
