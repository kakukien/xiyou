import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { store } from './store.js'
import { log } from '../ui/log.js'

const COLLECTIONS = ['objects', 'sequences', 'triggers', 'chapters', 'anchors', 'zones']

const palette = [
  '#e8b93b',
  '#5bb6ff',
  '#ff6b7a',
  '#72d572',
  '#c084fc',
  '#fb923c',
  '#22d3ee',
  '#f472b6'
]

let doc = null
let provider = null
let entities = null
let undoManager = null
let awarenessHandler = null
let observerHandler = null
let statusHandler = null
let syncHandler = null
let changeHandler = null
let selectionHandler = null
let syncTimer = null
let synced = false
let applying = false
let activeUser = null
let activeConnection = null
let connectionGeneration = 0

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function json(value) {
  return JSON.stringify(value)
}

function parse(value, fallback = null) {
  try {
    return typeof value === 'string' ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function ensureBucket(name) {
  let bucket = entities.get(name)
  if (!(bucket instanceof Y.Map)) {
    bucket = new Y.Map()
    entities.set(name, bucket)
  }
  return bucket
}

function sceneCollection(name) {
  if (name === 'base') return store.scene.base || {}
  if (name === 'meta') return store.scene.meta || {}
  return Array.isArray(store.scene[name]) ? store.scene[name] : []
}

function entityMap(name) {
  return name === 'base' || name === 'meta'
    ? ensureBucket(name)
    : ensureBucket(name)
}

function writeCollection(name) {
  const bucket = entityMap(name)

  if (name === 'base' || name === 'meta') {
    const value = json(sceneCollection(name))
    if (bucket.get(name) !== value) bucket.set(name, value)
    return
  }

  const desired = new Map()
  for (const item of sceneCollection(name)) {
    if (item && item.id != null) desired.set(String(item.id), json(item))
  }

  for (const [id, value] of bucket.entries()) {
    if (!desired.has(String(id))) bucket.delete(id)
    else if (value !== desired.get(String(id))) bucket.set(id, desired.get(String(id)))
  }

  for (const [id, value] of desired.entries()) {
    if (!bucket.has(id)) bucket.set(id, value)
  }
}

function writeLocalScene() {
  if (!doc || !entities || !synced || applying) return

  doc.transact(() => {
    for (const name of [...COLLECTIONS, 'base', 'meta']) writeCollection(name)
  }, 'local')
}

function readCollection(name) {
  const bucket = entities.get(name)

  if (!(bucket instanceof Y.Map)) {
    if (name === 'base' || name === 'meta') return null
    return []
  }

  if (name === 'base' || name === 'meta') {
    return parse(bucket.get(name), null)
  }

  const result = []
  for (const [, value] of bucket.entries()) {
    const item = parse(value, null)
    if (item) result.push(item)
  }
  return result
}

function readRemoteScene() {
  const next = clone(store.scene)

  for (const name of COLLECTIONS) {
    const value = readCollection(name)
    next[name] = Array.isArray(value) ? value : []
  }

  const base = readCollection('base')
  const meta = readCollection('meta')

  if (base && typeof base === 'object') next.base = base
  if (meta && typeof meta === 'object') next.meta = meta

  return next
}

function applyRemoteScene({ loaded = false } = {}) {
  if (!doc || !entities) return

  const next = readRemoteScene()

  applying = true
  try {
    store.scene = next
    store.emit('change', { remote: true })
    if (loaded) store.emit('scene-loaded', { remote: true })
    store.save()
  } finally {
    applying = false
  }
}

function hasRemoteData() {
  if (!entities) return false

  for (const name of [...COLLECTIONS, 'base', 'meta']) {
    const bucket = entities.get(name)
    if (!(bucket instanceof Y.Map)) continue
    if (bucket.size > 0) return true
  }

  return false
}

function publishPeers() {
  if (!provider || !provider.awareness) return

  const localClientId = doc ? doc.clientID : null
  const peers = []

  for (const [clientId, state] of provider.awareness.getStates()) {
    if (clientId === localClientId || !state) continue

    peers.push({
      clientId,
      name: state.name || `访客${clientId}`,
      color: state.color || palette[clientId % palette.length],
      sel: Array.isArray(state.sel) ? state.sel : []
    })
  }

  store.emit('collab-peers', peers)
}

function emitStatus(extra = {}) {
  store.emit('collab-status', { connected: Boolean(provider && activeConnection), connecting: Boolean(activeConnection && !collab.connected), room: activeConnection?.room || '', url: activeConnection?.url || '', ...extra })
}

function updateLocalAwareness() {
  if (!provider || !provider.awareness || !doc) return

  const current = provider.awareness.getLocalState() || {}
  provider.awareness.setLocalState({
    ...current,
    name: activeUser?.name || current.name || `访客${doc.clientID}`,
    color: activeUser?.color || current.color || palette[doc.clientID % palette.length],
    sel: store.selected()
  })
}

function handleRemoteTransaction(events, transaction) {
  if (!synced || transaction.origin === 'local') return
  if (!events || events.length === 0) return
  applyRemoteScene()
}

function sceneHasContent(value) {
  if (!value) return false
  return Boolean(
    value.base?.sog_url ||
    value.base?.chunks?.length ||
    value.objects?.length ||
    value.zones?.length ||
    value.triggers?.length ||
    value.anchors?.length ||
    value.meta?.assets?.length ||
    value.story?.chapters?.length
  )
}

function remoteSceneForComparison() {
  return readRemoteScene()
}

function finishInitialSync() {
  if (synced) return
  synced = true

  if (!hasRemoteData()) {
    writeLocalScene()
    log('已发布本地场景到协作房间')
  } else {
    const remote = remoteSceneForComparison()
    const localHasContent = sceneHasContent(store.scene)
    const remoteHasContent = sceneHasContent(remote)
    const localTime = Date.parse(store.scene.meta?.updatedAt || '') || 0
    const remoteTime = Date.parse(remote.meta?.updatedAt || '') || 0

    // 两边都有内容时不再无条件用远端覆盖本地；保留较新的草稿，避免刷新/错房间造成“内容消失”。
    if (localHasContent && remoteHasContent && localTime >= remoteTime) {
      writeLocalScene()
      log('本地草稿较新，已保留本地并同步到协作房间', 'warn')
    } else {
      applyRemoteScene({ loaded: true })
      log('已载入协作场景')
    }
  }

  publishPeers()
}

function setupStoreListeners() {
  if (!changeHandler) {
    changeHandler = () => {
      if (applying) return
      writeLocalScene()
    }
    store.on('change', changeHandler)
  }

  if (!selectionHandler) {
    selectionHandler = () => updateLocalAwareness()
    store.on('selection', selectionHandler)
  }
}

function removeRuntimeListeners() {
  if (provider && provider.awareness && awarenessHandler) {
    provider.awareness.off('change', awarenessHandler)
  }

  if (provider && statusHandler) {
    provider.off('status', statusHandler)
  }

  if (provider && syncHandler) {
    provider.off('sync', syncHandler)
  }

  if (provider && provider.off && provider.off('connection-error')) {
    provider.off('connection-error')
  }

  if (entities && observerHandler) {
    entities.unobserveDeep(observerHandler)
  }

  awarenessHandler = null
  statusHandler = null
  syncHandler = null
  observerHandler = null
}

export const collab = {
  connected: false,

  async connect({ url, room, user = {} } = {}) {
    if (!url || !room) {
      throw new Error('协作连接地址和房间不能为空')
    }
    const generation = ++connectionGeneration
    this.disconnect({ invalidate: false })
    setupStoreListeners()
    activeConnection = { url, room }
    emitStatus({ connecting: true })

    doc = new Y.Doc()
    entities = doc.getMap('entities')
    undoManager = new Y.UndoManager(entities, {
      trackedOrigins: new Set(['local'])
    })

    activeUser = {
      name: user.name || '',
      color: user.color || palette[doc.clientID % palette.length]
    }

    const opts = { connect: true }
    const key = user.key || ''
    if (key) opts.params = { key }

    provider = new WebsocketProvider(url, room, doc, opts)

    synced = false
    this.connected = false

    observerHandler = handleRemoteTransaction
    entities.observeDeep(observerHandler)

    awarenessHandler = () => publishPeers()
    provider.awareness.on('change', awarenessHandler)
    updateLocalAwareness()

    statusHandler = ({ status }) => {
      if (generation !== connectionGeneration) return
      const nextConnected = status === 'connected'
      const changed = this.connected !== nextConnected
      this.connected = nextConnected
      emitStatus({ connecting: false })

      if (!changed) return
      if (this.connected) log(`已连接协作房间：${room}`)
      else log('协作连接已断开', 'warn')
    }

    provider.on('status', statusHandler)

    const promise = new Promise((resolve, reject) => {
      let settled = false

      const finish = (callback, value) => {
        if (settled) return
        settled = true
        if (syncTimer) {
          clearTimeout(syncTimer)
          syncTimer = null
        }
        if (provider && provider.off) provider.off('sync', syncHandler)
        callback(value)
      }

      syncHandler = isSynced => {
        if (!isSynced) return
        finish(resolve, true)
      }

      provider.on('sync', syncHandler)

      syncTimer = setTimeout(() => {
        finish(reject, new Error('协作服务器连接超时'))
      }, 10000)
    })

    try {
      await promise
      if (generation !== connectionGeneration) throw new Error('协作连接已被新的连接请求替换')
      finishInitialSync()
      return true
    } catch (error) {
      if (generation !== connectionGeneration) throw error
      this.connected = false
      emitStatus({ connecting: false })
      log(`协作连接失败：${error.message}`, 'error')
      this.disconnect()
      throw error
    }
  },

  peers() {
    if (!provider || !provider.awareness || !doc) return []

    const result = []
    for (const [clientId, state] of provider.awareness.getStates()) {
      if (clientId === doc.clientID || !state) continue

      result.push({
        clientId,
        name: state.name || `访客${clientId}`,
        color: state.color || palette[clientId % palette.length],
        sel: Array.isArray(state.sel) ? state.sel : []
      })
    }

    return result
  },

  lockedBy(objectId) {
    const id = String(objectId)
    const peer = this.peers().find(item => item.sel.includes(id))
    return peer ? { name: peer.name, color: peer.color } : null
  },

  undo() {
    if (!undoManager || !undoManager.canUndo()) return false
    undoManager.undo()
    if (synced) applyRemoteScene()
    return true
  },

  redo() {
    if (!undoManager || !undoManager.canRedo()) return false
    undoManager.redo()
    if (synced) applyRemoteScene()
    return true
  },

  canUndo() {
    return Boolean(undoManager && undoManager.canUndo())
  },

  canRedo() {
    return Boolean(undoManager && undoManager.canRedo())
  },

  disconnect({ invalidate = true } = {}) {
    if (invalidate) connectionGeneration += 1
    if (syncTimer) {
      clearTimeout(syncTimer)
      syncTimer = null
    }

    removeRuntimeListeners()

    if (provider) {
      provider.disconnect()
      provider.destroy()
    }

    if (doc) doc.destroy()

    provider = null
    doc = null
    entities = null
    undoManager = null
    synced = false
    activeUser = null
    activeConnection = null
    this.connected = false

    emitStatus({ connected: false, connecting: false })
  }
}

setupStoreListeners()