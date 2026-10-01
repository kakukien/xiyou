import { store } from './store.js'
import { OBJECT_TYPES } from './schema.js'

const OBJECT_TYPE_IDS = new Set(Object.keys(OBJECT_TYPES))

const CONDITION_IDS = new Set([
  'tap',
  'gaze',
  'hold',
  'enter',
  'seq_event',
  'node_done'
])

const ACTION_IDS = new Set([
  'play_seq',
  'show',
  'hide',
  'highlight',
  'card',
  'reward',
  'goto_node'
])

function clone(value) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value))
}

function hasObject(id) {
  return !!id && Array.isArray(store.scene?.objects) &&
    store.scene.objects.some(item => item.id === id)
}

function hasSequence(id) {
  return !!id && Array.isArray(store.scene?.sequences) &&
    store.scene.sequences.some(item => item.id === id)
}

function hasTrigger(id) {
  return !!id && Array.isArray(store.scene?.triggers) &&
    store.scene.triggers.some(item => item.id === id)
}

function hasNode(id) {
  return !!id && Array.isArray(store.scene?.story?.chapters) &&
    store.scene.story.chapters.some(chapter =>
      Array.isArray(chapter.nodes) && chapter.nodes.some(node => node.id === id)
    )
}

function hasChapter(id) {
  return !!id && Array.isArray(store.scene?.story?.chapters) &&
    store.scene.story.chapters.some(chapter => chapter.id === id)
}

function numberOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback
}

function vector(value, fallback, length = 3) {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length }, (_, index) =>
    numberOr(source[index], fallback[index] ?? 0)
  )
}

function normalizeTransform(transform = {}) {
  return {
    p: vector(transform.p, [0, 0, 0]),
    r: vector(transform.r, [0, 0, 0]),
    s: vector(transform.s, [1, 1, 1])
  }
}

function normalizeObjectProps(input = {}) {
  const props = clone(input) || {}
  props.transform = normalizeTransform(props.transform)
  if (props.name === undefined) props.name = ''
  if (props.node_id === undefined) props.node_id = ''
  if (props.asset === undefined) props.asset = ''
  if (props.material === undefined) props.material = {}
  return props
}

function cleanId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function uniqueObjectProps(input) {
  const props = normalizeObjectProps(input)
  if (hasObject(props.id)) delete props.id
  return props
}

function uniqueSequenceProps(input) {
  const props = clone(input) || {}
  if (hasSequence(props.id)) delete props.id
  return props
}

function uniqueTriggerProps(input) {
  const props = clone(input) || {}
  if (hasTrigger(props.id)) delete props.id
  return props
}

function uniqueNodeProps(input) {
  const props = clone(input) || {}
  if (hasNode(props.id)) delete props.id
  return props
}

function formatVector(value) {
  return vector(value, [0, 0, 0]).join(',')
}

function objectTypeLabel(type) {
  const meta = OBJECT_TYPES?.[type]
  return meta?.label || meta?.name || type || ''
}

function summarizeSequence(sequence) {
  const tracks = Array.isArray(sequence.tracks) ? sequence.tracks : []
  const targets = [...new Set(tracks.map(track => track.target).filter(Boolean))]
  return `${sequence.id}|${sequence.name || ''}|${numberOr(sequence.duration, 0)}s|${tracks.length}轨|${targets.join(',')}`
}

function summarizeTrigger(trigger) {
  const actions = Array.isArray(trigger.do)
    ? trigger.do.map(item => item.action).filter(Boolean).join(',')
    : ''
  return `${trigger.id}|${trigger.when || ''}|${trigger.target || ''}|${actions}`
}

export function sceneSummary() {
  const scene = store.scene || {}
  const lines = []
  const base = scene.base || {}
  const transform = base.transform || {}

  lines.push(`场景|${scene.meta?.name || '未命名场景'}`)
  lines.push(`base|${base.sog_url || '占位'}|s=${numberOr(transform.s, 1)}|t=${formatVector(transform.t)}`)

  const objects = Array.isArray(scene.objects) ? scene.objects : []
  for (const object of objects) {
    const itemTransform = object.transform || {}
    lines.push(
      `对象|${object.id || ''}|${objectTypeLabel(object.type)}|${object.name || ''}|p(${formatVector(itemTransform.p)})|${object.node_id || '-'}`
    )
  }

  const chapters = Array.isArray(scene.story?.chapters)
    ? scene.story.chapters
    : []

  for (const chapter of chapters) {
    const nodes = Array.isArray(chapter.nodes) ? chapter.nodes : []
    for (const node of nodes) {
      lines.push(
        `节点|${chapter.title || chapter.id || ''}>${node.id || ''}|${node.title || ''}|${node.anchor || '-'}|${node.next === null ? 'null' : (node.next || '-')}`
      )
    }
  }

  const sequences = Array.isArray(scene.sequences) ? scene.sequences : []
  if (sequences.length) {
    lines.push(`时间线|${sequences.map(summarizeSequence).join(';')}`)
  } else {
    lines.push('时间线|无')
  }

  const triggers = Array.isArray(scene.triggers) ? scene.triggers : []
  if (triggers.length) {
    lines.push(`触发器|${triggers.map(summarizeTrigger).join(';')}`)
  } else {
    lines.push('触发器|无')
  }

  return lines.join('\n').slice(0, 2000)
}

export const SYSTEM_PROMPT = `你是「西游·虚境 AR 空间编辑器」的内置助手，帮助合作伙伴用自然语言编辑三维 AR 场景。

你必须只输出一个 JSON 对象，不要输出 Markdown 或代码围栏：
{"reply":"给用户的中文回复（≤60字）","ops":[]}

允许的 ops 及字段：
1. {"op":"add_object","type":"quad|video_quad|glb|light|splat_segment|compound","name":"","transform":{"p":[x,y,z],"r":[0,0,0],"s":[1,1,1]},"node_id":"","material":{},"asset":"","parts":[]}
2. {"op":"update_object","id":"","patch":{}}
3. {"op":"remove_object","id":""}
4. {"op":"add_trigger","id":"","target":"<objectId>","when":"tap|gaze|hold|enter|seq_event|node_done","params":{},"do":[{"action":"play_seq|show|hide|highlight|card|reward|goto_node","args":{}}]}
5. {"op":"add_sequence","id":"","name":"","duration":2,"tracks":[{"target":"<objectId>","kind":"transform|opacity","keys":[{"t":0,"v":{},"ease":"out"}]}]}
6. {"op":"add_node","chapter_id":"","id":"","title":"","text":"≤40字","next":""}
7. {"op":"update_node","chapter_id":"","id":"","patch":{}}
8. {"op":"set_sky","top":"#hex","horizon":"#hex","bottom":"#hex","sun":[x,y,z],"sunColor":"#hex"} // 更换天空穹顶配色

compound 组装体（实时生成任意 3D）：parts 是数组，每项 {"shape":"box|sphere|cylinder|cone|torus|icosa|octa|tetra|capsule|plane|ring","p":[x,y,z],"r":[deg,deg,deg],"s":[x,y,z],"color":"#hex","opacity":0-1,"emissive":"#hex","metalness":0-1,"roughness":0-1,"blend":"additive","flat":true,"shader":{"kind":""}}。
例：生成莲花台 = 底部 cylinder 灰座 + 中层 6 个倾斜的 capsule 花瓣(粉色) + 顶部 sphere 莲心(金) + 环绕 ring(additive 金色光晕)。多思考物体的组成部分再动手。

material.shader 动态效果（quad/compound 部件可用）：{"kind":"nebula星云|flame火焰|sigil法阵光环|holo全息|ripple涟漪","color1":"#hex","color2":"#hex","speed":1,"intensity":1.2,"blend":"additive"}

规则：
- material 可用字段：{"opacity":0-1,"color":"#hex","alpha":"贴图","blend":"additive(发光叠加)|normal","cutout":true(镂空),"point_size":点大小(仅点云),"shader":{"kind":"nebula星云|flame火焰|sigil法阵|holo全息|ripple涟漪","color1":"#hex","color2":"#hex","speed":1,"intensity":1.2}}。发光体配 additive，镂空贴图配 cutout，半透明配 opacity。
- alpha 贴图三种来源：demo:glow|beam|ring|lattice|flame|symbol:<字>（程序化）；fx:glow_orb|spark|smoke|flare|ring_glow|rune_ring|petal|cloud|bokeh|mote（内置高清特效 PNG）；或直接给图片 URL。
- 粒子发射器：compound 的 parts 里放 {"shape":"points","count":300,"spread":[宽,高,深],"size":0.05,"speed":0.3,"drift":0.2,"material":{"color":"#hex","alpha":"fx:mote"}}——萤火虫/下雪/上升光尘/星尘都能做。
- set_sky 可选 {"image":"fx/sky_dusk.jpg|fx/sky_night.jpg|fx/sky_dawn.jpg"} 用内置全景天空图，或传 top/horizon/bottom 纯色渐变。
- 你只能编辑场景内容（对象、触发器、时间线、剧情节点）。底座(base)、素材库、编辑器界面不可修改——没有对应 op，被要求时 reply 说明超出权限，ops 给空数组。
- 引用已有对象、节点和时间线时必须使用场景清单中的 id。
- 拿不准时先根据场景清单猜测，并在 reply 中说明。
- 一次最多 8 个 op。
- reply 不超过 60 字；节点 text 不超过 40 字。
- 不知道如何执行时，reply 说明原因，ops 使用空数组。
- 只输出 JSON 对象。`

function validateAddObject(op) {
  if (!OBJECT_TYPE_IDS.has(op.type) || !OBJECT_TYPES?.[op.type]) {
    throw new Error('对象类型不合法')
  }

  const props = uniqueObjectProps({
    id: cleanId(op.id),
    type: op.type,
    name: typeof op.name === 'string' ? op.name : '',
    transform: op.transform,
    node_id: typeof op.node_id === 'string' ? op.node_id : '',
    material: op.material && typeof op.material === 'object' ? op.material : {},
    asset: typeof op.asset === 'string' ? op.asset : '',
    parts: Array.isArray(op.parts) ? clone(op.parts) : undefined
  })

  return props
}

function validateTrigger(op) {
  if (!hasObject(op.target)) throw new Error('触发器目标对象不存在')
  if (!CONDITION_IDS.has(op.when)) throw new Error('触发条件不合法')
  if (!Array.isArray(op.do)) throw new Error('触发动作必须是数组')

  for (const action of op.do) {
    if (!action || !ACTION_IDS.has(action.action)) {
      throw new Error('触发动作不合法')
    }
  }

  return uniqueTriggerProps({
    id: cleanId(op.id),
    target: op.target,
    when: op.when,
    params: op.params && typeof op.params === 'object' ? op.params : {},
    do: clone(op.do)
  })
}

function validateSequence(op) {
  if (!Array.isArray(op.tracks)) throw new Error('时间线轨道必须是数组')

  const tracks = op.tracks.map(track => {
    if (!hasObject(track.target)) {
      throw new Error(`时间线目标不存在：${track.target || ''}`)
    }
    if (!['transform', 'opacity'].includes(track.kind)) {
      throw new Error('时间线轨道类型不合法')
    }
    return clone(track)
  })

  return uniqueSequenceProps({
    id: cleanId(op.id),
    name: typeof op.name === 'string' ? op.name : '',
    duration: numberOr(op.duration, 2),
    tracks
  })
}

function executeOp(op) {
  if (!op || typeof op !== 'object') {
    throw new Error('操作格式无效')
  }

  switch (op.op) {
    case 'add_object': {
      const props = validateAddObject(op)
      return store.addObject(op.type, props)
    }

    case 'update_object': {
      if (!hasObject(op.id)) throw new Error('对象不存在')
      const patch = clone(op.patch)
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        throw new Error('对象 patch 无效')
      }
      if (patch.transform !== undefined) {
        patch.transform = normalizeTransform(patch.transform)
      }
      return store.updateObject(op.id, patch)
    }

    case 'remove_object': {
      if (!hasObject(op.id)) throw new Error('对象不存在')
      return store.removeObject(op.id)
    }

    case 'add_trigger': {
      const props = validateTrigger(op)
      return store.addTrigger(props)
    }

    case 'add_sequence': {
      const props = validateSequence(op)
      return store.addSequence(props)
    }

    case 'add_node': {
      if (!hasChapter(op.chapter_id)) throw new Error('章节不存在')

      const props = uniqueNodeProps({
        id: cleanId(op.id),
        title: typeof op.title === 'string' ? op.title : '',
        text: typeof op.text === 'string' ? op.text.slice(0, 40) : '',
        next: op.next === null ? null : (typeof op.next === 'string' ? op.next : '')
      })

      return store.addNode(op.chapter_id, props)
    }

    case 'update_node': {
      if (!hasChapter(op.chapter_id)) throw new Error('章节不存在')
      if (!hasNode(op.id)) throw new Error('节点不存在')

      const patch = clone(op.patch)
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        throw new Error('节点 patch 无效')
      }
      if (typeof patch.text === 'string') {
        patch.text = patch.text.slice(0, 40)
      }

      return store.updateNode(op.chapter_id, op.id, patch)
    }

    case 'set_sky': {
      const sky = {}
      for (const k of ['top', 'horizon', 'bottom', 'sunColor']) {
        if (typeof op[k] === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(op[k])) sky[k] = op[k]
      }
      if (Array.isArray(op.sun) && op.sun.length === 3) sky.sun = op.sun.map(Number)
      if (!Object.keys(sky).length) throw new Error('set_sky 参数无效')
      store.setBase({ env: { sky } })
      return store.scene.base.env
    }

    case 'set_base':
      throw new Error('权限不足：AI 不可修改底座')

    default:
      throw new Error(`不支持的操作：${op.op || ''}`)
  }
}

function rewriteRefs(op, aliases) {
  if (!aliases.size || !op || typeof op !== 'object') return op
  const cloned = clone(op)
  const fix = value => (typeof value === 'string' && aliases.has(value) ? aliases.get(value) : value)

  if (cloned.id) cloned.id = fix(cloned.id)
  if (cloned.target) cloned.target = fix(cloned.target)
  if (cloned.node_id) cloned.node_id = fix(cloned.node_id)
  if (cloned.chapter_id) cloned.chapter_id = fix(cloned.chapter_id)
  if (cloned.patch && typeof cloned.patch === 'object') {
    if (cloned.patch.node_id) cloned.patch.node_id = fix(cloned.patch.node_id)
    if (cloned.patch.anchor) cloned.patch.anchor = fix(cloned.patch.anchor)
    if (cloned.patch.next) cloned.patch.next = fix(cloned.patch.next)
    if (cloned.patch.on_enter) cloned.patch.on_enter = fix(cloned.patch.on_enter)
  }
  if (Array.isArray(cloned.tracks)) {
    for (const track of cloned.tracks) if (track && track.target) track.target = fix(track.target)
  }
  if (Array.isArray(cloned.do)) {
    for (const action of cloned.do) {
      if (action && action.args && typeof action.args === 'object') {
        for (const k of Object.keys(action.args)) action.args[k] = fix(action.args[k])
      }
    }
  }
  return cloned
}

export function applyOps(ops) {
  const done = []
  const failed = []

  if (!Array.isArray(ops)) {
    return {
      done,
      failed: [{ op: ops, err: 'ops 必须是数组' }]
    }
  }

  const aliases = new Map()

  for (const rawOp of ops) {
    const op = rewriteRefs(rawOp, aliases)
    try {
      const result = executeOp(op)
      done.push(op)
      const newId = result && result.id ? result.id : null
      if (newId) {
        if (typeof rawOp.id === 'string' && rawOp.id && rawOp.id !== newId) {
          aliases.set(rawOp.id, newId)
        }
        if (typeof rawOp.name === 'string' && rawOp.name) {
          aliases.set(rawOp.name, newId)
        }
      }
    } catch (error) {
      failed.push({
        op,
        err: error?.message || String(error)
      })
    }
  }

  return { done, failed }
}