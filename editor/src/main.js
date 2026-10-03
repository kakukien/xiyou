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
import { mount as mountCollabCursors } from './ui/collab-cursors.js'
import { collab } from './core/collab.js'
import { addElementInstance } from './core/elements.js'
import { projects } from './core/projects.js'

// ---- bootstrap ----
window.__xiyou = { viewport, store, player, projects }
const params = new URLSearchParams(location.search)
// 工程制：?proj=<id> → 协作房间 xiyou-proj-<id> + 独立本地存档；?room= 保持兼容。
const PROJ = params.get('proj') || 'main'
const ROOM = params.get('room') || `xiyou-proj-${PROJ}`
const STORAGE_KEY = `xiyou.scene.v2.${ROOM}`
window.__xiyouRoom = ROOM
window.__xiyouProj = PROJ
store.setStorageKey(STORAGE_KEY)
if (params.has('reset')) {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(`${STORAGE_KEY}.backup`)
  } catch {}
}
const loadedScene = store.load()
// 场景名称不能用于判断“是否应清空”。旧演示场景也是用户真实草稿，升级只允许走 schema migration。
if (!loadedScene && store.lastLoadStatus === 'missing') {
  store.newScene()
  store.save()
}
if (!loadedScene && store.lastLoadStatus !== 'missing') {
  log('场景草稿未自动覆盖：请检查日志或从备份/JSON 恢复', 'warn')
}

// 言出法随热加载：?splat=assets/gen_x.ply 直接替换 3GS 底座（gen_space.py 产物）
// 生成空间用单位变换——ml-sharp 输出相机在原点，套实拍场地的 Sim3 会把空间掰歪
const splatQ = params.get('splat')
if (splatQ) {
  store.scene.base = {
    ...(store.scene.base || {}),
    sog_url: splatQ,
    transform: { s: 1, R: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0], scale_source: 'genspace' }
  }
}

// 空底座占位：现场照片墙播种为可编辑 quad（可选中/移动/换图/删除）
// photo_walls_seeded 标记保证只播种一次，用户删掉后不会再冒回来
{
  const base = store.scene.base || {}
  const meta = store.scene.meta || (store.scene.meta = {})
  if (!meta.photo_walls_seeded && !base.sog_url && !(base.chunks || []).length && !base.proxy) {
    meta.photo_walls_seeded = true
    ;[
      { name: '现场照片A', p: [0, 2, -6], r: [0, 0, 0] },
      { name: '现场照片B', p: [-4.2, 2, -4.2], r: [0, -45, 0] },
      { name: '现场照片C', p: [4.2, 2, -4.2], r: [0, 45, 0] }
    ].forEach(wall => store.addObject('quad', { name: wall.name, transform: { p: wall.p, r: wall.r, s: [4, 4, 1] } }))
  }
}

viewport.init(document.getElementById('viewport'))
mountVpchrome(document.getElementById('viewport-wrap'), viewport)
mountCollabCursors(document.getElementById('viewport-wrap'))
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

// 移动端把复杂面板改为底部工作表：视口保持可见，面板按需打开。
const mobileNav = document.getElementById('mobile-nav')
mobileNav?.addEventListener('click', event => {
  const button = event.target.closest('[data-mobile-panel]')
  if (!button) return
  const panel = button.dataset.mobilePanel
  document.body.dataset.mobilePanel = panel === 'none' ? '' : panel
  mobileNav.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button))
})

// auto-connect collab (non-fatal if server unreachable)
if (presenceEl?._connect && presenceEl._hasExplicitCollab) presenceEl._connect()

// 工程注册表（共享素材库也在这条 doc 里）
projects.connect()
// 注册当前工程，让工程清单对协作者可见
projects.on('ready', () => {
  const name = store.scene?.meta?.name || '未命名工程'
  if (!projects.list().find(item => item.id === PROJ)) {
    projects.touch(PROJ, { name, owner: '' })
  }
  // 播种共享素材库：场景中 fld_shared 归档的素材同步进注册表（全员可见）
  const sharedFolders = projects.sharedFolders()
  if (!sharedFolders.find(f => f.id === 'fld_shared')) {
    sharedFolders.unshift({ id: 'fld_shared', name: '共享素材', parent: '' })
    projects.setSharedFolders(sharedFolders)
  }
  const existing = new Set(projects.sharedAssets().map(a => a.id))
  const BUILTIN_SHARED = [
    { id: 'a_world', name: '虚境世界·体素.glb', url: 'assets/xiyou_world.glb', kind: 'model', type: 'glb', folder: 'fld_shared', bytes: 1915952, mime: 'model/gltf-binary' },
    { id: 'a_belltower', name: '西安钟楼·体块.glb', url: 'assets/xiyou_belltower.glb', kind: 'model', type: 'glb', folder: 'fld_shared', bytes: 782288, mime: 'model/gltf-binary' },
  ]
  const seed = [
    ...BUILTIN_SHARED,
    ...(store.scene?.meta?.assets || []).filter(a => a.folder === 'fld_shared'),
  ].filter(a => !existing.has(a.id))
  if (seed.length) {
    seed.forEach(a => projects.addSharedAsset({ ...a, folder: 'fld_shared' }))
  }
})

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
store.on('published', release => {
  log(release ? `已发布快照 v${release.version}` : '已发布快照')
})
store.on('runtime-score', ({ score } = {}) => {
  document.getElementById('viewport-overlay').textContent = store.mode === 'play' ? `模拟试玩 · 分数 ${Number(score) || 0}` : ''
})
store.on('spawn-element', ({ elementId, point, name } = {}) => {
  if (store.mode !== 'play' || !elementId) return
  addElementInstance(elementId, point, { name: name || undefined })
})

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
  const elementId = e.dataTransfer.getData('text/x-xiyou-element')
  const assetId = e.dataTransfer.getData('text/x-xiyou-asset')
  const sharedId = e.dataTransfer.getData('text/x-xiyou-shared')
  const point = viewport.placementPoint ? viewport.placementPoint(e.clientX, e.clientY) : [0, 0, -3]
  if (elementId) {
    addElementInstance(elementId, point)
    return
  }
  // 共享素材拖入视口：先复制进本工程资产表，对象引用才有解析源
  if (sharedId && !assetId) {
    const shared = (projects.sharedAssets?.() || []).find(item => item.id === sharedId)
    if (!shared) return
    let asset = (store.scene.meta?.assets || []).find(item => item.id === shared.id)
    if (!asset) asset = store.addAsset({ ...shared, folder: '' })
    if (!asset) return
    const kind = shared.kind || shared.type
    if (kind === 'splat') { store.setBase({ sog_url: asset.url || '' }); log(`已将共享素材「${shared.name || sharedId}」设为高斯空间底座`); return }
    const objectType = kind === 'image' ? 'quad' : kind === 'video' ? 'video_quad' : kind === 'model' || kind === 'glb' ? 'glb' : null
    if (!objectType) { log(`共享素材「${shared.name || sharedId}」暂不支持拖入视口`, 'warn'); return }
    const zone = viewport.zoneAtPoint?.(point, 'editable')
    const obj = store.addObject(objectType, { asset: asset.id, zone_id: zone?.id || '', transform: { p: point, r: [0, 0, 0], s: [1, 1, 1] } })
    store.select(obj.id)
    log(`已布置共享素材 ${shared.name || sharedId}`)
    return
  }
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
