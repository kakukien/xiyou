import { defaults, newObject, newSequence, newTrigger, newNode, newChapter, newAnchor } from './schema.js'

const EVENTS = ['change', 'selection', 'mode', 'assets', 'log']

const listeners = new Map(EVENTS.map(evt => [evt, new Set()]))

let scene = defaults()
let selection = new Set()
let mode = 'edit'
let storageKey = 'xiyou.scene'
const undoStack = []
const redoStack = []
const HISTORY_LIMIT = 100

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

  source.base = {
    sog_url: typeof base.sog_url === 'string' ? base.sog_url : '',
    collider_url: base.collider_url ?? null,
    env: isObject(base.env) ? base.env : {},
    transform: {
      s: Number.isFinite(baseTransform.s) ? baseTransform.s : 1,
      R: Array.isArray(baseTransform.R) ? baseTransform.R : [1, 0, 0, 0, 1, 0, 0, 0, 1],
      t: Array.isArray(baseTransform.t) ? baseTransform.t : [0, 0, 0],
      scale_source: baseTransform.scale_source || 'manual'
    }
  }

  source.objects = Array.isArray(source.objects) ? source.objects : []
  source.sequences = Array.isArray(source.sequences) ? source.sequences : []
  source.triggers = Array.isArray(source.triggers) ? source.triggers : []
  source.anchors = Array.isArray(source.anchors) ? source.anchors : []

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
  if (record && !transient) {
    undoStack.push(JSON.stringify(scene))
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift()
    redoStack.length = 0
  }

  if (!isObject(scene.meta)) scene.meta = {}
  scene.meta.dirty = true
  emit('change', { transient })
}

function replaceScene(nextScene, { record = true, transient = false } = {}) {
  if (record && !transient) {
    undoStack.push(JSON.stringify(scene))
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift()
    redoStack.length = 0
  }

  scene = normalizeScene(nextScene)
  scene.meta.dirty = true

  const hadSelection = selection.size > 0
  selection.clear()

  emit('change', { transient })
  if (hadSelection) emit('selection', [])
}

function findById(list, id) {
  return list.find(item => item && item.id === id)
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

  setBase(patch) {
    if (!isObject(patch)) return scene.base

    scene.base = deepMerge(scene.base, patch)
    markChanged(false)
    return scene.base
  },

  undo() {
    if (!undoStack.length) return false

    redoStack.push(JSON.stringify(scene))
    const snapshot = undoStack.pop()

    try {
      scene = normalizeScene(JSON.parse(snapshot))
      scene.meta.dirty = true
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

    undoStack.push(JSON.stringify(scene))
    const snapshot = redoStack.pop()

    try {
      scene = normalizeScene(JSON.parse(snapshot))
      scene.meta.dirty = true
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

  setMode(nextMode) {
    if (nextMode !== 'edit' && nextMode !== 'play') return false
    if (mode === nextMode) return true

    mode = nextMode
    emit('mode', mode)
    return true
  },

  addAsset(props = {}) {
    if (!isObject(props)) return null

    const asset = {
      id: props.id || randomId('asset'),
      name: typeof props.name === 'string' ? props.name : '未命名素材',
      type: props.type || 'unknown',
      size: Number.isFinite(props.size) ? props.size : 0,
      url: typeof props.url === 'string' ? props.url : ''
    }

    scene.meta.assets.push(asset)
    markChanged(false)
    emit('assets', scene.meta.assets)
    return asset
  },

  removeAsset(id) {
    const index = scene.meta.assets.findIndex(asset => asset?.id === id)
    if (index < 0) return false

    scene.meta.assets.splice(index, 1)
    markChanged(false)
    emit('assets', scene.meta.assets)
    return true
  }
}