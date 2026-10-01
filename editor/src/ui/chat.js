import { store } from '../core/store.js';
import { sceneSummary, SYSTEM_PROMPT, applyOps } from '../core/aiops.js';
import { log } from './log.js';

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

function makeRequestMessages() {
  const summary = sceneSummary(store.scene);
  return [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n当前场景：${summary}`
    }
  ];
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
  const collapse = makeElement('button', 'ai-chat-collapse', '−');
  collapse.type = 'button';
  collapse.title = '收起';

  header.appendChild(title);
  header.appendChild(status);
  header.appendChild(collapse);

  const messages = makeElement('div', 'ai-chat-messages');
  const inputArea = makeElement('div', 'ai-chat-input-area');
  const input = document.createElement('textarea');
  input.className = 'ai-chat-input';
  input.rows = 1;
  input.placeholder = '告诉我你想修改什么…';
  input.setAttribute('aria-label', '输入给 AI 的修改指令');

  const send = makeElement('button', 'ai-chat-send', '发送');
  send.type = 'button';

  inputArea.appendChild(input);
  inputArea.appendChild(send);
  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(inputArea);
  root.appendChild(panel);
  root.appendChild(fab);
  document.body.appendChild(root);

  let open = false;
  let sending = false;
  let welcomed = false;
  const history = [];

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
        '你好！我是场景编辑助手。说出你想改的场景，比如：在入口加一个会发光的符咒 / 把悟空移到左边两米'
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
      const endpoint = `${location.origin === 'https://agentpay.xx.kg' ? '' : 'https://agentpay.xx.kg'}/xiyou-ai/chat`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...makeRequestMessages(), ...history]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`服务响应异常（${response.status}）`);
      }

      const data = await response.json();
      const parsed = parseResponse(data.content);
      typing.remove();

      appendMessage(messages, 'ai', parsed.reply);
      history.push({ role: 'assistant', content: parsed.reply });
      while (history.length > 20) history.shift();

      if (parsed.ops.length) {
        try {
          const rawResults = await applyOps(parsed.ops);
          const results = normalizeResults(rawResults, parsed.ops);
          const feedback = buildFeedback(results, parsed.ops.length);
          const feedbackEl = makeElement('div', `ai-chat-feedback${feedback.failed ? ' error' : ''}`, feedback.text);
          messages.appendChild(feedbackEl);

          results.forEach((result, index) => {
            const ok = resultSuccess(result);
            log(
              `AI 修改 ${index + 1}/${parsed.ops.length}：${resultMessage(result, index)}`,
              ok ? 'info' : 'error'
            );
          });
          scrollBottom(messages);
        } catch (error) {
          const message = `修改执行失败：${error?.message || '未知错误'}`;
          const feedbackEl = makeElement('div', 'ai-chat-feedback error', message);
          messages.appendChild(feedbackEl);
          log(message, 'error');
          scrollBottom(messages);
        }
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

  fab.addEventListener('click', () => {
    if (open) closePanel();
    else openPanel();
  });

  collapse.addEventListener('click', closePanel);
  send.addEventListener('click', sendMessage);
  input.addEventListener('input', resizeInput);

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  store.on('mode', updateMode);
  updateMode();
}