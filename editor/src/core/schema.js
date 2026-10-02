const VIDEO_PRESETS = {
  S: { w: 1024, h: 2048 },
  P: { w: 768, h: 2048 },
  L: { w: 1280, h: 1440 }
};

export { VIDEO_PRESETS };

export const OBJECT_TYPES = {
  splat_segment: {
    id: 'splat_segment',
    label: '点云片段',
    icon: 'sparkling-2-line',
    defaultSize: [2, 2, 2],
    canInteract: true,
    hitbox: 'auto'
  },
  quad: {
    id: 'quad',
    label: '图片平面',
    icon: 'image-2-line',
    defaultSize: [1, 1, 0],
    canInteract: true,
    hitbox: 'box'
  },
  video_quad: {
    id: 'video_quad',
    label: '视频平面',
    icon: 'movie-2-line',
    defaultSize: [0.75, 1, 0],
    canInteract: true,
    hitbox: 'box'
  },
  glb: {
    id: 'glb',
    label: '3D 模型',
    icon: 'box-3-line',
    defaultSize: [1, 1, 1],
    canInteract: true,
    hitbox: 'auto'
  },
  light: {
    id: 'light',
    label: '点光源',
    icon: 'lightbulb-flash-line',
    defaultSize: [1, 1, 1],
    canInteract: true,
    hitbox: 'none'
  },
  compound: {
    id: 'compound',
    label: '组装体',
    icon: 'shapes-line',
    defaultSize: [1, 1, 1],
    canInteract: true,
    hitbox: 'auto'
  }
};

export const CONDITIONS = [
  { id: 'tap', label: '点击' },
  { id: 'gaze', label: '看向1s' },
  { id: 'hold', label: '按住1s' },
  { id: 'enter', label: '进入区域' },
  { id: 'seq_event', label: '时间线事件' },
  { id: 'node_done', label: '节点完成' }
];

export const ACTIONS = [
  { id: 'play_seq', label: '播放时间线', argKinds: ['sequence'] },
  { id: 'show', label: '显示', argKinds: [] },
  { id: 'hide', label: '隐藏', argKinds: [] },
  { id: 'highlight', label: '高亮', argKinds: [] },
  { id: 'card', label: '弹卡片', argKinds: ['text'] },
  { id: 'reward', label: '给奖励', argKinds: ['text'] },
  { id: 'goto_node', label: '跳转节点', argKinds: ['node'] }
];

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function merge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return patch === undefined ? clone(base) : clone(patch);
  }

  const result = base && typeof base === 'object' && !Array.isArray(base)
    ? clone(base)
    : {};

  Object.keys(patch).forEach((key) => {
    const value = patch[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = merge(result[key], value);
    } else {
      result[key] = clone(value);
    }
  });

  return result;
}

function makeId(type) {
  return `${type}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyTransform() {
  return {
    p: [0, 0, 0],
    r: [0, 0, 0],
    s: [1, 1, 1]
  };
}

export function defaults() {
  return {
    schemaVersion: '2.0.0',
    projectId: '',
    siteId: '',
    base: {
      sog_url: '',
      collider_url: null,
      collider: { type: 'box', size: [20, 2, 20], center: [0, 1, 0], visible: false },
      lod: { enabled: false, levels: ['high', 'medium', 'low'], current: 'high', urls: { high: '', medium: '', low: '' }, thresholds: { near: 12, far: 30 } },
      chunks: [],
      transform: {
        s: 1,
        R: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        t: [0, 0, 0],
        scale_source: 'manual'
      },
      capture_id: '',
      capture: null,
      coordinate_system: {
        up: 'Y',
        forward: '-Z',
        handedness: 'right',
        units: 'meters',
        origin: 'capture'
      },
      artifacts: {},
      editing: {
        revision: 0,
        transform: null,
        crop: null,
        deletion_mask: null
      },
      quality: null,
      splat_editor: null
    },
    objects: [],
    sequences: [],
    triggers: [],
    story: {
      chapters: []
    },
    anchors: [],
    zones: [],
    meta: {
      name: '未命名场景',
      assets: [],
      releases: []
    }
  };
}

export function newObject(type, props = {}) {
  const meta = OBJECT_TYPES[type] || OBJECT_TYPES.quad;
  const size = clone(meta.defaultSize);

  const defaultHitbox = meta.hitbox === 'none'
    ? {
        type: 'none',
        size,
        center: [0, 0, 0]
      }
    : {
        type: meta.hitbox,
        size,
        center: [0, 0, 0]
      };

  const object = {
    id: makeId(type),
    name: meta.label,
    type: meta.id,
    transform: {
      p: [0, 0, 0],
      r: [0, 0, 0],
      s: [1, 1, 1]
    },
    asset: '',
    material: type === 'video_quad'
      ? { preset: 'P', duration: 1 }
      : {},
    hitbox: defaultHitbox,
    visible: true,
    node_id: '',
    zone_id: '',
    comments: []
  };

  return merge(object, merge({ id: object.id, type: meta.id }, props || {}));
}

export function newSequence(props = {}) {
  const sequence = {
    id: makeId('sequence'),
    name: '未命名时间线',
    duration: 1,
    tracks: []
  };

  return merge(sequence, props);
}

export function newTrigger(props = {}) {
  const trigger = {
    id: makeId('trigger'),
    name: '新触发器',
    target: '',
    when: 'tap',
    params: {},
    do: []
  };

  return merge(trigger, props);
}

export function newNode(props = {}) {
  const node = {
    id: makeId('node'),
    title: '新节点',
    anchor: '',
    on_enter: '',
    next: null,
    text: '',
    checklist: {
      copy: false,
      placed: false,
      trigger: false,
      located: false
    }
  };

  return merge(node, props);
}

export function newChapter(title = '新章节', props = {}) {
  if (title && typeof title === 'object') {
    props = title;
    title = props.title || '新章节';
  }

  const chapter = {
    id: makeId('chapter'),
    title,
    nodes: []
  };

  return merge(chapter, props);
}

export function newAnchor(props = {}) {
  const anchor = {
    id: makeId('anchor'),
    name: '',
    kind: 'vps',
    pose: { t: [0, 0, 0], r: [0, 0, 0] },
    image_url: null
  };
  const merged = merge(anchor, props);
  if (props.type && !props.kind) merged.kind = props.type;
  return merged;
}

export function newZone(props = {}) {
  return merge({
    id: makeId('zone'),
    name: '新空间区域',
    kind: 'editable',
    shape: 'box',
    transform: { p: [0, 1, 0], r: [0, 0, 0], s: [2, 2, 2] },
    color: '#2563eb',
    visible: true,
    locked: false,
    description: ''
  }, props)
}

function objectIds(scene) {
  return new Set((scene.objects || []).map((item) => item && item.id).filter(Boolean));
}

function sequenceIds(scene) {
  return new Set((scene.sequences || []).map((item) => item && item.id).filter(Boolean));
}

function triggerIds(scene) {
  return new Set((scene.triggers || []).map((item) => item && item.id).filter(Boolean));
}

function anchorIds(scene) {
  return new Set((scene.anchors || []).map((item) => item && item.id).filter(Boolean));
}

function zoneIds(scene) {
  return new Set((scene.zones || []).map((item) => item && item.id).filter(Boolean));
}

function nodeMap(scene) {
  const map = new Map();

  (scene.story && scene.story.chapters || []).forEach((chapter) => {
    (chapter.nodes || []).forEach((node) => {
      if (node && node.id) map.set(node.id, node);
    });
  });

  return map;
}

function allNodeIds(scene) {
  return new Set(nodeMap(scene).keys());
}

function addIssue(list, level, msg, target) {
  list.push({
    level,
    msg,
    target: target || ''
  });
}

function checkVector(value, length) {
  return Array.isArray(value) &&
    value.length === length &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

export function validate(scene) {
  const result = [];
  const data = scene && typeof scene === 'object' ? scene : {};
  const objects = Array.isArray(data.objects) ? data.objects : [];
  const sequences = Array.isArray(data.sequences) ? data.sequences : [];
  const triggers = Array.isArray(data.triggers) ? data.triggers : [];
  const zones = Array.isArray(data.zones) ? data.zones : [];
  const chapters = data.story && Array.isArray(data.story.chapters)
    ? data.story.chapters
    : [];

  if (!data.base || typeof data.base !== 'object') {
    addIssue(result, 'error', '缺少场景基底数据', 'base');
  }

  if (!data.meta || typeof data.meta !== 'object') {
    addIssue(result, 'error', '缺少场景元数据', 'meta');
  }
  if (data.base?.collider && (!checkVector(data.base.collider.size, 3) || !checkVector(data.base.collider.center, 3))) {
    addIssue(result, 'warn', 'Collider 尺寸或中心数据不完整', 'base.collider');
  }
  if (data.base?.lod?.enabled) {
    const thresholds = data.base.lod.thresholds || {}
    if (!(Number(thresholds.near) >= 0) || !(Number(thresholds.far) > Number(thresholds.near))) {
      addIssue(result, 'warn', 'LOD 距离阈值不合理', 'base.lod');
    }
  }
  ;(data.base?.chunks || []).forEach((chunk, index) => {
    if (!chunk?.id) addIssue(result, 'error', '底座分块缺少 id', `base.chunks[${index}]`)
    if (!chunk?.url && !chunk?.lod?.high) addIssue(result, 'warn', '底座分块缺少加载地址', chunk?.id || `base.chunks[${index}]`)
  })

  const ids = new Set();

  objects.forEach((obj, index) => {
    const target = obj && obj.id ? obj.id : `objects[${index}]`;

    if (!obj || !obj.id) {
      addIssue(result, 'error', '对象缺少 id', target);
    } else if (ids.has(obj.id)) {
      addIssue(result, 'error', `重复的实体 id：${obj.id}`, obj.id);
    } else {
      ids.add(obj.id);
    }

    if (!obj || !OBJECT_TYPES[obj.type]) {
      addIssue(result, 'error', '对象类型无效', target);
    }

    if (!obj || !obj.transform || typeof obj.transform !== 'object') {
      addIssue(result, 'error', '对象缺少 transform', target);
    } else {
      if (!checkVector(obj.transform.p, 3)) {
        addIssue(result, 'error', 'transform.p 必须是三个数字', target);
      }
      if (!checkVector(obj.transform.r, 3)) {
        addIssue(result, 'error', 'transform.r 必须是三个数字', target);
      }
      if (!checkVector(obj.transform.s, 3)) {
        addIssue(result, 'error', 'transform.s 必须是三个数字', target);
      }
    }

    if (!obj || !obj.hitbox || typeof obj.hitbox !== 'object') {
      addIssue(result, 'warn', '对象缺少命中体设置', target);
    }

    if (!obj || !Array.isArray(obj.comments)) {
      addIssue(result, 'warn', '对象 comments 应为数组', target);
    }
  });

  const knownZoneIds = new Set(zones.map(zone => zone?.id).filter(Boolean));
  zones.forEach((zone, index) => {
    const target = zone?.id || `zones[${index}]`;
    if (!zone?.id) addIssue(result, 'error', '空间区域缺少 id', target);
    if (!zone?.transform || !checkVector(zone.transform.p, 3) || !checkVector(zone.transform.s, 3)) {
      addIssue(result, 'error', '空间区域 transform 必须包含 p/s 三维数字', target);
    }
  });
  objects.forEach((obj) => {
    if (obj?.zone_id && !knownZoneIds.has(obj.zone_id)) addIssue(result, 'warn', `对象所属区域不存在：${obj.zone_id}`, obj.id);
  });

  sequences.forEach((sequence, index) => {
    const target = sequence && sequence.id ? sequence.id : `sequences[${index}]`;

    if (!sequence || !sequence.id) {
      addIssue(result, 'error', '时间线缺少 id', target);
    } else if (ids.has(sequence.id)) {
      addIssue(result, 'error', `重复的实体 id：${sequence.id}`, sequence.id);
    } else {
      ids.add(sequence.id);
    }

    if (!sequence || !Array.isArray(sequence.tracks)) {
      addIssue(result, 'error', '时间线 tracks 必须是数组', target);
    } else {
      sequence.tracks.forEach((track, trackIndex) => {
        const trackTarget = `${target}.tracks[${trackIndex}]`;

        if (!track || !track.target) {
          addIssue(result, 'error', '时间线轨道缺少 target', trackTarget);
        }

        if (!track || !Array.isArray(track.keys)) {
          addIssue(result, 'error', '时间线轨道 keys 必须是数组', trackTarget);
        }
      });
    }
  });

  triggers.forEach((trigger, index) => {
    const target = trigger && trigger.id ? trigger.id : `triggers[${index}]`;

    if (!trigger || !trigger.id) {
      addIssue(result, 'error', '触发器缺少 id', target);
    } else if (ids.has(trigger.id)) {
      addIssue(result, 'error', `重复的实体 id：${trigger.id}`, trigger.id);
    } else {
      ids.add(trigger.id);
    }

    if (!trigger || !trigger.when) {
      addIssue(result, 'error', '触发器缺少条件', target);
    }

    if (!trigger || !Array.isArray(trigger.do) || trigger.do.length === 0) {
      addIssue(result, 'error', '触发器 do 不能为空数组', target);
    }
  });

  const chapterIds = new Set();

  chapters.forEach((chapter, chapterIndex) => {
    const chapterTarget = chapter && chapter.id
      ? chapter.id
      : `story.chapters[${chapterIndex}]`;

    if (!chapter || !chapter.id) {
      addIssue(result, 'error', '章节缺少 id', chapterTarget);
    } else if (chapterIds.has(chapter.id)) {
      addIssue(result, 'error', `重复的章节 id：${chapter.id}`, chapter.id);
    } else {
      chapterIds.add(chapter.id);
    }

    if (!chapter || !Array.isArray(chapter.nodes)) {
      addIssue(result, 'error', '章节 nodes 必须是数组', chapterTarget);
    } else {
      chapter.nodes.forEach((node, nodeIndex) => {
        const nodeTarget = node && node.id
          ? node.id
          : `${chapterTarget}.nodes[${nodeIndex}]`;

        if (!node || !node.id) {
          addIssue(result, 'error', '节点缺少 id', nodeTarget);
        } else if (ids.has(node.id)) {
          addIssue(result, 'error', `重复的实体 id：${node.id}`, node.id);
        } else {
          ids.add(node.id);
        }

        if (!node || !node.checklist || typeof node.checklist !== 'object') {
          addIssue(result, 'warn', '节点缺少 checklist', nodeTarget);
        }
      });
    }
  });

  if (!Array.isArray(data.anchors)) {
    addIssue(result, 'error', 'anchors 必须是数组', 'anchors');
  }

  return result;
}

function isTemporaryUrl(value) {
  return /^(blob:|local:)/i.test(String(value || ''))
}

function forEachBaseUrl(base, callback) {
  if (!base || typeof base !== 'object') return
  callback(base.sog_url, 'base.sog_url')
  callback(base.collider_url, 'base.collider_url')
  Object.entries(base.lod?.urls || {}).forEach(([level, value]) => callback(value, `base.lod.urls.${level}`))
  ;(base.chunks || []).forEach((chunk, index) => {
    callback(chunk?.url, `base.chunks[${index}].url`)
    Object.entries(chunk?.lod || {}).forEach(([level, value]) => callback(value, `base.chunks[${index}].lod.${level}`))
  })
}

function isRegisteredAsset(scene, value) {
  if (!value) return true;

  const assets = scene.meta && Array.isArray(scene.meta.assets)
    ? scene.meta.assets
    : [];

  if (assets.some((asset) => asset && (asset.id === value || asset.url === value))) {
    return true;
  }

  return /^(placeholder|builtin|built-in|内置)/i.test(String(value));
}

export function publishCheck(scene) {
  const data = scene && typeof scene === 'object' ? scene : defaults();
  const blocks = [];
  const warns = [];

  const objects = Array.isArray(data.objects) ? data.objects : [];
  const sequences = Array.isArray(data.sequences) ? data.sequences : [];
  const triggers = Array.isArray(data.triggers) ? data.triggers : [];
  const chapters = data.story && Array.isArray(data.story.chapters)
    ? data.story.chapters
    : [];
  const anchors = anchorIds(data);
  const zones = zoneIds(data);
  const objectSet = objectIds(data);
  const sequenceSet = sequenceIds(data);
  const triggerSet = triggerIds(data);
  const nodes = nodeMap(data);
  const nodeSet = new Set(nodes.keys());

  const block = (kind, msg, target) => {
    blocks.push({ kind, msg, target: target || '' });
  };

  const warn = (kind, msg, target) => {
    warns.push({ kind, msg, target: target || '' });
  };

  if (data.base?.sog_url && typeof data.base.sog_url !== 'string') {
    block('base_invalid', '高斯底座地址无效', 'base');
  }
  forEachBaseUrl(data.base, (value, target) => {
    if (isTemporaryUrl(value)) block('temporary_asset', '存在本机临时资产地址，上传到持久化存储后才能发布', target)
  })
  ;(data.meta?.assets || []).forEach(asset => {
    if (isTemporaryUrl(asset?.url)) block('temporary_asset', `素材「${asset.name || asset.id || '未命名'}」仍是本机临时资产，不能直接发布`, asset.id || 'meta.assets')
  })
  ;(data.base?.chunks || []).forEach(chunk => {
    if (!chunk?.id || (!chunk.url && !chunk.lod?.high)) block('base_chunk_invalid', `底座分块无法加载：${chunk?.name || chunk?.id || '未命名分块'}`, chunk?.id || 'base.chunks')
  });
  (data.zones || []).forEach(zone => {
    if (!zone?.id) block('zone_invalid', '空间区域缺少 id', 'zones');
    const p = zone?.transform?.p;
    const s = zone?.transform?.s;
    if (!Array.isArray(p) || p.length !== 3 || !Array.isArray(s) || s.length !== 3) {
      block('zone_invalid', `空间区域数据不完整：${zone?.name || zone?.id || '未命名区域'}`, zone?.id || 'zones');
    }
  });

  triggers.forEach((trigger) => {
    if (!trigger) return;

    if (trigger.target && !objectSet.has(trigger.target) && !zones.has(trigger.target)) {
      block('dangling_ref', `触发器目标不存在：${trigger.target}`, trigger.id);
    }

    (trigger.do || []).forEach((action, index) => {
      if (!action) return;
      const args = action.args || {};

      if (args.seqId && !sequenceSet.has(args.seqId)) {
        block(
          'dangling_ref',
          `动作引用的时间线不存在：${args.seqId}`,
          `${trigger.id}.do[${index}]`
        );
      }

      if (args.nodeId && !nodeSet.has(args.nodeId)) {
        block(
          'dangling_ref',
          `动作引用的节点不存在：${args.nodeId}`,
          `${trigger.id}.do[${index}]`
        );
      }
    });
  });

  objects.forEach((obj) => {
    if (obj?.zone_id && !zones.has(obj.zone_id)) {
      block('dangling_ref', `对象所属区域不存在：${obj.zone_id}`, obj.id);
    }
  });

  sequences.forEach((sequence) => {
    (sequence.tracks || []).forEach((track, index) => {
      if (track && track.target && !objectSet.has(track.target)) {
        block(
          'dangling_ref',
          `时间线轨道目标不存在：${track.target}`,
          `${sequence.id}.tracks[${index}]`
        );
      }
    });
  });

  chapters.forEach((chapter) => {
    (chapter.nodes || []).forEach((node) => {
      if (!node) return;

      if (node.anchor && !anchors.has(node.anchor)) {
        block('dangling_ref', `节点锚点不存在：${node.anchor}`, node.id);
      }

      if (node.on_enter && !triggerSet.has(node.on_enter)) {
        block('dangling_ref', `节点进入触发器不存在：${node.on_enter}`, node.id);
      }

      if (node.next && !nodeSet.has(node.next)) {
        block('dangling_ref', `节点后继不存在：${node.next}`, node.id);
      }
    });
  });

  if (chapters.length === 0 || !chapters[0] || !Array.isArray(chapters[0].nodes) || chapters[0].nodes.length === 0) {
    block('no_start_node', '没有可用的起始节点', 'story');
  }

  const allNodes = Array.from(nodes.values());

  if (!allNodes.some((node) => node.next === null || node.next === '')) {
    block('no_ending', '没有终点节点', 'story');
  }

  objects.forEach((obj) => {
    if (!obj || !obj.asset) return;

    if (!isRegisteredAsset(data, obj.asset)) {
      block('asset_load_fail', `素材未登记或无法加载：${obj.asset}`, obj.id);
    }
  });

  objects.forEach((obj) => {
    if (!obj || !Array.isArray(obj.comments)) return;

    const open = obj.comments.filter((comment) => {
      if (!comment || typeof comment !== 'object') return false;
      return comment.resolved === false || comment.status === 'open' || comment.done === false;
    });

    if (open.length > 0) {
      warn('open_comments', `对象有 ${open.length} 条未解决批注`, obj.id);
    }
  });

  allNodes.forEach((node) => {
    if (!node.anchor) {
      warn('unplaced_node', '节点尚未放置锚点', node.id);
    }
  });

  return {
    blocks,
    warns: warns.concat(
      budget(data).over
        ? [{ kind: 'over_budget', msg: '场景预算超限', target: 'scene' }]
        : []
    )
  };
}

function assetSizeInBytes(asset) {
  if (!asset) return 0;
  const value = Number(asset.size);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function budget(scene) {
  const data = scene && typeof scene === 'object' ? scene : defaults();
  const assets = data.meta && Array.isArray(data.meta.assets)
    ? data.meta.assets
    : [];
  const assetMap = new Map();

  assets.forEach((asset) => {
    if (!asset) return;
    if (asset.id) assetMap.set(asset.id, asset);
    if (asset.url) assetMap.set(asset.url, asset);
  });

  let bytes = 0;
  let videos = 0;
  let tris = 0;

  (data.objects || []).forEach((obj) => {
    if (!obj) return;

    switch (obj.type) {
      case 'quad':
        bytes += 5 * 1024;
        tris += 2;
        break;

      case 'video_quad': {
        const material = obj.material || {};
        const preset = VIDEO_PRESETS[material.preset] || VIDEO_PRESETS.P;
        const durationValue = Number(
          material.duration !== undefined
            ? material.duration
            : obj.duration !== undefined
              ? obj.duration
              : 1
        );
        const duration = Number.isFinite(durationValue) && durationValue > 0
          ? durationValue
          : 1;

        bytes += preset.w * preset.h * duration * 0.5;
        videos += 1;
        tris += 2;
        break;
      }

      case 'glb': {
        const asset = assetMap.get(obj.asset);
        bytes += assetSizeInBytes(asset);
        tris += 1500;
        break;
      }

      case 'splat_segment':
        bytes += 80 * 1024;
        tris += 5000;
        break;

      case 'light':
        break;

      default:
        break;
    }
  });

  const estFps = Math.max(15, 60 - tris / 8000 - videos * 6);
  const overBytes = bytes > 30 * 1024 * 1024;
  const overVideos = videos > 3;
  const overTris = tris > 200000;
  const fixes = [];

  if (overBytes) {
    fixes.push({
      msg: '场景大小超过 30MB',
      fix: '转序列帧/降 LOD'
    });
  }

  if (overVideos) {
    fixes.push({
      msg: '视频路数超过 3 路',
      fix: '延后出现/降档'
    });
  }

  if (overTris) {
    fixes.push({
      msg: '三角面数超过 200k',
      fix: '简化模型/降低点云密度'
    });
  }

  return {
    bytes,
    videos,
    tris,
    estFps,
    over: overBytes || overVideos || overTris,
    fixes
  };
}