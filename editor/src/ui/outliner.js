import { store } from '../core/store.js';
import { OBJECT_TYPES } from '../core/schema.js';
import { viewport } from '../core/viewport.js';

const typeLabels = {
  splat_segment: '点云片段',
  quad: '图片平面',
  video_quad: '视频平面',
  glb: 'GLB模型',
  light: '灯光'
};

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function typeLabel(type) {
  const meta = OBJECT_TYPES?.[type];
  return meta?.label || meta?.name || meta?.title || typeLabels[type] || type;
}

function isPlayMode() {
  return store.mode === 'play';
}

function lockedBy(id) {
  const collab = globalThis.collab;
  if (!collab?.lockedBy) return null;
  if (typeof collab.lockedBy === 'function') return collab.lockedBy(id);
  if (collab.lockedBy instanceof Map) return collab.lockedBy.get(id) || null;
  if (typeof collab.lockedBy === 'object') return collab.lockedBy[id] || null;
  return null;
}

function initials(name) {
  const text = String(name || '');
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

function selectedId() {
  return store.selected?.()[0] || null;
}

function selectedNode(scene) {
  const id = selectedId();
  for (const chapter of scene.story?.chapters || []) {
    const node = (chapter.nodes || []).find(item => item.id === id);
    if (node) return node;
  }

  const object = scene.objects?.find(item => item.id === id);
  if (object?.node_id) {
    for (const chapter of scene.story?.chapters || []) {
      const node = (chapter.nodes || []).find(item => item.id === object.node_id);
      if (node) return node;
    }
  }

  return null;
}

function nodeStats(scene, node) {
  const objects = scene.objects || [];
  const triggers = scene.triggers || [];
  const linkedObjects = objects.filter(object => object.node_id === node.id);
  const linkedTriggers = triggers.filter(trigger => {
    if (trigger.target === node.id) return true;
    return linkedObjects.some(object => object.id === trigger.target);
  });

  return {
    text: Boolean(String(node.text || '').trim()),
    placed: linkedObjects.length > 0 || Boolean(node.anchor),
    trigger: linkedTriggers.length > 0 || Boolean(node.on_enter),
    located: Boolean(node.anchor)
  };
}

function nodeMatches(scene, node, query) {
  if (!query) return true;
  const text = [
    node.title,
    node.text,
    node.id
  ].join(' ').toLowerCase();
  return text.includes(query);
}

function chapterMatches(scene, chapter, query) {
  if (!query) return true;
  if ([chapter.title, chapter.id].join(' ').toLowerCase().includes(query)) return true;
  return (chapter.nodes || []).some(node => nodeMatches(scene, node, query));
}

function renderNode(scene, node, chapter, worldOnly = false) {
  const stats = nodeStats(scene, node);
  const selected = selectedId() === node.id;
  const isStart = chapter.nodes?.[0]?.id === node.id;
  const checks = [
    ['文', stats.text],
    ['摆', stats.placed],
    ['触', stats.trigger],
    ['位', stats.located]
  ];

  if (worldOnly) {
    return `
      <div class="tree-item node-card${selected ? ' active' : ''}" data-node-id="${esc(node.id)}">
        <div class="node-thumb">${esc((node.title || '节').slice(0, 1))}</div>
        <div class="node-meta">
          <div class="t">${isStart ? '<span class="node-start">▶</span>' : ''}${esc(node.title || '未命名节点')}</div>
          <div class="s">${esc(node.text || '暂无节点描述')}</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="tree-item node-card${selected ? ' active' : ''}" data-node-id="${esc(node.id)}">
      <div class="node-thumb">${esc((node.title || '节').slice(0, 1))}</div>
      <div class="node-meta">
        <div class="t">${isStart ? '<span class="node-start">▶</span>' : ''}${esc(node.title || '未命名节点')}</div>
        <div class="s">${esc(node.text || '暂无节点描述')}</div>
      </div>
      <div class="node-checks">
        ${checks.map(([label, done]) => `<span class="${done ? 'done' : ''}">${label}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderChapter(scene, chapter, query, worldOnly = false) {
  const nodes = chapter.nodes || [];
  const visibleNodes = nodes.filter(node => nodeMatches(scene, node, query));
  if (query && !chapterMatches(scene, chapter, query)) return '';

  const collapsed = localCollapsed.has(chapter.id);
  const selected = selectedId() === chapter.id;
  const nodeHtml = collapsed
    ? ''
    : visibleNodes.map(node => renderNode(scene, node, chapter, worldOnly)).join('');

  return `
    <div class="ol-chapter" data-chapter-id="${esc(chapter.id)}">
      <div class="ch-row${selected ? ' active' : ''}" data-chapter-toggle="${esc(chapter.id)}">
        <span class="ch-arrow">${collapsed ? '▸' : '▾'}</span>
        <span class="ch-name">${esc(chapter.title || '未命名章节')}</span>
        <span class="ch-count">${nodes.length}/${nodes.length}</span>
      </div>
      <div class="ch-nodes">${nodeHtml}</div>
    </div>
  `;
}

function renderObjects(scene, query, readOnly) {
  const objects = scene.objects || [];
  const groups = new Map();

  for (const object of objects) {
    const text = [object.name, object.type, typeLabel(object.type), object.id].join(' ').toLowerCase();
    if (query && !text.includes(query)) continue;
    if (!groups.has(object.type)) groups.set(object.type, []);
    groups.get(object.type).push(object);
  }

  const groupsHtml = [...groups.entries()].map(([type, items]) => `
    <div class="obj-group" data-object-type="${esc(type)}">
      <div class="obj-group-h">
        <span>${esc(typeLabel(type))}</span>
        <span class="obj-count">${items.length}</span>
      </div>
      ${items.map(object => {
        const selected = selectedId() === object.id;
        const lock = lockedBy(object.id);
        return `
          <div class="tree-item obj-row${selected ? ' active' : ''}" data-object-id="${esc(object.id)}" title="${esc(object.name || object.id)}">
            <span class="obj-icon">${esc(OBJECT_TYPES?.[type]?.icon || '◆')}</span>
            <span class="obj-name">${esc(object.name || '未命名对象')}</span>
            <span class="obj-actions">
              ${lock ? `<span class="obj-lock" title="${esc(lock)}"><i></i>${esc(initials(lock))}</span>` : ''}
              ${object.visible === false ? '<span class="obj-hidden">○</span>' : ''}
              ${readOnly ? '' : `<button class="obj-delete" type="button" data-delete-object="${esc(object.id)}">×</button>`}
            </span>
          </div>
        `;
      }).join('')}
    </div>
  `).join('');

  return `
    <div class="ol-section-title">
      <span>场景对象</span>
      ${readOnly ? '' : '<button class="ol-inline-add" type="button" data-action="add-object">＋添加</button>'}
    </div>
    <div class="ol-object-groups">${groupsHtml || '<div class="ol-empty">暂无场景对象</div>'}</div>
  `;
}

const localCollapsed = new Set();

export function mount(el) {
  let activeTab = 'content';
  let query = '';

  function render() {
    const scene = store.scene;
    const readOnly = isPlayMode();
    const chapters = scene.story?.chapters || [];
    const visibleChapters = chapters.filter(chapter => chapterMatches(scene, chapter, query));
    const worldOnly = activeTab === 'world';

    el.innerHTML = `
      <div class="ol-tabs">
        <button class="tab${activeTab === 'content' ? ' active' : ''}" data-tab="content">内容</button>
        <button class="tab${activeTab === 'world' ? ' active' : ''}" data-tab="world">世界大纲</button>
      </div>
      <div class="ol-search">
        <input class="field" type="search" placeholder="搜索章节、节点、对象" value="${esc(query)}">
      </div>
      <div class="ol-addrow">
        ${readOnly ? '' : `
          <button class="btn" type="button" data-action="add-chapter">＋章节</button>
          <button class="btn" type="button" data-action="add-node">＋节点</button>
        `}
      </div>
      <div class="ol-tree">
        <div class="ol-section-title">剧情章</div>
        <div class="ol-chapters">
          ${visibleChapters.map(chapter => renderChapter(scene, chapter, query, worldOnly)).join('') || '<div class="ol-empty">暂无匹配内容</div>'}
        </div>
        ${worldOnly ? '' : renderObjects(scene, query, readOnly)}
      </div>
    `;

    bind();
  }

  function bind() {
    el.querySelectorAll('[data-tab]').forEach(button => {
      button.addEventListener('click', () => {
        activeTab = button.dataset.tab;
        render();
      });
    });

    const search = el.querySelector('.ol-search input');
    search?.addEventListener('input', event => {
      query = event.target.value.trim().toLowerCase();
      render();
      const next = el.querySelector('.ol-search input');
      next?.focus();
      if (next) next.setSelectionRange(query.length, query.length);
    });

    el.querySelectorAll('[data-chapter-toggle]').forEach(row => {
      row.addEventListener('click', event => {
        const id = row.dataset.chapterToggle;
        if (localCollapsed.has(id)) localCollapsed.delete(id);
        else localCollapsed.add(id);
        render();
      });
    });

    el.querySelectorAll('[data-node-id]').forEach(row => {
      row.addEventListener('click', () => {
        const nodeId = row.dataset.nodeId;
        store.select(nodeId);
        // 聚焦到该节点第一个对象，让视口跟着跳
        const target = (store.scene.objects || []).find(o => o.node_id === nodeId);
        if (target && viewport.focus) viewport.focus(target.id);
      });
    });

    el.querySelectorAll('[data-object-id]').forEach(row => {
      row.addEventListener('click', event => {
        if (event.target.closest('[data-delete-object]')) return;
        store.select(row.dataset.objectId);
      });

      row.addEventListener('dblclick', () => {
        viewport.focus(row.dataset.objectId);
      });
    });

    el.querySelectorAll('[data-delete-object]').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        if (isPlayMode()) return;
        const object = store.getObject(button.dataset.deleteObject);
        if (!object) return;
        if (!window.confirm(`删除对象“${object.name || '未命名对象'}”？`)) return;
        store.removeObject(object.id);
      });
    });

    el.querySelector('[data-action="add-chapter"]')?.addEventListener('click', () => {
      if (isPlayMode()) return;
      const title = window.prompt('章节名称', '新章节');
      if (title === null) return;
      store.addChapter(title.trim() || '新章节');
    });

    el.querySelector('[data-action="add-node"]')?.addEventListener('click', () => {
      if (isPlayMode()) return;
      const chapters = store.scene.story?.chapters || [];
      if (!chapters.length) {
        store.addChapter('新章节');
        return;
      }

      const node = selectedNode(store.scene);
      const chapter = node
        ? chapters.find(item => item.nodes?.some(child => child.id === node.id))
        : chapters[chapters.length - 1];

      if (!chapter) return;
      const title = window.prompt('节点名称', '新节点');
      if (title === null) return;
      store.addNode(chapter.id, { title: title.trim() || '新节点' });
    });

    el.querySelector('[data-action="add-object"]')?.addEventListener('click', event => {
      if (isPlayMode()) return;
      openObjectMenu(event.currentTarget);
    });
  }

  function openObjectMenu(anchor) {
    el.querySelector('.ol-type-menu')?.remove();

    const menu = document.createElement('div');
    menu.className = 'ol-type-menu';
    menu.innerHTML = Object.keys(OBJECT_TYPES || typeLabels).map(type => `
      <button type="button" data-create-type="${esc(type)}">
        <span>${esc(OBJECT_TYPES?.[type]?.icon || '◆')}</span>${esc(typeLabel(type))}
      </button>
    `).join('');

    anchor.parentElement?.appendChild(menu);

    menu.querySelectorAll('[data-create-type]').forEach(button => {
      button.addEventListener('click', () => {
        const object = store.addObject(button.dataset.createType);
        store.select(object.id);
        menu.remove();
      });
    });

    const close = event => {
      if (!menu.contains(event.target) && event.target !== anchor) {
        menu.remove();
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }

  store.on('change', render);
  store.on('selection', render);
  store.on('collab-peers', render);
  store.on('mode', render);

  render();
}