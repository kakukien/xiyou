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

      const sequence = cardToSequence(card.id, obj.id);
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
        do: [{ action: 'play_seq', args: { seq: seq.id } }]
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
      activeTab = id;
      requestRender();
    });
    row.appendChild(tab);
  });

  row.appendChild(renderCardChips());
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

    if (asset.mime?.startsWith('image/') && asset.url && !asset.url.startsWith('local://')) {
      const image = document.createElement('img');
      image.src = asset.url;
      image.alt = asset.name || '';
      thumb.appendChild(image);
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

      store.addAsset({
        name: file.name,
        type,
        size: file.size,
        bytes: file.size,
        mime,
        url: `local://${file.name}`
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

  const seq = getSequence();
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

  toolbar.append('时间线：', select, ' 时长 ', duration, ' 秒 ', play, addSequence);
  panel.appendChild(toolbar);

  if (!seq) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = '暂无时间线，点击「＋ 新建」创建';
    panel.appendChild(empty);
    return panel;
  }

  const durationValue = Number(seq.duration) || 1;
  const ruler = document.createElement('div');
  ruler.className = 'tl-ruler';

  const rulerLabel = document.createElement('div');
  rulerLabel.className = 'tl-name';
  rulerLabel.textContent = '时间';
  ruler.appendChild(rulerLabel);

  const rulerLane = document.createElement('div');
  rulerLane.className = 'tl-lane tl-ruler-lane';
  for (let frame = 0; frame <= Math.ceil(durationValue * 30); frame += 10) {
    const mark = document.createElement('span');
    mark.className = 'tl-mark';
    mark.style.left = `${Math.min(100, frame / 30 / durationValue * 100)}%`;
    mark.textContent = `${(frame / 30).toFixed(1)}s`;
    rulerLane.appendChild(mark);
  }
  ruler.appendChild(rulerLane);
  panel.appendChild(ruler);

  const tracks = document.createElement('div');
  tracks.className = 'tl-tracks';

  (seq.tracks || []).forEach((track, trackIndex) => {
    const row = document.createElement('div');
    row.className = 'tl-track';

    const name = document.createElement('div');
    name.className = 'tl-name';

    const dot = document.createElement('span');
    dot.className = `kdot k-${KIND_COLORS[track.kind] || 'event'}`;

    const label = document.createElement('span');
    label.textContent = `${KIND_LABELS[track.kind] || track.kind} · ${objectName(track.target)}`;

    name.append(dot, label);

    const lane = document.createElement('div');
    lane.className = 'tl-lane';

    lane.addEventListener('click', event => {
      if (event.target !== lane) return;
      const rect = lane.getBoundingClientRect();
      playhead = Math.max(0, Math.min(durationValue, ((event.clientX - rect.left) / rect.width) * durationValue));
      requestRender();
    });

    lane.addEventListener('dblclick', event => {
      if (event.target !== lane) return;
      const rect = lane.getBoundingClientRect();
      const t = Math.max(0, Math.min(durationValue, ((event.clientX - rect.left) / rect.width) * durationValue));
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
    });

    (track.keys || []).forEach((key, keyIndex) => {
      const point = document.createElement('button');
      point.type = 'button';
      point.className = 'tl-key';
      point.title = `${Number(key.t || 0).toFixed(2)}s`;
      point.style.left = `${Math.max(0, Math.min(100, Number(key.t || 0) / durationValue * 100))}%`;
      point.addEventListener('click', event => {
        event.stopPropagation();
        selectedKey = { seqId: seq.id, trackIndex, keyIndex };
        playhead = Number(key.t) || 0;
        requestRender();
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
    tracks.appendChild(row);
  });

  panel.appendChild(tracks);

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
  (store.scene.objects || []).forEach(obj => {
    const option = document.createElement('option');
    option.value = obj.id;
    option.textContent = obj.name || obj.id;
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

  const playheadBar = document.createElement('div');
  playheadBar.className = 'tl-playhead';
  playheadBar.style.left = `${playhead / durationValue * 100}%`;
  panel.appendChild(playheadBar);

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
    store.updateSequence(seq.id, { tracks: replaceTrack(seq, trackIndex, { keys }) });
  });
  editor.appendChild(time);

  if (track.kind === 'transform') {
    ['p', 'r', 's'].forEach(prop => {
      const input = document.createElement('input');
      input.className = 'field';
      input.placeholder = prop;
      input.value = JSON.stringify(key.v?.[prop] || (prop === 's' ? [1, 1, 1] : [0, 0, 0]));
      input.addEventListener('change', () => {
        const value = parseValue(input.value, key.v?.[prop] || [0, 0, 0]);
        const nextValue = { ...(key.v || {}), [prop]: value };
        const keys = [...(track.keys || [])];
        keys[keyIndex] = { ...keys[keyIndex], v: nextValue };
        store.updateSequence(seq.id, { tracks: replaceTrack(seq, trackIndex, { keys }) });
      });
      editor.appendChild(input);
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

  render();
}