import { store } from '../core/store.js';
import { publishCheck } from '../core/schema.js';
import { openAR } from './arview.js';
import { log } from './log.js';
import { iconMarkup } from './components/icon.js';

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
  const issues = typeof store.validate === 'function' ? store.validate() : []
  const publish = publishCheck(store.scene)
  const structureBlocks = Array.isArray(issues)
    ? issues.filter(item => item.level === 'error').map(item => ({ kind: item.kind || 'error', msg: item.msg || '存在结构错误', target: item.target }))
    : []
  const structureWarns = Array.isArray(issues)
    ? issues.filter(item => item.level === 'warn').map(item => ({ kind: item.kind || 'warn', msg: item.msg || '存在需要注意的问题', target: item.target }))
    : []
  return {
    blocks: [...structureBlocks, ...(publish.blocks || [])],
    warns: [...structureWarns, ...(publish.warns || [])]
  }
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
  brand.className = 'tb-brand';
  brand.textContent = '造梦 · 故事空间';

  const divider = document.createElement('span');
  divider.className = 'tb-divider';

  const sceneName = document.createElement('span');
  sceneName.className = 'tb-scene-name';

  const saved = document.createElement('span');
  saved.className = 'tb-saved';

  const sceneMeta = document.createElement('span');
  sceneMeta.className = 'tb-scene-meta';
  sceneMeta.append(sceneName, saved);

  logo.append(mark, brand, divider, sceneMeta);

  const modeToggle = document.createElement('div');
  modeToggle.className = 'mode-toggle';

  const splatModeButton = document.createElement('button');
  splatModeButton.className = 'btn mode-btn mode-btn-splat';
  splatModeButton.type = 'button';
  splatModeButton.innerHTML = '<span>场景</span>';
  splatModeButton.title = '进入场景工作台：管理高斯场景与空间底座';

  const editModeButton = document.createElement('button');
  editModeButton.className = 'btn mode-btn';
  editModeButton.type = 'button';
  editModeButton.textContent = '创作';

  const playModeButton = document.createElement('button');
  playModeButton.className = 'btn mode-btn';
  playModeButton.type = 'button';
  playModeButton.textContent = '试玩';

  modeToggle.append(splatModeButton, editModeButton, playModeButton);

  const spacer = document.createElement('div');
  spacer.className = 'tb-spacer';

  const draftChip = document.createElement('button');
  draftChip.className = 'draft-chip';
  draftChip.type = 'button';
  draftChip.title = '点击复制房间链接';

  const demoButton = document.createElement('button');
  demoButton.className = 'btn';
  demoButton.type = 'button';
  demoButton.title = '创建空白故事场景';
  demoButton.textContent = '新建';

  const arButton = document.createElement('button');
  arButton.className = 'btn';
  arButton.type = 'button';
  arButton.title = '打开正式游客 Runtime：相机、方向、定位兜底和场景互动';
  arButton.textContent = '游客 Runtime';

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
  noticeButton.innerHTML = iconMarkup('notification-3-line', '通知');

  const baseLoad = document.createElement('span');
  baseLoad.className = 'tb-base-load';
  baseLoad.title = '高斯底座加载状态';

  bar.append(
    logo,
    baseLoad,
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
    const editorMode = store.editorMode || 'scene';
    editModeButton.classList.toggle('active', editorMode === 'scene' && mode === 'edit');
    playModeButton.classList.toggle('active', editorMode === 'scene' && mode === 'play');
    splatModeButton.classList.toggle('active', editorMode === 'splat-studio');
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
    closeButton.innerHTML = iconMarkup('close-line', '关闭');
    closeButton.addEventListener('click', closeOverlay);

    header.append(heading, closeButton);

    const body = document.createElement('div');
    body.className = 'tb-dialog-body';

    const jumpTo = (target) => {
      if (!target) return
      const object = store.getObject?.(target)
      const zone = store.getZone?.(target)
      const anchor = store.getAnchor?.(target)
      const nodes = store.scene?.story?.chapters?.flatMap(chapter => chapter.nodes || []) || []
      const node = nodes.find(item => item.id === target)
      if (object || zone || anchor || node) {
        store.select(target)
        if (object || zone) window.__xiyou?.viewport?.focus?.(target)
        if (node) {
          const linked = store.scene.objects.find(item => item.node_id === node.id)
          if (linked) { store.select(linked.id); window.__xiyou?.viewport?.focus?.(linked.id) }
        }
        closeOverlay()
      }
    }

    const blocks = validation.blocks || [];
    const warns = validation.warns || [];

    if (!blocks.length && !warns.length) {
      const success = document.createElement('div');
      success.className = 'tb-result-success';
      success.innerHTML = `${iconMarkup('checkbox-circle-line')}<span>可发布</span>`;
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
          if (item.target) { row.classList.add('jumpable'); row.title = '点击定位'; row.addEventListener('click', () => jumpTo(item.target)); }
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
          if (item.target) { row.classList.add('jumpable'); row.title = '点击定位'; row.addEventListener('click', () => jumpTo(item.target)); }
          body.appendChild(row);
        });
      }
    }

    if (options.published) {
      const published = document.createElement('div');
      published.className = 'tb-result-success';
      const version = options.release?.version ? ` v${options.release.version}` : '';
      published.innerHTML = `${iconMarkup('checkbox-circle-line')}<span>场景已发布${version}</span>`;
      body.appendChild(published);
    }

    dialog.append(header, body);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeOverlay();
    });

    document.body.appendChild(overlay);
  }

  function showReleaseDiff(release, previous) {
    const diff = store.releaseDiff?.(previous.id, release.id)
    if (!diff) return
    closeOverlay()
    overlay = document.createElement('div')
    overlay.className = 'tb-overlay'
    const dialog = document.createElement('div')
    dialog.className = 'tb-dialog'
    const header = document.createElement('div')
    header.className = 'tb-dialog-header'
    const title = document.createElement('strong')
    title.textContent = `版本差异 · v${previous.version} → v${release.version}`
    const close = document.createElement('button')
    close.className = 'btn icon-btn'
    close.innerHTML = iconMarkup('close-line', '关闭')
    close.addEventListener('click', closeOverlay)
    header.append(title, close)
    const body = document.createElement('div')
    body.className = 'tb-dialog-body'
    const row = (label, value) => { const el = document.createElement('div'); el.className = 'tb-history-row'; el.textContent = `${label}：${value}`; body.appendChild(el) }
    const locate = id => {
      const object = store.getObject?.(id)
      const zone = store.getZone?.(id)
      if (object || zone) {
        store.select(id)
        window.__xiyou?.viewport?.focus?.(id)
        closeOverlay()
      }
    }
    const list = (label, value) => {
      row(label, `+${value.added.length} / -${value.removed.length} / 改 ${value.changed.length}`)
      ;[['新增', value.added], ['删除', value.removed], ['修改', value.changed]].forEach(([kind, ids]) => {
        if (!ids.length) return
        const detail = document.createElement('div')
        detail.className = 'tb-diff-detail'
        const title = document.createElement('span')
        title.textContent = `${kind}：`
        detail.appendChild(title)
        ids.forEach((id, index) => {
          const button = document.createElement('button')
          button.type = 'button'
          button.className = 'tb-diff-id'
          button.textContent = id
          button.disabled = !store.getObject?.(id) && !store.getZone?.(id)
          button.addEventListener('click', () => locate(id))
          detail.appendChild(button)
          if (index < ids.length - 1) detail.append('、')
        })
        body.appendChild(detail)
      })
    }
    list('对象', diff.objects)
    list('空间区域', diff.zones)
    list('资源', diff.assets)
    row('底座', diff.baseChanged ? '已变化' : '未变化')
    dialog.append(header, body)
    overlay.append(dialog)
    overlay.addEventListener('click', event => { if (event.target === overlay) closeOverlay() })
    document.body.appendChild(overlay)
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
    closeButton.innerHTML = iconMarkup('close-line', '关闭');
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

    const releases = store.scene?.meta?.releases || []
    if (releases.length) {
      const releaseTitle = document.createElement('div')
      releaseTitle.className = 'tb-result-title'
      releaseTitle.textContent = '发布版本'
      body.appendChild(releaseTitle)
      releases.slice().reverse().slice(0, 8).forEach(release => {
        const row = document.createElement('div')
        row.className = 'tb-history-row tb-release-row'
        const label = document.createElement('span')
        label.textContent = `v${release.version} · ${release.name || '未命名版本'}`
        const restore = document.createElement('button')
        restore.type = 'button'
        restore.className = 'btn btn-sm'
        restore.textContent = '恢复'
        restore.addEventListener('click', () => {
          if (!window.confirm(`恢复版本 v${release.version}？当前未发布修改会保留在撤销记录中。`)) return
          if (store.restoreRelease?.(release.id)) {
            closeOverlay()
            log(`已恢复发布版本 v${release.version}`)
          }
        })
        const previous = releases[releases.indexOf(release) - 1]
        if (previous) {
          const compare = document.createElement('button')
          compare.type = 'button'
          compare.className = 'btn btn-sm'
          compare.textContent = '对比'
          compare.addEventListener('click', () => showReleaseDiff(release, previous))
          row.append(label, compare, restore)
        } else row.append(label, restore)
        body.appendChild(row)
      })
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
    store.setEditorMode?.('scene');
    store.setMode('edit');
  });

  playModeButton.addEventListener('click', () => {
    store.setEditorMode?.('scene');
    store.setMode('play');
  });

  splatModeButton.addEventListener('click', () => {
    store.setMode('edit');
    store.setEditorMode?.('splat-studio');
  });

  draftChip.addEventListener('click', async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', getRoomCode());
    url.searchParams.delete('draft');

    try {
      await navigator.clipboard.writeText(url.toString());
      draftChip.textContent = '已复制房间链接';
      setTimeout(renderDraft, 1400);
    } catch {
      window.prompt('复制房间链接', url.toString());
    }
  });

  demoButton.addEventListener('click', () => {
    if (!window.confirm('创建空白场景会清除当前场景内容，确定继续？')) return;
    store.newScene();
    log('已创建空白故事场景');
  });

  arButton.addEventListener('click', () => {
    const url = new URL('./runtime.html', window.location.href)
    url.searchParams.set('room', getRoomCode())
    window.open(url.toString(), '_blank', 'noopener')
  });

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

    const release = store.createRelease?.();
    log(release ? `已发布场景 v${release.version}` : '已发布场景');
    showOverlay('发布结果', validation, { published: true, release });
  });

  noticeButton.addEventListener('click', showHistory);

  store.on('mode', renderMode);
  store.on('editor-mode', renderMode);
  store.on('change', ({ transient } = {}) => {
    renderSceneName();

    if (!transient) {
      scheduleSave();
    } else {
      renderSaved();
    }
  });
  store.on('base-load', state => {
    if (!state?.total) { baseLoad.textContent = ''; baseLoad.className = 'tb-base-load'; baseLoad.removeAttribute('title'); return }
    const percent = Number.isFinite(state.progress)
      ? ` ${Math.max(0, Math.min(100, state.progress))}%`
      : ''
    baseLoad.textContent = state.loaded === state.total
      ? `底座 ${state.loaded}/${state.total}${percent}`
      : `加载底座 ${state.loaded}/${state.total}${percent}`
    baseLoad.className = `tb-base-load ${state.failed ? 'warn' : state.loaded === state.total ? 'ok' : 'loading'}`
    const failedChunks = (state.chunks || []).filter(chunk => chunk.status === 'failed')
    const failedText = failedChunks.map(chunk => `${chunk.name || chunk.id}：${chunk.error || '加载失败'}`).join('；')
    baseLoad.title = failedText
      ? `LOD ${state.lod} · 失败 ${state.failed} 个：${failedText}`
      : `LOD ${state.lod} · ${state.loaded}/${state.total} · 进度 ${Math.max(0, Math.min(100, state.progress || 0))}%`
  })

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