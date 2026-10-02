import { defaults, newObject, newSequence, newTrigger, newNode, newChapter, newAnchor, newZone, validate as validateScene } from './schema.js'

const EVENTS = ['change', 'selection', 'mode', 'editor-mode', 'assets', 'log']

const listeners = new Map(EVENTS.map(evt => [evt, new Set()]))

let scene = defaults()
let selection = new Set()
let mode = 'edit'
let editorMode = 'scene'
let storageKey = 'xiyou.scene'
let batchDepth = 0
let batchDirty = false
let batchSnapshot = null
let committedSnapshot = JSON.stringify(scene)
const undoStack = []
const redoStack = []
// 撤销步数可调（默认 30），持久化到本机
let historyLimit = (() => {
  try {
    const value = Number(localStorage.getItem('xiyou.historyLimit'))
    return Number.isFinite(value) && value >= 1 ? Math.min(500, Math.round(value)) : 30
  } catch { return 30 }
})()

const changeLog = []
const CHANGELOG_LIMIT = 300

function whoami() {
  try {
    return localStorage.getItem('xiyou.user') || '我'
  } catch {
    return '我'
  }
}

function addHistory(target, what, who) {
  const entry = { who: who || whoami(), when: Date.now(), target: target || '', what }
  changeLog.push(entry)
  if (changeLog.length > CHANGELOG_LIMIT) changeLog.shift()
  emit('history', entry)
}

function clone(value) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value))
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function deepMerge(target, patch) {
  if (!isObject(patch)) return clone(patch)

  const result = isObject(target) ? clone(target) : {}

  for (const [key, value] of Object.entries(patch)) {
    if (isObject(value)) {
      result[key] = deepMerge(result[key], value)
    } else {
      result[key] = clone(value)
    }
  }

  return result
}

function randomId(prefix = 'asset') {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let value = ''
  for (let i = 0; i < 6; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${prefix}_${value}`
}

function normalizeScene(input) {
  const source = isObject(input) ? clone(input) : {}
  const base = isObject(source.base) ? source.base : {}
  const baseTransform = isObject(base.transform) ? base.transform : {}

  source.schemaVersion = typeof source.schemaVersion === 'string' ? source.schemaVersion : '2.0.0'
  source.projectId = typeof source.projectId === 'string' ? source.projectId : ''
  source.siteId = typeof source.siteId === 'string' ? source.siteId : ''

  const capture = isObject(base.capture) ? base.capture : null
  const coordinateSystem = isObject(base.coordinate_system) ? base.coordinate_system : {}
  const editing = isObject(base.editing) ? base.editing : {}
  source.base = {
    sog_url: typeof base.sog_url === 'string' ? base.sog_url : '',
    visible: base.visible !== false,
    editor_load: base.editor_load !== false,
    collider_url: base.collider_url ?? null,
    collider: isObject(base.collider) ? base.collider : { type: 'box', size: [20, 2, 20], center: [0, 1, 0], visible: false },
    lod: isObject(base.lod) ? { enabled: Boolean(base.lod.enabled), levels: Array.isArray(base.lod.levels) ? base.lod.levels : ['high', 'medium', 'low'], current: base.lod.current || 'high', urls: isObject(base.lod.urls) ? base.lod.urls : { high: '', medium: '', low: '' }, thresholds: isObject(base.lod.thresholds) ? base.lod.thresholds : { near: 12, far: 30 } } : { enabled: false, levels: ['high', 'medium', 'low'], current: 'high', urls: { high: '', medium: '', low: '' }, thresholds: { near: 12, far: 30 } },
    chunks: Array.isArray(base.chunks) ? base.chunks : [],
    proxy: isObject(base.proxy) && base.proxy.v === 1 ? base.proxy : null,
    viewMode: ['proxy', 'splat', 'both'].includes(base.viewMode) ? base.viewMode : '',
    env: isObject(base.env) ? base.env : {},
    transform: {
      s: Number.isFinite(baseTransform.s) ? baseTransform.s : 1,
      R: Array.isArray(baseTransform.R) ? baseTransform.R : [1, 0, 0, 0, 1, 0, 0, 0, 1],
      t: Array.isArray(baseTransform.t) ? baseTransform.t : [0, 0, 0],
      scale_source: baseTransform.scale_source || 'manual'
    },
    capture_id: typeof base.capture_id === 'string' ? base.capture_id : '',
    capture,
    coordinate_system: {
      up: coordinateSystem.up || 'Y',
      forward: coordinateSystem.forward || '-Z',
      handedness: coordinateSystem.handedness || 'right',
      units: coordinateSystem.units || 'meters',
      origin: coordinateSystem.origin || 'capture'
    },
    artifacts: isObject(base.artifacts) ? base.artifacts : {},
    editing: {
      revision: Number(editing.revision) || 0,
      transform: isObject(editing.transform) ? editing.transform : null,
      crop: isObject(editing.crop) ? editing.crop : null,
      deletion_mask: editing.deletion_mask ?? null
    },
    quality: isObject(base.quality) ? base.quality : null,
    splat_editor: isObject(base.splat_editor) ? base.splat_editor : null
  }

  source.objects = Array.isArray(source.objects) ? source.objects : []
  source.sequences = Array.isArray(source.sequences) ? source.sequences : []
  source.triggers = Array.isArray(source.triggers) ? source.triggers : []
  source.anchors = Array.isArray(source.anchors) ? source.anchors : []
  source.zones = Array.isArray(source.zones) ? source.zones : []

  if (!isObject(source.story)) source.story = {}
  source.story.chapters = Array.isArray(source.story.chapters)
    ? source.story.chapters
    : []

  if (!isObject(source.meta)) source.meta = {}
  source.meta.name = typeof source.meta.name === 'string'
    ? source.meta.name
    : '未命名场景'
  source.meta.assets = Array.isArray(source.meta.assets)
    ? source.meta.assets
    : []
  source.meta.folders = Array.isArray(source.meta.folders)
    ? source.meta.folders.filter(item => isObject(item) && item.id).map(item => ({
        id: String(item.id),
        name: String(item.name || '未命名文件夹'),
        parent: typeof item.parent === 'string' ? item.parent : ''
      }))
    : []
  source.meta.releases = Array.isArray(source.meta.releases)
    ? source.meta.releases
    : []

  return source
}

function isValidScene(value) {
  if (!isObject(value)) return false
  if (!isObject(value.base)) return false
  if (!Array.isArray(value.objects)) return false
  if (!Array.isArray(value.sequences)) return false
  if (!Array.isArray(value.triggers)) return false
  if (!isObject(value.story) || !Array.isArray(value.story.chapters)) return false
  if (!Array.isArray(value.anchors)) return false
  if (!isObject(value.meta) || !Array.isArray(value.meta.assets)) return false
  return true
}

function emit(evt, payload) {
  let set = listeners.get(evt)
  if (!set) {
    set = new Set()
    listeners.set(evt, set)
  }

  for (const fn of [...set]) {
    try {
      fn(payload)
    } catch (error) {
      if (evt !== 'log') {
        const loggers = listeners.get('log')
        if (loggers) {
          for (const logger of [...loggers]) {
            try {
              logger({
                message: error?.message || String(error),
                level: 'error'
              })
            } catch {
              // 忽略日志监听器异常
            }
          }
        }
      }
    }
  }
}

function markChanged(transient = false, record = true) {
  if (!isObject(scene.meta)) scene.meta = {}
  scene.meta.dirty = true

  if (batchDepth > 0) {
    if (record && !transient) {
      if (!batchSnapshot) batchSnapshot = committedSnapshot
      batchDirty = true
    }
    return
  }

  if (record && !transient) {
    undoStack.push(committedSnapshot)
    if (undoStack.length > historyLimit) undoStack.shift()
    redoStack.length = 0
    committedSnapshot = JSON.stringify(scene)
  }

  emit('change', { transient })
}

function replaceScene(nextScene, { record = true, transient = false } = {}) {
  if (record && !transient) {
    undoStack.push(committedSnapshot)
    if (undoStack.length > historyLimit) undoStack.shift()
    redoStack.length = 0
  }

  scene = normalizeScene(nextScene)
  committedSnapshot = JSON.stringify(scene)
  scene.meta.dirty = true

  const hadSelection = selection.size > 0
  selection.clear()

  emit('change', { transient })
  if (hadSelection) emit('selection', [])
}

function findById(list, id) {
  return list.find(item => item && item.id === id)
}


function assetMatches(value, assetId, assetUrl) {
  return Boolean(value) && (value === assetId || (assetUrl && value === assetUrl))
}

function assetReferencesFor(assetId) {
  const asset = scene.meta?.assets?.find(item => item?.id === assetId)
  if (!asset) return { objects: [], base: [], total: 0 }

  const assetUrl = asset.url || ''
  const objects = scene.objects
    .filter(object => assetMatches(object?.asset, asset.id, assetUrl))
    .map(object => ({
      kind: 'object',
      id: object.id,
      name: object.name || object.id,
      type: object.type || 'object'
    }))

  const base = []
  const addBaseReference = (field, label, value, extra = {}) => {
    if (!assetMatches(value, asset.id, assetUrl)) return
    base.push({ kind: 'base', id: extra.id || field, name: label, field, ...extra })
  }

  const baseData = scene.base || {}
  addBaseReference('sog_url', '空间底座', baseData.sog_url)
  addBaseReference('collider_url', '底座 Collider', baseData.collider_url)
  Object.entries(baseData.lod?.urls || {}).forEach(([level, value]) => {
    addBaseReference(`lod.urls.${level}`, `${level} LOD 底座`, value, { level })
  })
  ;(baseData.chunks || []).forEach(chunk => {
    addBaseReference(`chunks.${chunk.id}.url`, chunk.name || chunk.id || '底座分块', chunk.url, { id: chunk.id, chunkId: chunk.id })
    Object.entries(chunk.lod || {}).forEach(([level, value]) => {
      addBaseReference(`chunks.${chunk.id}.lod.${level}`, `${chunk.name || chunk.id || '底座分块'} · ${level} LOD`, value, { id: `${chunk.id}:${level}`, chunkId: chunk.id, level })
    })
  })
  addBaseReference('env.sky.image', '天空图', baseData.env?.sky?.image)

  return { objects, base, total: objects.length + base.length }
}

export const store = {
  get scene() {
    return scene
  },

  set scene(nextScene) {
    scene = normalizeScene(nextScene)
    if (!isObject(scene.meta)) scene.meta = {}
    scene.meta.dirty = true
  },

  selection,

  get mode() {
    return mode
  },

  get editorMode() {
    return editorMode
  },

  get canUndo() {
    return undoStack.length > 0
  },

  get canRedo() {
    return redoStack.length > 0
  },

  on(evt, fn) {
    if (typeof fn !== 'function') return () => {}
    if (!listeners.has(evt)) listeners.set(evt, new Set())
    listeners.get(evt).add(fn)
    return () => this.off(evt, fn)
  },

  off(evt, fn) {
    listeners.get(evt)?.delete(fn)
  },

  emit,

  select(id, { add = false } = {}) {
    const before = [...selection]

    if (id === null || id === undefined) {
      selection.clear()
    } else if (add) {
      if (selection.has(id)) selection.delete(id)
      else selection.add(id)
    } else {
      selection.clear()
      selection.add(id)
    }

    const changed = before.length !== selection.size ||
      before.some(item => !selection.has(item))

    if (changed) emit('selection', [...selection])
  },

  selected() {
    return [...selection]
  },

  selectMany(ids = []) {
    const before = [...selection]
    selection.clear()
    ids.filter(Boolean).forEach(id => selection.add(id))
    const changed = before.length !== selection.size || before.some(item => !selection.has(item))
    if (changed) emit('selection', [...selection])
  },

  history(target) {
    return target ? changeLog.filter(e => e.target === target) : [...changeLog]
  },

  note(target, what, who) {
    addHistory(target, what, who)
  },

  addObject(type, props = {}) {
    const object = newObject(type, props)
    scene.objects.push(object)
    addHistory(object.id, `创建了「${object.name || type}」`)
    markChanged(false)
    return object
  },

  getObject(id) {
    return findById(scene.objects, id)
  },

  updateObject(id, patch, { transient = false } = {}) {
    const object = this.getObject(id)
    if (!object || !isObject(patch)) return null

    const safePatch = clone(patch)
    delete safePatch.id
    delete safePatch.name

    const updated = deepMerge(object, safePatch)
    updated.id = object.id
    updated.name = object.name
    Object.assign(object, updated)

    if (!transient) {
      const keys = Object.keys(safePatch)
      addHistory(id, `更新了「${object.name || id}」(${keys.join('/')})`)
    }
    markChanged(transient, true)
    return object
  },

  removeObject(id) {
    const index = scene.objects.findIndex(object => object?.id === id)
    if (index < 0) return false

    const removedObj = scene.objects[index]
    scene.objects.splice(index, 1)
    const hadSelection = selection.delete(id)

    addHistory(id, `删除了「${removedObj?.name || id}」`)
    markChanged(false)
    if (hadSelection) emit('selection', [...selection])
    return true
  },

  addSequence(props = {}) {
    const sequence = newSequence(props)
    scene.sequences.push(sequence)
    addHistory(sequence.id, `新建时间线「${sequence.name || sequence.id}」`)
    markChanged(false)
    return sequence
  },

  updateSequence(id, patch, { transient = false } = {}) {
    const sequence = findById(scene.sequences, id)
    if (!sequence || !isObject(patch)) return null

    const safePatch = clone(patch)
    delete safePatch.id

    const updated = deepMerge(sequence, safePatch)
    updated.id = sequence.id
    Object.assign(sequence, updated)

    markChanged(transient, true)
    return sequence
  },

  removeSequence(id) {
    const index = scene.sequences.findIndex(sequence => sequence?.id === id)
    if (index < 0) return false

    scene.sequences.splice(index, 1)
    markChanged(false)
    return true
  },

  addTrigger(props = {}) {
    const trigger = newTrigger(props)
    scene.triggers.push(trigger)
    addHistory(trigger.target || trigger.id, '添加了触发')
    markChanged(false)
    return trigger
  },

  updateTrigger(id, patch, { transient = false } = {}) {
    const trigger = findById(scene.triggers, id)
    if (!trigger || !isObject(patch)) return null

    const safePatch = clone(patch)
    delete safePatch.id

    const updated = deepMerge(trigger, safePatch)
    updated.id = trigger.id
    Object.assign(trigger, updated)

    markChanged(transient, true)
    return trigger
  },

  removeTrigger(id) {
    const index = scene.triggers.findIndex(trigger => trigger?.id === id)
    if (index < 0) return false

    scene.triggers.splice(index, 1)
    markChanged(false)
    return true
  },

  addAnchor(props = {}) {
    const anchor = newAnchor(props)
    scene.anchors.push(anchor)
    addHistory(anchor.id, `新增锚点「${anchor.name || anchor.id}」`)
    markChanged(false)
    return anchor
  },

  getAnchor(id) {
    return findById(scene.anchors, id)
  },

  updateAnchor(id, patch, { transient = false } = {}) {
    const anchor = this.getAnchor(id)
    if (!anchor || !isObject(patch)) return null

    const safePatch = clone(patch)
    delete safePatch.id

    const updated = deepMerge(anchor, safePatch)
    updated.id = anchor.id
    Object.assign(anchor, updated)

    if (!transient) addHistory(id, `更新了锚点「${anchor.name || id}」`)
    markChanged(transient, true)
    return anchor
  },

  removeAnchor(id) {
    const index = scene.anchors.findIndex(anchor => anchor?.id === id)
    if (index < 0) return false

    scene.anchors.splice(index, 1)
    const hadSelection = selection.delete(id)

    addHistory(id, `删除了锚点「${id}」`)
    markChanged(false)
    if (hadSelection) emit('selection', [...selection])
    return true
  },

  addZone(props = {}) {
    const zone = newZone(props)
    scene.zones.push(zone)
    addHistory(zone.id, `新增区域「${zone.name || zone.id}」`)
    markChanged(false)
    return zone
  },

  getZone(id) {
    return findById(scene.zones, id)
  },

  updateZone(id, patch, { transient = false } = {}) {
    const zone = this.getZone(id)
    if (!zone || !isObject(patch)) return null
    const safePatch = clone(patch)
    delete safePatch.id
    const updated = deepMerge(zone, safePatch)
    updated.id = zone.id
    Object.assign(zone, updated)
    if (!transient) addHistory(id, `更新了区域「${zone.name || id}」`)
    markChanged(transient, true)
    return zone
  },

  removeZone(id) {
    const index = scene.zones.findIndex(zone => zone?.id === id)
    if (index < 0) return false
    scene.zones.splice(index, 1)
    const affected = scene.objects.filter(object => object?.zone_id === id)
    affected.forEach(object => { object.zone_id = '' })
    const hadSelection = selection.delete(id)
    addHistory(id, `删除了区域并解绑 ${affected.length} 个对象`)
    markChanged(false)
    if (hadSelection) emit('selection', [...selection])
    return true
  },

  addChapter(title) {
    const chapter = newChapter(title)
    scene.story.chapters.push(chapter)
    markChanged(false)
    return chapter
  },

  addNode(chapterId, props = {}) {
    const chapter = findById(scene.story.chapters, chapterId)
    if (!chapter) return null

    if (!Array.isArray(chapter.nodes)) chapter.nodes = []
    const node = newNode(props)
    chapter.nodes.push(node)
    addHistory(node.id, `新增节点「${node.title || node.id}」`)
    markChanged(false)
    return node
  },

  updateChapter(chapterId, patch, { transient = false } = {}) {
    const chapter = findById(scene.story.chapters, chapterId)
    if (!chapter || !isObject(patch)) return null

    const safePatch = clone(patch)
    delete safePatch.id
    delete safePatch.nodes
    Object.assign(chapter, deepMerge(chapter, safePatch))
    chapter.id = chapterId

    markChanged(transient, true)
    return chapter
  },

  removeChapter(chapterId) {
    const index = scene.story.chapters.findIndex(chapter => chapter?.id === chapterId)
    if (index < 0) return false

    scene.story.chapters.splice(index, 1)
    const hadSelection = selection.delete(chapterId)

    markChanged(false)
    if (hadSelection) emit('selection', [...selection])
    return true
  },

  updateNode(chapterId, nodeId, patch, { transient = false } = {}) {
    const chapter = findById(scene.story.chapters, chapterId)
    const node = chapter && findById(chapter.nodes || [], nodeId)
    if (!node || !isObject(patch)) return null

    const safePatch = clone(patch)
    delete safePatch.id

    const updated = deepMerge(node, safePatch)
    updated.id = node.id
    Object.assign(node, updated)

    markChanged(transient, true)
    return node
  },

  moveNode(chapterId, nodeId, toIndex) {
    const chapter = findById(scene.story.chapters, chapterId)
    if (!chapter || !Array.isArray(chapter.nodes)) return false

    const index = chapter.nodes.findIndex(node => node?.id === nodeId)
    if (index < 0) return false

    const target = Math.max(0, Math.min(chapter.nodes.length - 1, Number(toIndex) || 0))
    const [node] = chapter.nodes.splice(index, 1)
    chapter.nodes.splice(target, 0, node)

    markChanged(false)
    return true
  },

  removeNode(chapterId, nodeId) {
    const chapter = findById(scene.story.chapters, chapterId)
    if (!chapter || !Array.isArray(chapter.nodes)) return false

    const index = chapter.nodes.findIndex(node => node?.id === nodeId)
    if (index < 0) return false

    chapter.nodes.splice(index, 1)
    const hadSelection = selection.delete(nodeId)

    markChanged(false)
    if (hadSelection) emit('selection', [...selection])
    return true
  },

  setBase(patch, { transient = false } = {}) {
    if (!isObject(patch)) return scene.base

    scene.base = deepMerge(scene.base, patch)
    markChanged(transient)
    return scene.base
  },

  setStream(spec) {
    scene.stream = spec === null ? null : clone(spec)
    markChanged(false)
    return scene.stream
  },

  undo() {
    if (!undoStack.length) return false

    redoStack.push(committedSnapshot)
    const snapshot = undoStack.pop()

    try {
      scene = normalizeScene(JSON.parse(snapshot))
      scene.meta.dirty = true
      committedSnapshot = JSON.stringify(scene)
    } catch {
      return false
    }

    const hadSelection = selection.size > 0
    selection.clear()

    emit('change', { transient: false })
    if (hadSelection) emit('selection', [])
    return true
  },

  redo() {
    if (!redoStack.length) return false

    undoStack.push(committedSnapshot)
    const snapshot = redoStack.pop()

    try {
      scene = normalizeScene(JSON.parse(snapshot))
      scene.meta.dirty = true
      committedSnapshot = JSON.stringify(scene)
    } catch {
      return false
    }

    const hadSelection = selection.size > 0
    selection.clear()

    emit('change', { transient: false })
    if (hadSelection) emit('selection', [])
    return true
  },

  setStorageKey(key) {
    storageKey = key || 'xiyou.scene'
  },

  save() {
    try {
      scene.meta.dirty = false
      localStorage.setItem(storageKey, JSON.stringify(scene))
      return true
    } catch (error) {
      emit('log', {
        message: `保存场景失败：${error?.message || String(error)}`,
        level: 'error'
      })
      return false
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return false

      const parsed = JSON.parse(raw)
      if (!isValidScene(parsed)) return false

      scene = normalizeScene(parsed)
      scene.meta.dirty = false
      committedSnapshot = JSON.stringify(scene)

      const hadSelection = selection.size > 0
      selection.clear()

      undoStack.length = 0
      redoStack.length = 0

      emit('change', { transient: false })
      if (hadSelection) emit('selection', [])
      return true
    } catch (error) {
      emit('log', {
        message: `读取场景失败：${error?.message || String(error)}`,
        level: 'error'
      })
      return false
    }
  },

  newScene(template) {
    const nextScene = template === undefined
      ? defaults()
      : typeof template === 'function'
        ? template()
        : template

    replaceScene(nextScene, { record: true, transient: false })
    return scene
  },

  exportJSON() {
    return JSON.stringify(scene, null, 2)
  },

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString)
      if (!isObject(parsed)) throw new Error('场景数据不是对象')

      const nextScene = normalizeScene(parsed)
      replaceScene(nextScene, { record: true, transient: false })
      return true
    } catch (error) {
      emit('log', {
        message: `导入场景失败：${error?.message || String(error)}`,
        level: 'error'
      })
      return false
    }
  },

  batch(fn) {
    batchDepth += 1
    try {
      return fn?.()
    } finally {
      batchDepth -= 1
      if (batchDepth === 0 && batchDirty) {
        undoStack.push(batchSnapshot || committedSnapshot)
        if (undoStack.length > historyLimit) undoStack.shift()
        redoStack.length = 0
        committedSnapshot = JSON.stringify(scene)
        batchSnapshot = null
        batchDirty = false
        emit('change', { transient: false })
      } else if (batchDepth === 0) {
        batchSnapshot = null
      }
    }
  },

  releaseDiff(leftId, rightId) {
    const left = (scene.meta.releases || []).find(item => item.id === leftId)
    const right = (scene.meta.releases || []).find(item => item.id === rightId)
    if (!left || !right) return null
    const parseSnapshot = release => { try { return JSON.parse(release.snapshot || '{}') } catch { return {} } }
    const a = parseSnapshot(left)
    const b = parseSnapshot(right)
    const ids = (value, key) => new Set((value[key] || []).map(item => item?.id).filter(Boolean))
    const diff = (key) => {
      const aItems = key === 'assets' ? (a.meta?.assets || []) : (a[key] || [])
      const bItems = key === 'assets' ? (b.meta?.assets || []) : (b[key] || [])
      const aIds = new Set(aItems.map(item => item?.id).filter(Boolean))
      const bIds = new Set(bItems.map(item => item?.id).filter(Boolean))
      return {
        added: [...bIds].filter(id => !aIds.has(id)),
        removed: [...aIds].filter(id => !bIds.has(id)),
        changed: [...bIds].filter(id => aIds.has(id) && JSON.stringify(bItems.find(item => item.id === id)) !== JSON.stringify(aItems.find(item => item.id === id)))
      }
    }
    return { left, right, objects: diff('objects'), zones: diff('zones'), assets: diff('assets'), baseChanged: JSON.stringify(a.base || {}) !== JSON.stringify(b.base || {}) }
  },

  restoreRelease(id) {
    const release = (scene.meta.releases || []).find(item => item.id === id)
    if (!release?.snapshot) return false
    try {
      const parsed = JSON.parse(release.snapshot)
      parsed.meta = { ...(parsed.meta || {}), releases: clone(scene.meta.releases || []) }
      replaceScene(parsed, { record: true, transient: false })
      addHistory(release.id, `恢复发布版本 v${release.version}`)
      emit('release-restored', release)
      return true
    } catch (error) {
      emit('log', { message: `恢复发布版本失败：${error?.message || String(error)}`, level: 'error' })
      return false
    }
  },

  validate() {
    return validateScene(scene)
  },

  setEditorMode(nextMode) {
    if (nextMode !== 'scene' && nextMode !== 'splat-studio') return false
    if (editorMode === nextMode) return true
    editorMode = nextMode
    emit('editor-mode', editorMode)
    return true
  },

  setMode(nextMode) {
    if (nextMode !== 'edit' && nextMode !== 'play') return false
    if (mode === nextMode) return true

    mode = nextMode
    emit('mode', mode)
    return true
  },

  addAsset(props = {}) {
    if (!isObject(props)) return null

    const bytes = Number.isFinite(props.bytes) ? props.bytes : (Number.isFinite(props.size) ? props.size : 0)
    const asset = {
      id: props.id || randomId('asset'),
      kind: props.kind || props.type || 'unknown',
      subtype: props.subtype || props.type || 'unknown',
      name: typeof props.name === 'string' ? props.name : '未命名素材',
      type: props.type || props.kind || 'unknown',
      size: bytes,
      bytes,
      mime: typeof props.mime === 'string' ? props.mime : '',
      url: typeof props.url === 'string' ? props.url : '',
      source: props.source || 'upload',
      variants: isObject(props.variants) ? clone(props.variants) : {},
      metadata: isObject(props.metadata) ? clone(props.metadata) : {},
      tags: Array.isArray(props.tags) ? clone(props.tags) : [],
      folder: typeof props.folder === 'string' ? props.folder : '',
      license: props.license || 'project',
      version: props.version || '1.0.0'
    }

    scene.meta.assets.push(asset)
    markChanged(false)
    emit('assets', scene.meta.assets)
    return asset
  },

  assetReferences(id) {
    return assetReferencesFor(id)
  },

  replaceAsset(id, file, url = '') {
    const asset = scene.meta.assets.find(item => item?.id === id)
    if (!asset || !file) return null

    const oldUrl = asset.url || ''
    const nextUrl = url || oldUrl
    const replaceUrl = value => assetMatches(value, asset.id, oldUrl) ? nextUrl : value
    const nextBase = clone(scene.base)

    nextBase.sog_url = replaceUrl(nextBase.sog_url)
    nextBase.collider_url = replaceUrl(nextBase.collider_url)
    if (nextBase.env?.sky) nextBase.env.sky.image = replaceUrl(nextBase.env.sky.image)
    if (nextBase.lod?.urls) {
      Object.keys(nextBase.lod.urls).forEach(level => {
        nextBase.lod.urls[level] = replaceUrl(nextBase.lod.urls[level])
      })
    }
    ;(nextBase.chunks || []).forEach(chunk => {
      chunk.url = replaceUrl(chunk.url)
      if (chunk.lod) Object.keys(chunk.lod).forEach(level => { chunk.lod[level] = replaceUrl(chunk.lod[level]) })
    })
    scene.objects.forEach(object => {
      if (object?.asset === asset.id) object.asset = asset.id
      else if (object?.asset === oldUrl) object.asset = nextUrl
    })

    const nextVersion = Number.parseInt(String(asset.version || '1.0.0').split('.')[0], 10) + 1
    Object.assign(asset, {
      url: nextUrl,
      bytes: Number(file.size) || 0,
      size: Number(file.size) || 0,
      mime: file.type || asset.mime || '',
      version: `${nextVersion}.0.0`,
      source: 'upload'
    })
    scene.base = nextBase
    addHistory(id, `替换素材「${asset.name || id}」为 v${asset.version}`)
    markChanged(false)
    emit('assets', scene.meta.assets)
    return asset
  },

  updateAsset(id, patch = {}) {
    const asset = scene.meta.assets.find(item => item?.id === id)
    if (!asset || !isObject(patch)) return null
    const safePatch = clone(patch)
    delete safePatch.id
    Object.assign(asset, safePatch)
    addHistory(id, `更新素材「${asset.name || id}」`)
    markChanged(false)
    emit('assets', scene.meta.assets)
    return asset
  },

  // ---- 资源工作目录（UE 式内容浏览器）----
  // scene.meta.folders: [{ id, name, parent }]；parent='' 挂在根目录「内容」下；
  // asset.folder 存目录 id，'' 表示根目录。协作时每人用自己的目录隔离素材。

  get folders() {
    if (!isObject(scene.meta)) scene.meta = {}
    if (!Array.isArray(scene.meta.folders)) scene.meta.folders = []
    return scene.meta.folders
  },

  // 播种默认工作目录：共享素材 + 当前用户个人目录，返回个人目录 id
  ensureWorkspaceFolders() {
    const folders = this.folders
    let touched = false
    if (!folders.find(item => item.id === 'fld_shared')) {
      folders.push({ id: 'fld_shared', name: '共享素材', parent: '' })
      touched = true
    }
    const personalId = `fld_${whoami()}`
    if (!folders.find(item => item.id === personalId)) {
      folders.push({ id: personalId, name: `${whoami()}的素材`, parent: '' })
      touched = true
    }
    if (touched) {
      markChanged(false)
      emit('assets', scene.meta.assets)
    }
    return personalId
  },

  addFolder(name, parent = '') {
    const label = String(name || '').trim() || '新建文件夹'
    const folder = { id: randomId('fld'), name: label, parent: String(parent || '') }
    this.folders.push(folder)
    addHistory(folder.id, `新建文件夹「${label}」`)
    markChanged(false)
    emit('assets', scene.meta.assets)
    return folder
  },

  renameFolder(id, name) {
    const folder = this.folders.find(item => item.id === id)
    const label = String(name || '').trim()
    if (!folder || !label) return null
    folder.name = label
    addHistory(id, `重命名文件夹为「${label}」`)
    markChanged(false)
    emit('assets', scene.meta.assets)
    return folder
  },

  // 删除目录：子目录与素材都上移到父目录，不丢素材
  removeFolder(id) {
    const folders = this.folders
    const folder = folders.find(item => item.id === id)
    if (!folder) return false
    const parent = folder.parent || ''
    folders.forEach(item => { if (item.parent === id) item.parent = parent })
    scene.meta.assets.forEach(asset => { if (asset?.folder === id) asset.folder = parent })
    folders.splice(folders.indexOf(folder), 1)
    addHistory(id, `删除文件夹「${folder.name}」`)
    markChanged(false)
    emit('assets', scene.meta.assets)
    return true
  },

  moveAssetToFolder(assetId, folderId = '') {
    const asset = scene.meta.assets.find(item => item?.id === assetId)
    if (!asset) return null
    const exists = folderId === '' || this.folders.some(item => item.id === folderId)
    if (!exists) return null
    asset.folder = folderId
    markChanged(false)
    emit('assets', scene.meta.assets)
    return asset
  },

  get historyLimit() { return historyLimit },

  setHistoryLimit(value) {
    const next = Number(value)
    if (!Number.isFinite(next)) return historyLimit
    historyLimit = Math.max(1, Math.min(500, Math.round(next)))
    try { localStorage.setItem('xiyou.historyLimit', String(historyLimit)) } catch {}
    while (undoStack.length > historyLimit) undoStack.shift()
    return historyLimit
  },

  createRelease() {
    if (!isObject(scene.meta)) scene.meta = {}
    if (!Array.isArray(scene.meta.releases)) scene.meta.releases = []
    const previous = scene.meta.releases[scene.meta.releases.length - 1]
    const previousVersion = Number(previous?.version) || 0
    const snapshot = clone(scene)
    snapshot.meta = { ...(snapshot.meta || {}), releases: [] }
    const release = {
      id: randomId('release'),
      version: previousVersion + 1,
      name: `${scene.meta.name || '未命名场景'} v${previousVersion + 1}`,
      createdAt: new Date().toISOString(),
      schemaVersion: scene.schemaVersion || '2.0.0',
      baseUrl: scene.base?.sog_url || '',
      objects: scene.objects.length,
      zones: scene.zones.length,
      assets: scene.meta.assets.length,
      snapshot: JSON.stringify(snapshot)
    }
    scene.meta.releases.push(release)
    addHistory(release.id, `创建发布版本 v${release.version}`)
    markChanged(false)
    emit('published', release)
    return release
  },

  removeAsset(id) {
    const index = scene.meta.assets.findIndex(asset => asset?.id === id)
    if (index < 0) return false

    scene.meta.assets.splice(index, 1)
    const affected = scene.objects.filter(object => object?.asset === id)
    affected.forEach(object => { object.asset = '' })
    addHistory(id, `删除素材并解绑 ${affected.length} 个对象`)
    markChanged(false)
    emit('assets', scene.meta.assets)
    return true
  }
}