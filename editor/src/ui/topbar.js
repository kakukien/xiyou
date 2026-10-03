import { store } from '../core/store.js';
import { publishCheck } from '../core/schema.js';
import { projects } from '../core/projects.js';
import { openAR } from './arview.js';
import { log } from './log.js';
import { iconMarkup } from './components/icon.js';
import { copyText } from './toast.js';

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

function runtimeUrlForRelease(release) {
  const url = new URL('./runtime.html', window.location.href)
  // 同浏览器优先从当前 room 的发布快照读取；跨设备时部署下载的 JSON 后再填写 scene URL。
  url.searchParams.set('release', release.id)
  url.searchParams.set('room', getRoomCode())
  return url.toString()
}

function localReleaseData(release) {
  try {
    const parsed = JSON.parse(release.snapshot || '{}')
    return JSON.stringify(parsed, null, 2)
  } catch {
    return release.snapshot || '{}'
  }
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
  sceneName.title = '双击重命名工程';
  sceneName.style.cursor = 'text';

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

  // 工程切换器（UE 式 project）：每个工程 = 独立协作房间 + 独立本地草稿
  const projSelect = document.createElement('select');
  projSelect.className = 'field tb-proj';
  projSelect.title = '切换工程（每个工程是独立协作房间与存档）';

  const projNewBtn = document.createElement('button');
  projNewBtn.className = 'btn icon-btn';
  projNewBtn.type = 'button';
  projNewBtn.title = '新建工程';
  projNewBtn.innerHTML = iconMarkup('add-line', '新建工程');

  const demoButton = document.createElement('button');
  demoButton.className = 'btn';
  demoButton.type = 'button';
  demoButton.title = '创建空白互动场景';
  demoButton.textContent = '新建';

  const syncButton = document.createElement('button');
  syncButton.className = 'btn';
  syncButton.type = 'button';
  syncButton.title = '载入线上正式场景 show/scene.json（覆盖当前草稿）';
  syncButton.textContent = '同步线上';

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
  connection.innerHTML = '<i class="tb-status-dot"></i><span>未连接</span>';

  const noticeButton = document.createElement('button');
  noticeButton.className = 'btn icon-btn';
  noticeButton.type = 'button';
  noticeButton.title = '通知';
  noticeButton.innerHTML = iconMarkup('notification-3-line', '通知');

  const baseLoad = document.createElement('span');
  baseLoad.className = 'tb-base-load';
  baseLoad.title = '高斯底座加载状态';

  // 点云加载开关：同步线上后底座动辄几十 MB，关掉即只留占位底座，编辑不受下载阻塞
  const splatToggle = document.createElement('button');
  splatToggle.className = 'btn btn-sm';
  splatToggle.type = 'button';
  splatToggle.title = '编辑器内加载/卸载点云底座（不影响发布的 AR 端）';

  // 撤销步数可调（默认 30）
  const undoWrap = document.createElement('label');
  undoWrap.className = 'tb-undo-limit';
  undoWrap.title = '撤销/回退步数上限（1–500）';
  undoWrap.innerHTML = '<span>回退</span>';
  const undoInput = document.createElement('input');
  undoInput.type = 'number';
  undoInput.min = '1';
  undoInput.max = '500';
  undoInput.className = 'field tb-undo-input';
  undoWrap.appendChild(undoInput);

  bar.append(
    logo,
    baseLoad,
    splatToggle,
    undoWrap,
    modeToggle,
    spacer,
    draftChip,
    projSelect,
    projNewBtn,
    demoButton,
    syncButton,
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

  function renderSplatToggle() {
    const on = store.scene?.base?.editor_load !== false;
    splatToggle.textContent = on ? '点云:开' : '点云:关';
    splatToggle.classList.toggle('active', !on);
    splatToggle.title = on
      ? '点云底座正在编辑器加载——点击关闭，编辑时不再下载/渲染大文件'
      : '点云底座已关闭——点击恢复加载';
  }

  function renderUndoLimit() {
    undoInput.value = String(store.historyLimit || 30);
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
      if (options.release) {
        const releaseActions = document.createElement('div');
        releaseActions.className = 'tb-release-actions';
        const runtimeLink = runtimeUrlForRelease(options.release);
        const copyEntry = document.createElement('button');
        copyEntry.className = 'btn btn-sm';
        copyEntry.type = 'button';
        copyEntry.textContent = '复制游客入口';
        copyEntry.addEventListener('click', () => copyText(runtimeLink, '已复制游客入口'));
        const download = document.createElement('button');
        download.className = 'btn btn-sm';
        download.type = 'button';
        download.textContent = '下载 Release JSON';
        download.addEventListener('click', () => {
          const blob = new Blob([localReleaseData(options.release)], { type: 'application/json' });
          const anchor = document.createElement('a');
          anchor.href = URL.createObjectURL(blob);
          anchor.download = `${options.release.id}.json`;
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
        });
        releaseActions.append(copyEntry, download);
        body.appendChild(releaseActions);
        const hint = document.createElement('div');
        hint.className = 'tb-release-hint';
        hint.textContent = '游客入口需要把 Release JSON 部署到可访问地址；当前浏览器本地发布用于预览与下载。';
        body.appendChild(hint);
      }
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

    copyText(url.toString(), '已复制房间链接');
    draftChip.textContent = '已复制房间链接';
    setTimeout(renderDraft, 1400);
  });

  // 演示场景会覆盖当前场景：两步确认（第一次点击进入待确认态，3s 内再点执行）
  let demoArmed = false;
  let demoTimer = null;
  demoButton.addEventListener('click', () => {
    if (!window.confirm('创建空白场景会清除当前场景内容，确定继续？')) return;
    store.newScene();
    log('已创建空白互动场景');
  });

  // ---- 工程切换 ----
  const currentProj = window.__xiyouProj || 'main';
  function renderProjects() {
    const list = projects.list()
    projSelect.innerHTML = ''
    const known = list.find(item => item.id === currentProj)
    const items = known ? list : [{ id: currentProj, name: store.scene?.meta?.name || currentProj }, ...list]
    for (const item of items) {
      const opt = document.createElement('option')
      opt.value = item.id
      opt.textContent = item.id === 'main' ? `${item.name || '正式场景'}（主线）` : (item.name || item.id)
      opt.selected = item.id === currentProj
      projSelect.appendChild(opt)
    }
  }
  projects.on('projects', renderProjects)
  projects.on('ready', renderProjects)
  renderProjects()

  projSelect.addEventListener('change', () => {
    const next = projSelect.value
    if (!next || next === currentProj) return
    const url = new URL(location.href)
    url.searchParams.set('proj', next)
    url.searchParams.delete('room')
    location.href = url.toString()
  })

  projNewBtn.addEventListener('click', () => {
    const name = window.prompt('新工程名称', '未命名工程')
    if (name === null) return
    const item = projects.create(name, '')
    if (item) {
      const url = new URL(location.href)
      url.searchParams.set('proj', item.id)
      url.searchParams.delete('room')
      location.href = url.toString()
    } else log('工程注册表尚未连接，稍后重试', 'warn')
  })

  // 场景名双击改名：同时写 meta.name + 工程注册表，立即落盘
  sceneName.addEventListener('dblclick', () => {
    const next = window.prompt('工程名称', store.scene?.meta?.name || '')
    if (next === null || !next.trim()) return
    store.scene.meta.name = next.trim()
    projects.rename(currentProj, next.trim()) || projects.touch(currentProj, { name: next.trim() })
    store.save?.()
    store.emit('change', { transient: false })
    renderSceneName()
    renderProjects()
    log(`工程已更名为「${next.trim()}」`)
  })

  syncButton.addEventListener('click', async () => {
    if (currentProj === 'main') {
      if (!window.confirm('载入线上正式场景会覆盖当前草稿，确定继续？')) return;
      try {
        syncButton.textContent = '同步中…';
        const res = await fetch('show/scene.json?v=' + Date.now());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        store.newScene(await res.json());
        store.save?.();
        log('已载入线上正式场景（虚境世界/钟楼等新对象一并带入）');
      } catch (e) {
        log(`载入线上场景失败：${e?.message || e}`, 'error');
      }
      syncButton.textContent = '同步线上';
      return
    }
    // 非主线工程：从协作房间拉取最新工程状态
    if (!window.confirm('重新连接本工程的协作房间，拉取服务器上的最新内容？')) return
    location.reload()
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

  splatToggle.addEventListener('click', () => {
    const next = store.scene?.base?.editor_load === false;
    store.setBase?.({ editor_load: next });
    renderSplatToggle();
    log(next ? '点云底座已开启加载' : '点云底座已关闭，只显示占位底座');
  });

  undoInput.addEventListener('change', () => {
    const next = store.setHistoryLimit?.(undoInput.value);
    undoInput.value = String(next || 30);
    log(`撤销步数已设为 ${next} 步`);
  });

  renderSplatToggle();
  renderUndoLimit();

  store.on('mode', renderMode);
  store.on('editor-mode', renderMode);
  store.on('change', ({ transient } = {}) => {
    renderSceneName();
    renderSplatToggle();

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