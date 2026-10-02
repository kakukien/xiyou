import { store } from '../core/store.js';
import { publishCheck } from '../core/schema.js';
import { demoScene } from '../core/templates.js';
import { openAR } from './arview.js';
import { log } from './log.js';
import { copyText, toast } from './toast.js';

function randomDraftCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const makePart = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${makePart()}-${makePart()}`;
}

function getDraftCode() {
  const params = new URLSearchParams(window.location.search);
  let code = params.get('draft') || localStorage.getItem('xiyou.draft');

  if (!code) {
    code = randomDraftCode();
    localStorage.setItem('xiyou.draft', code);
  }

  return code.toUpperCase();
}

function getRoomCode() {
  const params = new URLSearchParams(window.location.search);
  const presenceInput = document.querySelector(
    '[data-presence-room], .presence input, input[name="room"], input[placeholder*="房间"]'
  );

  return (
    params.get('room') ||
    presenceInput?.value?.trim() ||
    'demo'
  );
}

function getValidation() {
  let result;

  if (typeof store.validate === 'function') {
    result = store.validate();
  } else {
    result = publishCheck(store.scene);
  }

  if (Array.isArray(result)) {
    return {
      blocks: result
        .filter(item => item.level === 'error')
        .map(item => ({
          kind: item.kind || 'error',
          msg: item.msg || '存在结构错误',
          target: item.target
        })),
      warns: result
        .filter(item => item.level === 'warn')
        .map(item => ({
          kind: item.kind || 'warn',
          msg: item.msg || '存在需要注意的问题',
          target: item.target
        }))
    };
  }

  return {
    blocks: Array.isArray(result?.blocks) ? result.blocks : [],
    warns: Array.isArray(result?.warns) ? result.warns : []
  };
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function emit(name, detail) {
  if (typeof store.emit === 'function') {
    store.emit(name, detail);
  }
}

export function mount(el) {
  el.innerHTML = '';

  const bar = document.createElement('div');
  bar.className = 'topbar';

  const logo = document.createElement('div');
  logo.className = 'tb-logo';

  const mark = document.createElement('span');
  mark.className = 'mark';

  const brand = document.createElement('span');
  brand.textContent = '西游·虚境';

  const divider = document.createElement('span');
  divider.className = 'tb-divider';

  const sceneName = document.createElement('span');
  sceneName.className = 'tb-scene-name';

  logo.append(mark, brand, divider, sceneName);

  const saved = document.createElement('span');
  saved.className = 'tb-saved';

  const modeToggle = document.createElement('div');
  modeToggle.className = 'mode-toggle';

  const editModeButton = document.createElement('button');
  editModeButton.className = 'btn mode-btn';
  editModeButton.type = 'button';
  editModeButton.textContent = '创作';

  const playModeButton = document.createElement('button');
  playModeButton.className = 'btn mode-btn';
  playModeButton.type = 'button';
  playModeButton.textContent = '试玩';

  modeToggle.append(editModeButton, playModeButton);

  const spacer = document.createElement('div');
  spacer.className = 'tb-spacer';

  const draftChip = document.createElement('button');
  draftChip.className = 'draft-chip';
  draftChip.type = 'button';
  draftChip.title = '点击复制房间链接';

  const demoButton = document.createElement('button');
  demoButton.className = 'btn';
  demoButton.type = 'button';
  demoButton.title = '把演示场景载入当前房间（会同步给所有协作者）';
  demoButton.textContent = '演示';

  const arButton = document.createElement('button');
  arButton.className = 'btn';
  arButton.type = 'button';
  arButton.title = '以游客视角看场景：手机上是相机画面+陀螺仪';
  arButton.textContent = '游客视角';

  const anchorButton = document.createElement('button');
  anchorButton.className = 'btn';
  anchorButton.type = 'button';
  anchorButton.title = '放置定位锚点：点击视口地面落点，剧情节点可绑定（Esc 取消）';
  anchorButton.textContent = '锚点';

  const previewButton = document.createElement('button');
  previewButton.className = 'btn';
  previewButton.type = 'button';
  previewButton.textContent = '预览';

  const publishButton = document.createElement('button');
  publishButton.className = 'btn primary';
  publishButton.type = 'button';
  publishButton.textContent = '发布';

  const connection = document.createElement('span');
  connection.className = 'tb-connection';
  connection.innerHTML = '<i class="tb-status-dot"></i><span>已连接</span>';

  const noticeButton = document.createElement('button');
  noticeButton.className = 'btn icon-btn';
  noticeButton.type = 'button';
  noticeButton.title = '通知';
  noticeButton.textContent = '🔔';

  bar.append(
    logo,
    saved,
    modeToggle,
    spacer,
    draftChip,
    demoButton,
    arButton,
    anchorButton,
    previewButton,
    publishButton,
    connection,
    noticeButton
  );

  el.appendChild(bar);

  const draftCode = getDraftCode();
  let saveTimer = null;
  let overlay = null;

  function renderSceneName() {
    sceneName.textContent = store.scene?.meta?.name || '未命名场景';
  }

  function renderDraft() {
    draftChip.textContent = `草稿码 ${draftCode}`;
  }

  function renderMode() {
    const mode = store.mode || 'edit';
    editModeButton.classList.toggle('active', mode === 'edit');
    playModeButton.classList.toggle('active', mode === 'play');
  }

  function renderSaved() {
    const dirty = Boolean(store.scene?.meta?.dirty);

    if (dirty) {
      saved.textContent = '编辑中';
      saved.classList.add('dirty');
    } else {
      saved.textContent = `已保存 ${formatTime()}`;
      saved.classList.remove('dirty');
    }
  }

  function closeOverlay() {
    overlay?.remove();
    overlay = null;
  }

  function showOverlay(title, validation, options = {}) {
    closeOverlay();

    overlay = document.createElement('div');
    overlay.className = 'tb-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'tb-dialog';

    const header = document.createElement('div');
    header.className = 'tb-dialog-header';

    const heading = document.createElement('strong');
    heading.textContent = title;

    const closeButton = document.createElement('button');
    closeButton.className = 'btn icon-btn';
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', closeOverlay);

    header.append(heading, closeButton);

    const body = document.createElement('div');
    body.className = 'tb-dialog-body';

    const blocks = validation.blocks || [];
    const warns = validation.warns || [];

    if (!blocks.length && !warns.length) {
      const success = document.createElement('div');
      success.className = 'tb-result-success';
      success.textContent = '✓ 可发布';
      body.appendChild(success);
    } else {
      if (blocks.length) {
        const blockTitle = document.createElement('div');
        blockTitle.className = 'tb-result-title error';
        blockTitle.textContent = `阻塞项（${blocks.length}）`;
        body.appendChild(blockTitle);

        blocks.forEach(item => {
          const row = document.createElement('div');
          row.className = 'tb-result-row error';
          row.textContent = item.msg || item.kind || '未通过检查';
          body.appendChild(row);
        });
      }

      if (warns.length) {
        const warnTitle = document.createElement('div');
        warnTitle.className = 'tb-result-title warn';
        warnTitle.textContent = `提醒（${warns.length}）`;
        body.appendChild(warnTitle);

        warns.forEach(item => {
          const row = document.createElement('div');
          row.className = 'tb-result-row warn';
          row.textContent = item.msg || item.kind || '请检查此项';
          body.appendChild(row);
        });
      }
    }

    if (options.published) {
      const published = document.createElement('div');
      published.className = 'tb-result-success';
      published.textContent = '✓ 场景已发布';
      body.appendChild(published);
    }

    dialog.append(header, body);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeOverlay();
    });

    document.body.appendChild(overlay);
  }

  function showHistory() {
    let history = [];

    if (typeof store.history === 'function') {
      history = store.history() || [];
    }

    if (!Array.isArray(history)) {
      history = [];
    }

    const recent = history.slice(-10).reverse();
    const validation = { blocks: [], warns: [] };

    closeOverlay();

    overlay = document.createElement('div');
    overlay.className = 'tb-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'tb-dialog';

    const header = document.createElement('div');
    header.className = 'tb-dialog-header';

    const heading = document.createElement('strong');
    heading.textContent = '最近通知';

    const closeButton = document.createElement('button');
    closeButton.className = 'btn icon-btn';
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', closeOverlay);

    header.append(heading, closeButton);

    const body = document.createElement('div');
    body.className = 'tb-dialog-body';

    if (!recent.length) {
      const empty = document.createElement('div');
      empty.className = 'tb-empty';
      empty.textContent = '暂无通知';
      body.appendChild(empty);
    } else {
      recent.forEach(item => {
        const row = document.createElement('div');
        row.className = 'tb-history-row';

        const message = typeof item === 'string'
          ? item
          : item.msg || item.message || item.text || '场景发生了变化';

        const time = typeof item === 'object' && item.time
          ? item.time
          : '';

        row.textContent = time ? `${time} ${message}` : message;
        body.appendChild(row);
      });
    }

    dialog.append(header, body);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeOverlay();
    });

    document.body.appendChild(overlay);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (typeof store.save === 'function') {
        store.save();
      }
      renderSceneName();
      renderSaved();
    }, 2000);
  }

  editModeButton.addEventListener('click', () => {
    store.setMode('edit');
  });

  playModeButton.addEventListener('click', () => {
    store.setMode('play');
  });

  draftChip.addEventListener('click', async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', getRoomCode());
    url.searchParams.delete('draft');

    copyText(url.toString(), '已复制房间链接');
    draftChip.textContent = '已复制房间链接';
    setTimeout(renderDraft, 1400);
  });

  // 演示场景会覆盖当前场景：两步确认（第一次点击进入待确认态，3s 内再点执行）
  let demoArmed = false;
  let demoTimer = null;
  demoButton.addEventListener('click', () => {
    if (!demoArmed) {
      demoArmed = true;
      const prev = demoButton.textContent;
      demoButton.textContent = '再点一次确认载入（覆盖当前场景）';
      demoButton.classList.add('danger');
      demoTimer = setTimeout(() => {
        demoArmed = false;
        demoButton.textContent = prev;
        demoButton.classList.remove('danger');
      }, 3000);
      return;
    }
    clearTimeout(demoTimer);
    demoArmed = false;
    demoButton.textContent = '演示';
    demoButton.classList.remove('danger');
    store.newScene(demoScene());
    log('已载入演示场景');
    toast('已载入演示场景 · Ctrl+Z 撤销');
  });

  arButton.addEventListener('click', () => openAR());

  anchorButton.addEventListener('click', () => {
    const vp = window.__xiyou?.viewport;
    if (!vp) return;
    const next = vp.anchorPlacement ? null : 'vps';
    vp.setAnchorPlacement(next);
    anchorButton.classList.toggle('active', Boolean(next));
    log(next ? '锚点放置模式：点击视口地面放置（Esc 取消）' : '已退出锚点放置');
  });

  store.on('anchor-placement', kind => {
    if (!kind) anchorButton.classList.remove('active');
  });

  previewButton.addEventListener('click', () => {
    showOverlay('发布预览', getValidation());
  });

  publishButton.addEventListener('click', () => {
    const validation = getValidation();

    if (validation.blocks.length) {
      showOverlay('无法发布', validation);
      return;
    }

    emit('published', { scene: store.scene });
    log('已发布 demo');
    showOverlay('发布结果', validation, { published: true });
  });

  noticeButton.addEventListener('click', showHistory);

  store.on('mode', renderMode);
  store.on('change', ({ transient } = {}) => {
    renderSceneName();

    if (!transient) {
      scheduleSave();
    } else {
      renderSaved();
    }
  });
  store.on('collab-status', status => {
    const connected = typeof status === 'string'
      ? status !== 'offline'
      : status?.connected !== false;

    connection.classList.toggle('offline', !connected);
    connection.querySelector('span').textContent = connected ? '已连接' : '未连接';
  });

  renderSceneName();
  renderDraft();
  renderMode();
  renderSaved();
}