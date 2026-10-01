import { store } from './core/store.js'
import { viewport } from './core/viewport.js'
import { player, tickPlay } from './core/playback.js'
import { demoScene } from './core/templates.js'
import { log } from './ui/log.js'
import { mount as mountTopbar } from './ui/topbar.js'
import { mount as mountOutliner } from './ui/outliner.js'
import { mount as mountDetails } from './ui/details.js'
import { mount as mountDock } from './ui/dock.js'
import { mount as mountPresence } from './ui/presence.js'
import { mount as mountChat } from './ui/chat.js'
import { mount as mountVpchrome } from './ui/vpchrome.js'
import { collab } from './core/collab.js'

// ---- bootstrap ----
const params = new URLSearchParams(location.search)
const ROOM = params.get('room') || 'demo'
store.setStorageKey(`xiyou.scene.${ROOM}`)
if (params.has('reset')) {
  try { localStorage.removeItem(`xiyou.scene.${ROOM}`) } catch {}
}
if (!store.load()) store.newScene(demoScene())

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

// auto-connect collab (non-fatal if server unreachable)
if (presenceEl && presenceEl._connect) presenceEl._connect()

// ---- react to store ----
let lastBase = store.scene.base
store.on('change', () => {
  if (store.scene.base !== lastBase) {
    lastBase = store.scene.base
    viewport.setBase(lastBase)
  }
  viewport.sync()
  store.save()
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

// ---- drag from content browser ----
const vpEl = document.getElementById('viewport')
vpEl.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' })
vpEl.addEventListener('drop', e => {
  e.preventDefault()
  const type = e.dataTransfer.getData('xo-type')
  if (!type) return
  const p = viewport.groundPoint ? viewport.groundPoint(e.clientX, e.clientY) : [0, 0, -3]
  const obj = store.addObject(type, { transform: { p, r: [0, 0, 0], s: [1, 1, 1] } })
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
  else if (k === 'f') { const id = store.selected()[0]; if (id) viewport.focus(id) }
  else if (k === 'delete' || k === 'backspace') {
    for (const id of store.selected()) if (store.getObject(id)) store.removeObject(id)
  }
})

// ---- main loop ----
const clock = { last: performance.now() }
function frame(now) {
  const dt = Math.min((now - clock.last) / 1000, 0.1)
  clock.last = now
  viewport.tick(dt)
  tickPlay(dt)
  viewport.render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

log('编辑器已就绪')
