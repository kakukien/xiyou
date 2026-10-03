import { store } from '../core/store.js';
import { projects } from '../core/projects.js';
import { ACTION_CARDS, cardToSequence, INTERACTION_TEMPLATES, interactionTemplate } from '../core/templates.js';
import { budget } from '../core/schema.js';
import { player } from '../core/playback.js';
import { log } from './log.js';
import { iconMarkup } from './components/icon.js';
import { listElements, addElementInstance, categoryLabel } from '../core/elements.js';
import { viewport } from '../core/viewport.js';
import { inspectPly } from '../core/ply.js';

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
let assetQuery = '';
let assetKind = 'all';
let selectedAssetId = null;
let selectedSharedId = null;
// 内容浏览器目录选择：'p:<fid>' 项目目录 / 'p:' 项目根 / 's:<fid>' 共享目录 / 's:' 全部共享
let assetFolder = null;
let keyPopoverCleanup = null;

// 行内改名：把 el 换成 input，Enter/失焦提交，Esc 取消
function inlineEditInto(el, current, onCommit) {
  const input = document.createElement('input');
  input.className = 'field ol-inline-edit';
  input.value = current;
  input.style.width = Math.max(80, el.offsetWidth) + 'px';
  el.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const commit = (save) => {
    if (done) return;
    done = true;
    const value = input.value.trim();
    if (save && value && value !== current) onCommit(value);
    requestRender();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') commit(true);
    if (e.key === 'Escape') commit(false);
    e.stopPropagation();
  });
  input.addEventListener('blur', () => commit(true));
  input.addEventListener('click', e => e.stopPropagation());
}

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
    ['assets', '资源库'],
    ['components', '互动组件'],
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

  const spacer = document.createElement('span');
  spacer.className = 'dock-tabs-spacer';
  row.appendChild(spacer);

  const maximize = makeButton('', 'tab dock-max');
  maximize.innerHTML = iconMarkup(dockMaximized ? 'collapse-diagonal-line' : 'expand-diagonal-line', dockMaximized ? '还原面板高度' : '放大编辑区');
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

function assetKindOf(asset) {
  if (asset?.kind && asset.kind !== 'unknown') return asset.kind
  if (asset?.type === 'glb' || asset?.mime?.includes('gltf')) return 'model'
  if (asset?.mime?.startsWith('image/')) return 'image'
  if (asset?.mime?.startsWith('video/')) return 'video'
  if (asset?.mime?.startsWith('audio/')) return 'audio'
  return 'other'
}

function renderAssets() {
  const panel = document.createElement('div');
  panel.className = 'dock-panel content-browser';

  const toolbar = document.createElement('div');
  toolbar.className = 'asset-toolbar';

  const search = document.createElement('input');
  search.className = 'field asset-search';
  search.type = 'search';
  search.placeholder = '搜索资源名称、标签';
  search.value = assetQuery;
  search.addEventListener('input', event => {
    assetQuery = event.target.value;
    requestRender();
    const next = root?.querySelector('.asset-search');
    next?.focus();
    next?.setSelectionRange(assetQuery.length, assetQuery.length);
  });

  const kind = document.createElement('select');
  kind.className = 'field asset-kind';
  [['all', '全部类型'], ['splat', '空间底座'], ['model', '模型'], ['image', '图片'], ['video', '视频'], ['audio', '音频'], ['fx', '特效'], ['template', '模板']].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === assetKind;
    kind.appendChild(option);
  });
  kind.addEventListener('change', event => { assetKind = event.target.value; requestRender(); });

  const importButton = makeButton('', 'btn btn-secondary btn-sm');
  importButton.innerHTML = `${iconMarkup('upload-2-line')}<span>导入资源</span>`;
  importButton.addEventListener('click', () => root?.querySelector('.cb-import input')?.click());
  toolbar.append(search, kind, importButton);
  panel.appendChild(toolbar);
  panel.appendChild(renderSharedElementLibrary());

  // ---- 工作目录树：共享素材库（全员同步）+ 项目素材（仅本工程）----
  const personalId = store.ensureWorkspaceFolders?.() || ''
  if (assetFolder === null) assetFolder = `p:${personalId}`
  const folders = (store.folders || []).filter(item => item.id !== 'fld_shared')
  const sharedFolders = projects.sharedFolders?.() || []
  if (assetFolder.startsWith('p:') && assetFolder !== 'p:' && !folders.some(item => item.id === assetFolder.slice(2))) assetFolder = 'p:'
  if (assetFolder.startsWith('s:') && assetFolder !== 's:' && !sharedFolders.some(item => item.id === assetFolder.slice(2))) assetFolder = 's:'

  const folderScope = () => assetFolder.slice(0, 2) === 's:' ? 'shared' : 'project'
  const folderId = () => assetFolder.slice(2)

  const body = document.createElement('div')
  body.className = 'cb-body'

  const rail = document.createElement('div')
  rail.className = 'cb-folders'

  const addRow = (sel, name, icon, depth, title) => {
    const row = document.createElement('button')
    row.type = 'button'
    row.className = `cb-folder${assetFolder === sel ? ' active' : ''}`
    row.style.paddingLeft = `${6 + depth * 12}px`
    row.innerHTML = `${iconMarkup(icon)}<span>${name}</span>`
    row.title = title || name
    row.addEventListener('click', () => { assetFolder = sel; requestRender() })
    // 素材卡拖上目录行 = 移动到该目录
    row.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; row.classList.add('drop') })
    row.addEventListener('dragleave', () => row.classList.remove('drop'))
    row.addEventListener('drop', event => {
      event.preventDefault()
      row.classList.remove('drop')
      const sharedId = event.dataTransfer?.getData('text/x-xiyou-shared')
      const assetId = event.dataTransfer?.getData('text/x-xiyou-asset')
      const targetScope = sel.startsWith('s:') ? 'shared' : 'project'
      const targetFolder = sel.slice(2)
      if (sharedId) {
        // 共享素材拖到项目目录 = 复制进本工程
        if (targetScope === 'project') {
          const shared = projects.sharedAssets().find(item => item.id === sharedId)
          if (shared) {
            store.addAsset({ ...shared, folder: targetFolder, id: shared.id })
            log(`已从共享素材库引入「${shared.name || sharedId}」`)
          }
        } else {
          projects.updateSharedAsset(sharedId, { folder: targetFolder })
        }
        requestRender()
        return
      }
      if (assetId && targetScope === 'project' && store.moveAssetToFolder?.(assetId, targetFolder)) {
        log(`已移动到「${name}」`)
        requestRender()
      }
    })
    rail.appendChild(row)
  }

  const depthOf = (list, item) => {
    let d = 1, p = item.parent
    while (p) { d += 1; p = list.find(f => f.id === p)?.parent }
    return Math.min(d, 4)
  }

  const sharedHead = document.createElement('div')
  sharedHead.className = 'cb-folders-head'
  sharedHead.textContent = '共享素材库'
  rail.appendChild(sharedHead)
  addRow('s:', '全部共享', 'folder-open-line', 0, '显示共享素材库全部内容')
  const pushShared = parent => {
    sharedFolders.filter(item => (item.parent || '') === parent).forEach(item => {
      addRow(`s:${item.id}`, item.name, 'folder-2-line', depthOf(sharedFolders, item), `共享目录：${item.name}`)
      pushShared(item.id)
    })
  }
  pushShared('')

  const projHead = document.createElement('div')
  projHead.className = 'cb-folders-head'
  projHead.textContent = '项目素材'
  rail.appendChild(projHead)
  addRow('p:', '工程文件', 'folder-open-line', 0, `本工程根目录：${store.scene?.meta?.name || ''}`)
  const pushProject = parent => {
    folders.filter(item => (item.parent || '') === parent).forEach(item => {
      addRow(`p:${item.id}`, item.name, 'folder-2-line', depthOf(folders, item), `项目目录：${item.name}`)
      pushProject(item.id)
    })
  }
  pushProject('')

  const railOps = document.createElement('div')
  railOps.className = 'cb-folders-ops'
  const mkOp = (icon, title, fn) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'btn icon-btn btn-xs'
    b.title = title
    b.innerHTML = iconMarkup(icon)
    b.addEventListener('click', fn)
    return b
  }
  const isSharedScope = folderScope() === 'shared'
  railOps.append(
    mkOp('folder-add-line', `在当前${isSharedScope ? '共享' : '项目'}目录下新建文件夹`, () => {
      const name = window.prompt('文件夹名称', '新建文件夹')
      if (name === null) return
      const f = isSharedScope ? projects.addSharedFolder(name, folderId()) : store.addFolder?.(name, folderId())
      if (f) { assetFolder = `${isSharedScope ? 's' : 'p'}:${f.id}`; requestRender() }
    }),
    mkOp('edit-line', '重命名当前文件夹', () => {
      const id = folderId()
      if (!id) { log('根目录不可重命名', 'warn'); return }
      const cur = (isSharedScope ? sharedFolders : folders).find(item => item.id === id)
      const name = window.prompt('文件夹名称', cur?.name || '')
      if (name === null) return
      if (isSharedScope) projects.renameSharedFolder(id, name)
      else store.renameFolder?.(id, name)
      requestRender()
    }),
    mkOp('delete-bin-6-line', '删除当前文件夹（素材上移到父目录）', () => {
      const id = folderId()
      if (!id) { log('根目录不可删除', 'warn'); return }
      const cur = (isSharedScope ? sharedFolders : folders).find(item => item.id === id)
      if (window.confirm(`删除文件夹「${cur?.name}」？其中素材会上移到父目录。`)) {
        if (isSharedScope) projects.removeSharedFolder(id)
        else store.removeFolder?.(id)
        assetFolder = `${isSharedScope ? 's' : 'p'}:${cur?.parent || ''}`
        requestRender()
      }
    })
  )
  rail.appendChild(railOps)
  body.appendChild(rail)

  const stripWrap = document.createElement('div')
  stripWrap.className = 'cb-strip-wrap'

  const strip = document.createElement('div');
  strip.className = 'asset-strip';

  const sharedScope = assetFolder.startsWith('s:')
  const currentFolderId = assetFolder.slice(2)
  // fld_shared 是旧项目目录里的归档：显示并入共享素材库，不再出现在项目区
  const registryAssets = projects.sharedAssets?.() || []
  const registryIds = new Set(registryAssets.map(item => item.id))
  const legacyShared = (store.scene.meta?.assets || []).filter(item => item.folder === 'fld_shared' && !registryIds.has(item.id))
  const sourceAssets = sharedScope
    ? [...registryAssets, ...legacyShared]
    : (store.scene.meta?.assets || []).filter(item => item.folder !== 'fld_shared')
  const assets = sourceAssets.filter(asset => {
    const category = assetKindOf(asset);
    const haystack = [asset.name, asset.id, asset.kind, asset.type, category, ...(asset.tags || [])].join(' ').toLowerCase();
    const matchesQuery = !assetQuery.trim() || haystack.includes(assetQuery.trim().toLowerCase());
    const matchesKind = assetKind === 'all' || category === assetKind || asset.kind === assetKind || asset.type === assetKind || asset.subtype === assetKind;
    const matchesFolder = currentFolderId === '' || (asset.folder || '') === currentFolderId;
    return matchesQuery && matchesKind && matchesFolder;
  });
  assets.forEach(asset => {
    const card = document.createElement('div');
    card.className = `cb-card${selectedAssetId === asset.id ? ' active' : ''}`;

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
      const typeIcon = { splat: 'landscape-line', model: 'box-3-line', glb: 'box-3-line', image: 'image-2-line', video: 'movie-2-line', audio: 'volume-up-line', fx: 'sparkling-2-line', template: 'layout-grid-line' }[assetKindOf(asset)] || 'file-3-line';
      thumb.innerHTML = `${iconMarkup(typeIcon)}<span>${assetKindOf(asset)}</span>`;
    }

    const name = document.createElement('div');
    name.className = 'cb-name';
    name.textContent = asset.name || asset.id;

    const size = document.createElement('div');
    size.className = 'cb-size';
    size.textContent = formatBytes(asset.bytes ?? asset.size);

    const remove = makeButton('', 'cb-remove');
    remove.innerHTML = iconMarkup('close-line', '删除素材');
    remove.title = '删除素材';
    remove.addEventListener('click', event => {
      event.stopPropagation();
      if (sharedScope) projects.removeSharedAsset(asset.id)
      else store.removeAsset(asset.id);
      requestRender()
    });

    card.append(thumb, name, size, remove);
    card.addEventListener('click', () => {
      if (sharedScope) { selectedSharedId = asset.id; selectedAssetId = null }
      else { selectedAssetId = asset.id; selectedSharedId = null }
      if (assetKindOf(asset) === 'splat') {
        // 共享 splat 素材需先引入本工程，保证场景引用可解析
        if (sharedScope && !(store.scene.meta?.assets || []).some(item => item.id === asset.id)) {
          store.addAsset({ ...asset, folder: '' })
        }
        store.setBase?.({ sog_url: asset.url || '' })
        log(`已将空间底座切换为「${asset.name || asset.id}」`)
      }
      requestRender()
    })
    card.draggable = true;
    card.addEventListener('dragstart', event => {
      if (sharedScope) event.dataTransfer?.setData('text/x-xiyou-shared', asset.id);
      else event.dataTransfer?.setData('text/x-xiyou-asset', asset.id);
    });
    strip.appendChild(card);
  });

  const importCard = document.createElement('button');
  importCard.type = 'button';
  importCard.className = 'cb-card cb-import';
  importCard.innerHTML = `${iconMarkup('upload-2-line', '导入素材')}<span>导入素材</span>`;
  importCard.title = '导入图片、视频、音频、GLB 或高斯泼溅 PLY / SOG / SPZ 文件';

  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = 'image/*,video/*,audio/*,.glb,.gltf,.sog,.ply,.spz,.splat,.ksplat,model/gltf-binary,model/gltf+json';
  input.hidden = true;

  input.addEventListener('change', async () => {
    for (const file of Array.from(input.files || [])) {
      const mime = file.type || '';
      let type = 'asset';
      if (mime.startsWith('image/')) type = 'image';
      else if (mime.startsWith('video/')) type = 'video';
      else if (file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf')) type = 'glb';
      else if (/\.(sog|ply|spz|splat|ksplat)$/i.test(file.name)) type = 'splat';
      else if (mime.startsWith('audio/')) type = 'audio';

      let url = `local://${file.name}`;
      // 本机导入的素材用 blob URL 挂起来，缩略图和贴图立即可见
      if (!window.__xiyouBlobMap) window.__xiyouBlobMap = new Map();
      window.__xiyouBlobMap.set(url, URL.createObjectURL(file));

      const assetProps = {
        name: file.name,
        kind: type === 'glb' ? 'model' : type,
        type,
        folder: currentFolderId,
        size: file.size,
        bytes: file.size,
        mime,
        url,
        metadata: type === 'splat' ? { format: file.name.split('.').pop()?.toLowerCase() || 'ply', local: true } : {}
      }
      const asset = sharedScope
        ? projects.addSharedAsset(assetProps)
        : store.addAsset(assetProps)
      if (asset && type === 'splat') {
        const plyMeta = /\.ply$/i.test(file.name) ? await inspectPly(file) : null
        if (plyMeta) {
          asset.metadata = { ...(asset.metadata || {}), ply: plyMeta }
          const patch = {
            sog_url: url,
            transform: plyMeta.transform,
            coordinate_system: plyMeta.coordinateSystem,
            editing: { transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }, crop: null }
          }
          store.updateAsset?.(asset.id, { metadata: asset.metadata })
          store.setBase?.(patch)
          log(`已分析 PLY：${plyMeta.vertexCount.toLocaleString()} 个 Gaussian，已按 Y-up 居中并落地`, 'info')
        } else {
          store.setBase?.({ sog_url: url, transform: { s: 1, R: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0], scale_source: 'manual' } });
          log(`已导入高斯泼溅「${file.name}」，正在加载到底座`, 'info');
        }
      }
    }
    input.value = '';
  });

  importCard.addEventListener('click', () => input.click());
  importCard.appendChild(input);
  strip.appendChild(importCard);

  stripWrap.appendChild(strip)
  body.appendChild(stripWrap)
  panel.appendChild(body)

  const selectedShared = (projects.sharedAssets?.() || []).find(asset => asset.id === selectedSharedId)
  if (selectedShared) {
    const detail = document.createElement('section')
    detail.className = 'asset-detail'
    const folderOptions = [['', '共享素材库（根）'], ...sharedFolders.map(f => [f.id, f.name])]
      .map(([value, label]) => `<option value="${value}" ${(selectedShared.folder || '') === value ? 'selected' : ''}>${label}</option>`).join('')
    detail.innerHTML = `<div class="asset-detail-head"><div><strong>${selectedShared.name || selectedShared.id}</strong><span>共享素材 · ${selectedShared.kind || selectedShared.type || '资源'}</span></div><button class="btn icon-btn asset-detail-close" title="关闭" aria-label="关闭">${iconMarkup('close-line')}</button></div><div class="asset-detail-grid"><label>目录<select class="field" data-shared-folder>${folderOptions}</select></label><label>标签<input class="field" data-shared-tags value="${(selectedShared.tags || []).join(', ')}"></label></div><div class="muted base-help">共享素材对全部工程可见；拖入工程视口会自动引入本项目。</div>`
    detail.querySelector('.asset-detail-close').addEventListener('click', () => { selectedSharedId = null; requestRender() })
    detail.querySelector('[data-shared-folder]').addEventListener('change', e => { projects.updateSharedAsset(selectedShared.id, { folder: e.target.value }); requestRender() })
    detail.querySelector('[data-shared-tags]').addEventListener('change', e => { projects.updateSharedAsset(selectedShared.id, { tags: e.target.value.split(',').map(v => v.trim()).filter(Boolean) }) })
    panel.appendChild(detail)
    return panel
  }
  const selectedAsset = (store.scene.meta?.assets || []).find(asset => asset.id === selectedAssetId)
  if (selectedAsset) {
    const detail = document.createElement('section')
    detail.className = 'asset-detail'
    const references = store.assetReferences?.(selectedAsset.id) || { objects: [], base: [], total: 0 }
    const refs = references.objects || []
    const refNames = refs.map(object => object.name || object.id)
    const baseRefs = references.base || []
    const refSummary = references.total
      ? `${references.total} 处引用 · ${refNames.length ? `对象：${refNames.join('、')}` : ''}${baseRefs.length ? `${refNames.length ? '；' : ''}底座：${baseRefs.map(item => item.name).join('、')}` : ''}`
      : '暂无引用'
    const folderOptions = [['', '内容（根目录）'], ...(store.folders || []).map(f => [f.id, f.name])]
      .map(([value, label]) => `<option value="${value}" ${(selectedAsset.folder || '') === value ? 'selected' : ''}>${label}</option>`).join('')
    detail.innerHTML = `<div class="asset-detail-head"><div><strong>${selectedAsset.name || selectedAsset.id}</strong><span>${selectedAsset.kind || selectedAsset.type || '资源'} · v${selectedAsset.version || '1.0.0'}</span></div><button class="btn icon-btn asset-detail-close" title="关闭" aria-label="关闭">${iconMarkup('close-line')}</button></div><div class="asset-detail-grid"><label>目录<select class="field" data-asset-field="folder">${folderOptions}</select></label><label>标签<input class="field" data-asset-field="tags" value="${(selectedAsset.tags || []).join(', ')}"></label><label>授权<select class="field" data-asset-field="license"><option value="project" ${selectedAsset.license === 'project' ? 'selected' : ''}>项目</option><option value="site" ${selectedAsset.license === 'site' ? 'selected' : ''}>景区</option><option value="organization" ${selectedAsset.license === 'organization' ? 'selected' : ''}>组织</option></select></label></div><div class="asset-detail-refs"><strong>影响范围</strong><br>${refSummary}</div><div class="asset-detail-actions"><button class="btn btn-secondary btn-sm asset-replace">${iconMarkup('refresh-line')}<span>替换文件</span></button><input type="file" class="asset-replace-input" hidden></div>`
    detail.querySelector('.asset-detail-close').addEventListener('click', () => { selectedAssetId = null; requestRender() })
    const replaceInput = detail.querySelector('.asset-replace-input')
    detail.querySelector('.asset-replace').addEventListener('click', () => replaceInput.click())
    replaceInput.addEventListener('change', () => {
      const file = replaceInput.files?.[0]
      if (!file) return
      const url = `local://${file.name}`
      window.__xiyouBlobMap ||= new Map()
      window.__xiyouBlobMap.set(url, URL.createObjectURL(file))
      const references = store.assetReferences?.(selectedAsset.id) || { objects: [], base: [], total: 0 }
      if (references.total && !window.confirm(`替换资源将影响 ${references.total} 处引用（对象 ${references.objects.length} 个、底座 ${references.base.length} 处），是否继续？`)) {
        replaceInput.value = ''
        return
      }
      const next = store.replaceAsset?.(selectedAsset.id, file, url)
      log(`已替换资源 v${next?.version || selectedAsset.version}，影响 ${references.total} 处引用（对象 ${references.objects.length} 个、底座 ${references.base.length} 处）`)
      replaceInput.value = ''
    })
    detail.querySelectorAll('[data-asset-field]').forEach(field => field.addEventListener('change', () => {
      const key = field.dataset.assetField
      const value = key === 'tags' ? field.value.split(',').map(item => item.trim()).filter(Boolean) : field.value
      store.updateAsset?.(selectedAsset.id, { [key]: value })
    }))
    panel.appendChild(detail)
  }
  return panel;
}

function renderSharedElementLibrary() {
  const panel = document.createElement('section')
  panel.className = 'shared-element-library'
  panel.innerHTML = `<div class="shared-element-library-head"><div><strong>共享素材库</strong><span>常用家具、游戏素材和空间效果</span></div><span class="shared-element-library-count">${listElements({}).length} 个</span></div>`
  const categories = document.createElement('div')
  categories.className = 'shared-element-categories'
  const visibleCategories = ['furniture', 'environment', 'game', 'toy', 'fx', 'interactive']
  visibleCategories.forEach(categoryId => {
    const items = listElements({ categoryId }).slice(0, 8)
    if (!items.length) return
    const group = document.createElement('section')
    group.className = 'shared-element-category'
    group.innerHTML = `<div class="shared-element-category-title"><span>${categoryLabel(categoryId)}</span><small>${items.length}</small></div>`
    const grid = document.createElement('div')
    grid.className = 'shared-element-grid'
    items.forEach(item => {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'shared-element-card'
      card.title = `添加${item.name}到视口`
      card.innerHTML = `<span class="shared-element-icon">${iconMarkup(item.render?.kind === 'effect' ? 'sparkling-2-line' : item.categoryId === 'furniture' ? 'armchair-line' : item.categoryId === 'game' ? 'game-line' : 'shapes-line')}</span><span class="shared-element-name">${item.name}</span><span class="shared-element-action">添加</span>`
      card.addEventListener('click', () => {
        if (store.mode === 'play') return
        const rect = viewport.container?.getBoundingClientRect?.()
        const point = viewport.placementPoint?.(rect ? rect.left + rect.width * 0.52 : window.innerWidth * 0.62, rect ? rect.top + rect.height * 0.48 : window.innerHeight * 0.48) || [0, 0, -3]
        addElementInstance(item.id, point)
      })
      grid.appendChild(card)
    })
    group.appendChild(grid)
    categories.appendChild(group)
  })
  panel.appendChild(categories)
  return panel
}

function renderComponents() {
  const panel = document.createElement('div')
  panel.className = 'dock-panel component-browser'

  const intro = document.createElement('div')
  intro.className = 'component-intro'
  intro.innerHTML = `<div class="component-intro-title">互动组件</div><div class="component-intro-copy">把对象、触发条件和反馈动作组合成可复用的互动元素。</div>`
  panel.appendChild(intro)

  const grid = document.createElement('div')
  grid.className = 'component-grid'
  const obj = currentObject()
  INTERACTION_TEMPLATES.forEach(template => {
    const card = document.createElement('article')
    card.className = 'component-card'
    card.innerHTML = `<div class="component-card-icon">${iconMarkup(template.icon)}</div><div class="component-card-body"><strong>${template.label}</strong><span>${template.description}</span><small>${template.when === 'tap' ? '点击' : template.when === 'gaze' ? '注视' : template.when === 'hold' ? '按住' : '进入区域'}</small></div>`
    const apply = makeButton('', 'btn btn-secondary btn-sm')
    apply.innerHTML = `${iconMarkup('add-line')}<span>添加</span>`
    apply.disabled = !obj
    apply.title = obj ? `应用到「${obj.name || obj.id}」` : '请先选择一个对象'
    apply.addEventListener('click', () => {
      if (!obj) return
      const result = interactionTemplate(template.id, obj.id, obj)
      if (!result) return
      if (result.sequence) {
        const sequence = store.addSequence(result.sequence)
        result.trigger.do = (result.trigger.do || []).map(action => action.action === 'play_seq' ? { ...action, args: { seqId: sequence.id } } : action)
      }
      store.addTrigger(result.trigger)
      log(`已添加互动组件「${template.label}」到 ${obj.name || obj.id}`)
      requestRender()
    })
    card.appendChild(apply)
    grid.appendChild(card)
  })

  if (!obj) {
    const hint = document.createElement('div')
    hint.className = 'component-selection-hint'
    hint.innerHTML = `${iconMarkup('cursor-line')}<span>先在视口或左侧大纲选择一个对象</span>`
    panel.appendChild(hint)
  }
  panel.appendChild(grid)
  return panel
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

  const addSequence = makeButton('', 'btn');
  addSequence.innerHTML = `${iconMarkup('add-line')}<span>新建</span>`;
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
    inlineEditInto(select, current.name || current.id, name => {
      updateSequencePatch(current, { name });
    });
  });

  const deleteSequence = makeButton('删除', 'btn danger');
  deleteSequence.addEventListener('click', () => {
    const current = getSequence();
    if (!current) return;
    const name = current.name || current.id;
    player.stop();
    player.endPreview?.();
    store.removeSequence(current.id);
    selectedSequenceId = null;
    selectedKey = null;
    requestRender();
    toast(`已删除时间线「${name}」· Ctrl+Z 撤销`);
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

  const play = makeButton('', 'btn');
  play.innerHTML = `${iconMarkup('play-fill')}<span>播放</span>`;
  play.disabled = !seq;
  play.addEventListener('click', () => {
    if (seq) player.play(seq.id);
  });

  const stop = makeButton('', 'btn');
  stop.innerHTML = `${iconMarkup('stop-fill')}<span>停止</span>`;
  stop.disabled = !seq;
  stop.addEventListener('click', () => {
    player.stop(true);
    player.endPreview?.();
    playhead = 0;
    requestRender();
  });

  const zoomOut = makeButton('', 'btn');
  zoomOut.innerHTML = iconMarkup('zoom-out-line', '缩小时间刻度');
  zoomOut.title = '缩小时间刻度（Ctrl+滚轮也可）';
  zoomOut.addEventListener('click', () => {
    tlZoom = Math.max(20, tlZoom * 0.75);
    requestRender();
  });
  const zoomIn = makeButton('', 'btn');
  zoomIn.innerHTML = iconMarkup('zoom-in-line', '放大时间刻度');
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
    empty.textContent = '暂无时间线，点击「新建」创建';
    panel.appendChild(empty);
    return panel;
  }

  const durationValue = Number(seq.duration) || 1;
  const NAME_W = 170;
  const availableLaneWidth = Math.max(240, (root?.clientWidth || 900) - NAME_W - 24);
  const pxW = Math.max(200, durationValue * tlZoom, availableLaneWidth);
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
    hint.textContent = '还没有轨道——用下方「轨道」给对象加一条，轨道上双击空白处打关键帧';
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

    const removeTrack = makeButton('', 'tl-track-del');
    removeTrack.innerHTML = iconMarkup('delete-bin-6-line', '删除轨道');
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
      point.dataset.keyAnchor = `${trackIndex}-${keyIndex}`;
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

  const addTrack = makeButton('', 'btn');
  addTrack.innerHTML = `${iconMarkup('add-line')}<span>轨道</span>`;
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

function mountKeyPopover(editor, anchor, scroll) {
  if (!editor || !anchor) return;

  editor.dataset.keyPortal = 'true';
  document.body.appendChild(editor);

  const position = () => {
    if (!document.body.contains(editor) || !document.body.contains(anchor)) return;
    const anchorRect = anchor.getBoundingClientRect();
    const width = editor.offsetWidth;
    const height = editor.offsetHeight;
    const gap = 10;
    const margin = 12;
    let left = anchorRect.left + anchorRect.width / 2 - width / 2;
    let top = anchorRect.bottom + gap;

    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    if (top + height > window.innerHeight - margin) top = anchorRect.top - height - gap;
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));

    editor.style.left = `${Math.round(left)}px`;
    editor.style.top = `${Math.round(top)}px`;
  };

  const cleanup = () => {
    scroll?.removeEventListener('scroll', position);
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
    if (editor.parentNode) editor.remove();
  };

  keyPopoverCleanup = cleanup;
  scroll?.addEventListener('scroll', position, { passive: true });
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  requestAnimationFrame(position);
}

function renderKeyEditor(seq, track, trackIndex, key, keyIndex) {
  const editor = document.createElement('div');
  editor.className = 'key-popover';
  editor.dataset.keyEditor = `${trackIndex}-${keyIndex}`;

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

  const close = makeButton('', 'btn');
  close.innerHTML = iconMarkup('close-line', '关闭');
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

let dockGrip = null;

function render() {
  keyPopoverCleanup?.();
  keyPopoverCleanup = null;
  if (!root) return;
  root.replaceChildren();

  const tabs = renderTabs();
  const content = document.createElement('div');
  content.className = 'dock-content';

  if (activeTab === 'assets') content.appendChild(renderAssets());
  if (activeTab === 'components') content.appendChild(renderComponents());
  if (activeTab === 'timeline') content.appendChild(renderTimeline());
  if (activeTab === 'log') content.appendChild(renderLogs());

  if (dockGrip) root.append(dockGrip);
  root.append(tabs, content, renderStatusbar());

  if (activeTab === 'timeline') {
    const keyEditor = root.querySelector('[data-key-editor]');
    if (keyEditor) {
      const anchor = root.querySelector(`[data-key-anchor=\"${keyEditor.dataset.keyEditor}\"]`);
      mountKeyPopover(keyEditor, anchor, root.querySelector('.tl-scroll'));
    }
  }
}

export function mount(el) {
  root = el;
  root.classList.add('dock');

  // 顶边拖拽调高 + 上次高度记忆
  const savedH = localStorage.getItem('xiyou.dockH');
  if (savedH) root.style.height = savedH;

  dockGrip = document.createElement('div');
  dockGrip.className = 'dock-resize';
  dockGrip.title = '上下拖动调整面板高度';
  dockGrip.innerHTML = '<span class="dock-grip-pill"></span>';
  dockGrip.addEventListener('pointerdown', event => {
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

  store.on('change', requestRender);
  projects.on('shared', requestRender);
  projects.on('projects', requestRender);
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