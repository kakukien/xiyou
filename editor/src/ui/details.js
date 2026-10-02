import { store } from '../core/store.js';
import { collab } from '../core/collab.js';
import { CONDITIONS } from '../core/schema.js';
import { iconMarkup } from './components/icon.js';

const CONDITION_LABELS = {
  tap: '点击',
  gaze: '看向',
  hold: '按住',
  enter: '进入区域',
  seq_event: '时间线事件',
  node_done: '节点完成'
};

const ACTION_LABELS = {
  play_seq: '播放时间线',
  show: '显示',
  hide: '隐藏',
  highlight: '高亮',
  card: '弹卡片',
  reward: '奖励',
  goto_node: '跳转节点'
};

const MATERIAL_LABELS = {
  default: '默认材质',
  basic: '基础材质',
  transparent: '透明材质',
  additive: '叠加材质',
  unlit: '无光材质',
  video: '视频材质',
  point: '点云材质',
  light: '灯光材质'
};

const MATERIAL_OPTIONS = {
  quad: ['default', 'basic', 'transparent', 'additive', 'unlit'],
  video_quad: ['video', 'transparent', 'unlit'],
  glb: ['default', 'basic', 'transparent', 'unlit'],
  splat_segment: ['point', 'additive', 'unlit'],
  light: ['light', 'default'],
  default: ['default', 'basic', 'transparent']
};

const CONDITION_IDS = Array.isArray(CONDITIONS)
  ? CONDITIONS.map(item => item.id)
  : Object.keys(CONDITION_LABELS);

let root = null;
let activeTab = '基础';
let uniformScale = true;
let unsubscribe = [];
// 交互编辑器的 UI 态挂在这里，不混进 scene 数据
let editingAction = null; // {triggerId, index}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getSelectedObject() {
  const ids = typeof store.selected === 'function' ? store.selected() : [];
  if (!ids.length || typeof store.getObject !== 'function') return null;
  return store.getObject(ids[0]) || null;
}

function getSelectedObjects() {
  if (typeof store.selected !== 'function' || typeof store.getObject !== 'function') return []
  return store.selected().map(id => store.getObject(id)).filter(Boolean)
}

function allNodes() {
  const result = [];
  for (const chapter of store.scene?.story?.chapters || []) {
    for (const node of chapter.nodes || []) {
      result.push({ ...node, chapterId: chapter.id });
    }
  }
  return result;
}

function allSequences() {
  return store.scene?.sequences || [];
}

function allTriggersFor(id) {
  return (store.scene?.triggers || []).filter(trigger => trigger.target === id);
}

function getAsset(obj) {
  const assets = store.scene?.meta?.assets || [];
  if (!obj?.asset) return null;
  return assets.find(asset => asset.id === obj.asset || asset.url === obj.asset) || null;
}

function hasCompleteReference(obj) {
  const sequences = allSequences();
  const nodes = allNodes();
  const triggers = allTriggersFor(obj.id);

  for (const sequence of sequences) {
    for (const track of sequence.tracks || []) {
      if (track.target === obj.id && !obj.id) return false;
    }
  }

  for (const trigger of triggers) {
    for (const action of trigger.do || []) {
      if (action.action === 'play_seq' && action.args?.seqId) {
        if (!sequences.some(sequence => sequence.id === action.args.seqId)) return false;
      }
      if (action.action === 'goto_node' && action.args?.nodeId) {
        if (!nodes.some(node => node.id === action.args.nodeId)) return false;
      }
    }
  }

  return true;
}

function assetState(obj) {
  if (!obj?.asset) return false;
  const asset = getAsset(obj);
  return Boolean(asset || /^https?:\/\//.test(obj.asset) || /^blob:/.test(obj.asset) || obj.asset.startsWith('/'));
}

function inputNumber(value, path, index, options = {}) {
  const { step = '0.1', cls = '' } = options;
  return `<input class="field ${cls}" type="number" step="${step}" value="${esc(Number(value ?? 0))}" data-path="${esc(path)}" data-index="${index}">`;
}

function axisField(axis, inputMarkup) {
  return `<label class="axis-field axis-${axis.toLowerCase()}"><span class="axis-name">${axis}</span>${inputMarkup}</label>`;
}

function card(title, content, cls = '') {
  return `<section class="det-card ${cls}"><div class="det-card-title">${title}</div>${content}</section>`;
}

function chip(text, kind = '') {
  return `<span class="chip ${kind}">${esc(text)}</span>`;
}

function nodeOptions(selected) {
  return [
    `<option value="">无</option>`,
    ...allNodes().map(node => `<option value="${esc(node.id)}" ${node.id === selected ? 'selected' : ''}>${esc(node.title || node.id)}</option>`)
  ].join('');
}

function zoneOptions(selected) {
  return [
    '<option value="">不绑定区域</option>',
    ...(store.scene?.zones || []).map(zone => `<option value="${esc(zone.id)}" ${zone.id === selected ? 'selected' : ''}>${esc(zone.name || zone.id)}</option>`)
  ].join('')
}

function sequenceOptions(selected) {
  return [
    `<option value="">选择时间线</option>`,
    ...allSequences().map(sequence => `<option value="${esc(sequence.id)}" ${sequence.id === selected ? 'selected' : ''}>${esc(sequence.name || sequence.id)}</option>`)
  ].join('');
}

function renderHeader(obj) {
  const assetOk = assetState(obj);
  const refOk = hasCompleteReference(obj);
  const node = allNodes().find(item => item.id === obj.node_id);
  const comments = (obj.comments || []).filter(comment => comment && comment.resolved === false);
  const lockedBy = getLockedBy(obj.id);

  let html = `
    <div class="obj-head">
      <div class="t">${esc(obj.name || obj.id)}</div>
      <div class="chips">
        ${chip(assetOk ? '素材已加载' : '素材缺失', assetOk ? 'ok' : 'warn')}
        ${chip(refOk ? '引用完整' : '引用断链', refOk ? 'ok' : 'warn')}
        ${chip(node ? node.title || node.id : '未入节点', node ? 'ok' : 'warn')}
        ${comments.length ? chip(`${comments.length} 条待确认`, 'warn') : ''}
        ${lockedBy ? chip(`${lockedBy} 正在编辑`, 'warn') : ''}
      </div>
    </div>
    <div class="subtabs">
      ${['基础', '材质', '显隐', '高级'].map(tab => `<button class="tab ${activeTab === tab ? 'active' : ''}" data-tab="${tab}">${tab}</button>`).join('')}
    </div>
  `;

  return html;
}

function renderTransform(obj) {
  const transform = obj.transform || {};
  const p = transform.p || [0, 0, 0];
  const r = transform.r || [0, 0, 0];
  const s = transform.s || [1, 1, 1];

  return card('变换', `
    <div class="row axis-row"><span class="axis-label">位置</span>${['X', 'Y', 'Z'].map((axis, i) => axisField(axis, inputNumber(p[i], 'transform.p', i))).join('')}</div>
    <div class="row axis-row"><span class="axis-label">旋转</span>${['X', 'Y', 'Z'].map((axis, i) => axisField(axis, inputNumber(r[i], 'transform.r', i))).join('')}</div>
    <div class="row axis-row"><span class="axis-label">缩放</span>${['X', 'Y', 'Z'].map((axis, i) => axisField(axis, inputNumber(s[i], 'transform.s', i))).join('')}
      <button class="btn uniform-btn ${uniformScale ? 'active' : ''}" title="等比缩放" data-action="uniform">${iconMarkup(uniformScale ? 'link' : 'link-unlink', '等比缩放')}</button>
    </div>
  `);
}

function renderMaterial(obj) {
  const type = obj.type || 'quad';
  const material = obj.material || {};
  const options = MATERIAL_OPTIONS[type] || MATERIAL_OPTIONS.default;
  const pointSize = material.point_size ?? material.pointSize ?? 0.02;

  return card('材质与显隐', `
    <label class="row field-row"><span>材质</span><select class="field" data-material="type">${options.map(item => `<option value="${item}" ${material.type === item ? 'selected' : ''}>${MATERIAL_LABELS[item] || item}</option>`).join('')}</select></label>
    <div class="slider-row"><span>透明度</span><input type="range" min="0" max="1" step="0.01" value="${esc(material.opacity ?? 1)}" data-material="opacity"><output>${Number(material.opacity ?? 1).toFixed(2)}</output></div>
    ${type === 'splat_segment' ? `<div class="slider-row"><span>点大小</span><input type="range" min="0.005" max="0.1" step="0.001" value="${esc(pointSize)}" data-material="point_size"><output>${Number(pointSize).toFixed(3)}</output></div>` : ''}
    <label class="row toggle-row"><span>可见</span><button class="toggle ${obj.visible !== false ? 'on' : ''}" data-action="visible" aria-pressed="${obj.visible !== false}"><i></i></button></label>
  `);
}

function renderVisibility(obj) {
  return card('显隐', `
    <label class="row toggle-row"><span>编辑器中可见</span><button class="toggle ${obj.visible !== false ? 'on' : ''}" data-action="visible" aria-pressed="${obj.visible !== false}"><i></i></button></label>
    <div class="muted">对象在试玩模式中的显示状态由交互与时间线控制。</div>
  `);
}

function renderAdvanced(obj) {
  const hitbox = obj.hitbox || {};
  const size = hitbox.size || [1, 1, 1];
  const radius = hitbox.r ?? size[0] ?? 1;

  return `
    ${card('命中体', `
      <label class="row field-row"><span>命中类型</span><select class="field" data-hitbox="type">
        ${['auto', 'box', 'sphere', 'none'].map(type => `<option value="${type}" ${hitbox.type === type ? 'selected' : ''}>${type === 'auto' ? '自动' : type === 'box' ? '盒体' : type === 'sphere' ? '球体' : '无'}</option>`).join('')}
      </select></label>
      <label class="row field-row"><span>命中半径</span><input class="field" type="number" step="0.1" value="${esc(radius)}" data-hitbox="r"></label>
    `)}
    ${card('归属', `
      <label class="row field-row"><span>所属节点</span><select class="field" data-object="node_id">${nodeOptions(obj.node_id)}</select></label>
      <label class="row field-row"><span>空间区域</span><select class="field" data-object="zone_id">${zoneOptions(obj.zone_id)}</select></label>
    `)}
    ${card('杂项', `
      <label class="row field-row"><span>名称</span><input class="field" value="${esc(obj.name || '')}" data-object="name"></label>
      <div class="row readonly-row"><span>id</span><code>${esc(obj.id)}</code></div>
    `)}
  `;
}

function actionSummary(action) {
  const args = action.args || {};
  if (action.action === 'play_seq') {
    const seq = allSequences().find(item => item.id === args.seqId);
    return seq ? `播放：${seq.name || seq.id}` : '播放时间线';
  }
  if (action.action === 'card') return args.text ? `弹卡片：${args.text}` : '弹卡片';
  if (action.action === 'goto_node') {
    const node = allNodes().find(item => item.id === args.nodeId);
    return node ? `跳转：${node.title || node.id}` : '跳转节点';
  }
  return ACTION_LABELS[action.action] || action.action || '选择动作';
}

function renderActionEditor(trigger, index) {
  const action = trigger.do?.[index] || { action: 'highlight', args: {} };
  const args = action.args || {};
  let extra = '';

  if (action.action === 'play_seq') {
    extra = `<select class="field action-arg" data-trigger="${trigger.id}" data-action-index="${index}" data-arg="seqId">${sequenceOptions(args.seqId)}</select>`;
  } else if (action.action === 'card') {
    extra = `<input class="field action-arg" placeholder="卡片文字" value="${esc(args.text || '')}" data-trigger="${trigger.id}" data-action-index="${index}" data-arg="text">`;
  } else if (action.action === 'goto_node') {
    extra = `<select class="field action-arg" data-trigger="${trigger.id}" data-action-index="${index}" data-arg="nodeId">${nodeOptions(args.nodeId)}</select>`;
  }

  return `
    <div class="action-editor">
      <select class="field action-kind" data-trigger="${trigger.id}" data-action-index="${index}">
        ${Object.keys(ACTION_LABELS).map(key => `<option value="${key}" ${key === action.action ? 'selected' : ''}>${ACTION_LABELS[key]}</option>`).join('')}
      </select>
      ${extra}
    </div>
  `;
}

function renderInteraction(obj) {
  const targetId = obj.id
  const triggers = (store.scene?.triggers || []).filter(trigger => trigger.target === targetId);
  const rows = triggers.length ? triggers.map(trigger => {
    const actions = trigger.do || [];
    return `
      <div class="trigger-row" data-trigger-row="${trigger.id}">
        <div class="sentence">
          <span>当</span>
          <button class="chip cond-chip" data-trigger="${trigger.id}">${CONDITION_LABELS[trigger.when] || trigger.when || '点击'}</button>
          <span>时 →</span>
          <button class="action-chip" data-edit-action="${trigger.id}">${actions.length ? actions.map(actionSummary).join('、') : '添加动作'}</button>
          <button class="btn icon-btn add-action" data-trigger="${trigger.id}" title="添加动作" aria-label="添加动作">${iconMarkup('add-line')}</button>
          <button class="btn icon-btn remove-trigger" data-trigger="${trigger.id}" title="删除触发器" aria-label="删除触发器">${iconMarkup('delete-bin-6-line')}</button>
        </div>
        <div class="cond-chips">
          <span class="muted">触发条件</span>
          ${CONDITION_IDS.map(id => `<button class="chip ${trigger.when === id ? 'active' : ''}" data-set-when="${id}" data-trigger="${trigger.id}">${CONDITION_LABELS[id] || id}</button>`).join('')}
        </div>
        ${trigger.when === 'enter' ? `<label class="row field-row trigger-param"><span>进入半径</span><input class="field" type="number" min="0.1" step="0.1" value="${esc(trigger.params?.radius ?? 2)}" data-trigger-param="radius" data-trigger="${trigger.id}"></label>` : ''}
        ${trigger.when === 'gaze' || trigger.when === 'hold' ? `<label class="row field-row trigger-param"><span>持续秒数</span><input class="field" type="number" min="0.1" step="0.1" value="${esc(trigger.params?.secs ?? 1)}" data-trigger-param="secs" data-trigger="${trigger.id}"></label>` : ''}
        ${editingAction?.triggerId === trigger.id ? renderActionEditor(trigger, editingAction.index) : ''}
      </div>
    `;
  }).join('') : `<div class="muted">尚未添加交互</div>`;

  return card('交互', `
    <div class="interaction-list">${rows}</div>
    <button class="btn add-trigger" data-action="add-trigger">${iconMarkup('add-line')} 添加触发条件</button>
  `);
}

function renderHistory(obj) {
  let history = [];
  if (typeof store.history === 'function') {
    history = store.history(obj.id) || [];
  }
  history = history.slice().reverse().slice(0, 8);

  return card('对象历史', history.length ? history.map(item => {
    const date = item.time ? new Date(item.time) : new Date();
    const when = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return `<div class="hist-row"><span class="who">${esc(item.who || item.user || '本地')}</span><span class="what">${esc(item.what || item.action || '修改对象')}</span><span class="when">${when}</span></div>`;
  }).join('') : '<div class="muted">暂无修改记录</div>', 'history-card');
}

function getLockedBy(id) {
  const candidates = [
    collab,
    globalThis.collab,
    globalThis.collaboration
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate.lockedBy === 'function') {
      const value = candidate.lockedBy(id);
      if (value) return typeof value === 'string' ? value : value.name || value.id || '其他用户';
    }
  }
  return '';
}

function getSelectedNode() {
  const ids = typeof store.selected === 'function' ? store.selected() : [];
  if (!ids.length) return null;
  return allNodes().find(node => node.id === ids[0]) || null;
}

function getSelectedAnchor() {
  const ids = typeof store.selected === 'function' ? store.selected() : [];
  if (!ids.length || typeof store.getAnchor !== 'function') return null;
  return store.getAnchor(ids[0]) || null;
}

function getSelectedZone() {
  const ids = typeof store.selected === 'function' ? store.selected() : []
  if (!ids.length || typeof store.getZone !== 'function') return null
  return store.getZone(ids[0]) || null
}

function baseUploadButton(label, accept, field, description) {
  return `<div class="base-upload-row"><div class="base-upload-copy"><strong>${label}</strong><span>${description}</span></div><button class="btn btn-secondary btn-sm" type="button" data-base-upload="${field}">${iconMarkup('upload-2-line')} 上传文件</button><input hidden type="file" accept="${accept}" data-base-upload-input="${field}"></div>`
}

function anchorOptions(selected) {
  const anchors = store.scene?.anchors || [];
  return [
    `<option value="">不绑定锚点</option>`,
    ...anchors.map(anchor => `<option value="${esc(anchor.id)}" ${anchor.id === selected ? 'selected' : ''}>${esc(anchor.name || anchor.id)}</option>`)
  ].join('');
}

function nextNodeOptions(selected, selfId) {
  return [
    `<option value="">（剧情终点）</option>`,
    ...allNodes().filter(node => node.id !== selfId).map(node =>
      `<option value="${esc(node.id)}" ${node.id === selected ? 'selected' : ''}>${esc(node.title || node.id)}</option>`)
  ].join('');
}

function renderNodeEditor(node) {
  const isStart = allNodes().length ? (store.scene.story?.chapters || []).some(ch => ch.nodes?.[0]?.id === node.id) : false;
  return `
    <div class="obj-head">
      <div class="t">节点 · ${esc(node.title || node.id)}</div>
      <div class="chips">
        ${chip(isStart ? '入口节点' : '剧情节点', isStart ? 'ok' : '')}
        ${chip(node.anchor ? '已绑锚点' : '未绑锚点', node.anchor ? 'ok' : 'warn')}
      </div>
    </div>
    <div class="details-content">
      ${card('节点内容', `
        <label class="row field-row"><span>标题</span><input class="field" value="${esc(node.title || '')}" data-node-field="title"></label>
        <label class="row field-row"><span>文案</span><textarea class="field" rows="3" data-node-field="text">${esc(node.text || '')}</textarea></label>
      `)}
      ${card('空间与流转', `
        <label class="row field-row"><span>绑定锚点</span><select class="field" data-node-field="anchor">${anchorOptions(node.anchor)}</select></label>
        <label class="row field-row"><span>进入播放</span><select class="field" data-node-field="on_enter">${sequenceOptions(node.on_enter)}</select></label>
        <label class="row field-row"><span>下一节点</span><select class="field" data-node-field="next">${nextNodeOptions(node.next, node.id)}</select></label>
        ${isStart ? '' : `<button class="btn" type="button" data-node-action="make-start">设为章节入口</button>`}
      `)}
      <div class="row readonly-row"><span>id</span><code>${esc(node.id)}</code></div>
    </div>
  `;
}

// ---------- 底座上传/处理（模块级状态，不进场景数据） ----------
let __plyUp = null; // {name,size,count,sh,buf,blobUrl,canon,compressed,parseErr}
let __fileInput = null;
function ensureFileInput() {
  if (__fileInput) return __fileInput;
  __fileInput = document.createElement('input');
  __fileInput.type = 'file';
  __fileInput.accept = '.ply,.compressed.ply,.splat,.ksplat,.spz';
  __fileInput.style.display = 'none';
  document.body.appendChild(__fileInput);
  __fileInput.addEventListener('change', async () => {
    const f = __fileInput.files?.[0];
    __fileInput.value = '';
    if (!f) return;
    const buf = await f.arrayBuffer();
    let meta = null, parseErr = '';
    if (/\.ply$/i.test(f.name)) {
      try { meta = parsePly(buf); } catch (e) { parseErr = e.message; }
    }
    __plyUp = {
      name: f.name, size: f.size, buf, meta, parseErr,
      count: meta?.vertexCount || 0, sh: meta?.shDegree ?? 0,
      blobUrl: URL.createObjectURL(f),
      canon: 'assets/' + f.name.replace(/\.[^.]+$/, '') + '.ply',
    };
    store.setBase({ sog_url: __plyUp.blobUrl });
    render();
  });
  return __fileInput;
}

function rotAxis(ax, deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return ax === 'x' ? [1, 0, 0, 0, c, -s, 0, s, c]
    : ax === 'y' ? [c, 0, s, 0, 1, 0, -s, 0, c]
      : [c, -s, 0, s, c, 0, 0, 0, 1];
}
function mulR(A, B) {
  const o = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let v = 0; for (let k = 0; k < 3; k++) v += A[i * 3 + k] * B[k * 3 + j];
    o[i * 3 + j] = v;
  }
  return o;
}

// 未选中任何东西时：显示场景底座编辑器（3GS/PLY 路径 + 显隐 + 上传 + 矫正 + 压缩）
function renderBaseEditor() {
  const base = store.scene?.base || {};
  const t = base.transform || {};
  const hasSplat = Boolean(base.sog_url);
  const isBlob = (base.sog_url || '').startsWith('blob:');
  const up = __plyUp;
  const tt = Array.isArray(t.t) ? t.t : [0, 0, 0];
  const stChip = baseStatus.state === 'loading' ? chip('下载/解析中…', 'warn')
    : baseStatus.state === 'loaded' ? chip('已渲染', 'ok')
      : baseStatus.state === 'error' ? chip('加载失败', 'warn') : '';
  return `
    <div class="obj-head">
      <div class="t">场景底座</div>
      <div class="chips">
        ${chip(hasSplat ? '3GS 已配置' : '占位网格', hasSplat ? 'ok' : 'warn')}
        ${chip(base.visible !== false ? '显示中' : '已隐藏', base.visible !== false ? '' : 'warn')}
        ${isBlob ? chip('本地预览', 'warn') : ''}
        ${stChip}
      </div>
    </div>
    <div class="details-content">
      ${card('实景底座（3DGS / PLY）', `
        <label class="row toggle-row"><span>在场景中显示</span><button class="toggle ${base.visible !== false ? 'on' : ''}" data-base-action="toggle-vis"><i></i></button></label>
        <label class="row field-row"><span>底座路径</span><input class="field" value="${esc(isBlob ? '(本地预览)' : base.sog_url || '')}" placeholder="assets/hks204606.compressed.ply" data-base-field="sog_url"><button class="btn sm" type="button" data-base-action="apply-url">加载</button></label>
        ${baseStatus.state === 'loading' ? `<div class="row readonly-row"><span>状态</span><code>下载/解析中…（43MB 经 CDN 约 40 秒，请稍候）</code></div>` : ''}
        ${baseStatus.state === 'error' ? `<div class="row readonly-row"><span>状态</span><code>加载失败：${esc(baseStatus.msg || '')}</code></div>` : ''}
        <div class="row">
          <button class="btn" type="button" data-base-action="upload">上传 PLY…</button>
          <button class="btn" type="button" data-base-action="load-hks">载入 hks204606</button>
          ${hasSplat ? `<button class="btn danger" type="button" data-base-action="clear">卸载底座</button>` : ''}
        </div>
        ${up ? `<div class="row readonly-row"><span>本地文件</span><code>${esc(up.name)} · ${fmtSize(up.size)}${up.count ? ` · ${(up.count / 1000).toFixed(0)}k 高斯 · SH${up.sh}` : ''}${up.parseErr ? ' · 解析失败:' + esc(up.parseErr) : ''}</code></div>` : ''}
        ${isBlob ? `<div class="row readonly-row"><span>提示</span><code>本地预览中·发布前把文件放入 public/assets/ 并设为正式路径</code></div>` : ''}
      `)}
      ${hasSplat ? card('空间矫正（模型 → AR 坐标，VPS 定位共用此坐标系）', `
        <label class="row field-row"><span>缩放 s</span><input class="field" type="number" step="0.01" value="${esc(Number(t.s ?? 1))}" data-base-t="s"></label>
        <div class="row axis-row"><span class="axis-label">平移 t</span>${['X', 'Y', 'Z'].map((axis, i) => `<label>${axis}<input class="field" type="number" step="0.05" value="${esc(Number(tt[i] ?? 0))}" data-base-t="t${i}"></label>`).join('')}</div>
        <div class="row">
          ${['x', 'y', 'z'].map(ax => `<button class="btn sm" type="button" data-base-rot="${ax}">绕${ax.toUpperCase()} +90°</button>`).join('')}
          ${['x', 'y', 'z'].map(ax => `<button class="btn sm" type="button" data-base-rot="${ax}:-90">绕${ax.toUpperCase()} -90°</button>`).join('')}
        </div>
        <div class="row">
          <button class="btn" type="button" data-base-action="reset-rot">重置旋转</button>
          <button class="btn" type="button" data-base-action="reset-pos">重置平移</button>
        </div>
        <div class="row readonly-row"><span>当前</span><code>R 行列式≈1 · s=${esc(t.s ?? 1)}</code></div>
      `) : ''}
      ${up && !up.parseErr ? card('减体积（浏览器内处理，产物可下载）', `
        <label class="row field-row"><span>保留 SH 阶</span><select class="field" data-base-opt="sh">
          ${[0, 1, 2, 3].map(d => `<option value="${d}" ${d === Math.min(up.sh, 1) ? 'selected' : ''}>${d} 阶${d === 0 ? '（最小·无色差光晕）' : ''}</option>`).join('')}
        </select></label>
        <label class="row field-row"><span>高斯采样</span><select class="field" data-base-opt="keep">
          ${[[1, '100%'], [0.7, '70%'], [0.5, '50%'], [0.3, '30%']].map(([v, l]) => `<option value="${v}" ${v === 0.7 ? 'selected' : ''}>${l}</option>`).join('')}
        </select></label>
        <div class="row">
          <button class="btn" type="button" data-base-action="compress">压缩并预览</button>
          <button class="btn" type="button" data-base-action="apply-path">设为正式路径</button>
        </div>
        ${up.compressed ? `<div class="row readonly-row"><span>产物</span><code>${esc(up.canonName)} · ${fmtSize(up.compressed.bytes)} · ${(up.compressed.count / 1000).toFixed(0)}k 高斯（已自动下载并预览）</code></div>` : ''}
        <div class="row readonly-row"><span>正式路径</span><code>${esc(up.canon)}</code></div>
      `) : ''}
      <div class="details-empty">在左侧或视口中选择对象可编辑其属性</div>
    </div>
  `;
}

function renderAnchorEditor(anchor) {
  const t = anchor.pose?.t || [0, 0, 0];
  return `
    <div class="obj-head">
      <div class="t">锚点 · ${esc(anchor.name || anchor.id)}</div>
      <div class="chips">
        ${chip(anchor.kind === 'poster' ? '海报识别' : '空间定位', 'ok')}
      </div>
    </div>
    <div class="details-content">
      ${card('锚点', `
        <label class="row field-row"><span>名称</span><input class="field" value="${esc(anchor.name || '')}" data-anchor-field="name"></label>
        <label class="row field-row"><span>类型</span><select class="field" data-anchor-field="kind">
          <option value="vps" ${anchor.kind !== 'poster' ? 'selected' : ''}>空间定位（vps）</option>
          <option value="poster" ${anchor.kind === 'poster' ? 'selected' : ''}>海报识别（poster）</option>
        </select></label>
        ${anchor.kind === 'poster' ? `<label class="row field-row"><span>海报图</span><input class="field" placeholder="图片 URL" value="${esc(anchor.image_url || '')}" data-anchor-field="image_url"></label>` : ''}
        <div class="row axis-row"><span class="axis-label">位置</span>${['X', 'Y', 'Z'].map((axis, i) => axisField(axis, `<input class="field" type="number" step="0.1" value="${esc(Number(t[i] ?? 0))}" data-anchor-pos="${i}">`)).join('')}</div>
      `)}
      <div class="row readonly-row"><span>id</span><code>${esc(anchor.id)}</code></div>
    </div>
  `;
}

function renderMultiEditor(objects) {
  const zones = store.scene?.zones || []
  return `
    <div class="obj-head"><div class="t">已选择 ${objects.length} 个对象</div><div class="chips">${chip('批量编辑', 'ok')}</div></div>
    <div class="details-content">
      ${card('批量归属', `<label class="row field-row"><span>空间区域</span><select class="field" data-multi-zone><option value="">不绑定区域</option>${zones.map(zone => `<option value="${esc(zone.id)}">${esc(zone.name || zone.id)}</option>`).join('')}</select></label><div class="muted base-help">选择区域后，将为当前选中的 ${objects.length} 个对象统一设置空间归属。</div>`)}
      ${card('批量可见性', `<div class="row batch-actions"><button class="btn btn-secondary btn-sm" data-multi-visible="true">${iconMarkup('eye-line')} 显示</button><button class="btn btn-secondary btn-sm" data-multi-visible="false">${iconMarkup('eye-off-line')} 隐藏</button></div>`)}
    </div>
  `
}

function renderZoneEditor(zone) {
  const t = zone.transform?.p || [0, 1, 0]
  const scale = zone.transform?.s || [2, 2, 2]
  const label = zone.kind === 'forbidden' ? '禁布区域' : zone.kind === 'trigger' ? '触发区域' : '可编辑区域'
  return `
    <div class="obj-head"><div class="t">空间区域 · ${esc(zone.name || zone.id)}</div><div class="chips">${chip(label, zone.kind === 'forbidden' ? 'warn' : 'ok')}</div></div>
    <div class="details-content">
      ${card('区域设置', `
        <label class="row field-row"><span>名称</span><input class="field" value="${esc(zone.name || '')}" data-zone-field="name"></label>
        <label class="row field-row"><span>类型</span><select class="field" data-zone-field="kind"><option value="editable" ${zone.kind === 'editable' ? 'selected' : ''}>可编辑</option><option value="trigger" ${zone.kind === 'trigger' ? 'selected' : ''}>触发</option><option value="forbidden" ${zone.kind === 'forbidden' ? 'selected' : ''}>禁布</option></select></label>
        <label class="row field-row"><span>说明</span><textarea class="field" rows="2" data-zone-field="description">${esc(zone.description || '')}</textarea></label>
        <label class="row field-row"><span>颜色</span><input class="field" type="color" value="${esc(/^#[0-9a-f]{6}$/i.test(zone.color || '') ? zone.color : '#2563eb')}" data-zone-field="color"></label>
        <label class="row field-row"><span>显示</span><button class="toggle ${zone.visible !== false ? 'on' : ''}" data-zone-action="visible" aria-pressed="${zone.visible !== false}"><i></i></button></label>
        <label class="row field-row"><span>锁定</span><button class="toggle ${zone.locked ? 'on' : ''}" data-zone-action="locked" aria-pressed="${Boolean(zone.locked)}"><i></i></button></label>
        <button class="btn btn-secondary btn-sm" data-zone-action="select-objects">${iconMarkup('checkbox-multiple-line')} 选择区域对象</button>
      `)}
      ${card('区域范围', `
        <div class="row axis-row"><span class="axis-label">中心</span>${['X', 'Y', 'Z'].map((axis, i) => axisField(axis, `<input class="field" type="number" step="0.1" value="${esc(Number(t[i] ?? 0))}" data-zone-pos="${i}">`)).join('')}</div>
        <div class="row axis-row"><span class="axis-label">尺寸</span>${['X', 'Y', 'Z'].map((axis, i) => axisField(axis, `<input class="field" type="number" min="0.1" step="0.1" value="${esc(Number(scale[i] ?? 1))}" data-zone-scale="${i}">`)).join('')}</div>
      `)}
      <div class="row readonly-row"><span>id</span><code>${esc(zone.id)}</code></div>
      <div class="details-fixed">${renderInteraction(zone)}</div>
    </div>
  `
}

function renderBaseEditor() {
  const base = store.scene?.base || {}
  const transform = base.transform || {}
  const t = transform.t || [0, 0, 0]
  const env = base.env?.sky || {}
  return `
    <div class="obj-head">
      <div class="t">空间底座</div>
      <div class="chips">
        ${chip(base.sog_url ? (String(base.sog_url).startsWith('local://') ? '本地临时预览' : '高斯底座已绑定') : '使用占位底座', base.sog_url && !String(base.sog_url).startsWith('local://') ? 'ok' : 'warn')}
        ${chip(base.collider_url ? '碰撞体已绑定' : '未绑定碰撞体', base.collider_url ? 'ok' : 'warn')}
        ${chip(base.capture_id ? `Capture ${base.capture_id.slice(-6)}` : '未生成 Capture', base.capture_id ? 'ok' : 'warn')}
      </div>
    </div>
    <div class="details-content">
      ${card('底座资源', `
        ${baseUploadButton('高斯泼溅底座', '.ply,.sog,.spz,.splat,.ksplat', 'sog_url', '支持 PLY / SOG / SPZ / SPLAT / KSPLAT')}
        <label class="row field-row"><span>资源地址</span><input class="field" value="${esc(base.sog_url || '')}" placeholder="可选远程 PLY / SOG / SPZ URL" data-base-field="sog_url"></label>
        ${baseUploadButton('碰撞体', '.glb,.gltf', 'collider_url', '可选，用于地面落点与禁布检测')}
        <label class="row field-row"><span>碰撞地址</span><input class="field" value="${esc(base.collider_url || '')}" placeholder="可选 Collider GLB / GLTF URL" data-base-field="collider_url"></label>
        <label class="row field-row"><span>碰撞可视化</span><button class="toggle ${base.collider?.visible ? 'on' : ''}" data-base-action="collider-visible" aria-pressed="${Boolean(base.collider?.visible)}"><i></i></button></label>
        <div class="row axis-row"><span class="axis-label">碰撞尺寸</span>${['X', 'Y', 'Z'].map((axis, i) => axisField(axis, `<input class="field" type="number" min="0.1" step="0.1" value="${esc(Number(base.collider?.size?.[i] ?? [20, 2, 20][i]))}" data-base-collider-size="${i}">`)).join('')}</div>
        <div class="row axis-row"><span class="axis-label">碰撞中心</span>${['X', 'Y', 'Z'].map((axis, i) => axisField(axis, `<input class="field" type="number" step="0.1" value="${esc(Number(base.collider?.center?.[i] ?? [0, 1, 0][i]))}" data-base-collider-center="${i}">`)).join('')}</div>
        <div class="muted base-help">建议使用稳定资源地址；本地临时 URL 只用于预览，发布检查会阻止未上传的临时资产。</div>
      `)}
      ${card('Capture Package', `
        <div class="row readonly-row"><span>状态</span><code>${esc(base.capture_id ? (base.quality?.provider || '已创建') : '未创建')}</code></div>
        <div class="row readonly-row"><span>坐标系</span><code>${esc(`${base.coordinate_system?.up || 'Y'}-up · ${base.coordinate_system?.units || 'meters'}`)}</code></div>
        <div class="row readonly-row"><span>编辑修订</span><code>r${esc(base.editing?.revision || 0)}</code></div>
        <div class="row readonly-row"><span>质量报告</span><code>${esc(base.quality ? '已记录' : '待 Provider 返回')}</code></div>
      `)}
      ${card('空间对齐', `
        <label class="row field-row"><span>缩放</span><input class="field" type="number" min="0.001" step="0.001" value="${esc(transform.s ?? 1)}" data-base-transform="s"></label>
        <div class="row axis-row"><span class="axis-label">平移</span>${['X', 'Y', 'Z'].map((axis, i) => axisField(axis, `<input class="field" type="number" step="0.01" value="${esc(Number(t[i] ?? 0))}" data-base-position="${i}">`)).join('')}</div>
        <div class="row readonly-row"><span>来源</span><code>${esc(transform.scale_source || 'manual')}</code></div>
        <label class="row field-row"><span>LOD 自动</span><button class="toggle ${base.lod?.enabled ? 'on' : ''}" data-base-action="lod-enabled" aria-pressed="${Boolean(base.lod?.enabled)}"><i></i></button></label>
        <label class="row field-row"><span>当前 LOD</span><select class="field" data-base-lod="current"><option value="high" ${base.lod?.current === 'high' ? 'selected' : ''}>高质量</option><option value="medium" ${base.lod?.current === 'medium' ? 'selected' : ''}>均衡</option><option value="low" ${base.lod?.current === 'low' ? 'selected' : ''}>轻量</option></select></label>
        ${['high', 'medium', 'low'].map(level => `<label class="row field-row"><span>${level === 'high' ? '高质量' : level === 'medium' ? '均衡' : '轻量'} URL</span><input class="field" value="${esc(base.lod?.urls?.[level] || '')}" placeholder="可选底座变体 URL" data-base-lod-url="${level}"></label>`).join('')}
      `)}
      ${card('底座分块', `
        ${(base.chunks || []).map((chunk, index) => `<div class="chunk-row"><span class="chunk-index">${index + 1}</span><input class="field" value="${esc(chunk.name || '')}" placeholder="分块名称" data-chunk-field="name" data-chunk-index="${index}"><input class="field" value="${esc(chunk.url || '')}" placeholder="分块 URL" data-chunk-field="url" data-chunk-index="${index}"><button class="btn icon-btn" data-chunk-remove="${index}" title="删除分块" aria-label="删除分块">${iconMarkup('delete-bin-6-line')}</button></div>`).join('') || '<div class="muted base-help">暂无分块，当前使用单底座地址。</div>'}
        <button class="btn btn-secondary btn-sm" data-chunk-add>${iconMarkup('add-line')} 添加分块</button>
      `)}
      ${card('空间主题', `
        <label class="row field-row"><span>天空图</span><input class="field" value="${esc(env.image || '')}" placeholder="内置天空或图片 URL" data-base-sky="image"></label>
        <label class="row field-row"><span>天空顶部</span><input class="field" type="color" value="${esc(/^#[0-9a-f]{6}$/i.test(env.top || '') ? env.top : '#3d6db5')}" data-base-sky="top"></label>
        <label class="row field-row"><span>地平线</span><input class="field" type="color" value="${esc(/^#[0-9a-f]{6}$/i.test(env.horizon || '') ? env.horizon : '#dfe8f2')}" data-base-sky="horizon"></label>
      `)}
    </div>
  `
}

function contentFor(obj) {
  if (activeTab === '材质') return renderMaterial(obj);
  if (activeTab === '显隐') return renderVisibility(obj);
  if (activeTab === '高级') return renderAdvanced(obj);
  return renderTransform(obj);
}

function render() {
  if (!root) return;
  const objects = getSelectedObjects();
  if (objects.length > 1) {
    root.innerHTML = renderMultiEditor(objects)
    applyModeState()
    return
  }
  const obj = objects[0] || null;

  if (!obj) {
    const node = getSelectedNode();
    const anchor = getSelectedAnchor();
    const zone = getSelectedZone();
    root.innerHTML = node
      ? renderNodeEditor(node)
      : anchor
        ? renderAnchorEditor(anchor)
        : zone
          ? renderZoneEditor(zone)
          : renderBaseEditor();
    applyModeState();
    return;
  }

  root.innerHTML = `
    ${renderHeader(obj)}
    <div class="details-content">${contentFor(obj)}</div>
    <div class="details-fixed">${renderInteraction(obj)}${renderHistory(obj)}</div>
  `;

  applyModeState();
}

function applyModeState() {
  if (!root) return;
  const disabled = store.mode === 'play';
  root.querySelectorAll('input, select, textarea, .toggle, .uniform-btn, .add-trigger, .add-action, .remove-trigger, .cond-chip, .action-chip').forEach(node => {
    node.disabled = disabled;
  });
}

function updateObject(id, patch, transient = false) {
  if (typeof store.updateObject === 'function') {
    store.updateObject(id, patch, { transient });
  }
}

function updateTransform(obj, path, index, value, transient) {
  const current = obj.transform?.[path] ? [...obj.transform[path]] : [0, 0, 0];
  current[index] = Number(value);
  if (path === 's' && uniformScale) {
    current[0] = Number(value);
    current[1] = Number(value);
    current[2] = Number(value);
  }
  updateObject(obj.id, { transform: { [path]: current } }, transient);
}

function updateTrigger(triggerId, patch) {
  if (typeof store.updateTrigger === 'function') {
    store.updateTrigger(triggerId, patch);
  }
}

function bindEvents() {
  root.addEventListener('click', event => {
    const tab = event.target.closest('[data-tab]');
    if (tab) {
      activeTab = tab.dataset.tab;
      render();
      return;
    }

    const uniform = event.target.closest('[data-action="uniform"]');
    if (uniform) {
      uniformScale = !uniformScale;
      render();
      return;
    }

    const baseUpload = event.target.closest('[data-base-upload]');
    if (baseUpload) {
      root.querySelector(`[data-base-upload-input=\"${baseUpload.dataset.baseUpload}\"]`)?.click();
      return;
    }

    const baseAction = event.target.closest('[data-base-action]');
    if (baseAction) {
      const key = baseAction.dataset.baseAction;
      if (key === 'collider-visible') store.setBase?.({ collider: { ...(store.scene.base.collider || {}), visible: !store.scene.base.collider?.visible } });
      if (key === 'lod-enabled') store.setBase?.({ lod: { ...(store.scene.base.lod || {}), enabled: !store.scene.base.lod?.enabled } });
      return;
    }

    const chunkAdd = event.target.closest('[data-chunk-add]');
    if (chunkAdd) {
      const chunks = [...(store.scene.base.chunks || [])]
      chunks.push({ id: `chunk_${Date.now().toString(36)}`, name: `分块 ${chunks.length + 1}`, url: '', lod: {} })
      store.setBase?.({ chunks })
      return
    }
    const chunkRemove = event.target.closest('[data-chunk-remove]');
    if (chunkRemove) {
      const chunks = [...(store.scene.base.chunks || [])]
      chunks.splice(Number(chunkRemove.dataset.chunkRemove), 1)
      store.setBase?.({ chunks })
      return
    }

    const multiVisible = event.target.closest('[data-multi-visible]');
    if (multiVisible) {
      const visible = multiVisible.dataset.multiVisible === 'true'
      store.batch?.(() => getSelectedObjects().forEach(object => store.updateObject(object.id, { visible })))
      return
    }

    const zoneAction = event.target.closest('[data-zone-action]');
    if (zoneAction) {
      const zone = getSelectedZone();
      if (zone) {
        const key = zoneAction.dataset.zoneAction
        if (key === 'select-objects') {
          store.selectMany?.((store.scene.objects || []).filter(object => object.zone_id === zone.id).map(object => object.id))
          return
        }
        const value = key === 'visible' ? zone.visible === false : zone.locked !== true
        store.updateZone?.(zone.id, { [key]: value })
      }
      return;
    }

    const visible = event.target.closest('[data-action="visible"]');
    if (visible) {
      const obj = getSelectedObject();
      if (obj) updateObject(obj.id, { visible: obj.visible === false });
      return;
    }

    const addTrigger = event.target.closest('[data-action="add-trigger"]');
    if (addTrigger) {
      const obj = getSelectedObject();
      const zone = getSelectedZone();
      const target = obj || zone;
      if (target && typeof store.addTrigger === 'function') {
        store.addTrigger({
          target: target.id,
          when: zone ? 'enter' : 'tap',
          params: zone ? {} : {},
          do: [{ action: 'highlight', args: {} }]
        });
      }
      return;
    }

    const removeTrigger = event.target.closest('.remove-trigger');
    if (removeTrigger && typeof store.removeTrigger === 'function') {
      store.removeTrigger(removeTrigger.dataset.trigger);
      return;
    }

    const condition = event.target.closest('[data-set-when]');
    if (condition) {
      updateTrigger(condition.dataset.trigger, { when: condition.dataset.setWhen });
      return;
    }

    const conditionChip = event.target.closest('.cond-chip');
    if (conditionChip) {
      const trigger = (store.scene.triggers || []).find(item => item.id === conditionChip.dataset.trigger);
      if (trigger) {
        const index = Math.max(0, CONDITION_IDS.indexOf(trigger.when));
        updateTrigger(trigger.id, { when: CONDITION_IDS[(index + 1) % CONDITION_IDS.length] });
      }
      return;
    }

    const actionButton = event.target.closest('[data-edit-action]');
    if (actionButton) {
      editingAction = { triggerId: actionButton.dataset.editAction, index: 0 };
      render();
      return;
    }

    const addAction = event.target.closest('.add-action');
    if (addAction) {
      const trigger = (store.scene.triggers || []).find(item => item.id === addAction.dataset.trigger);
      if (trigger) {
        const actions = [...(trigger.do || []), { action: 'highlight', args: {} }];
        updateTrigger(trigger.id, { do: actions });
        editingAction = { triggerId: trigger.id, index: actions.length - 1 };
        render();
      }
    }

    const makeStart = event.target.closest('[data-node-action="make-start"]');
    if (makeStart) {
      const node = getSelectedNode();
      if (node) store.moveNode?.(node.chapterId, node.id, 0);
    }
  });

  root.addEventListener('input', event => {
    const obj = getSelectedObject();
    if (!obj) return;

    const field = event.target.closest('[data-path]');
    if (field) {
      updateTransform(obj, field.dataset.path.split('.').pop(), Number(field.dataset.index), field.value, true);
      return;
    }

    const material = event.target.closest('[data-material]');
    if (material) {
      const key = material.dataset.material;
      const value = key === 'opacity' || key === 'point_size' ? Number(material.value) : material.value;
      updateObject(obj.id, { material: { [key]: value } }, true);
      const output = material.parentElement?.querySelector('output');
      if (output) output.value = Number(value).toFixed(key === 'point_size' ? 3 : 2);
      return;
    }

    const objectField = event.target.closest('[data-object="name"]');
    if (objectField) updateObject(obj.id, { name: objectField.value }, true);
  });

  root.addEventListener('change', event => {
    const baseUploadInput = event.target.closest('[data-base-upload-input]');
    if (baseUploadInput) {
      const file = baseUploadInput.files?.[0];
      if (!file) return;
      const field = baseUploadInput.dataset.baseUploadInput;
      const url = `local://${file.name}`;
      window.__xiyouBlobMap ||= new Map();
      window.__xiyouBlobMap.set(url, URL.createObjectURL(file));
      store.addAsset?.({ name: file.name, kind: field === 'sog_url' ? 'splat' : 'collider', type: field === 'sog_url' ? 'splat' : 'collider', bytes: file.size, size: file.size, mime: file.type || '', url, metadata: { format: file.name.split('.').pop()?.toLowerCase() || '' } });
      store.setBase?.({ [field]: url });
      log(`已上传${field === 'sog_url' ? '高斯泼溅底座' : '碰撞体'}「${file.name}」`, 'info');
      baseUploadInput.value = '';
      return;
    }

    const chunkField = event.target.closest('[data-chunk-field]');
    if (chunkField) {
      const chunks = [...(store.scene.base.chunks || [])]
      const index = Number(chunkField.dataset.chunkIndex)
      chunks[index] = { ...(chunks[index] || {}), [chunkField.dataset.chunkField]: chunkField.value }
      store.setBase?.({ chunks })
      return
    }

    const multiZone = event.target.closest('[data-multi-zone]');
    if (multiZone) {
      store.batch?.(() => getSelectedObjects().forEach(object => store.updateObject(object.id, { zone_id: multiZone.value || '' })))
      return
    }

    const triggerParam = event.target.closest('[data-trigger-param]');
    if (triggerParam) {
      const trigger = (store.scene.triggers || []).find(item => item.id === triggerParam.dataset.trigger)
      if (trigger) store.updateTrigger?.(trigger.id, { params: { ...(trigger.params || {}), [triggerParam.dataset.triggerParam]: Math.max(0.1, Number(triggerParam.value) || 1) } })
      return
    }

    const zoneField = event.target.closest('[data-zone-field]');
    if (zoneField) {
      const zone = getSelectedZone();
      if (zone) store.updateZone?.(zone.id, { [zoneField.dataset.zoneField]: zoneField.value });
      return;
    }
    const zonePos = event.target.closest('[data-zone-pos]');
    if (zonePos) {
      const zone = getSelectedZone();
      if (zone) { const pos = [...(zone.transform?.p || [0, 1, 0])]; pos[Number(zonePos.dataset.zonePos)] = Number(zonePos.value) || 0; store.updateZone?.(zone.id, { transform: { p: pos } }); }
      return;
    }
    const zoneScale = event.target.closest('[data-zone-scale]');
    if (zoneScale) {
      const zone = getSelectedZone();
      if (zone) { const size = [...(zone.transform?.s || [2, 2, 2])]; size[Number(zoneScale.dataset.zoneScale)] = Math.max(0.1, Number(zoneScale.value) || 1); store.updateZone?.(zone.id, { transform: { s: size } }); }
      return;
    }

    const colliderSize = event.target.closest('[data-base-collider-size]');
    if (colliderSize) {
      const size = [...(store.scene.base.collider?.size || [20, 2, 20])];
      size[Number(colliderSize.dataset.baseColliderSize)] = Math.max(0.1, Number(colliderSize.value) || 1);
      store.setBase?.({ collider: { ...(store.scene.base.collider || {}), size } });
      return;
    }
    const colliderCenter = event.target.closest('[data-base-collider-center]');
    if (colliderCenter) {
      const center = [...(store.scene.base.collider?.center || [0, 1, 0])];
      center[Number(colliderCenter.dataset.baseColliderCenter)] = Number(colliderCenter.value) || 0;
      store.setBase?.({ collider: { ...(store.scene.base.collider || {}), center } });
      return;
    }

    const baseLodUrl = event.target.closest('[data-base-lod-url]');
    if (baseLodUrl) {
      const urls = { ...(store.scene.base.lod?.urls || {}) };
      urls[baseLodUrl.dataset.baseLodUrl] = baseLodUrl.value;
      store.setBase?.({ lod: { ...(store.scene.base.lod || {}), urls } });
      return;
    }

    const baseLod = event.target.closest('[data-base-lod]');
    if (baseLod) {
      store.setBase?.({ lod: { ...(store.scene.base.lod || {}), [baseLod.dataset.baseLod]: baseLod.value } });
      return;
    }

    const baseField = event.target.closest('[data-base-field]');
    if (baseField) {
      const key = baseField.dataset.baseField;
      store.setBase?.({ [key]: baseField.value || (key === 'collider_url' ? null : '') });
      return;
    }

    const baseTransform = event.target.closest('[data-base-transform]');
    if (baseTransform) {
      store.setBase?.({ transform: { [baseTransform.dataset.baseTransform]: Math.max(0.001, Number(baseTransform.value) || 1) } });
      return;
    }

    const basePosition = event.target.closest('[data-base-position]');
    if (basePosition) {
      const current = [...(store.scene?.base?.transform?.t || [0, 0, 0])];
      current[Number(basePosition.dataset.basePosition)] = Number(basePosition.value) || 0;
      store.setBase?.({ transform: { t: current } });
      return;
    }

    const baseSky = event.target.closest('[data-base-sky]');
    if (baseSky) {
      store.setBase?.({ env: { sky: { [baseSky.dataset.baseSky]: baseSky.value } } });
      return;
    }

    const storyNodeField = event.target.closest('[data-node-field]');
    if (storyNodeField) {
      const node = getSelectedNode();
      if (!node) return;
      const key = storyNodeField.dataset.nodeField;
      const value = key === 'next' || key === 'anchor' || key === 'on_enter' ? (storyNodeField.value || null) : storyNodeField.value;
      store.updateNode?.(node.chapterId, node.id, { [key]: value });
      return;
    }

    const anchorField = event.target.closest('[data-anchor-field]');
    if (anchorField) {
      const anchor = getSelectedAnchor();
      if (!anchor) return;
      store.updateAnchor?.(anchor.id, { [anchorField.dataset.anchorField]: anchorField.value });
      return;
    }

    const anchorPos = event.target.closest('[data-anchor-pos]');
    if (anchorPos) {
      const anchor = getSelectedAnchor();
      if (!anchor) return;
      const t = [...(anchor.pose?.t || [0, 0, 0])];
      t[Number(anchorPos.dataset.anchorPos)] = Number(anchorPos.value) || 0;
      store.updateAnchor?.(anchor.id, { pose: { ...(anchor.pose || {}), t } });
      return;
    }

    const baseField = event.target.closest('[data-base-field]');
    if (baseField && typeof store.setBase === 'function') {
      store.setBase({ [baseField.dataset.baseField]: baseField.value.trim() });
      return;
    }

    const baseT = event.target.closest('[data-base-t]');
    if (baseT && typeof store.setBase === 'function') {
      const key = baseT.dataset.baseT;
      const tr = JSON.parse(JSON.stringify(store.scene.base.transform || {}));
      if (key === 's') tr.s = Number(baseT.value) || 1;
      else if (/^t[0-2]$/.test(key)) {
        tr.t = Array.isArray(tr.t) ? [...tr.t] : [0, 0, 0];
        tr.t[Number(key[1])] = Number(baseT.value) || 0;
      }
      store.setBase({ transform: tr }, { transient: true });
      return;
    }

    const obj = getSelectedObject();
    if (!obj) return;

    const field = event.target.closest('[data-path]');
    if (field) {
      updateTransform(obj, field.dataset.path.split('.').pop(), Number(field.dataset.index), field.value, false);
      return;
    }

    const material = event.target.closest('[data-material]');
    if (material) {
      const key = material.dataset.material;
      updateObject(obj.id, { material: { [key]: key === 'opacity' || key === 'point_size' ? Number(material.value) : material.value } }, false);
      return;
    }

    const ownershipField = event.target.closest('[data-object="node_id"], [data-object="zone_id"]');
    if (ownershipField) {
      updateObject(obj.id, { [ownershipField.dataset.object]: ownershipField.value }, false);
      return;
    }

    const nameField = event.target.closest('[data-object="name"]');
    if (nameField) {
      updateObject(obj.id, { name: nameField.value }, false);
      return;
    }

    const hitboxField = event.target.closest('[data-hitbox]');
    if (hitboxField) {
      const key = hitboxField.dataset.hitbox;
      const value = key === 'r' ? Number(hitboxField.value) : hitboxField.value;
      const patch = key === 'r'
        ? { r: value, size: [value, value, value] }
        : { type: value };
      updateObject(obj.id, { hitbox: patch }, false);
      return;
    }

    const actionKind = event.target.closest('.action-kind');
    if (actionKind) {
      const trigger = (store.scene.triggers || []).find(item => item.id === actionKind.dataset.trigger);
      if (!trigger) return;
      const actions = [...(trigger.do || [])];
      const index = Number(actionKind.dataset.actionIndex);
      actions[index] = { action: actionKind.value, args: {} };
      updateTrigger(trigger.id, { do: actions });
      editingAction = { triggerId: trigger.id, index };
      render();
      return;
    }

    const actionArg = event.target.closest('.action-arg');
    if (actionArg) {
      const trigger = (store.scene.triggers || []).find(item => item.id === actionArg.dataset.trigger);
      if (!trigger) return;
      const actions = [...(trigger.do || [])];
      const index = Number(actionArg.dataset.actionIndex);
      actions[index] = {
        ...actions[index],
        args: { ...(actions[index].args || {}), [actionArg.dataset.arg]: actionArg.value }
      };
      updateTrigger(trigger.id, { do: actions });
    }
  });
}

export function mount(el) {
  root = el;
  activeTab = '基础';
  bindEvents();

  const refresh = () => render();
  const refreshChange = payload => {
    if (!payload?.transient || !root?.contains(document.activeElement)) render();
  };
  const onBaseStatus = () => render();
  window.addEventListener('xiyou:base-status', onBaseStatus);
  unsubscribe.push(() => window.removeEventListener('xiyou:base-status', onBaseStatus));

  if (typeof store.on === 'function') {
    ['selection', 'history', 'collab-peers', 'mode'].forEach(event => {
      store.on(event, refresh);
      unsubscribe.push(() => store.off?.(event, refresh));
    });
    store.on('change', refreshChange);
    unsubscribe.push(() => store.off?.('change', refreshChange));
  }

  render();

  return () => {
    unsubscribe.forEach(fn => fn());
    unsubscribe = [];
    root = null;
  };
}