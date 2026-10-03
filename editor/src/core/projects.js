/**
 * 工程注册表 + 共享素材库。
 *
 * 用一条独立的 Yjs 文档（房间 xiyou-projects）存两件事：
 *   projects: Map<projId, JSON{name, owner, updatedAt}>   —— 工程清单
 *   shared:   Map<'folders'|'assets', JSON>               —— 全员可见的共享素材库
 *
 * 项目素材走各自工程房间（xiyou-proj-<id>）的 scene.meta，天然只在本工程可见。
 * 无服务端新依赖：静态站 + 既有 y-websocket 开放房间。
 */
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const REGISTRY_ROOM = 'xiyou-projects'

// 内置共享素材：客户端常量，注册表连不上/被清空也始终可见
// id/结构必须与 main.js 播种的 BUILTIN_SHARED 一致，避免连上后出现两份
const BUILTIN_SHARED_FOLDER = { id: 'fld_shared', name: '共享素材', parent: '' }
const BUILTIN_SHARED_ASSETS = [
  { id: 'a_world', name: '故事空间·体素.glb', url: 'assets/xiyou_world.glb', kind: 'model', type: 'glb', folder: 'fld_shared', tags: ['环境', '体素', '场景'], bytes: 1915952, mime: 'model/gltf-binary', builtin: true },
  { id: 'a_belltower', name: '西安钟楼·体块.glb', url: 'assets/xiyou_belltower.glb', kind: 'model', type: 'glb', folder: 'fld_shared', tags: ['建筑', '钟楼', '西安'], bytes: 782288, mime: 'model/gltf-binary', builtin: true },
  { id: 'a_nongyao', name: '王者峡谷.glb', url: 'assets/nongyao.glb', kind: 'model', type: 'glb', folder: 'fld_shared', tags: ['游戏', '场景'], bytes: 19235268, mime: 'model/gltf-binary', builtin: true },
  { id: 'a_obj_temple', name: '寺庙模型.glb', url: 'assets/obj_temple.glb', kind: 'model', type: 'glb', folder: 'fld_shared', tags: ['建筑', '模型'], bytes: 14152912, mime: 'model/gltf-binary', builtin: true },
  { id: 'a_gen_subjtest_src', name: '主体生成参考图.png', url: 'assets/gen_subjtest_src.png', kind: 'image', type: 'image', folder: 'fld_shared', tags: ['生成', '参考图'], bytes: 239347, mime: 'image/png', builtin: true },
  { id: 'a_gen_testmt_src', name: '场景生成参考图 1.png', url: 'assets/gen_testmt_src.png', kind: 'image', type: 'image', folder: 'fld_shared', tags: ['生成', '参考图'], bytes: 42460, mime: 'image/png', builtin: true },
  { id: 'a_gen_wmuriz2ar_src', name: '场景生成参考图 2.png', url: 'assets/gen_wmuriz2ar_src.png', kind: 'image', type: 'image', folder: 'fld_shared', tags: ['生成', '参考图'], bytes: 42460, mime: 'image/png', builtin: true },
  { id: 'a_gen_wmurjj923_src', name: '场景生成参考图 3.png', url: 'assets/gen_wmurjj923_src.png', kind: 'image', type: 'image', folder: 'fld_shared', tags: ['生成', '参考图'], bytes: 42460, mime: 'image/png', builtin: true },
  { id: 'a_gen_wmurm2sqi_src', name: '场景生成参考图 4.png', url: 'assets/gen_wmurm2sqi_src.png', kind: 'image', type: 'image', folder: 'fld_shared', tags: ['生成', '参考图'], bytes: 42460, mime: 'image/png', builtin: true },
  { id: 'a_gen_wmurmcser_src', name: '场景生成参考图 5.png', url: 'assets/gen_wmurmcser_src.png', kind: 'image', type: 'image', folder: 'fld_shared', tags: ['生成', '参考图'], bytes: 1347677, mime: 'image/png', builtin: true },
  { id: 'a_vps', name: 'VPS 地址配置.txt', url: 'vps.txt', kind: 'config', type: 'text', folder: 'fld_shared', tags: ['VPS', '配置'], bytes: 0, mime: 'text/plain', builtin: true },
]

const listeners = new Map()
let doc = null
let provider = null
let projectsMap = null
let sharedMap = null
let ready = false

function emit(evt, payload) {
  for (const fn of [...(listeners.get(evt) || [])]) {
    try { fn(payload) } catch {}
  }
}

function parseJSON(value, fallback) {
  try { return typeof value === 'string' ? JSON.parse(value) : fallback } catch { return fallback }
}

function wsUrl() {
  const override = new URLSearchParams(location.search).get('ws')
  if (override) return override
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return `ws://${location.hostname}:8022`
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${location.host}/xiyou-yjs`
}

export const projects = {
  get ready() { return ready },

  connect() {
    if (provider) return
    doc = new Y.Doc()
    projectsMap = doc.getMap('projects')
    sharedMap = doc.getMap('shared')
    provider = new WebsocketProvider(wsUrl(), REGISTRY_ROOM, doc, { connect: true })
    provider.on('sync', synced => {
      if (!synced) return
      // 服务端内存态：容器重启会丢注册表——空文档时用本机快照自愈
      if (projectsMap.size === 0 && sharedMap.size === 0) {
        try {
          const snap = JSON.parse(localStorage.getItem('xiyou.registry.v1') || 'null')
          if (snap) {
            doc.transact(() => {
              Object.entries(snap.projects || {}).forEach(([id, raw]) => projectsMap.set(id, raw))
              Object.entries(snap.shared || {}).forEach(([key, raw]) => sharedMap.set(key, raw))
            })
          }
        } catch {}
      }
      ready = true
      emit('ready')
      emit('change')
    })
    const snapshot = () => {
      try {
        const snap = { projects: {}, shared: {} }
        for (const [k, v] of projectsMap.entries()) snap.projects[k] = v
        for (const [k, v] of sharedMap.entries()) snap.shared[k] = v
        localStorage.setItem('xiyou.registry.v1', JSON.stringify(snap))
      } catch {}
    }
    projectsMap.observeDeep(() => { snapshot(); emit('projects') })
    sharedMap.observeDeep(() => { snapshot(); emit('shared') })
  },

  on(evt, fn) {
    if (!listeners.has(evt)) listeners.set(evt, new Set())
    listeners.get(evt).add(fn)
    return () => listeners.get(evt)?.delete(fn)
  },

  // ---- 工程清单 ----
  list() {
    const out = []
    if (!projectsMap) return out
    for (const [id, raw] of projectsMap.entries()) {
      const item = parseJSON(raw, null)
      if (item) out.push({ id, ...item })
    }
    return out.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  },

  create(name, owner = '') {
    if (!projectsMap) return null
    const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const item = { name: String(name || '未命名工程').trim() || '未命名工程', owner, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    projectsMap.set(id, JSON.stringify(item))
    return { id, ...item }
  },

  rename(id, name) {
    const raw = projectsMap?.get(id)
    const item = parseJSON(raw, null)
    if (!item || !name?.trim()) return false
    item.name = name.trim()
    item.updatedAt = new Date().toISOString()
    projectsMap.set(id, JSON.stringify(item))
    return true
  },

  touch(id, patch = {}) {
    const raw = projectsMap?.get(id)
    const item = parseJSON(raw, {})
    Object.assign(item, patch, { updatedAt: new Date().toISOString() })
    projectsMap?.set(id, JSON.stringify(item))
  },

  remove(id) {
    if (!projectsMap?.has(id)) return false
    projectsMap.delete(id)
    return true
  },

  // ---- 共享素材库（目录树 + 素材元数据，全员同步）----
  sharedFolders() {
    const reg = parseJSON(sharedMap?.get('folders'), [])
    return [BUILTIN_SHARED_FOLDER, ...reg.filter(f => f.id !== BUILTIN_SHARED_FOLDER.id)]
  },

  sharedAssets() {
    const reg = parseJSON(sharedMap?.get('assets'), [])
    const dup = new Set(BUILTIN_SHARED_ASSETS.map(a => a.id))
    return [...BUILTIN_SHARED_ASSETS, ...reg.filter(a => !a.builtin && !dup.has(a.id))]
  },

  setSharedFolders(folders) {
    sharedMap?.set('folders', JSON.stringify(folders || []))
  },

  setSharedAssets(assets) {
    sharedMap?.set('assets', JSON.stringify(assets || []))
  },

  addSharedFolder(name, parent = '') {
    const folders = this.sharedFolders()
    const folder = { id: `sf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: String(name || '新建文件夹').trim() || '新建文件夹', parent }
    folders.push(folder)
    this.setSharedFolders(folders)
    return folder
  },

  renameSharedFolder(id, name) {
    const folders = this.sharedFolders()
    const folder = folders.find(item => item.id === id)
    if (!folder || !name?.trim()) return false
    folder.name = name.trim()
    this.setSharedFolders(folders)
    return true
  },

  removeSharedFolder(id) {
    const folders = this.sharedFolders()
    const folder = folders.find(item => item.id === id)
    if (!folder) return false
    const parent = folder.parent || ''
    folders.forEach(item => { if (item.parent === id) item.parent = parent })
    const assets = this.sharedAssets()
    assets.forEach(asset => { if (asset.folder === id) asset.folder = parent })
    this.setSharedAssets(assets)
    this.setSharedFolders(folders.filter(item => item.id !== id))
    return true
  },

  addSharedAsset(props = {}) {
    const assets = this.sharedAssets()
    const asset = { id: props.id || `sa_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, folder: '', ...props }
    if (!assets.find(item => item.id === asset.id)) {
      assets.push(asset)
      this.setSharedAssets(assets)
    }
    return asset
  },

  updateSharedAsset(id, patch = {}) {
    const assets = this.sharedAssets()
    const asset = assets.find(item => item.id === id)
    if (!asset) return null
    Object.assign(asset, patch, { id })
    this.setSharedAssets(assets)
    return asset
  },

  removeSharedAsset(id) {
    this.setSharedAssets(this.sharedAssets().filter(item => item.id !== id))
  }
}

export const SHARED_ROOT = 'scope:shared'
export const PROJECT_ROOT = 'scope:project'
