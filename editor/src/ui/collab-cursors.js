import { store } from '../core/store.js'
import { collab } from '../core/collab.js'

const ROLE_LABELS = {
  manager: '管理者',
  editor: '编辑者',
  previewer: '预览者'
}

function initials(name) {
  return String(name || '?').trim().slice(0, 2).toUpperCase() || '?'
}

export function mount(container) {
  const layer = document.createElement('div')
  layer.className = 'collab-cursors'
  layer.setAttribute('aria-hidden', 'true')
  container.appendChild(layer)

  let peers = []
  let connected = false
  let lastSentAt = 0
  let pendingCursor = null
  let sendTimer = null

  function render() {
    const visibleIds = new Set()
    peers.forEach(peer => {
      const cursor = peer.cursor
      if (!cursor?.visible || !Number.isFinite(Number(cursor.x)) || !Number.isFinite(Number(cursor.y))) return
      const id = String(peer.clientId ?? peer.id ?? peer.name)
      visibleIds.add(id)
      let node = Array.from(layer.children).find(item => item.dataset.clientId === id)
      if (!node) {
        node = document.createElement('div')
        node.className = 'collab-cursor'
        node.dataset.clientId = id
        node.innerHTML = '<span class="collab-cursor-pointer"></span><span class="collab-cursor-label"><b></b><small></small></span>'
        layer.appendChild(node)
      }
      node.style.setProperty('--cursor-color', peer.color || '#2563eb')
      node.style.left = `${Math.max(0, Math.min(1, Number(cursor.x))) * 100}%`
      node.style.top = `${Math.max(0, Math.min(1, Number(cursor.y))) * 100}%`
      node.querySelector('b').textContent = peer.name || '匿名用户'
      node.querySelector('small').textContent = ROLE_LABELS[peer.role] || '协作者'
    })
    Array.from(layer.children).forEach(node => {
      if (!visibleIds.has(node.dataset.clientId)) node.remove()
    })
  }

  function send(cursor) {
    if (!connected) return
    const now = performance.now()
    const delay = Math.max(0, 40 - (now - lastSentAt))
    pendingCursor = cursor
    if (sendTimer || delay > 0) {
      if (!sendTimer) sendTimer = window.setTimeout(() => { sendTimer = null; send(pendingCursor) }, delay)
      return
    }
    lastSentAt = now
    pendingCursor = null
    collab.setCursor(cursor)
  }

  function onMove(event) {
    const rect = container.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    send({
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
      visible: true
    })
  }

  function hide() { send({ visible: false }) }

  container.addEventListener('pointermove', onMove, { passive: true })
  container.addEventListener('pointerleave', hide, { passive: true })
  window.addEventListener('blur', hide)

  const onPeers = value => { peers = Array.isArray(value) ? value : []; render() }
  const onStatus = value => {
    connected = typeof value === 'string' ? value === 'connected' : Boolean(value?.connected)
    if (!connected) hide()
  }
  store.on('collab-peers', onPeers)
  store.on('collab-status', onStatus)

  return {
    dispose() {
      container.removeEventListener('pointermove', onMove)
      container.removeEventListener('pointerleave', hide)
      window.removeEventListener('blur', hide)
      store.off?.('collab-peers', onPeers)
      store.off?.('collab-status', onStatus)
      if (sendTimer) window.clearTimeout(sendTimer)
      layer.remove()
    },
    refresh: render
  }
}
