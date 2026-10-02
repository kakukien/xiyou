import { newObject, newSequence, newTrigger, defaults } from './schema.js';

export const ACTION_CARDS = [
  { id: 'fly_in', label: '飞入' },
  { id: 'land', label: '落地' },
  { id: 'roll', label: '翻滚' },
  { id: 'dissolve', label: '消散' },
  { id: 'transform', label: '变换' },
  { id: 'orbit', label: '环绕' },
  { id: 'blink', label: '闪现' },
  { id: 'float', label: '浮动' },
  { id: 'rise', label: '升起' },
  { id: 'pulse', label: '脉动' }
];

function transformKey(t, p, r = [0, 0, 0], s = [1, 1, 1], ease = 'linear') {
  return { t, v: { p, r, s }, ease };
}

function opacityKey(t, v, ease = 'linear') {
  return { t, v, ease };
}

function makeCardSequence(name, duration, targetId, kind, keys) {
  return newSequence({
    name,
    duration,
    tracks: [{ target: targetId, kind, keys }]
  });
}

function genericParts(color = '#9b6b43') {
  return [
    { shape: 'box', p: [0, 0.5, 0], r: [0, 0, 0], s: [1, 1, 1], color },
    { shape: 'torus', p: [0, 0.55, 0], r: [90, 0, 0], s: [0.7, 0.7, 0.7], color: '#e8b93b', flat: true, opacity: 0.75 }
  ];
}

export function demoScene() {
  const scene = defaults();
  scene.meta = {
    name: '固定元素互动预览',
    assets: [],
    releases: []
  };
  scene.base = {
    ...scene.base,
    env: { sky: { image: 'fx/sky_dusk.jpg' } }
  };

  const chair = newObject('compound', {
    id: 'preview_chair',
    name: '椅子',
    element_id: 'furniture.chair',
    element_version: '0.1.0',
    voice_token: 'xj.element.furniture.chair',
    element_category: 'furniture',
    render_preset: 'chair',
    transform: { p: [-1, 0, -3], r: [0, 0, 0], s: [1, 1, 1] },
    parts: [
      { shape: 'box', p: [0, 0.62, 0], s: [0.75, 0.1, 0.72], color: '#946342' },
      { shape: 'box', p: [0, 1.02, -0.3], s: [0.72, 0.82, 0.1], color: '#805235' },
      ...[[-0.27, 0.3, -0.25], [0.27, 0.3, -0.25], [-0.27, 0.3, 0.25], [0.27, 0.3, 0.25]].map(p => ({ shape: 'box', p, s: [0.09, 0.6, 0.09], color: '#68452f' }))
    ],
    hitbox: { type: 'box', size: [0.75, 1.1, 0.72], center: [0, 0.55, 0] },
    interaction: { enabled: true, profile: 'tap_feedback', profiles: ['static', 'pushable', 'tap_feedback'], state: 'default', cooldown: 0.3, params: {} }
  });

  const crate = newObject('compound', {
    id: 'preview_crate',
    name: '木箱',
    element_id: 'furniture.crate',
    element_version: '0.1.0',
    voice_token: 'xj.element.furniture.crate',
    element_category: 'furniture',
    render_preset: 'crate',
    transform: { p: [1, 0, -3], r: [0, 20, 0], s: [1, 1, 1] },
    parts: genericParts('#9a6139'),
    hitbox: { type: 'box', size: [0.9, 0.9, 0.9], center: [0, 0.45, 0] },
    interaction: { enabled: true, profile: 'openable', profiles: ['static', 'pushable', 'pickup_throw', 'openable'], state: 'closed', cooldown: 0.3, params: {} }
  });

  const fireflies = newObject('compound', {
    id: 'preview_fireflies',
    name: '萤火虫群',
    element_id: 'fx.firefly_swarm',
    element_version: '0.1.0',
    voice_token: 'xj.element.fx.firefly_swarm',
    element_category: 'fx',
    render_preset: 'firefly_swarm',
    transform: { p: [0, 0.5, -3], r: [0, 0, 0], s: [1, 1, 1] },
    parts: [{ shape: 'points', count: 80, spread: [2.4, 1.6, 2.4], size: 0.06, speed: 0.12, drift: 0.5, material: { color: '#ffe28a', alpha: 'fx:mote', opacity: 0.95 } }],
    hitbox: { type: 'none', size: [1, 1, 1], center: [0, 0, 0] },
    interaction: { enabled: true, profile: 'particle_emitter', profiles: ['particle_emitter', 'atmosphere', 'flyby'], state: 'default', cooldown: 0.3, params: {} }
  });

  const pulse = newSequence({
    id: 'seq_preview_pulse',
    name: '点击脉动',
    duration: 0.8,
    tracks: [{ target: chair.id, kind: 'transform', keys: [
      transformKey(0, chair.transform.p, chair.transform.r, chair.transform.s, 'in'),
      transformKey(0.4, chair.transform.p, chair.transform.r, [1.12, 1.12, 1.12], 'inout'),
      transformKey(0.8, chair.transform.p, chair.transform.r, chair.transform.s, 'out')
    ] }]
  });

  scene.objects = [chair, crate, fireflies];
  scene.sequences = [pulse];
  scene.triggers = [
    newTrigger({ id: 'trigger_preview_chair', name: '椅子点击反馈', target: chair.id, when: 'tap', params: {}, do: [
      { action: 'play_seq', args: { seqId: pulse.id } },
      { action: 'highlight', args: { targetId: chair.id } }
    ] }),
    newTrigger({ id: 'trigger_preview_crate', name: '木箱开合', target: crate.id, when: 'tap', params: {}, do: [
      { action: 'set_state', args: { targetId: crate.id, state: 'toggle' } },
      { action: 'highlight', args: { targetId: crate.id } }
    ] }),
    newTrigger({ id: 'trigger_preview_fireflies', name: '萤火虫发射', target: fireflies.id, when: 'tap', params: {}, do: [
      { action: 'emit_particles', args: { targetId: fireflies.id, duration: 1.2 } }
    ] })
  ];
  scene.zones = [
    { id: 'zone_preview', name: '互动测试区', kind: 'editable', shape: 'box', transform: { p: [0, 1, -3], r: [0, 0, 0], s: [8, 2, 6] }, color: '#2563eb', visible: true, locked: false, description: '固定元素互动测试区域' },
    { id: 'zone_preview_trigger', name: '进入触发区', kind: 'trigger', shape: 'box', transform: { p: [0, 1, -2], r: [0, 0, 0], s: [3, 2, 3] }, color: '#d97706', visible: true, locked: false, description: '用于验证进入和离开事件' },
    { id: 'zone_preview_forbidden', name: '设备禁布区', kind: 'forbidden', shape: 'box', transform: { p: [4, 1, -2], r: [0, 0, 0], s: [2, 2, 2] }, color: '#dc2626', visible: true, locked: true, description: '测试禁布约束' }
  ];
  return scene;
}

export function cardToSequence(cardId, targetId, base = {}) {
  const bp = base.p || [0, 0, 0];
  const br = base.r || [0, 0, 0];
  const bs = base.s || [1, 1, 1];
  const T = (t, dp, dr, sm, ease) => transformKey(t,
    [bp[0] + dp[0], bp[1] + dp[1], bp[2] + dp[2]],
    [br[0] + dr[0], br[1] + dr[1], br[2] + dr[2]],
    [bs[0] * sm[0], bs[1] * sm[1], bs[2] * sm[2]], ease);

  const sequences = {
    fly_in: ['飞入', 1.2, [transformKey(0, [0, 2, 0], [0, 0, 0], [0.2, 0.2, 0.2], 'out'), T(1.2, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'out')]],
    land: ['落地', 1, [T(0, [0, 1.2, 0], [0, 0, 0], [1, 1, 1], 'out'), T(0.7, [0, -0.08, 0], [0, 0, 0], [1.05, 0.95, 1.05], 'in'), T(1, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'out')]],
    roll: ['翻滚', 1.2, [T(0, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'inout'), T(0.6, [0, 0, 0], [0, 180, 0], [1, 1, 1], 'linear'), T(1.2, [0, 0, 0], [0, 360, 0], [1, 1, 1], 'out')]],
    orbit: ['环绕', 2, [T(0, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'linear'), T(1, [0, 0, 0], [0, 180, 0], [1, 1, 1], 'linear'), T(2, [0, 0, 0], [0, 360, 0], [1, 1, 1], 'linear')]],
    float: ['浮动', 2, [T(0, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'inout'), T(1, [0, 0.18, 0], [0, 0, 0], [1, 1, 1], 'inout'), T(2, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'inout')]],
    rise: ['升起', 1.2, [T(0, [0, -0.4, 0], [0, 0, 0], [1, 1, 1], 'in'), T(1.2, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'out')]],
    pulse: ['脉动', 1.2, [T(0, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'inout'), T(0.3, [0, 0, 0], [0, 0, 0], [1.25, 1.25, 1.25], 'inout'), T(0.6, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'inout'), T(1.2, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'out')]]
  };
  if (cardId === 'dissolve') return makeCardSequence('消散', 1.5, targetId, 'opacity', [opacityKey(0, 1, 'in'), opacityKey(1.1, 0.35, 'inout'), opacityKey(1.5, 0, 'out')]);
  const item = sequences[cardId] || sequences.pulse;
  return makeCardSequence(item[0], item[1], targetId, 'transform', item[2]);
}

export const INTERACTION_TEMPLATES = [
  { id: 'tap-highlight', label: '点击高亮', description: '点击对象时高亮反馈。', icon: 'cursor-line', when: 'tap', action: 'highlight' },
  { id: 'gaze-card', label: '注视提示', description: '注视对象后弹出提示卡片。', icon: 'eye-line', when: 'gaze', action: 'card', text: '发现了新的互动元素。' },
  { id: 'hold-reward', label: '按住反馈', description: '按住对象完成后给出反馈。', icon: 'hand-coin-line', when: 'hold', action: 'reward', text: '互动完成。' },
  { id: 'enter-sequence', label: '进入动画', description: '进入区域后播放动画。', icon: 'door-open-line', when: 'enter', action: 'sequence' }
];

export function interactionTemplate(id, targetId, base = {}) {
  const template = INTERACTION_TEMPLATES.find(item => item.id === id);
  if (!template || !targetId) return null;
  const targetName = base.name || targetId;
  const result = { name: `${template.label}：${targetName}`, trigger: { target: targetId, when: template.when, params: template.when === 'enter' ? { radius: 2 } : template.when === 'gaze' || template.when === 'hold' ? { secs: 1 } : {}, do: [] }, sequence: null };
  if (template.action === 'highlight') result.trigger.do.push({ action: 'highlight', args: { targetId } });
  else if (template.action === 'card') result.trigger.do.push({ action: 'card', args: { text: template.text } });
  else if (template.action === 'reward') result.trigger.do.push({ action: 'reward', args: { text: template.text } });
  else if (template.action === 'sequence') {
    const sequence = cardToSequence('pulse', targetId, base.transform);
    sequence.name = `${targetName}动画`;
    result.sequence = sequence;
    result.trigger.do.push({ action: 'play_seq', args: { seqId: sequence.id } });
  }
  return result;
}
