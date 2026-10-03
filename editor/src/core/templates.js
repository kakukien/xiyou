import { newObject, newSequence, newTrigger, newNode, newChapter, defaults } from './schema.js';

export const ACTION_CARDS = [
  { id: 'fly_in', label: '飞入' },
  { id: 'land', label: '落地' },
  { id: 'roll', label: '翻滚' },
  { id: 'dissolve', label: '消散' },
  { id: 'transform', label: '变身' },
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
    tracks: [
      {
        target: targetId,
        kind,
        keys
      }
    ]
  });
}

export function demoScene() {
  const scene = defaults();

  scene.base = {
    // 花果山拍摄点 3GS 底座（hks204606，708k 高斯 compressed.ply 41MB，AR 坐标经 Sim3 对齐）
    sog_url: 'assets/hks204606.compressed.ply',
    collider_url: null,
    transform: {
      s: 0.6405792403036242,
      R: [
        0.9666439262936674, -0.006198977271578077, -0.2560490039823422,
        0.006198977271578077, -0.9988479663538381, 0.04758479580273278,
        -0.2560490039823422, -0.04758479580273278, -0.9654918926475056
      ],
      t: [0.00618069, 0.995901, 0.0474444],
      scale_source: 'camera_height:1.55 (inv)'
    },
    env: {
      sky: { image: 'fx/sky_dusk.jpg' }
    }
  };

  const n1 = newNode({
    id: 'n1',
    title: '石卵醒来',
    anchor: '',
    on_enter: '',
    next: 'n2',
    text: '石卵在花果山深处苏醒，金光照亮了古老岩壁。',
    checklist: {
      copy: false,
      placed: false,
      trigger: false,
      located: false
    }
  });

  const n2 = newNode({
    id: 'n2',
    title: '岩壁低语',
    anchor: '',
    on_enter: '',
    next: 'n3',
    text: '岩壁传来低语，沉睡的虚境正在回应你的注视。',
    checklist: {
      copy: false,
      placed: false,
      trigger: false,
      located: false
    }
  });

  const n3 = newNode({
    id: 'n3',
    title: '虚境之门',
    anchor: '',
    on_enter: '',
    next: null,
    text: '按住虚境之门，开启通往花果山深处的道路。',
    checklist: {
      copy: false,
      placed: false,
      trigger: false,
      located: false
    }
  });

  const chapter = newChapter('花果山觉醒');
  chapter.id = 'ch1';
  chapter.title = '花果山觉醒';
  chapter.nodes = [n1, n2, n3];

  const ch2 = newChapter('唐僧上线'); ch2.id = 'ch2'; ch2.nodes = [];
  const ch3 = newChapter('八十一难'); ch3.id = 'ch3'; ch3.nodes = [];
  const ch4 = newChapter('大雷音寺'); ch4.id = 'ch4'; ch4.nodes = [];
  const ch5 = newChapter('破碎西天'); ch5.id = 'ch5'; ch5.nodes = [];

  const monkey = newObject('glb', {
    id: 'glb_悟空',
    name: 'GLB角色_01',
    asset: '',
    node_id: 'n1',
    visible: true,
    transform: {
      p: [0, 1, -3],
      r: [0, 0, 0],
      s: [1, 1, 1]
    }
  });

  const tang = newObject('glb', {
    id: 'glb_唐僧',
    name: 'GLB角色_02',
    asset: '',
    node_id: 'n2',
    visible: true,
    transform: { p: [1.4, 1, -3.6], r: [0, -30, 0], s: [0.95, 0.95, 0.95] }
  });

  const world = newObject('glb', {
    id: 'glb_故事空间',
    name: '故事空间·体素环绕',
    asset: 'a_world',
    node_id: '',
    visible: true,
    transform: { p: [0, -0.45, 0], r: [0, 0, 0], s: [1, 1, 1] }
  });
  world.hitbox = { type: 'none', size: [1, 1, 1], center: [0, 0, 0] };

  const belltower = newObject('glb', {
    id: 'glb_钟楼',
    name: '西安钟楼·体块',
    asset: 'a_belltower',
    node_id: '',
    visible: true,
    transform: { p: [0, 0, -5], r: [0, 0, 0], s: [1, 1, 1] }
  });
  belltower.hitbox = { type: 'none', size: [1, 1, 1], center: [0, 0, 0] };

  const cliff = newObject('splat_segment', {
    id: 'seg_墙面01',
    name: '墙面分块_01',
    asset: '',
    node_id: 'n2',
    visible: true,
    transform: {
      p: [2, 1.2, -4],
      r: [0, 0, 0],
      s: [1, 1, 1]
    }
  });

  const segGround = newObject('splat_segment', {
    id: 'seg_地面02', name: '地面分块_02', node_id: 'n1', visible: true,
    transform: { p: [0, 0.3, -1.5], r: [0, 0, 0], s: [2.4, 0.35, 1.8] }
  });
  const segPillar = newObject('splat_segment', {
    id: 'seg_石柱03', name: '石柱分块_03', node_id: 'n2', visible: true,
    transform: { p: [-2.4, 1.4, -3.4], r: [0, 18, 0], s: [0.7, 2.4, 0.7] }
  });
  const segHill = newObject('splat_segment', {
    id: 'seg_山体04', name: '山体分块_04', node_id: '', visible: true,
    transform: { p: [3.4, 1.6, -5.6], r: [0, -12, 0], s: [2.8, 2.4, 1.6] }
  });

  const videoA = newObject('video_quad', {
    id: 'vqu_视频01', name: '视频图片_01', node_id: 'n1', visible: true,
    asset: 'a_clip',
    material: { preset: 'plain' },
    transform: { p: [-1.6, 1.4, -2.4], r: [0, 22, 0], s: [1.15, 1.15, 1.15] }
  });
  const videoB = newObject('video_quad', {
    id: 'vqu_视频02', name: '视频图片_02', node_id: 'n2', visible: true,
    transform: { p: [2.8, 1.2, -3.2], r: [0, -28, 0], s: [1, 1, 1] }
  });

  const lightA = newObject('light', {
    id: 'lit_点光01', name: '点光源_01', node_id: 'n1', visible: true,
    material: { color: '#ff8c3b' },
    transform: { p: [0.6, 0.7, -1.6], r: [0, 0, 0], s: [0.6, 0.6, 0.6] }
  });
  const lightB = newObject('light', {
    id: 'lit_点光02', name: '点光源_02', node_id: 'n2', visible: true,
    material: { color: '#e8b93b' },
    transform: { p: [-2.2, 0.7, -2.8], r: [0, 0, 0], s: [0.6, 0.6, 0.6] }
  });

  const talisman = newObject('quad', {
    id: 'quad_结界符',
    name: '结界符',
    asset: '',
    node_id: 'n3',
    visible: true,
    transform: {
      p: [-2, 1.5, -3],
      r: [0, 0, 0],
      s: [1, 1, 1]
    }
  });

  // —— 特效演示 ——
  const beam = newObject('quad', {
    id: 'fx_光柱', name: '佛光柱·半透明',
    node_id: 'n3', visible: true,
    material: { alpha: 'demo:beam', blend: 'additive', color: '#ff9a3d', opacity: 0.85 },
    transform: { p: [0.2, 1.6, -2.6], r: [0, 0, 0], s: [0.9, 2.6, 1] }
  });
  const sigil = newObject('quad', {
    id: 'fx_符纹', name: '镂空符纹·透明贴图',
    node_id: 'n3', visible: true,
    material: { alpha: 'demo:symbol:符', cutout: true, color: '#ffcf6b' },
    transform: { p: [-1.1, 1.9, -2.8], r: [0, 14, 0], s: [0.8, 0.8, 0.8] }
  });
  const circle = newObject('quad', {
    id: 'fx_法阵', name: '地面法阵·叠加发光',
    node_id: 'n3', visible: true,
    material: { alpha: 'demo:ring', blend: 'additive', color: '#5bb6ff', opacity: 0.9 },
    transform: { p: [0.2, 0.05, -2.6], r: [-90, 0, 0], s: [3, 3, 1] }
  });
  const mist = newObject('quad', {
    id: 'fx_山雾', name: '山雾·半透粒子',
    node_id: '', visible: true,
    material: { alpha: 'demo:flame', blend: 'additive', color: '#9fb4d8', opacity: 0.5 },
    transform: { p: [1.5, 0.8, -4.5], r: [0, -10, 0], s: [4, 1.6, 1] }
  });
  const halo = newObject('quad', {
    id: 'fx_光晕', name: '角色光晕',
    node_id: 'n1', visible: true,
    material: { alpha: 'demo:glow', blend: 'additive', color: '#ffb26b', opacity: 0.7 },
    transform: { p: [0, 1, -3.35], r: [0, 0, 0], s: [1.6, 1.6, 1] }
  });

  // —— 组装体演示：莲花台（AI 实时生成同款语法）——
  const petals = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    petals.push({
      shape: 'capsule', color: '#f2b8c6', flat: false, roughness: 0.6,
      p: [Math.cos(a) * 0.42, 0.62, Math.sin(a) * 0.42],
      r: [Math.cos(a) * 62, -a * 180 / Math.PI, Math.sin(a) * -62],
      s: [0.55, 0.5, 0.55]
    });
  }
  const lotus = newObject('compound', {
    id: 'cmp_莲花台', name: '莲花台·组装体',
    node_id: 'n3', visible: true,
    parts: [
      { shape: 'cylinder', color: '#8d97a5', roughness: 0.9, p: [0, 0.12, 0], s: [1.1, 0.24, 1.1] },
      { shape: 'cylinder', color: '#b7bec8', roughness: 0.85, p: [0, 0.34, 0], s: [0.8, 0.2, 0.8] },
      ...petals,
      { shape: 'sphere', color: '#ffd98a', emissive: '#c9880f', emissive_intensity: 0.8, p: [0, 0.68, 0], s: [0.34, 0.34, 0.34] },
      { shape: 'torus', color: '#ffb03a', blend: 'additive', opacity: 0.75, flat: true, p: [0, 0.68, 0], r: [90, 0, 0], s: [1.6, 1.6, 1.6] }
    ],
    transform: { p: [1.2, 0, -1.4], r: [0, 0, 0], s: [1, 1, 1] }
  });

  // 动态 shader 演示：旋转法阵
  const animSigil = newObject('quad', {
    id: 'fx_动法阵', name: '旋转法阵·动态',
    node_id: 'n3', visible: true,
    material: { shader: { kind: 'sigil', color1: '#ffb03a', color2: '#5bb6ff', speed: 0.8, intensity: 1.4 } },
    transform: { p: [1.2, 1.55, -1.4], r: [-90, 0, 0], s: [2.2, 2.2, 1] }
  });

  // 粒子演示：萤火虫群绕着莲花台 + 光尘柱
  const fireflies = newObject('compound', {
    id: 'fx_萤火', name: '萤火虫群',
    node_id: 'n3', visible: true,
    parts: [
      { shape: 'points', count: 120, spread: [2.4, 1.6, 2.4], size: 0.06, speed: 0.12, drift: 0.5,
        material: { color: '#ffe28a', alpha: 'fx:mote', opacity: 0.95 } }
    ],
    transform: { p: [1.2, 0.4, -1.4], r: [0, 0, 0], s: [1, 1, 1] }
  });
  const dustColumn = newObject('compound', {
    id: 'fx_光尘柱', name: '上升光尘',
    node_id: 'n1', visible: true,
    parts: [
      { shape: 'points', count: 200, spread: [0.7, 2.6, 0.7], size: 0.035, speed: 0.25, drift: 0.1,
        material: { color: '#ffd9a0', alpha: 'fx:mote', opacity: 0.7 } },
      { shape: 'plane', alpha: 'fx:glow_orb', color: '#ffb03a', blend: 'additive', opacity: 0.8, flat: true,
        p: [0, 0.06, 0], r: [-90, 0, 0], s: [1.6, 1.6, 1] }
    ],
    transform: { p: [0, 0, -3], r: [0, 0, 0], s: [1, 1, 1] }
  });

  const appear = newSequence({
    id: 'seq_出场',
    name: '出场飞入',
    duration: 1,
    tracks: [
      {
        target: 'glb_悟空',
        kind: 'transform',
        keys: [
          transformKey(0, [0, 3, -3], [0, 0, 0], [0, 0, 0], 'out'),
          transformKey(1, [0, 1, -3], [0, 0, 0], [1, 1, 1], 'out')
        ]
      }
    ]
  });

  const reveal = newSequence({
    id: 'seq_结界显形',
    name: '结界显形',
    duration: 1,
    tracks: [
      {
        target: 'quad_结界符',
        kind: 'opacity',
        keys: [
          opacityKey(0, 0, 'in'),
          opacityKey(1, 1, 'out')
        ]
      }
    ]
  });

  const dissolve = newSequence({
    id: 'seq_消散',
    name: '消散',
    duration: 1,
    tracks: [
      {
        target: 'quad_结界符',
        kind: 'opacity',
        keys: [
          opacityKey(0, 1, 'in'),
          opacityKey(1, 0, 'out')
        ]
      }
    ]
  });

  const enterTrigger = newTrigger({
    id: 'tr_n1_enter',
    name: '进入石卵区域',
    target: 'glb_悟空',
    when: 'enter',
    params: { radius: 2 },
    do: [
      {
        action: 'play_seq',
        args: { seq: 'seq_出场' }
      },
      {
        action: 'card',
        args: { text: '悟空醒了' }
      }
    ]
  });

  const gazeTrigger = newTrigger({
    id: 'tr_n2_gaze',
    name: '注视岩壁',
    target: 'seg_墙面01',
    when: 'gaze',
    params: { secs: 1 },
    do: [
      {
        action: 'play_seq',
        args: { seq: 'seq_结界显形' }
      },
      {
        action: 'highlight',
        args: {}
      }
    ]
  });

  const holdTrigger = newTrigger({
    id: 'tr_n3_hold',
    name: '按住虚境之门',
    target: 'quad_结界符',
    when: 'hold',
    params: { secs: 1 },
    do: [
      {
        action: 'play_seq',
        args: { seq: 'seq_消散' }
      },
      {
        action: 'goto_node',
        args: { node: 'n3' }
      },
      {
        action: 'card',
        args: { text: '结局：虚境之门开启' }
      }
    ]
  });

  const videoSeq = newSequence({
    id: 'seq_视频A',
    name: '播放视频A',
    duration: 45,
    tracks: [
      {
        target: 'vqu_视频01',
        kind: 'video',
        keys: [{ t: 0, v: true, ease: 'in' }]
      },
      {
        target: 'vqu_视频01',
        kind: 'opacity',
        keys: [opacityKey(0, 0, 'in'), opacityKey(2, 1, 'out')]
      }
    ]
  });

  const eventSeq = newSequence({
    id: 'seq_事件轴',
    name: '节点事件轴',
    duration: 45,
    tracks: [
      {
        target: 'glb_悟空',
        kind: 'event',
        keys: [
          { t: 8, v: 'card:石卵微光', ease: 'in' },
          { t: 20, v: 'card:岩壁回应', ease: 'in' },
          { t: 35, v: 'card:虚境开启', ease: 'in' }
        ]
      }
    ]
  });

  // —— 现场重建占位：视频抽帧照片墙（裁切出大概的空间范围）——
  const SITE = 'site/';
  const backdrop = newObject('quad', {
    id: 'site_背景板', name: '背景板·主会场',
    asset: 'a_f13', node_id: '', visible: true,
    transform: { p: [0, 1.35, -5.2], r: [0, 0, 0], s: [4.8, 2.7, 1] }
  });
  const stageFloor = newObject('quad', {
    id: 'site_舞台', name: '舞台地面',
    asset: 'a_floor', node_id: '', visible: true,
    transform: { p: [0, 0.03, -3.2], r: [-90, 0, 0], s: [4.6, 2.4, 1] }
  });
  const speakers = newObject('quad', {
    id: 'site_音箱', name: '线阵音箱',
    asset: 'a_speakers', node_id: '', visible: true,
    transform: { p: [2.55, 0.95, -2.2], r: [0, -38, 0], s: [0.78, 1.9, 1] }
  });
  // 弧形照片墙：6 帧环绕后方
  const arcFrames = ['f01', 'f05', 'f09', 'f17', 'f21', 'f25'];
  const photoArc = arcFrames.map((f, i) => {
    const theta = ((i - 2.5) / 5) * Math.PI * 0.82; // ~148°
    const r = 6.2;
    return newObject('quad', {
      id: `site_${f}`, name: `现场_${f}`,
      asset: `a_${f}`, node_id: '', visible: true,
      transform: {
        p: [Math.sin(theta) * r, 1.55, -Math.cos(theta) * r + 0.6],
        r: [0, -theta * 180 / Math.PI, 0],
        s: [2.1, 1.18, 1]
      }
    });
  });

  scene.objects = [
    world, belltower,
    backdrop, stageFloor, speakers, ...photoArc,
    segGround, cliff, segPillar, segHill,
    videoA, videoB,
    monkey, tang,
    lightA, lightB,
    talisman,
    beam, sigil, circle, mist, halo,
    lotus, animSigil, fireflies, dustColumn
  ];
  scene.sequences = [appear, reveal, dissolve, videoSeq, eventSeq];
  scene.triggers = [enterTrigger, gazeTrigger, holdTrigger];
  scene.story = {
    start: 'n1',
    chapters: [chapter, ch2, ch3, ch4, ch5]
  };
  scene.anchors = [
    { id: 'anchor_入口', name: '入口定位点', kind: 'vps', pose: { t: [0, 0, 0], r: [0, 0, 0] } },
    { id: 'anchor_殿门', name: '殿门定位点', kind: 'poster', pose: { t: [0, 1.3, -3.2], r: [0, 0, 0] }, image_url: 'assets/poster.png' }
  ];
  scene.zones = [
    { id: 'zone_入口', name: '入口互动区', kind: 'trigger', shape: 'box', transform: { p: [0, 1, -2], r: [0, 0, 0], s: [3, 2, 3] }, color: '#f97316', visible: true, locked: false, description: '入口进入后可触发互动内容' },
    { id: 'zone_舞台', name: '舞台可编辑区', kind: 'editable', shape: 'box', transform: { p: [0, 1, -3], r: [0, 0, 0], s: [8, 2, 6] }, color: '#2563eb', visible: true, locked: false, description: '可布置角色、视频和灯光' },
    { id: 'zone_禁布', name: '设备禁布区', kind: 'forbidden', shape: 'box', transform: { p: [4, 1, -2], r: [0, 0, 0], s: [2, 2, 2] }, color: '#dc2626', visible: true, locked: true, description: '禁止放置遮挡现场设备的内容' }
  ];

  scene.meta = {
    name: '花果山觉醒',
    folders: [
      { id: 'fld_shared', name: '共享素材', parent: '' },
      { id: 'fld_我', name: '我的素材', parent: '' }
    ],
    assets: [
      { id: 'a_f01', name: '现场_入场.jpg', url: 'site/f01.jpg', kind: 'image', type: 'image', folder: 'fld_shared', bytes: 130049, mime: 'image/jpeg' },
      { id: 'a_f05', name: '现场_走廊.jpg', url: 'site/f05.jpg', kind: 'image', type: 'image', folder: 'fld_shared', bytes: 100859, mime: 'image/jpeg' },
      { id: 'a_f09', name: '现场_侧墙.jpg', url: 'site/f09.jpg', kind: 'image', type: 'image', folder: 'fld_shared', bytes: 98031, mime: 'image/jpeg' },
      { id: 'a_f13', name: '背景板.jpg', url: 'site/f13.jpg', kind: 'image', type: 'image', folder: 'fld_shared', bytes: 88940, mime: 'image/jpeg' },
      { id: 'a_f17', name: '现场_全景.jpg', url: 'site/f17.jpg', kind: 'image', type: 'image', folder: 'fld_shared', bytes: 100805, mime: 'image/jpeg' },
      { id: 'a_f21', name: '现场_签到台.jpg', url: 'site/f21.jpg', kind: 'image', type: 'image', folder: 'fld_shared', bytes: 106023, mime: 'image/jpeg' },
      { id: 'a_f25', name: '现场_出口.jpg', url: 'site/f25.jpg', kind: 'image', type: 'image', folder: 'fld_shared', bytes: 105922, mime: 'image/jpeg' },
      { id: 'a_floor', name: '舞台地面.png', url: 'site/floor.jpg', kind: 'image', type: 'image', folder: 'fld_shared', bytes: 15671, mime: 'image/jpeg' },
      { id: 'a_speakers', name: '线阵音箱.png', url: 'site/speakers.jpg', kind: 'image', type: 'image', folder: 'fld_shared', bytes: 90012, mime: 'image/jpeg' },
      { id: 'a_clip', name: '现场片段.mp4', url: 'site/clip.mp4', kind: 'video', type: 'video', folder: 'fld_shared', bytes: 709560, mime: 'video/mp4' },
      { id: 'a_world', name: '故事空间·体素.glb', url: 'assets/xiyou_world.glb', kind: 'model', type: 'glb', folder: 'fld_shared', bytes: 1915952, mime: 'model/gltf-binary' },
      { id: 'a_belltower', name: '西安钟楼·体块.glb', url: 'assets/xiyou_belltower.glb', kind: 'model', type: 'glb', folder: 'fld_shared', bytes: 782288, mime: 'model/gltf-binary' },
      { id: 'a_nongyao', name: '王者峡谷.glb', url: 'assets/nongyao.glb', kind: 'model', type: 'glb', folder: 'fld_shared', bytes: 19233212, mime: 'model/gltf-binary' },
      { id: 'a_pointcloud', name: '现场定位点云.ply', url: 'assets/hks204606.compressed.ply', kind: 'splat', type: 'splat', folder: 'fld_我', bytes: 43375147, mime: 'application/octet-stream', metadata: { format: 'ply', role: 'vps-base' } },
      { id: 'a_wukong', name: '孙悟空.glb', url: 'local://孙悟空.glb', kind: 'model', type: 'glb', folder: 'fld_shared', bytes: 356515840, mime: 'model/gltf-binary' },
      { id: 'a_va', name: '视频_A.mp4', url: 'local://视频_A.mp4', kind: 'video', type: 'video', folder: 'fld_shared', bytes: 188743680, mime: 'video/mp4' }
    ]
  };

  return scene;
}

export function cardToSequence(cardId, targetId, base) {
  const bp = base?.p || [0, 0, 0];
  const br = base?.r || [0, 0, 0];
  const bs = base?.s || [1, 1, 1];
  // 关键帧是绝对值：delta 位移/旋转叠加在对象当前 transform 上，缩放做乘法
  const T = (t, dp, dr, sm, ease) => transformKey(
    t,
    [bp[0] + dp[0], bp[1] + dp[1], bp[2] + dp[2]],
    [br[0] + dr[0], br[1] + dr[1], br[2] + dr[2]],
    [bs[0] * sm[0], bs[1] * sm[1], bs[2] * sm[2]],
    ease
  );

  switch (cardId) {
    case 'fly_in':
      return makeCardSequence('飞入', 1.2, targetId, 'transform', [
        T(0, [0, 2, 0], [0, 0, 0], [0.2, 0.2, 0.2], 'out'),
        T(1.2, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'out')
      ]);

    case 'land':
      return makeCardSequence('落地', 1, targetId, 'transform', [
        T(0, [0, 1.2, 0], [0, 0, 0], [1, 1, 1], 'out'),
        T(0.7, [0, -0.08, 0], [0, 0, 0], [1.05, 0.95, 1.05], 'in'),
        T(1, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'out')
      ]);

    case 'roll':
      return makeCardSequence('翻滚', 1.2, targetId, 'transform', [
        T(0, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'inout'),
        T(0.6, [0, 0, 0], [0, 180, 0], [1, 1, 1], 'linear'),
        T(1.2, [0, 0, 0], [0, 360, 0], [1, 1, 1], 'out')
      ]);

    case 'dissolve':
      return makeCardSequence('消散', 1.5, targetId, 'opacity', [
        opacityKey(0, 1, 'in'),
        opacityKey(1.1, 0.35, 'inout'),
        opacityKey(1.5, 0, 'out')
      ]);

    case 'transform':
      return makeCardSequence('变身', 1.5, targetId, 'transform', [
        T(0, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'in'),
        T(0.7, [0, 0.15, 0], [0, 180, 0], [0.75, 1.2, 0.75], 'inout'),
        T(1.5, [0, 0, 0], [0, 360, 0], [1, 1, 1], 'out')
      ]);

    case 'orbit':
      return makeCardSequence('环绕', 2, targetId, 'transform', [
        T(0, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'linear'),
        T(0.66, [0.7, 0, 0], [0, 120, 0], [1, 1, 1], 'linear'),
        T(1.33, [0, 0, 0.7], [0, 240, 0], [1, 1, 1], 'linear'),
        T(2, [0, 0, 0], [0, 360, 0], [1, 1, 1], 'linear')
      ]);

    case 'blink':
      return makeCardSequence('闪现', 1, targetId, 'opacity', [
        opacityKey(0, 0, 'linear'),
        opacityKey(0.2, 1, 'out'),
        opacityKey(0.5, 1, 'linear'),
        opacityKey(0.7, 0, 'in'),
        opacityKey(1, 1, 'out')
      ]);

    case 'float':
      return makeCardSequence('浮动', 2, targetId, 'transform', [
        T(0, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'inout'),
        T(1, [0, 0.25, 0], [0, 0, 0], [1, 1, 1], 'inout'),
        T(2, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'inout')
      ]);

    case 'rise':
      return makeCardSequence('升起', 1.5, targetId, 'transform', [
        T(0, [0, -0.8, 0], [0, 0, 0], [1, 1, 1], 'out'),
        T(1.5, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'out')
      ]);

    case 'pulse':
      return makeCardSequence('脉动', 1.2, targetId, 'transform', [
        T(0, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'inout'),
        T(0.3, [0, 0, 0], [0, 0, 0], [1.25, 1.25, 1.25], 'inout'),
        T(0.6, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'inout'),
        T(0.9, [0, 0, 0], [0, 0, 0], [1.15, 1.15, 1.15], 'inout'),
        T(1.2, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'out')
      ]);

    default:
      return makeCardSequence('占位动作', 1, targetId, 'transform', [
        T(0, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'linear'),
        T(1, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'linear')
      ]);
  }
}

export const INTERACTION_TEMPLATES = [
  { id: 'tap-highlight', label: '点击高亮', description: '点击对象时高亮反馈。', icon: 'cursor-line', when: 'tap', action: 'highlight' },
  { id: 'gaze-card', label: '注视提示', description: '注视对象后弹出提示卡片。', icon: 'eye-line', when: 'gaze', action: 'card', text: '发现了新的线索。' },
  { id: 'hold-reward', label: '按住奖励', description: '按住对象完成后发放奖励提示。', icon: 'hand-coin-line', when: 'hold', action: 'reward', text: '获得新的虚境线索。' },
  { id: 'enter-sequence', label: '进入显形', description: '进入区域后播放显形动画。', icon: 'door-open-line', when: 'enter', action: 'sequence' }
]

export function interactionTemplate(id, targetId, base = {}) {
  const template = INTERACTION_TEMPLATES.find(item => item.id === id)
  if (!template || !targetId) return null
  const targetName = base.name || targetId
  const result = { name: `${template.label}：${targetName}`, trigger: { target: targetId, when: template.when, params: template.when === 'enter' ? { radius: 2 } : template.when === 'gaze' || template.when === 'hold' ? { secs: 1 } : {}, do: [] }, sequence: null }
  if (template.action === 'highlight') result.trigger.do.push({ action: 'highlight', args: {} })
  else if (template.action === 'card') result.trigger.do.push({ action: 'card', args: { text: template.text } })
  else if (template.action === 'reward') result.trigger.do.push({ action: 'reward', args: { text: template.text } })
  else if (template.action === 'sequence') {
    const sequence = cardToSequence('blink', targetId, base.transform)
    sequence.name = `${targetName}显形`
    result.sequence = sequence
    result.trigger.do.push({ action: 'play_seq', args: { seqId: sequence.id } }, { action: 'card', args: { text: '进入区域，空间开始显形。' } })
  }
  return result
}
