import { store } from '../core/store.js';
import { collab } from '../core/collab.js';
import { sceneSummary, SYSTEM_PROMPT, applyOps } from '../core/aiops.js';
import { log } from './log.js';
import { elementVoiceSummary, listElements } from '../core/elements.js';
import { getAiConfig, saveAiConfig, resetAiConfig, requestAi } from '../core/ai-provider.js';

let mounted = false;

const STYLE_ID = 'xiyou-ai-chat-style';

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ai-chat-root {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 90;
      font-family: inherit;
      color: var(--text1, #252525);
    }

    .ai-chat-fab {
      width: 56px;
      height: 56px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      color: #fff;
      background: linear-gradient(135deg, #ff8c3b, #f56d00);
      box-shadow: 0 8px 24px rgba(245, 109, 0, .34);
      cursor: pointer;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: .5px;
      transition: transform .18s ease, box-shadow .18s ease;
    }

    .ai-chat-fab:hover {
      transform: scale(1.08);
      box-shadow: 0 10px 28px rgba(245, 109, 0, .45);
    }

    .ai-chat-panel {
      position: fixed;
      right: 16px;
      bottom: 76px;
      width: 360px;
      height: 480px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--bg1, #f8f8f6);
      border: 1px solid var(--line2, #d8d8d2);
      border-radius: 10px;
      box-shadow: 0 18px 48px rgba(0, 0, 0, .28);
    }

    .ai-chat-panel[hidden] {
      display: none;
    }

    .ai-chat-header {
      height: 46px;
      min-height: 46px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      border-bottom: 1px solid var(--line2, #d8d8d2);
      background: var(--bg2, #eeeeeb);
    }

    .ai-chat-title {
      flex: 1;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
    }

    .ai-chat-settings {
      display: grid;
      gap: 7px;
      padding: 9px;
      border-bottom: 1px solid var(--line2, #d8d8d2);
      background: #f7f6f2;
      font-size: 11px;
    }

    .ai-chat-settings[hidden] { display: none; }
    .ai-chat-settings label { display: grid; gap: 3px; color: var(--text2, #777); }
    .ai-chat-settings input, .ai-chat-settings select { width: 100%; min-height: 27px; }
    .ai-chat-settings-actions { display: flex; justify-content: flex-end; gap: 5px; }
    .ai-chat-settings-actions button { min-height: 25px; padding: 0 8px; border: 1px solid var(--line2, #d8d8d2); border-radius: 4px; background: #fff; color: var(--text2, #666); cursor: pointer; font: inherit; }
    .ai-chat-settings-actions .save { background: #f47721; border-color: #f47721; color: #fff; font-weight: 700; }

    .ai-chat-status {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #45b36b;
      box-shadow: 0 0 0 3px rgba(69, 179, 107, .14);
    }

    .ai-chat-status.is-disabled {
      background: #a4a4a0;
      box-shadow: none;
    }

    .ai-chat-collapse {
      width: 25px;
      height: 25px;
      padding: 0;
      border: 0;
      border-radius: 5px;
      background: transparent;
      color: var(--text2, #777);
      cursor: pointer;
      font-size: 18px;
      line-height: 25px;
    }

    .ai-chat-collapse:hover {
      background: var(--line1, #deded8);
      color: var(--text1, #252525);
    }

    .ai-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 13px 11px;
      scroll-behavior: smooth;
    }

    .ai-chat-message-row {
      display: flex;
      margin: 0 0 10px;
    }

    .ai-chat-message-row.user {
      justify-content: flex-end;
    }

    .ai-chat-message-row.ai {
      justify-content: flex-start;
    }

    .ai-chat-bubble {
      max-width: 82%;
      padding: 8px 10px;
      border-radius: 9px;
      font-size: 12px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .ai-chat-message-row.user .ai-chat-bubble {
      color: #fff;
      background: linear-gradient(135deg, #ff8c3b, #f56d00);
      border-bottom-right-radius: 3px;
    }

    .ai-chat-message-row.ai .ai-chat-bubble {
      color: var(--text1, #252525);
      background: #fff;
      border: 1px solid var(--line2, #deded8);
      border-bottom-left-radius: 3px;
    }

    .ai-chat-system {
      margin: 8px 20px 11px;
      color: var(--text3, #999);
      font-size: 11px;
      line-height: 1.45;
      text-align: center;
    }

    .ai-chat-feedback {
      max-width: 82%;
      margin: -5px 0 10px 2px;
      color: var(--text3, #8b8b86);
      font-size: 10px;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    .ai-chat-feedback.error {
      color: #d34a3d;
    }

    .ai-chat-plan {
      margin: 0 0 10px 2px;
      padding: 9px 10px;
      border: 1px solid var(--line2, #d8d8d2);
      border-radius: 6px;
      background: var(--bg2, #eeeeeb);
      font-size: 11px;
      line-height: 1.5;
    }

    .ai-chat-plan-title {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 5px;
      color: var(--text1, #252525);
      font-weight: 700;
    }

    .ai-chat-plan-list {
      margin: 0 0 8px 16px;
      color: var(--text2, #777);
    }

    .ai-chat-plan-actions {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }

    .ai-chat-plan-actions button {
      min-height: 26px;
      padding: 0 9px;
      border: 1px solid var(--line2, #d8d8d2);
      border-radius: 5px;
      background: #fff;
      color: var(--text2, #666);
      cursor: pointer;
      font: inherit;
    }

    .ai-chat-plan-actions .apply {
      border-color: #e96c16;
      background: #f47721;
      color: #fff;
      font-weight: 700;
    }

    .ai-chat-undo {
      margin-left: 5px;
      padding: 1px 5px;
      border: 1px solid var(--line2, #d8d8d2);
      border-radius: 4px;
      background: #fff;
      color: var(--text2, #777);
      cursor: pointer;
      font: inherit;
    }

    .ai-chat-instance-chooser {
      margin: 0 0 10px 2px;
      padding: 9px 10px;
      border: 1px solid #f1c29e;
      border-radius: 6px;
      background: #fff8f2;
      color: var(--text1, #252525);
      font-size: 11px;
    }
    .ai-chat-instance-chooser strong { display:block; margin-bottom:7px; }
    .ai-chat-instance-list { display:flex; flex-wrap:wrap; gap:5px; }
    .ai-chat-instance-choice { min-height:27px; padding:0 8px; border:1px solid #efb889; border-radius:5px; background:#fff; color:#b65316; cursor:pointer; font:inherit; }
    .ai-chat-instance-choice:hover { background:#fff0e3; border-color:#f47721; }

    .ai-chat-typing {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      height: 15px;
    }

    .ai-chat-typing span {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--text3, #999);
      animation: ai-chat-dot 1s infinite ease-in-out;
    }

    .ai-chat-typing span:nth-child(2) {
      animation-delay: .14s;
    }

    .ai-chat-typing span:nth-child(3) {
      animation-delay: .28s;
    }

    @keyframes ai-chat-dot {
      0%, 60%, 100% {
        opacity: .3;
        transform: translateY(0);
      }
      30% {
        opacity: 1;
        transform: translateY(-3px);
      }
    }

    .ai-chat-input-area {
      display: flex;
      align-items: flex-end;
      gap: 7px;
      padding: 9px;
      border-top: 1px solid var(--line2, #d8d8d2);
      background: var(--bg2, #eeeeeb);
    }

    .ai-chat-input {
      flex: 1;
      min-width: 0;
      min-height: 31px;
      max-height: 72px;
      resize: none;
      overflow-y: auto;
      padding: 7px 8px;
      border: 1px solid var(--line2, #d8d8d2);
      border-radius: 6px;
      outline: none;
      background: #fff;
      color: var(--text1, #252525);
      font: inherit;
      font-size: 12px;
      line-height: 1.45;
      box-sizing: border-box;
    }

    .ai-chat-input:focus {
      border-color: #f5822c;
      box-shadow: 0 0 0 2px rgba(245, 130, 44, .12);
    }

    .ai-chat-input:disabled {
      cursor: not-allowed;
      background: var(--bg3, #e5e5e0);
    }

    .ai-chat-mic {
      width: 31px;
      height: 31px;
      min-width: 31px;
      padding: 0;
      border: 1px solid var(--line2, #d8d8d2);
      border-radius: 6px;
      background: #fff;
      color: var(--text2, #777);
      cursor: pointer;
      font-size: 14px;
      line-height: 29px;
      transition: all .15s ease;
    }

    .ai-chat-mic:hover:not(:disabled) {
      border-color: #f5822c;
      color: #f5822c;
    }

    .ai-chat-mic.is-rec {
      color: #fff;
      background: #f56d00;
      border-color: #f56d00;
      animation: ai-chat-rec 1s infinite ease-in-out;
    }

    .ai-chat-mic:disabled {
      opacity: .4;
      cursor: not-allowed;
    }

    @keyframes ai-chat-rec {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245, 109, 0, .35); }
      50% { box-shadow: 0 0 0 6px rgba(245, 109, 0, 0); }
    }

    .ai-chat-send {
      height: 31px;
      padding: 0 12px;
      border: 0;
      border-radius: 6px;
      color: #fff;
      background: #f47721;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
    }

    .ai-chat-send:hover:not(:disabled) {
      background: #e7650d;
    }

    .ai-chat-send:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    @media (max-width: 480px) {
      .ai-chat-panel {
        right: 10px;
        bottom: 76px;
        width: calc(100vw - 20px);
      }

      .ai-chat-root {
        right: 10px;
        bottom: 10px;
      }
    }
  `;
  document.head.appendChild(style);
}

function makeElement(tag, className, text = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function scrollBottom(messages) {
  messages.scrollTop = messages.scrollHeight;
}

function appendMessage(messages, role, content) {
  const row = makeElement('div', `ai-chat-message-row ${role}`);
  const bubble = makeElement('div', 'ai-chat-bubble');
  bubble.textContent = content;
  row.appendChild(bubble);
  messages.appendChild(row);
  scrollBottom(messages);
  return row;
}

function appendSystem(messages, content) {
  const item = makeElement('div', 'ai-chat-system', content);
  messages.appendChild(item);
  scrollBottom(messages);
  return item;
}

function appendTyping(messages) {
  const row = makeElement('div', 'ai-chat-message-row ai');
  const bubble = makeElement('div', 'ai-chat-bubble');
  const typing = makeElement('div', 'ai-chat-typing');
  typing.appendChild(document.createElement('span'));
  typing.appendChild(document.createElement('span'));
  typing.appendChild(document.createElement('span'));
  bubble.appendChild(typing);
  row.appendChild(bubble);
  messages.appendChild(row);
  scrollBottom(messages);
  return row;
}

function parseResponse(content) {
  if (content && typeof content === 'object') {
    const ops = Array.isArray(content.ops) ? content.ops : [];
    const reply = content.reply ?? content.message ?? content.content ?? '';
    if (ops.length || reply) return { reply: typeof reply === 'string' ? reply : JSON.stringify(reply), ops, parsed: true };
  }
  const text = typeof content === 'string' ? content : String(content ?? '');
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');

  if (first < 0 || last <= first) {
    return { reply: text || '我暂时没有生成可执行的修改。', ops: [], parsed: false };
  }

  try {
    const parsed = JSON.parse(text.slice(first, last + 1));
    const ops = Array.isArray(parsed.ops) ? parsed.ops : [];
    const reply = parsed.reply ?? parsed.message ?? parsed.content ?? '';
    return {
      reply: typeof reply === 'string' ? reply : JSON.stringify(reply),
      ops,
      parsed: true
    };
  } catch {
    return { reply: text, ops: [], parsed: false };
  }
}

function resultSuccess(result) {
  if (result == null) return true;
  if (typeof result === 'boolean') return result;
  if (typeof result === 'object') {
    if (result.ok !== undefined) return result.ok !== false;
    if (result.success !== undefined) return result.success !== false;
    if (result.error || result.failed) return false;
    if (result.status === 'error' || result.status === 'failed') return false;
  }
  return true;
}

function resultMessage(result, index) {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    return result.message || result.msg || result.error || `第 ${index + 1} 项修改失败`;
  }
  return `第 ${index + 1} 项修改已完成`;
}

function normalizeResults(raw, ops) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.results)) return raw.results;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return ops.map(() => ({ ok: true }));
}

function buildFeedback(results, total) {
  const passed = results.filter(resultSuccess).length;
  const failed = results
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => !resultSuccess(result));

  let text = `已执行 ${passed}/${total} 项修改`;
  if (failed.length) {
    text += `\n${failed.map(({ result, index }) => resultMessage(result, index)).join('\n')}`;
  }
  return { text, failed: failed.length > 0 };
}

function normalizeVoiceText(value) {
  return String(value || '').toLowerCase().replace(/[\s，。、“”‘’'"：:；;！!？?、/\\_-]+/g, '');
}

function voiceCandidates(text) {
  const normalized = normalizeVoiceText(text);
  if (!normalized) return [];
  return listElements().filter(item => [item.name, ...(item.voice?.aliases || [])].some(alias => {
    const value = normalizeVoiceText(alias);
    return value.length >= 2 && normalized.includes(value);
  })).slice(0, 8);
}

function makeRequestMessages(userText = '') {
  const summary = sceneSummary(store.scene);
  const selected = store.selected().map(id => {
    const object = store.getObject?.(id);
    const zone = store.getZone?.(id);
    const anchor = store.getAnchor?.(id);
    if (object) return `选中对象|${object.id}|${object.element_id || '-'}|${object.voice_token || '-'}|${object.name || ''}|${object.type || ''}|p(${(object.transform?.p || []).join(',')})`;
    if (zone) return `选中区域|${zone.id}|${zone.name || ''}|${zone.kind || ''}`;
    if (anchor) return `选中锚点|${anchor.id}|${anchor.name || ''}|${anchor.kind || ''}|p(${(anchor.pose?.t || []).join(',')})`;
    return `选中实体|${id}`;
  }).join('\n') || '选中实体|无';
  const fixedElements = elementVoiceSummary({ limit: 124 });
  const placement = window.__xiyou?.viewport?.lastPlacementPoint;
  const placementContext = placement
    ? `最近视口落点|p(${placement.join(',')})|来源:viewport-click`
    : '最近视口落点|无';
  const assets = (store.scene.meta?.assets || []).slice(0, 80).map(asset =>
    `资源|${asset.id}|${asset.name || ''}|${asset.kind || asset.type || ''}|标签:${(asset.tags || []).join(',')}`
  ).join('\n') || '资源|无';
  const candidates = voiceCandidates(userText);
  const candidateText = candidates.length
    ? `\n语音/标签候选（仅供模型选择 element_id，不代表已添加）：\n${candidates.map(item => `${item.voice?.token || item.id}|${item.name}|${(item.voice?.aliases || []).slice(0, 4).join(',')}`).join('\n')}`
    : '';
  return [{
    role: 'system',
    content: `${SYSTEM_PROMPT}\n当前场景：${summary}\n当前选择：${selected}\n${placementContext}\n固定元素目录（add_element 可引用）：\n${fixedElements}\n可用资源目录：\n${assets}${candidateText}`
  }];
}

function isAddIntent(text) {
  return /(添加|加一个|加个|放一个|放个|创建|生成|摆放|放置|来一个|来个)/.test(String(text || ''));
}

function instanceCandidates(text) {
  if (isAddIntent(text)) return [];
  const normalized = normalizeVoiceText(text);
  const matched = listElements().filter(item => [item.name, ...(item.voice?.aliases || [])].some(alias => {
    const value = normalizeVoiceText(alias);
    return value.length >= 2 && normalized.includes(value);
  }));
  if (!matched.length) return [];
  const ids = new Set(matched.map(item => item.id));
  return (store.scene.objects || []).filter(object => {
    if (object.element_id && ids.has(object.element_id)) return true;
    const name = normalizeVoiceText(object.name || '');
    return matched.some(item => name === normalizeVoiceText(item.name));
  });
}

function appendInstanceChooser(messages, candidates, text, input, resizeInput) {
  const chooser = makeElement('div', 'ai-chat-instance-chooser');
  const title = makeElement('strong', '', '请先选择要操作的场景实例');
  const list = makeElement('div', 'ai-chat-instance-list');
  candidates.forEach((object, index) => {
    const position = (object.transform?.p || []).map(value => Number(value).toFixed(1)).join(', ');
    const button = makeElement('button', 'ai-chat-instance-choice', `${object.name || '元素'} ${index + 1} · (${position})`);
    button.type = 'button';
    button.addEventListener('click', () => {
      store.select(object.id);
      chooser.remove();
      input.value = text;
      resizeInput();
      appendSystem(messages, `已选中「${object.name || object.id}」，正在继续处理这条指令。`);
      input.focus();
      input.dispatchEvent(new Event('input'));
      // 选中后自动重新提交原句，AI 会收到明确的 object id。
      input.dataset.confirmedInstance = object.id;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    list.appendChild(button);
  });
  chooser.append(title, list);
  messages.appendChild(chooser);
  scrollBottom(messages);
  return chooser;
}

function planLabel(op) {
  const labels = {
    add_object: '添加对象',
    add_element: '添加固定元素',
    update_object: '修改对象',
    remove_object: '删除对象',
    add_trigger: '添加触发器',
    add_sequence: '添加时间线',
    add_node: '添加剧情节点',
    update_node: '修改剧情节点',
    add_anchor: '添加空间锚点',
    add_zone: '添加空间区域'
  };
  return labels[op?.op] || op?.op || '场景修改';
}

function appendPlan(messages, ops, onApply, onCancel) {
  const plan = makeElement('div', 'ai-chat-plan');
  const title = makeElement('div', 'ai-chat-plan-title', '待确认的场景修改');
  const list = makeElement('ul', 'ai-chat-plan-list');
  ops.forEach(op => {
    const item = makeElement('li', '', `${planLabel(op)}${op.name ? `：${op.name}` : ''}`);
    list.appendChild(item);
  });
  const actions = makeElement('div', 'ai-chat-plan-actions');
  const cancel = makeElement('button', '', '取消');
  const apply = makeElement('button', 'apply', '应用修改');
  cancel.addEventListener('click', () => { plan.remove(); onCancel?.(); });
  apply.addEventListener('click', async () => {
    apply.disabled = true;
    cancel.disabled = true;
    await onApply(plan);
  });
  actions.append(cancel, apply);
  plan.append(title, list, actions);
  messages.appendChild(plan);
  scrollBottom(messages);
  return plan;
}

export function mount() {
  if (mounted || !document.body) return;
  mounted = true;
  ensureStyle();

  const root = makeElement('div', 'ai-chat-root');
  const fab = makeElement('button', 'ai-chat-fab', 'AI');
  fab.type = 'button';
  fab.title = '打开 AI 助手';

  const panel = makeElement('section', 'ai-chat-panel');
  panel.hidden = true;

  const header = makeElement('div', 'ai-chat-header');
  const title = makeElement('div', 'ai-chat-title', 'AI 助手 · 场景编辑');
  const status = makeElement('div', 'ai-chat-status');
  const settingsButton = makeElement('button', 'ai-chat-collapse', '⚙');
  settingsButton.type = 'button';
  settingsButton.title = '配置 AI 服务';
  const collapse = makeElement('button', 'ai-chat-collapse', '−');
  collapse.type = 'button';
  collapse.title = '收起';

  header.appendChild(title);
  header.appendChild(status);
  header.appendChild(settingsButton);
  header.appendChild(collapse);

  const settings = makeElement('div', 'ai-chat-settings');
  settings.hidden = true;
  const protocolLabel = makeElement('label', '', '协议');
  const protocol = document.createElement('select');
  protocol.innerHTML = '<option value="relay">项目代理 / Relay</option><option value="openai">OpenAI-compatible</option>';
  protocolLabel.appendChild(protocol);
  const endpointLabel = makeElement('label', '', '服务地址');
  const endpoint = document.createElement('input');
  endpoint.type = 'url'; endpoint.placeholder = 'https://...'; endpointLabel.appendChild(endpoint);
  const modelLabel = makeElement('label', '', '模型（可选）');
  const model = document.createElement('input');
  model.type = 'text'; model.placeholder = '例如 gpt-4o-mini'; modelLabel.appendChild(model);
  const keyLabel = makeElement('label', '', 'API Key（仅保存在本机）');
  const apiKey = document.createElement('input');
  apiKey.type = 'password'; apiKey.autocomplete = 'off'; keyLabel.appendChild(apiKey);
  const settingActions = makeElement('div', 'ai-chat-settings-actions');
  const resetSettings = makeElement('button', '', '恢复默认');
  const saveSettings = makeElement('button', 'save', '保存配置');
  settingActions.append(resetSettings, saveSettings);
  settings.append(protocolLabel, endpointLabel, modelLabel, keyLabel, settingActions);

  const messages = makeElement('div', 'ai-chat-messages');
  const inputArea = makeElement('div', 'ai-chat-input-area');
  const input = document.createElement('textarea');
  input.className = 'ai-chat-input';
  input.rows = 1;
  input.placeholder = '告诉我你想修改什么…';
  input.setAttribute('aria-label', '输入给 AI 的修改指令');

  const send = makeElement('button', 'ai-chat-send', '发送');
  send.type = 'button';

  const mic = makeElement('button', 'ai-chat-mic', '🎙');
  mic.type = 'button';
  mic.title = '语音输入（说完自动发送）';

  inputArea.appendChild(input);
  inputArea.appendChild(mic);
  inputArea.appendChild(send);
  panel.appendChild(header);
  panel.appendChild(settings);
  panel.appendChild(messages);
  panel.appendChild(inputArea);
  root.appendChild(panel);
  root.appendChild(fab);
  document.body.appendChild(root);

  let open = false;
  let aiConfig = getAiConfig();
  let sending = false;
  let welcomed = false;
  let pendingPlan = null;
  const history = [];

  const renderProvider = () => {
    status.classList.toggle('is-disabled', !aiConfig.endpoint);
    status.title = `${aiConfig.protocol === 'openai' ? 'OpenAI-compatible' : '项目代理'} · ${aiConfig.endpoint || '未配置服务地址'}`;
  };

  const fillSettings = () => {
    protocol.value = aiConfig.protocol || 'relay';
    endpoint.value = aiConfig.endpoint || '';
    model.value = aiConfig.model || '';
    apiKey.value = aiConfig.apiKey || '';
  };

  const updateMode = () => {
    const playMode = store.mode === 'play';
    input.disabled = playMode || sending;
    send.disabled = playMode || sending;
    status.classList.toggle('is-disabled', playMode);

    if (playMode) {
      input.placeholder = '试玩模式下不可编辑';
      if (open && !input.dataset.playHintShown) {
        appendSystem(messages, '试玩模式下不可编辑');
        input.dataset.playHintShown = '1';
      }
    } else {
      input.placeholder = '告诉我你想修改什么…';
      delete input.dataset.playHintShown;
    }
  };

  const resizeInput = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 72)}px`;
  };

  const openPanel = () => {
    open = true;
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');

    if (!welcomed) {
      welcomed = true;
      appendMessage(
        messages,
        'ai',
        '你好！我是空间互动编辑助手。你可以说：在这里加一个椅子 / 把选中的元素移到右边'
      );
    }

    updateMode();
    scrollBottom(messages);
  };

  const closePanel = () => {
    open = false;
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
  };

  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text || sending || store.mode === 'play') return;

    const candidates = instanceCandidates(text);
    const selectedIds = new Set(store.selected());
    const hasSelectedCandidate = candidates.some(object => selectedIds.has(object.id));
    if (candidates.length > 1 && !hasSelectedCandidate && input.dataset.confirmedInstance !== candidates[0]?.id) {
      appendInstanceChooser(messages, candidates, text, input, resizeInput);
      return;
    }
    delete input.dataset.confirmedInstance;

    appendMessage(messages, 'user', text);
    history.push({ role: 'user', content: text });
    while (history.length > 20) history.shift();

    input.value = '';
    resizeInput();
    sending = true;
    updateMode();

    const typing = appendTyping(messages);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const result = await requestAi({ messages: [...makeRequestMessages(text), ...history], signal: controller.signal });
      const parsed = parseResponse(result.content);
      typing.remove();

      appendMessage(messages, 'ai', parsed.reply);
      history.push({ role: 'assistant', content: parsed.reply });
      while (history.length > 20) history.shift();

      if (parsed.ops.length) {
        if (pendingPlan) pendingPlan.remove();
        pendingPlan = appendPlan(messages, parsed.ops, async plan => {
          try {
            const rawResults = await applyOps(parsed.ops);
            const done = Array.isArray(rawResults?.done) ? rawResults.done : [];
            const failed = Array.isArray(rawResults?.failed) ? rawResults.failed : [];
            const feedback = buildFeedback([
              ...done.map(() => ({ ok: true })),
              ...failed.map(item => ({ ok: false, error: item.err }))
            ], parsed.ops.length);
            const feedbackEl = makeElement('div', `ai-chat-feedback${feedback.failed ? ' error' : ''}`, feedback.text);
            messages.appendChild(feedbackEl);
            if (done.length) {
              const undo = makeElement('button', 'ai-chat-undo', '撤销本次修改');
              undo.type = 'button';
              undo.addEventListener('click', () => {
                const ok = collab.connected ? collab.undo() : store.undo();
                undo.disabled = true;
                undo.textContent = ok ? '已撤销' : '无法撤销';
                if (ok) log('已撤销本次 AI 修改');
              });
              feedbackEl.append(' ', undo);
            }
            done.forEach((op, index) => log(`AI 修改 ${index + 1}/${parsed.ops.length}：${planLabel(op)}已完成`));
            failed.forEach(item => log(`AI 修改失败：${item.err}`, 'error'));
            plan.remove();
            pendingPlan = null;
            scrollBottom(messages);
          } catch (error) {
            const message = `修改执行失败：${error?.message || '未知错误'}`;
            const feedbackEl = makeElement('div', 'ai-chat-feedback error', message);
            messages.appendChild(feedbackEl);
            log(message, 'error');
            apply.disabled = false;
            cancel.disabled = false;
            scrollBottom(messages);
          }
        }, () => { pendingPlan = null; appendSystem(messages, '已取消这组场景修改。'); });
      } else if (!parsed.parsed) {
        appendSystem(messages, '我已理解你的描述，但没有识别出可直接执行的场景修改。');
      }
    } catch (error) {
      typing.remove();

      const isTimeout = error?.name === 'AbortError';
      const message = isTimeout
        ? '请求等待时间较长，请稍后重试。'
        : 'AI 暂时无法连接，请检查网络后重试。';

      appendMessage(messages, 'ai', message);
      log(`AI 请求失败：${error?.message || message}`, 'error');
    } finally {
      clearTimeout(timeout);
      sending = false;
      updateMode();
      input.focus();
    }
  };

  settingsButton.addEventListener('click', () => {
    settings.hidden = !settings.hidden;
    if (!settings.hidden) fillSettings();
  });
  saveSettings.addEventListener('click', () => {
    aiConfig = saveAiConfig({ protocol: protocol.value, endpoint: endpoint.value.trim(), model: model.value.trim(), apiKey: apiKey.value });
    renderProvider();
    settings.hidden = true;
    appendSystem(messages, 'AI 服务配置已保存。');
  });
  resetSettings.addEventListener('click', () => {
    aiConfig = resetAiConfig();
    fillSettings();
    renderProvider();
  });

  fab.addEventListener('click', () => {
    if (open) closePanel();
    else openPanel();
  });

  collapse.addEventListener('click', closePanel);
  send.addEventListener('click', sendMessage);
  input.addEventListener('input', resizeInput);

  // 语音输入：浏览器 SpeechRecognition（zh-CN），识别完成后自动提交文本；场景修改仍需计划确认
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recActive = false;
  if (SpeechRecognition) {
    const rec = new SpeechRecognition();
    rec.lang = 'zh-CN';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = event => {
      let interim = '';
      let final = '';
      for (const res of event.results) {
        if (res.isFinal) final += res[0].transcript;
        else interim += res[0].transcript;
      }
      input.value = (final || interim).trim();
      resizeInput();
      if (final && !sending && store.mode !== 'play') {
        input.placeholder = '正在提交识别结果…';
        input.focus();
        sendMessage();
      }
    };
    const stopRec = () => { recActive = false; mic.classList.remove('is-rec'); };
    rec.onend = stopRec;
    rec.onerror = stopRec;

    mic.addEventListener('click', () => {
      if (recActive) { rec.stop(); return; }
      try {
        rec.start();
        recActive = true;
        mic.classList.add('is-rec');
        input.placeholder = '正在听…';
      } catch { /* 已启动 */ }
    });
    store.on('mode', () => { if (store.mode === 'play' && recActive) rec.stop(); });
  } else {
    mic.style.display = 'none';
  }

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  store.on('mode', updateMode);
  renderProvider();
  updateMode();
}