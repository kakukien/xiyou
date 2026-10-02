import { AnimationMixer } from 'three';
import { store } from './store.js';
import { viewport } from './viewport.js';
import { log } from '../ui/log.js';

const active = [];
const highlightStates = new Set();
const enterStates = new Map();
// 预览快照：拖动播放头改视口前先留底，endPreview() 还原
const previewSnapshots = new Map();

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeValue(value, ease) {
  const t = clamp01(value);
  switch (ease) {
    case 'in':
      return t * t;
    case 'out':
      return 1 - (1 - t) * (1 - t);
    case 'inout':
      return t * t * (3 - 2 * t);
    case 'linear':
    default:
      return t;
  }
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === 'object') return { ...value };
  return value;
}

function readVector(vector, fallback) {
  return [
    Number.isFinite(vector?.x) ? vector.x : fallback[0],
    Number.isFinite(vector?.y) ? vector.y : fallback[1],
    Number.isFinite(vector?.z) ? vector.z : fallback[2]
  ];
}

function writeVector(vector, value) {
  if (!vector || !value) return;
  vector.set(value[0], value[1], value[2]);
}

function readTransform(node) {
  return {
    p: readVector(node.position, [0, 0, 0]),
    r: [
      node.rotation.x * 180 / Math.PI,
      node.rotation.y * 180 / Math.PI,
      node.rotation.z * 180 / Math.PI
    ],
    s: readVector(node.scale, [1, 1, 1])
  };
}

function applyTransform(node, value, fallback) {
  if (!node || !value) return;

  const current = fallback || readTransform(node);
  const p = Array.isArray(value.p) ? value.p : current.p;
  const r = Array.isArray(value.r) ? value.r : current.r;
  const s = Array.isArray(value.s) ? value.s : current.s;

  writeVector(node.position, [
    Number.isFinite(p[0]) ? p[0] : current.p[0],
    Number.isFinite(p[1]) ? p[1] : current.p[1],
    Number.isFinite(p[2]) ? p[2] : current.p[2]
  ]);

  node.rotation.set(
    (Number.isFinite(r[0]) ? r[0] : current.r[0]) * Math.PI / 180,
    (Number.isFinite(r[1]) ? r[1] : current.r[1]) * Math.PI / 180,
    (Number.isFinite(r[2]) ? r[2] : current.r[2]) * Math.PI / 180
  );

  writeVector(node.scale, [
    Number.isFinite(s[0]) ? s[0] : current.s[0],
    Number.isFinite(s[1]) ? s[1] : current.s[1],
    Number.isFinite(s[2]) ? s[2] : current.s[2]
  ]);
}

function valueAt(keys, time, current) {
  if (!keys.length) return null;

  const sorted = keys.slice().sort((a, b) => Number(a.t || 0) - Number(b.t || 0));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (time <= Number(first.t || 0)) return cloneValue(first.v);
  if (time >= Number(last.t || 0)) return cloneValue(last.v);

  let left = first;
  let right = last;

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (time >= Number(a.t || 0) && time <= Number(b.t || 0)) {
      left = a;
      right = b;
      break;
    }
  }

  const leftTime = Number(left.t || 0);
  const rightTime = Number(right.t || 0);
  const span = rightTime - leftTime;
  const raw = span <= 0 ? 1 : (time - leftTime) / span;
  const t = easeValue(raw, right.ease || left.ease);

  if (typeof left.v === 'number' || typeof right.v === 'number') {
    const a = Number.isFinite(left.v) ? left.v : current;
    const b = Number.isFinite(right.v) ? right.v : current;
    return a + (b - a) * t;
  }

  if (Array.isArray(left.v) || Array.isArray(right.v)) {
    const a = Array.isArray(left.v) ? left.v : current;
    const b = Array.isArray(right.v) ? right.v : current;
    return [0, 1, 2].map((index) => {
      const av = Number.isFinite(a?.[index]) ? a[index] : current?.[index] || 0;
      const bv = Number.isFinite(b?.[index]) ? b[index] : current?.[index] || 0;
      return av + (bv - av) * t;
    });
  }

  if (left.v && typeof left.v === 'object' || right.v && typeof right.v === 'object') {
    const a = left.v && typeof left.v === 'object' ? left.v : current || {};
    const b = right.v && typeof right.v === 'object' ? right.v : current || {};
    const result = { ...current };
    const keysToMix = new Set([...Object.keys(a), ...Object.keys(b)]);
    keysToMix.forEach((key) => {
      const av = Number.isFinite(a[key]) ? a[key] : current?.[key] || 0;
      const bv = Number.isFinite(b[key]) ? b[key] : current?.[key] || 0;
      result[key] = av + (bv - av) * t;
    });
    return result;
  }

  return right.v;
}

function readOpacity(node) {
  let value = 1;
  node?.traverse?.((child) => {
    if (value !== 1) return;
    const materials = child.material
      ? (Array.isArray(child.material) ? child.material : [child.material])
      : [];
    if (materials.length) value = materials[0].opacity ?? 1;
  });
  return value;
}

function setOpacity(node, opacity) {
  if (!node) return;
  node.traverse((child) => {
    if (!child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = opacity;
      material.needsUpdate = true;
    });
  });
}

function findVideos(node) {
  const videos = [];
  if (!node) return videos;

  node.traverse((child) => {
    const materials = child.material
      ? (Array.isArray(child.material) ? child.material : [child.material])
      : [];

    materials.forEach((material) => {
      const candidates = [
        material.map,
        material.alphaMap,
        material.uniforms?.map?.value,
        material.uniforms?.uTexture?.value,
        material.uniforms?.videoTexture?.value,
        material.uniforms?.uVideo?.value
      ];

      candidates.forEach((candidate) => {
        const video = candidate?.image;
        if (video && typeof video.play === 'function' && !videos.includes(video)) {
          videos.push(video);
        }
      });
    });
  });

  return videos;
}

function setVideoState(node, shouldPlay) {
  findVideos(node).forEach((video) => {
    if (shouldPlay) {
      const result = video.play();
      if (result?.catch) result.catch(() => {});
    } else {
      video.pause();
    }
  });
}

function resolveClip(node, value) {
  const animations = node?.userData?.animations;
  if (!animations || !animations.length) return null;

  const requested = value && typeof value === 'object' ? value.clip : value;
  if (typeof requested === 'number') return animations[requested] || null;
  if (typeof requested === 'string') {
    return animations.find((clip) => clip.name === requested) || null;
  }
  return animations[0] || null;
}

function playClip(node, value, mixers) {
  const clip = resolveClip(node, value);
  if (!clip) return;

  let mixer = node.userData.animationMixer || node.userData.mixer;
  if (!mixer) {
    mixer = new AnimationMixer(node);
    node.userData.animationMixer = mixer;
  }

  const action = mixer.clipAction(clip);
  action.reset().play();
  mixers.add(mixer);
}

function keyWasCrossed(key, previousTime, currentTime) {
  const keyTime = Number(key.t || 0);
  return keyTime > previousTime && keyTime <= currentTime;
}

function processEvents(track, state, previousTime, currentTime) {
  if (track.kind !== 'event') return;

  const keys = Array.isArray(track.keys) ? track.keys : [];
  keys.forEach((key, index) => {
    const marker = `${index}:${Number(key.t || 0)}`;
    if (!state.events.has(marker) && keyWasCrossed(key, previousTime, currentTime)) {
      state.events.add(marker);
      store.emit('seq-event', { seqId: state.seq.id, key });
    }
  });
}

function updateTrack(trackState, time) {
  const { track, node } = trackState;
  if (!node || !Array.isArray(track.keys) || !track.keys.length) return;

  const keys = track.keys.slice().sort((a, b) => Number(a.t || 0) - Number(b.t || 0));

  if (track.kind === 'transform') {
    const current = readTransform(node);
    const value = valueAt(keys, time, current);
    if (value) applyTransform(node, value, current);
    return;
  }

  if (track.kind === 'opacity') {
    const current = 1;
    const value = valueAt(keys, time, current);
    if (Number.isFinite(value)) setOpacity(node, value);
    return;
  }

  if (track.kind === 'video') {
    const value = valueAt(keys, time, false);
    if (typeof value === 'boolean') setVideoState(node, value);
    else if (value && typeof value === 'object' && typeof value.play === 'boolean') {
      setVideoState(node, value.play);
    }
    return;
  }

  if (track.kind === 'clip') {
    const value = valueAt(keys, time, null);
    if (value !== null) playClip(node, value, new Set());
  }
}

function restoreTrack(trackState) {
  const { track, node, initial } = trackState;
  if (!node || !initial) return;

  if (track.kind === 'transform') {
    applyTransform(node, initial.transform);
  } else if (track.kind === 'opacity') {
    setOpacity(node, initial.opacity);
  } else if (track.kind === 'video') {
    setVideoState(node, initial.video);
  }
}

function distanceBetween(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function cameraPosition() {
  const camera = viewport.camera;
  if (!camera?.position) return null;
  return camera.position;
}

function markNodeDone(nodeId) {
  if (!nodeId) return;
  store.emit('node-done', { nodeId });

  const triggersList = Array.isArray(store.scene.triggers) ? store.scene.triggers : [];
  triggersList
    .filter((trigger) => trigger.when === 'node_done' && trigger.target === nodeId)
    .forEach((trigger) => triggers.fire('node_done', nodeId, { from: 'node-done' }));
}

export const player = {
  play(seqId) {
    const sequences = Array.isArray(store.scene.sequences) ? store.scene.sequences : [];
    const seq = sequences.find((item) => item.id === seqId);
    if (!seq) {
      log(`未找到时间线：${seqId}`, 'warn');
      return false;
    }

    const tracks = Array.isArray(seq.tracks) ? seq.tracks : [];
    const trackStates = [];
    const mixers = new Set();

    // 同一条时间线不叠实例：先摘走旧实例并还原其轨道
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].seq.id === seq.id) {
        const stale = active.splice(i, 1)[0];
        stale.tracks.forEach(restoreTrack);
        stale.mixers.forEach((mixer) => mixer.stopAllAction());
      }
    }

    tracks.forEach((track) => {
      const node = viewport.node(track.target);
      if (!node) return;

      const initial = {};
      if (track.kind === 'transform') initial.transform = readTransform(node);
      if (track.kind === 'opacity') initial.opacity = 1;
      if (track.kind === 'video') initial.video = false;

      trackStates.push({
        track,
        node,
        initial,
        events: new Set()
      });

      if (track.kind === 'clip' && node.userData.animationMixer) {
        mixers.add(node.userData.animationMixer);
      }
    });

    active.push({
      seq,
      time: 0,
      previousTime: 0,
      duration: Math.max(0, Number(seq.duration) || 0),
      tracks: trackStates,
      mixers,
      finished: false
    });

    return true;
  },

  // 供时间线 UI 轮询播放头：返回 {time, duration} 或 null
  progress(seqId) {
    const state = active.find(item => item.seq.id === seqId);
    if (!state) return null;
    return {
      time: Math.min(state.time, state.duration),
      duration: state.duration,
      finished: state.finished
    };
  },

  stop(reset = false) {
    active.splice(0).forEach((state) => {
      if (reset) state.tracks.forEach(restoreTrack);
      state.mixers.forEach((mixer) => mixer.stopAllAction());
    });
  },

  // 拖动播放头实时预览：计算各轨在 t 的值并应用到节点（不进 active，不触发事件）
  preview(seqId, time) {
    const seq = (store.scene.sequences || []).find((item) => item.id === seqId);
    if (!seq) return false;
    const t = Math.max(0, Number(time) || 0);
    (seq.tracks || []).forEach((track) => {
      const node = viewport.node(track.target);
      if (!node) return;
      if (!previewSnapshots.has(node)) {
        previewSnapshots.set(node, {
          node,
          transform: readTransform(node),
          opacity: readOpacity(node),
          video: false
        });
      }
      updateTrack({ track, node, events: new Set() }, t);
    });
    return true;
  },

  // 结束预览：把所有被预览动过的节点还原到快照
  endPreview() {
    previewSnapshots.forEach((snap) => {
      applyTransform(snap.node, snap.transform);
      setOpacity(snap.node, snap.opacity);
      setVideoState(snap.node, snap.video);
    });
    previewSnapshots.clear();
  },

  tick(dt) {
    const delta = Math.max(0, Number(dt) || 0);
    const finished = [];

    active.forEach((state) => {
      state.previousTime = state.time;
      state.time += delta;

      const currentTime = state.duration > 0
        ? Math.min(state.time, state.duration)
        : state.time;

      state.tracks.forEach((trackState) => {
        processEvents(trackState.track, state, state.previousTime, currentTime);
        updateTrack(trackState, currentTime);
      });

      state.mixers.forEach((mixer) => mixer.update(delta));

      if (state.time >= state.duration) {
        state.finished = true;
        finished.push(state);
      }
    });

    finished.forEach((state) => {
      const index = active.indexOf(state);
      if (index >= 0) active.splice(index, 1);
      triggers.fire('seq_event', state.seq.id, { seqId: state.seq.id });
    });
  }
};

function highlight(node) {
  if (!node) return;

  const records = [];
  node.traverse((child) => {
    if (!child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];

    materials.forEach((material) => {
      if (material.emissive && typeof material.emissive.getHex === 'function') {
        records.push({
          material,
          property: 'emissive',
          value: material.emissive.getHex(),
          intensity: material.emissiveIntensity
        });
        material.emissive.setHex(0xe8b93b);
        material.emissiveIntensity = 1;
      } else if (material.color && typeof material.color.getHex === 'function') {
        records.push({
          material,
          property: 'color',
          value: material.color.getHex()
        });
        material.color.setHex(0xe8b93b);
      }
    });
  });

  const state = {
    node,
    records,
    remaining: 0.6
  };
  highlightStates.add(state);
}

function tickHighlights(dt) {
  [...highlightStates].forEach((state) => {
    state.remaining -= dt;
    if (state.remaining > 0) return;

    state.records.forEach((record) => {
      if (record.property === 'emissive') {
        record.material.emissive.setHex(record.value);
        record.material.emissiveIntensity = record.intensity;
      } else {
        record.material.color.setHex(record.value);
      }
      record.material.needsUpdate = true;
    });

    highlightStates.delete(state);
  });
}

export const triggers = {
  fire(when, targetId, extra = {}) {
    const triggerList = Array.isArray(store.scene.triggers) ? store.scene.triggers : [];
    const matched = triggerList.filter((trigger) => (
      trigger.when === when &&
      trigger.target &&
      trigger.target === targetId
    ));

    matched.forEach((trigger) => {
      const actions = Array.isArray(trigger.do) ? trigger.do : [];

      actions.forEach((item) => {
        const action = item?.action;
        const args = item?.args || {};

        if (action === 'play_seq') {
          const seqId = args.seqId || args.sequenceId || args.id;
          if (seqId) player.play(seqId);
          return;
        }

        if (action === 'show' || action === 'hide') {
          const objectId = args.targetId || args.objectId || trigger.target;
          if (objectId) {
            store.updateObject(objectId, { visible: action === 'show' });
          }
          return;
        }

        if (action === 'highlight') {
          highlight(viewport.node(args.targetId || args.objectId || trigger.target));
          return;
        }

        if (action === 'card') {
          store.emit('card', { text: args.text || args.copy || '' });
          return;
        }

        if (action === 'reward') {
          store.emit('card', { text: `获得奖励: ${args.text || args.reward || ''}` });
          return;
        }

        if (action === 'goto_node') {
          const nodeId = args.nodeId || args.id;
          store.emit('node-goto', { nodeId });
          markNodeDone(nodeId);
        }
      });

      store.emit('trigger-fired', { trigger, when, targetId, extra });
    });
  }
};

function tickEnter() {
  if (store.mode !== 'play') return;

  const position = cameraPosition();
  if (!position) return;

  const triggerList = Array.isArray(store.scene.triggers) ? store.scene.triggers : [];
  triggerList
    .filter((trigger) => trigger.when === 'enter' && trigger.target)
    .forEach((trigger) => {
      const node = viewport.node(trigger.target);
      if (!node) return;

      const radius = Number(trigger.params?.radius) || 2;
      const inside = distanceBetween(position, node.getWorldPosition
        ? node.getWorldPosition({ x: 0, y: 0, z: 0 })
        : node.position) < radius;

      const wasInside = enterStates.get(trigger.id) === true;
      if (inside && !wasInside) {
        enterStates.set(trigger.id, true);
        triggers.fire('enter', trigger.target);
      } else if (!inside && wasInside) {
        enterStates.set(trigger.id, false);
      }
    });
}

export function tickPlay(dt) {
  player.tick(dt);
  tickHighlights(Math.max(0, Number(dt) || 0));
  tickEnter();
}