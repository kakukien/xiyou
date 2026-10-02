import { store } from './core/store.js'
import { viewport } from './core/viewport.js'
import { player, tickPlay } from './core/playback.js'
import { log } from './ui/log.js'
import { mount as mountTopbar } from './ui/topbar.js'
import { mount as mountOutliner } from './ui/outliner.js'
import { mount as mountDetails } from './ui/details.js'
import { mount as mountDock } from './ui/dock.js'
import { mount as mountPresence } from './ui/presence.js'
import { mount as mountChat } from './ui/chat.js'
import { mount as mountVpchrome } from './ui/vpchrome.js'
import { mount as mountSplatStudio } from './ui/splat-studio.js'
import { collab } from './core/collab.js'

// ---- bootstrap ----
window.__xiyou = { viewport }
const params = new URLSearchParams(location.search)
const ROOM = params.get('room') || 'demo'
store.setStorageKey(`xiyou.scene.v2.${ROOM}`)
if (params.has('reset')) {
  try { localStorage.removeItem(`xiyou.scene.v2.${ROOM}`) } catch {}
}
const loadedScene = store.load()
const retiredPreset = loadedScene && (
  store.scene?.meta?.name === '花果山觉醒' ||
  store.scene?.story?.chapters?.some(chapter => chapter?.title === '花果山觉醒')
)
if (!loadedScene || retiredPreset) {
  store.newScene()
  store.save()
}

viewport.init(document.getElementById('viewport'))
mountVpchrome(document.getElementById('viewport-wrap'), viewport)
viewport.setBase(store.scene.base)
viewport.sync()

mountTopbar(document.getElementById('topbar'))
mountOutliner(document.getElementById('outliner'))
mountDetails(document.getElementById('details'))
mountDock(document.getElementById('dock'))
const presenceEl = mountPresence(document.getElementById('topbar'))
mountChat()
const splatStudio = mountSplatStudio(document.getElementById('splat-studio'))
window.__xiyou.splatStudio = splatStudio

// auto-connect collab (non-fatal if server unreachable)
if (presenceEl && presenceEl._connect) presenceEl._connect()

// ---- react to store ----
let lastBase = store.scene.base
store.on('change', () => {
  if (store.scene.base !== lastBase) {
    lastBase = store.scene.base
    viewport.setBase(lastBase)
  }
  if (!player.isPreviewing?.()) viewport.sync()
  store.save()
})
store.on('editor-mode', editorMode => {
  const studio = document.getElementById('splat-studio')
  const main = document.getElementById('main')
  const dock = document.getElementById('dock')
  const topbar = document.getElementById('topbar')
  const inStudio = editorMode === 'splat-studio'
  studio.hidden = !inStudio
  main.hidden = false
  dock.hidden = false
  topbar.classList.toggle('studio-shell-active', inStudio)
  document.body.classList.toggle('splat-studio-active', inStudio)
  document.body.classList.toggle('workspace-studio-active', inStudio)
  if (inStudio) splatStudio?.enter?.()
  else splatStudio?.exit?.()
})
store.on('mode', () => {
  const play = store.mode === 'play'
  viewport.helpersVisible(!play)
  document.getElementById('viewport-overlay').textContent = play ? '模拟试玩' : ''
})
store.on('node-goto', ({ nodeId }) => {
  log(`跳转到节点 ${nodeId}`)
  store.select(nodeId)
})
store.on('published', () => log('已发布快照'))

// 剧情卡片弹窗（编辑器内）
store.on('card', ({ text }) => {
  const toast = document.createElement('div')
  toast.className = 'story-toast'
  toast.textContent = text || '…'
  document.body.appendChild(toast)
  requestAnimationFrame(() => toast.classList.add('in'))
  setTimeout(() => { toast.classList.remove('in'); setTimeout(() => toast.remove(), 300) }, 2600)
})

// ---- drag from content browser ----
const vpEl = document.getElementById('viewport')
vpEl.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' })
vpEl.addEventListener('drop', e => {
  e.preventDefault()
  const type = e.dataTransfer.getData('xo-type')
  const assetId = e.dataTransfer.getData('text/x-xiyou-asset')
  const point = viewport.placementPoint ? viewport.placementPoint(e.clientX, e.clientY) : [0, 0, -3]
  if (assetId) {
    const asset = (store.scene.meta?.assets || []).find(item => item.id === assetId)
    if (!asset) return
    const kind = asset.kind || asset.type
    if (kind === 'splat') {
      store.setBase({ sog_url: asset.url || '' })
      log(`已将资源「${asset.name || asset.id}」设为高斯空间底座`)
      return
    }
    const objectType = kind === 'image' ? 'quad' : kind === 'video' ? 'video_quad' : kind === 'model' || kind === 'glb' ? 'glb' : null
    if (!objectType) {
      log(`资源「${asset.name || asset.id}」暂不支持拖入视口`, 'warn')
      return
    }
    const forbidden = viewport.zoneAtPoint?.(point, 'forbidden')
    if (forbidden) { log(`无法布置：位置落在禁布区域「${forbidden.name || forbidden.id}」`, 'warn'); return }
    const zone = viewport.zoneAtPoint?.(point, 'editable')
    const obj = store.addObject(objectType, { asset: asset.id, zone_id: zone?.id || '', transform: { p: point, r: [0, 0, 0], s: [1, 1, 1] } })
    store.select(obj.id)
    log(`已布置资源 ${asset.name || asset.id}`)
    return
  }
  if (!type) return
  const forbidden = viewport.zoneAtPoint?.(point, 'forbidden')
  if (forbidden) { log(`无法创建对象：位置落在禁布区域「${forbidden.name || forbidden.id}」`, 'warn'); return }
  const zone = viewport.zoneAtPoint?.(point, 'editable')
  const obj = store.addObject(type, { zone_id: zone?.id || '', transform: { p: point, r: [0, 0, 0], s: [1, 1, 1] } })
  store.select(obj.id)
  log(`创建对象 ${obj.name}`)
})

// ---- shortcuts ----
window.addEventListener('keydown', e => {
  if (e.target.matches('input,select,textarea')) return
  const k = e.key.toLowerCase()
  if (e.ctrlKey && k === 'z' && !e.shiftKey) { (collab.connected ? collab.undo() : store.undo()); e.preventDefault() }
  else if (e.ctrlKey && (k === 'y' || (k === 'z' && e.shiftKey))) { (collab.connected ? collab.redo() : store.redo()); e.preventDefault() }
  else if (e.ctrlKey && k === 's') { store.save(); e.preventDefault() }
  else if (k === 'w') viewport.setGizmo('translate')
  else if (k === 'e') viewport.setGizmo('rotate')
  else if (k === 'r') viewport.setGizmo('scale')
  else if (k === 'f' && store.editorMode === 'scene') { const id = store.selected()[0]; if (id) viewport.focus(id) }
  else if ((k === 'delete' || k === 'backspace') && store.editorMode === 'scene') {
    for (const id of store.selected()) if (store.getObject(id)) store.removeObject(id)
  }
})

// ---- main loop ----
const clock = { last: performance.now() }
function frame(now) {
  const dt = Math.min((now - clock.last) / 1000, 0.1)
  clock.last = now
  if (store.editorMode === 'scene') {
    viewport.tick(dt)
    tickPlay(dt)
    viewport.render()
  }
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

log('编辑器已就绪')
