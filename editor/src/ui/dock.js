import { store } from '../core/store.js';
import { ACTION_CARDS, cardToSequence } from '../core/templates.js';
import { budget } from '../core/schema.js';
import { player } from '../core/playback.js';
import { log } from './log.js';

const KIND_LABELS = {
  transform: '变换',
  opacity: '透明度',
  clip: '裁剪',
  video: '视频',
  audio: '音频',
  event: '事件'
};

const KIND_COLORS = {
  transform: 'transform',
  opacity: 'opacity',
  clip: 'clip',
  video: 'video',
  audio: 'audio',
  event: 'event'
};

const TRACK_KINDS = ['transform', 'opacity', 'clip', 'video', 'audio', 'event'];

let root = null;
let activeTab = 'assets';
let selectedSequenceId = null;
let playhead = 0;
let selectedKey = null;
let logItems = [];
let renderQueued = false;
let dockMaximized = false;
let dockPrevHeight = null;
let tlZoom = 140; // 时间线缩放：像素/秒

function esc(value) {
  return String(value ?? '');
}

function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatGB(bytes = 0) {
  return `${((Number(bytes) || 0) / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function objectName(id) {
  const obj = store.getObject(id);
  return obj?.name || id || '未指定对象';
}

function currentObject() {
  const ids = store.selected();
  return ids.length ? store.getObject(ids[0]) : null;
}

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function makeButton(text, className = 'btn') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  return button;
}

function renderCardChips() {
  const wrap = document.createElement('div');
  wrap.className = 'cardchips';

  ACTION_CARDS.forEach(card => {
    const chip = makeButton(card.label, 'chip');
    chip.title = `将「${card.label}」绑定到当前选中对象`;
    chip.addEventListener('click', () => {
      const obj = currentObject();
      if (!obj) {
        log('请先选择一个对象，再添加动作卡', 'warn');
        return;
      }

      const sequence = cardToSequence(card.id, obj.id, obj.transform);
      if (!sequence) {
        log(`无法创建动作卡：${card.label}`, 'error');
        return;
      }

      const seq = store.addSequence(sequence);
      store.addTrigger({
        name: `${card.label}：${obj.name || obj.id}`,
        target: obj.id,
        when: 'tap',
        params: {},
        do: [{ action: 'play_seq', args: { seqId: seq.id } }]
      });
      selectedSequenceId = seq.id;
      activeTab = 'timeline';
      log(`已将「${card.label}」绑定到 ${obj.name || obj.id}`, 'info');
      requestRender();
    });
    wrap.appendChild(chip);
  });

  return wrap;
}

function renderTabs() {
  const row = document.createElement('div');
  row.className = 'dock-tabs';

  const tabs = [
    ['assets', '内容浏览器'],
    ['timeline', '时间线'],
    ['log', '输出日志']
  ];

  tabs.forEach(([id, label]) => {
    const tab = makeButton(label, `tab${activeTab === id ? ' active' : ''}`);
    tab.addEventListener('click', () => {
      if (activeTab === 'timeline' && id !== 'timeline') player.endPreview?.();
      activeTab = id;
      // 时间线是重度编辑面：面板过矮时自动抬到一半屏高
      if (id === 'timeline' && root && root.getBoundingClientRect().height < 340) {
        root.style.height = `${Math.round(window.innerHeight * 0.5)}px`;
      }
      requestRender();
    });
    row.appendChild(tab);
  });

  row.appendChild(renderCardChips());

  const spacer = document.createElement('span');
  spacer.className = 'dock-tabs-spacer';
  row.appendChild(spacer);

  const maximize = makeButton(dockMaximized ? '⤡' : '⤢', 'tab dock-max');
  maximize.title = dockMaximized ? '还原面板高度' : '放大编辑区';
  maximize.addEventListener('click', () => {
    if (!root) return;
    if (dockMaximized) {
      root.style.height = dockPrevHeight || localStorage.getItem('xiyou.dockH') || '';
      dockMaximized = false;
    } else {
      dockPrevHeight = root.style.height || `${root.getBoundingClientRect().height}px`;
      root.style.height = `${Math.round(window.innerHeight * 0.55)}px`;
      dockMaximized = true;
    }
    requestRender();
  });
  row.appendChild(maximize);
  return row;
}

function renderAssets() {
  const panel = document.createElement('div');
  panel.className = 'dock-panel content-browser';

  const strip = document.createElement('div');
  strip.className = 'asset-strip';

  const assets = store.scene.meta?.assets || [];
  assets.forEach(asset => {
    const card = document.createElement('div');
    card.className = 'cb-card';

    const thumb = document.createElement('div');
    thumb.className = 'cb-thumb';

    const realUrl = asset.url && !asset.url.startsWith('local://')
      ? asset.url
      : window.__xiyouBlobMap?.get(asset.url);

    if (asset.mime?.startsWith('image/') && realUrl) {
      const image = document.createElement('img');
      image.src = realUrl;
      image.alt = asset.name || '';
      image.onerror = () => {
        image.remove();
        thumb.textContent = 'IMAGE';
      };
      thumb.appendChild(image);
    } else if (asset.mime?.startsWith('video/') && realUrl) {
      const vid = document.createElement('video');
      vid.src = realUrl;
      vid.muted = true;
      vid.playsInline = true;
      vid.onerror = () => {
        vid.remove();
        thumb.textContent = 'VIDEO';
      };
      thumb.appendChild(vid);
    } else {
      thumb.textContent = asset.type || asset.mime?.split('/')[0]?.toUpperCase() || 'ASSET';
    }

    const name = document.createElement('div');
    name.className = 'cb-name';
    name.textContent = asset.name || asset.id;

    const size = document.createElement('div');
    size.className = 'cb-size';
    size.textContent = formatBytes(asset.bytes ?? asset.size);

    const remove = makeButton('×', 'cb-remove');
    remove.title = '删除素材';
    remove.addEventListener('click', event => {
      event.stopPropagation();
      store.removeAsset(asset.id);
    });

    card.append(thumb, name, size, remove);
    card.draggable = true;
    card.addEventListener('dragstart', event => {
      event.dataTransfer?.setData('text/x-xiyou-asset', asset.id);
    });
    strip.appendChild(card);
  });

  const importCard = document.createElement('button');
  importCard.type = 'button';
  importCard.className = 'cb-card cb-import';
  importCard.innerHTML = '<span class="cb-import-plus">＋</span><span>导入素材</span>';

  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = 'image/*,video/*,.glb,.gltf,model/gltf-binary,model/gltf+json';
  input.hidden = true;

  input.addEventListener('change', () => {
    Array.from(input.files || []).forEach(file => {
      const mime = file.type || '';
      let type = 'asset';
      if (mime.startsWith('image/')) type = 'image';
      else if (mime.startsWith('video/')) type = 'video';
      else if (file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf')) type = 'glb';

      let url = `local://${file.name}`;
      // 本机导入的素材用 blob URL 挂起来，缩略图和贴图立即可见
      if (!window.__xiyouBlobMap) window.__xiyouBlobMap = new Map();
      window.__xiyouBlobMap.set(url, URL.createObjectURL(file));

      store.addAsset({
        name: file.name,
        type,
        size: file.size,
        bytes: file.size,
        mime,
        url
      });
    });
    input.value = '';
  });

  importCard.addEventListener('click', () => input.click());
  importCard.appendChild(input);
  strip.appendChild(importCard);

  panel.appendChild(strip);
  return panel;
}

function getSequence() {
  const sequences = store.scene.sequences || [];
  if (!sequences.length) return null;
  if (!selectedSequenceId || !sequences.some(seq => seq.id === selectedSequenceId)) {
    selectedSequenceId = sequences[0].id;
  }
  return sequences.find(seq => seq.id === selectedSequenceId) || null;
}

function parseValue(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    const number = Number(text);
    return Number.isNaN(number) ? fallback : number;
  }
}

function updateSequencePatch(seq, patch) {
  store.updateSequence(seq.id, patch);
}

function renderTimeline() {
  const panel = document.createElement('div');
  panel.className = 'dock-panel timeline-panel';

  const toolbar = document.createElement('div');
  toolbar.className = 'timeline-toolbar';

  const select = document.createElement('select');
  select.className = 'field';
  (store.scene.sequences || []).forEach(seq => {
    const option = document.createElement('option');
    option.value = seq.id;
    option.textContent = seq.name || seq.id;
    option.selected = seq.id === selectedSequenceId;
    select.appendChild(option);
  });
  select.addEventListener('change', () => {
    player.endPreview?.();
    selectedSequenceId = select.value;
    playhead = 0;
    selectedKey = null;
    requestRender();
  });

  const duration = document.createElement('input');
  duration.className = 'field timeline-duration';
  duration.type = 'number';
  duration.min = '0.1';
  duration.step = '0.1';

  const addSequence = makeButton('＋ 新建', 'btn');
  addSequence.addEventListener('click', () => {
    const seq = store.addSequence({
      name: '新时间线',
      duration: 2,
      tracks: []
    });
    selectedSequenceId = seq.id;
    activeTab = 'timeline';
    requestRender();
  });

  const renameSequence = makeButton('改名', 'btn');
  renameSequence.addEventListener('click', () => {
    const current = getSequence();
    if (!current) return;
    const name = window.prompt('时间线名称', current.name || current.id);
    if (name === null) return;
    updateSequencePatch(current, { name: name.trim() || current.name });
  });

  const deleteSequence = makeButton('删除', 'btn danger');
  deleteSequence.addEventListener('click', () => {
    const current = getSequence();
    if (!current) return;
    if (!window.confirm(`删除时间线「${current.name || current.id}」？触发器中的引用会悬空。`)) return;
    player.stop();
    player.endPreview?.();
    store.removeSequence(current.id);
    selectedSequenceId = null;
    selectedKey = null;
    requestRender();
  });

  const seq = getSequence();
  renameSequence.disabled = !seq;
  deleteSequence.disabled = !seq;
  duration.value = seq?.duration ?? 2;
  duration.disabled = !seq;
  duration.addEventListener('change', () => {
    if (!seq) return;
    const value = Math.max(0.1, Number(duration.value) || 2);
    updateSequencePatch(seq, { duration: value });
    playhead = Math.min(playhead, value);
  });

  const play = makeButton('▶ 播放', 'btn');
  play.disabled = !seq;
  play.addEventListener('click', () => {
    if (seq) player.play(seq.id);
  });

  const stop = makeButton('■ 停止', 'btn');
  stop.disabled = !seq;
  stop.addEventListener('click', () => {
    player.stop(true);
    player.endPreview?.();
    playhead = 0;
    requestRender();
  });

  const zoomOut = makeButton('－', 'btn');
  zoomOut.title = '缩小时间刻度（Ctrl+滚轮也可）';
  zoomOut.addEventListener('click', () => {
    tlZoom = Math.max(20, tlZoom * 0.75);
    requestRender();
  });
  const zoomIn = makeButton('＋', 'btn');
  zoomIn.title = '放大时间刻度';
  zoomIn.addEventListener('click', () => {
    tlZoom = Math.min(800, tlZoom * 1.33);
    requestRender();
  });
  const zoomFit = makeButton('适配', 'btn');
  zoomFit.title = '缩放到整个时长刚好显示';
  zoomFit.disabled = !seq;
  zoomFit.addEventListener('click', () => {
    const scrollEl = root?.querySelector('.tl-scroll');
    const avail = (scrollEl?.clientWidth || 800) - 170;
    if (seq && avail > 100) {
      tlZoom = Math.max(20, Math.min(800, avail / (Number(seq.duration) || 1)));
      requestRender();
    }
  });

  toolbar.append('时间线：', select, ' 时长 ', duration, ' 秒 ', play, stop, zoomOut, zoomIn, zoomFit, renameSequence, deleteSequence, addSequence);
  panel.appendChild(toolbar);

  if (!seq) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '暂无时间线，点击「＋ 新建」创建';
    panel.appendChild(empty);
    return panel;
  }

  const durationValue = Number(seq.duration) || 1;
  const NAME_W = 170;
  const pxW = Math.max(200, durationValue * tlZoom);
  const t2x = t => NAME_W + t * tlZoom;
  const x2t = (lane, clientX) => {
    const rect = lane.getBoundingClientRect();
    return Math.max(0, Math.min(durationValue, (clientX - rect.left) / tlZoom));
  };

  const scroll = document.createElement('div');
  scroll.className = 'tl-scroll';
  scroll.addEventListener('wheel', event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    tlZoom = Math.max(20, Math.min(800, tlZoom * (event.deltaY < 0 ? 1.25 : 0.8)));
    requestRender();
  });

  const inner = document.createElement('div');
  inner.className = 'tl-inner';
  inner.style.width = `${NAME_W + pxW}px`;

  // 标尺行（吸顶 + 点名吸左）
  const ruler = document.createElement('div');
  ruler.className = 'tl-ruler';

  const rulerLabel = document.createElement('div');
  rulerLabel.className = 'tl-name tl-name-sticky';
  rulerLabel.textContent = `${tlZoom >= 100 ? '' : '缩放着刻度 '}时间`;
  ruler.appendChild(rulerLabel);

  const rulerLane = document.createElement('div');
  rulerLane.className = 'tl-lane tl-ruler-lane';
  rulerLane.style.width = `${pxW}px`;
  rulerLane.title = '点击定位播放头 · Ctrl+滚轮缩放';
  rulerLane.addEventListener('click', event => {
    playhead = x2t(rulerLane, event.clientX);
    player.preview(seq.id, playhead);
    requestRender();
  });
  const markStep = tlZoom >= 240 ? 0.25 : tlZoom >= 100 ? 0.5 : tlZoom >= 40 ? 1 : 2;
  for (let t = 0; t <= durationValue + 1e-6; t += markStep) {
    const mark = document.createElement('span');
    const major = Math.abs(t / markStep - Math.round(t / markStep)) < 1e-6 && (t % 1 === 0 || markStep >= 1);
    mark.className = `tl-mark${t % 1 === 0 ? '' : ' minor'}`;
    mark.style.left = `${t * tlZoom}px`;
    if (t % 1 === 0 || markStep >= 1) mark.textContent = `${t.toFixed(t % 1 === 0 ? 0 : 1)}s`;
    rulerLane.appendChild(mark);
  }
  ruler.appendChild(rulerLane);
  inner.appendChild(ruler);

  if (!(seq.tracks || []).length) {
    const hint = document.createElement('div');
    hint.className = 'tl-empty-hint';
    hint.textContent = '还没有轨道——用下方「＋ 轨道」给对象加一条，轨道上双击空白处打关键帧';
    inner.appendChild(hint);
  }

  (seq.tracks || []).forEach((track, trackIndex) => {
    const row = document.createElement('div');
    row.className = 'tl-track';

    const name = document.createElement('div');
    name.className = 'tl-name tl-name-sticky';

    const dot = document.createElement('span');
    dot.className = `kdot k-${KIND_COLORS[track.kind] || 'event'}`;

    const label = document.createElement('span');
    label.className = 'tl-track-label';
    label.textContent = `${KIND_LABELS[track.kind] || track.kind} · ${objectName(track.target)}`;
    label.title = '点击选中该对象';
    name.addEventListener('click', () => {
      if (track.target) store.select(track.target);
    });

    const removeTrack = makeButton('×', 'tl-track-del');
    removeTrack.title = '删除轨道';
    removeTrack.addEventListener('click', () => {
      const nextTracks = (seq.tracks || []).filter((_, i) => i !== trackIndex);
      store.updateSequence(seq.id, { tracks: nextTracks });
      if (selectedKey?.trackIndex === trackIndex) selectedKey = null;
    });

    name.append(dot, label, removeTrack);

    const lane = document.createElement('div');
    lane.className = 'tl-lane';
    lane.style.width = `${pxW}px`;
    lane.title = '单击定位播放头 · 双击添加关键帧';

    lane.addEventListener('click', event => {
      if (event.target !== lane) return;
      playhead = x2t(lane, event.clientX);
      player.preview(seq.id, playhead);
      requestRender();
    });

    lane.addEventListener('dblclick', event => {
      if (event.target !== lane) return;
      const t = x2t(lane, event.clientX);
      const obj = store.getObject(track.target);
      let value;

      if (track.kind === 'transform') {
        value = {
          p: [...(obj?.transform?.p || [0, 0, 0])],
          r: [...(obj?.transform?.r || [0, 0, 0])],
          s: [...(obj?.transform?.s || [1, 1, 1])]
        };
      } else if (track.kind === 'opacity') {
        value = Number(obj?.material?.opacity ?? 1);
      } else {
        value = 0;
      }

      const keys = [...(track.keys || []), { t, v: value, ease: 'linear' }]
        .sort((a, b) => Number(a.t) - Number(b.t));

      const nextTracks = [...seq.tracks];
      nextTracks[trackIndex] = { ...track, keys };
      store.updateSequence(seq.id, { tracks: nextTracks });
      playhead = t;
      player.preview(seq.id, t);
    });

    (track.keys || []).forEach((key, keyIndex) => {
      const point = document.createElement('button');
      point.type = 'button';
      point.className = 'tl-key';
      point.title = `${Number(key.t || 0).toFixed(2)}s · 拖动调时间`;
      point.style.left = `${Number(key.t || 0) * tlZoom}px`;

      // 关键帧可左右拖动调时间
      point.addEventListener('pointerdown', event => {
        event.stopPropagation();
        event.preventDefault();
        const startX = event.clientX;
        const startT = Number(key.t) || 0;
        let moved = false;
        const onMove = e2 => {
          const dx = e2.clientX - startX;
          if (Math.abs(dx) > 3) moved = true;
          if (!moved) return;
          const nt = Math.max(0, Math.min(durationValue, startT + dx / tlZoom));
          point.style.left = `${nt * tlZoom}px`;
          point.title = `${nt.toFixed(2)}s`;
          playhead = nt;
          player.preview(seq.id, nt);
        };
        const onUp = e2 => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          if (moved) {
            const nt = Math.max(0, Math.min(durationValue, startT + (e2.clientX - startX) / tlZoom));
            const keys = [...(track.keys || [])];
            keys[keyIndex] = { ...keys[keyIndex], t: nt };
            keys.sort((a, b) => Number(a.t) - Number(b.t));
            store.updateSequence(seq.id, { tracks: replaceTrack(seq, trackIndex, { keys }) });
          } else {
            selectedKey = { seqId: seq.id, trackIndex, keyIndex };
            playhead = Number(key.t) || 0;
            player.preview(seq.id, playhead);
            requestRender();
          }
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
      lane.appendChild(point);

      if (
        selectedKey &&
        selectedKey.seqId === seq.id &&
        selectedKey.trackIndex === trackIndex &&
        selectedKey.keyIndex === keyIndex
      ) {
        lane.appendChild(renderKeyEditor(seq, track, trackIndex, key, keyIndex));
      }
    });

    row.append(name, lane);
    inner.appendChild(row);
  });

  const playheadBar = document.createElement('div');
  playheadBar.className = 'tl-playhead';
  playheadBar.style.left = `${t2x(playhead)}px`;
  inner.appendChild(playheadBar);

  scroll.appendChild(inner);
  panel.appendChild(scroll);

  const addTrackRow = document.createElement('div');
  addTrackRow.className = 'timeline-add-track';

  const kindSelect = document.createElement('select');
  kindSelect.className = 'field';
  TRACK_KINDS.forEach(kind => {
    const option = document.createElement('option');
    option.value = kind;
    option.textContent = KIND_LABELS[kind];
    kindSelect.appendChild(option);
  });

  const targetSelect = document.createElement('select');
  targetSelect.className = 'field';
  const selObj = currentObject();
  (store.scene.objects || []).forEach(obj => {
    const option = document.createElement('option');
    option.value = obj.id;
    option.textContent = obj.name || obj.id;
    if (selObj && obj.id === selObj.id) option.selected = true;
    targetSelect.appendChild(option);
  });

  const addTrack = makeButton('＋ 轨道', 'btn');
  addTrack.disabled = !(store.scene.objects || []).length;
  addTrack.addEventListener('click', () => {
    const tracksNext = [
      ...(seq.tracks || []),
      {
        target: targetSelect.value,
        kind: kindSelect.value,
        keys: []
      }
    ];
    store.updateSequence(seq.id, { tracks: tracksNext });
  });

  addTrackRow.append(kindSelect, targetSelect, addTrack);
  panel.appendChild(addTrackRow);

  return panel;
}

function renderKeyEditor(seq, track, trackIndex, key, keyIndex) {
  const editor = document.createElement('div');
  editor.className = 'key-popover';

  const title = document.createElement('strong');
  title.textContent = '关键帧';
  editor.appendChild(title);

  const time = document.createElement('input');
  time.className = 'field';
  time.type = 'number';
  time.step = '0.01';
  time.value = key.t ?? 0;
  time.title = '时间（秒）';
  time.addEventListener('change', () => {
    const keys = [...(track.keys || [])];
    keys[keyIndex] = { ...keys[keyIndex], t: Math.max(0, Number(time.value) || 0) };
    keys.sort((a, b) => Number(a.t) - Number(b.t));
    store.updateSequence(seq.id, { tracks: replaceTrack(seq, trackIndex, { keys }) });
  });
  editor.appendChild(time);

  const ease = document.createElement('select');
  ease.className = 'field key-ease';
  ease.title = '缓动';
  [['linear', '线性'], ['in', '缓入'], ['out', '缓出'], ['inout', '缓入出']].forEach(([id, text]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = text;
    option.selected = (key.ease || 'linear') === id;
    ease.appendChild(option);
  });
  ease.addEventListener('change', () => {
    const keys = [...(track.keys || [])];
    keys[keyIndex] = { ...keys[keyIndex], ease: ease.value };
    store.updateSequence(seq.id, { tracks: replaceTrack(seq, trackIndex, { keys }) });
  });
  editor.appendChild(ease);

  if (track.kind === 'transform') {
    // 分轴编辑：位移 XYZ / 旋转 XYZ° / 缩放 XYZ
    const propLabel = { p: '位移', r: '旋转°', s: '缩放' };
    ['p', 'r', 's'].forEach(prop => {
      const row = document.createElement('div');
      row.className = 'key-row';
      const tag = document.createElement('span');
      tag.className = 'key-tag';
      tag.textContent = propLabel[prop];
      row.appendChild(tag);
      const arr = key.v?.[prop] || (prop === 's' ? [1, 1, 1] : [0, 0, 0]);
      arr.forEach((v, i) => {
        const input = document.createElement('input');
        input.className = 'field key-axis';
        input.type = 'number';
        input.step = prop === 's' ? '0.05' : '0.1';
        input.value = Number(v).toFixed(2);
        input.title = `${propLabel[prop]} ${'XYZ'[i]}`;
        input.addEventListener('change', () => {
          const next = [...arr];
          next[i] = Number(input.value) || 0;
          const keys = [...(track.keys || [])];
          keys[keyIndex] = { ...keys[keyIndex], v: { ...(key.v || {}), [prop]: next } };
          store.updateSequence(seq.id, { tracks: replaceTrack(seq, trackIndex, { keys }) });
          player.preview(seq.id, Number(keys[keyIndex].t) || 0);
        });
        row.appendChild(input);
      });
      editor.appendChild(row);
    });
  } else if (track.kind === 'opacity') {
    const input = document.createElement('input');
    input.className = 'field';
    input.type = 'number';
    input.step = '0.01';
    input.min = '0';
    input.max = '1';
    input.value = typeof key.v === 'number' ? key.v : 1;
    input.addEventListener('change', () => {
      const keys = [...(track.keys || [])];
      keys[keyIndex] = { ...keys[keyIndex], v: Number(input.value) || 0 };
      store.updateSequence(seq.id, { tracks: replaceTrack(seq, trackIndex, { keys }) });
    });
    editor.appendChild(input);
  } else {
    const input = document.createElement('input');
    input.className = 'field';
    input.value = typeof key.v === 'string' ? key.v : JSON.stringify(key.v ?? '');
    input.addEventListener('change', () => {
      const keys = [...(track.keys || [])];
      keys[keyIndex] = { ...keys[keyIndex], v: parseValue(input.value, key.v) };
      store.updateSequence(seq.id, { tracks: replaceTrack(seq, trackIndex, { keys }) });
    });
    editor.appendChild(input);
  }

  const close = makeButton('×', 'btn');
  close.addEventListener('click', event => {
    event.stopPropagation();
    selectedKey = null;
    requestRender();
  });
  editor.appendChild(close);

  const del = makeButton('删除此键', 'btn danger');
  del.addEventListener('click', event => {
    event.stopPropagation();
    const keys = (track.keys || []).filter((_, i) => i !== keyIndex);
    store.updateSequence(seq.id, { tracks: replaceTrack(seq, trackIndex, { keys }) });
    selectedKey = null;
  });
  editor.appendChild(del);

  return editor;
}

function replaceTrack(seq, index, patch) {
  return (seq.tracks || []).map((track, trackIndex) =>
    trackIndex === index ? { ...track, ...patch } : track
  );
}

function renderLogs() {
  const panel = document.createElement('div');
  panel.className = 'dock-panel log-panel';

  const list = document.createElement('div');
  list.className = 'log-list';

  logItems.forEach(item => {
    const row = document.createElement('div');
    row.className = `log-item log-${item.level || 'info'}`;
    row.textContent = `[${item.time}] ${item.msg}`;
    list.appendChild(row);
  });

  if (!logItems.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '暂无输出日志';
    list.appendChild(empty);
  }

  panel.appendChild(list);
  return panel;
}

function renderStatusbar() {
  const bar = document.createElement('div');
  bar.className = 'dock-statusbar';

  const result = budget(store.scene);
  const bytes = (store.scene.meta?.assets || []).reduce(
    (total, asset) => total + Number(asset.bytes ?? asset.size ?? 0),
    0
  );
  const videos = result.videos || 0;
  const tris = result.tris || 0;

  const items = [
    `运行预算`,
    `资源体积 ${formatGB(bytes)}`,
    `同屏视频 ${videos}/3`,
    `面数 ${(tris / 10000).toFixed(1)} 万`,
    `预估 ${Math.round(result.estFps || 0)} FPS`
  ];

  items.forEach((text, index) => {
    const item = document.createElement('span');
    item.className = index === 0 && result.over ? 'over' : '';
    item.textContent = text;
    bar.appendChild(item);
  });

  if (result.over) {
    const warning = document.createElement('span');
    warning.className = 'over';
    warning.textContent = '预算超标';
    bar.appendChild(warning);
  }

  return bar;
}

function render() {
  if (!root) return;
  root.replaceChildren();

  const tabs = renderTabs();
  const content = document.createElement('div');
  content.className = 'dock-content';

  if (activeTab === 'assets') content.appendChild(renderAssets());
  if (activeTab === 'timeline') content.appendChild(renderTimeline());
  if (activeTab === 'log') content.appendChild(renderLogs());

  root.append(tabs, content, renderStatusbar());
}

export function mount(el) {
  root = el;
  root.classList.add('dock');

  // 顶边拖拽调高 + 上次高度记忆
  const savedH = localStorage.getItem('xiyou.dockH');
  if (savedH) root.style.height = savedH;

  const grip = document.createElement('div');
  grip.className = 'dock-resize';
  grip.title = '上下拖动调整面板高度';
  grip.innerHTML = '<span class="dock-grip-pill"></span>';
  grip.addEventListener('pointerdown', event => {
    event.preventDefault();
    dockMaximized = false;
    const startY = event.clientY;
    const startH = root.getBoundingClientRect().height;
    const onMove = e2 => {
      const h = Math.max(140, Math.min(window.innerHeight * 0.8, startH + (startY - e2.clientY)));
      root.style.height = `${Math.round(h)}px`;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      localStorage.setItem('xiyou.dockH', root.style.height);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
  root.prepend(grip);

  store.on('change', requestRender);
  store.on('selection', requestRender);
  store.on('assets', requestRender);
  store.on('budget', requestRender);

  store.on('log', payload => {
    const data = typeof payload === 'string' ? { msg: payload, level: 'info' } : payload || {};
    logItems.push({
      msg: data.msg || data.message || '',
      level: data.level || 'info',
      time: new Date().toLocaleTimeString()
    });
    if (logItems.length > 300) logItems = logItems.slice(-300);
    if (activeTab === 'log') requestRender();
  });

  // 播放中驱动播放头跟随（只动 DOM 不整页重渲）
  const tickPlayhead = () => {
    if (activeTab === 'timeline' && selectedSequenceId) {
      const state = player.progress?.(selectedSequenceId);
      if (state) {
        playhead = state.time;
        const bar = root?.querySelector('.tl-playhead');
        if (bar) {
          bar.style.left = `${170 + state.time * tlZoom}px`;
          // 播放头跑出可视区时自动跟滚
          const scrollEl = root?.querySelector('.tl-scroll');
          if (scrollEl && !state.finished) {
            const x = state.time * tlZoom;
            const viewL = scrollEl.scrollLeft;
            const viewR = viewL + scrollEl.clientWidth - 170;
            if (x > viewR - 80 || x < viewL) scrollEl.scrollLeft = Math.max(0, x - 120);
          }
        }
      }
    }
    requestAnimationFrame(tickPlayhead);
  };
  requestAnimationFrame(tickPlayhead);

  render();
}