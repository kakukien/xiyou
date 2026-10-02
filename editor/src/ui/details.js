import { store } from '../core/store.js';
import { collab } from '../core/collab.js';
import { CONDITIONS } from '../core/schema.js';

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
    <div class="row axis-row"><span class="axis-label">位置</span>${['X', 'Y', 'Z'].map((axis, i) => `<label>${axis}${inputNumber(p[i], 'transform.p', i)}</label>`).join('')}</div>
    <div class="row axis-row"><span class="axis-label">旋转</span>${['X', 'Y', 'Z'].map((axis, i) => `<label>${axis}${inputNumber(r[i], 'transform.r', i)}</label>`).join('')}</div>
    <div class="row axis-row"><span class="axis-label">缩放</span>${['X', 'Y', 'Z'].map((axis, i) => `<label>${axis}${inputNumber(s[i], 'transform.s', i)}</label>`).join('')}
      <button class="btn uniform-btn ${uniformScale ? 'active' : ''}" title="等比缩放" data-action="uniform">${uniformScale ? '⛓' : '⛓̸'}</button>
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
    ${card('归属', `<label class="row field-row"><span>所属节点</span><select class="field" data-object="node_id">${nodeOptions(obj.node_id)}</select></label>`)}
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
  const triggers = allTriggersFor(obj.id);
  const rows = triggers.length ? triggers.map(trigger => {
    const actions = trigger.do || [];
    return `
      <div class="trigger-row" data-trigger-row="${trigger.id}">
        <div class="sentence">
          <span>当</span>
          <button class="chip cond-chip" data-trigger="${trigger.id}">${CONDITION_LABELS[trigger.when] || trigger.when || '点击'}</button>
          <span>时 →</span>
          <button class="action-chip" data-edit-action="${trigger.id}">${actions.length ? actions.map(actionSummary).join('、') : '添加动作'}</button>
          <button class="btn icon-btn add-action" data-trigger="${trigger.id}" title="添加动作">＋</button>
          <button class="btn icon-btn remove-trigger" data-trigger="${trigger.id}" title="删除触发器">×</button>
        </div>
        <div class="cond-chips">
          <span class="muted">触发条件</span>
          ${CONDITION_IDS.map(id => `<button class="chip ${trigger.when === id ? 'active' : ''}" data-set-when="${id}" data-trigger="${trigger.id}">${CONDITION_LABELS[id] || id}</button>`).join('')}
        </div>
        ${editingAction?.triggerId === trigger.id ? renderActionEditor(trigger, editingAction.index) : ''}
      </div>
    `;
  }).join('') : `<div class="muted">尚未添加交互</div>`;

  return card('交互', `
    <div class="interaction-list">${rows}</div>
    <button class="btn add-trigger" data-action="add-trigger">＋ 添加触发条件</button>
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

// 未选中任何东西时：显示场景底座编辑器（3GS/PLY 路径 + 对齐参数）
function renderBaseEditor() {
  const base = store.scene?.base || {};
  const t = base.transform || {};
  const hasSplat = Boolean(base.sog_url);
  return `
    <div class="obj-head">
      <div class="t">场景底座</div>
      <div class="chips">
        ${chip(hasSplat ? '3GS 已加载' : '占位网格', hasSplat ? 'ok' : 'warn')}
      </div>
    </div>
    <div class="details-content">
      ${card('实景底座（3DGS / PLY）', `
        <label class="row field-row"><span>底座路径</span><input class="field" value="${esc(base.sog_url || '')}" placeholder="assets/hks204606.compressed.ply" data-base-field="sog_url"></label>
        <button class="btn" type="button" data-base-action="load-hks">载入本次重建（hks204606）</button>
        ${hasSplat ? `<button class="btn danger" type="button" data-base-action="clear">卸载底座</button>` : ''}
        <div class="row readonly-row"><span>对齐</span><code>s=${esc(t.s ?? 1)} t=${esc(JSON.stringify(t.t || [0,0,0]))}</code></div>
      `)}
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
        <div class="row axis-row"><span class="axis-label">位置</span>${['X', 'Y', 'Z'].map((axis, i) => `<label>${axis}<input class="field" type="number" step="0.1" value="${esc(Number(t[i] ?? 0))}" data-anchor-pos="${i}"></label>`).join('')}</div>
      `)}
      <div class="row readonly-row"><span>id</span><code>${esc(anchor.id)}</code></div>
    </div>
  `;
}

function contentFor(obj) {
  if (activeTab === '材质') return renderMaterial(obj);
  if (activeTab === '显隐') return renderVisibility(obj);
  if (activeTab === '高级') return renderAdvanced(obj);
  return renderTransform(obj);
}

function render() {
  if (!root) return;
  const obj = getSelectedObject();

  if (!obj) {
    const node = getSelectedNode();
    const anchor = getSelectedAnchor();
    root.innerHTML = node
      ? renderNodeEditor(node)
      : anchor
        ? renderAnchorEditor(anchor)
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

    const baseAction = event.target.closest('[data-base-action]');
    if (baseAction && typeof store.setBase === 'function') {
      if (baseAction.dataset.baseAction === 'load-hks') {
        store.setBase({
          sog_url: 'assets/hks204606.compressed.ply',
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
        });
      } else if (baseAction.dataset.baseAction === 'clear') {
        store.setBase({ sog_url: '' });
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
      if (obj && typeof store.addTrigger === 'function') {
        store.addTrigger({
          target: obj.id,
          when: 'tap',
          params: {},
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

    const nodeField = event.target.closest('[data-object="node_id"]');
    if (nodeField) {
      updateObject(obj.id, { node_id: nodeField.value }, false);
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