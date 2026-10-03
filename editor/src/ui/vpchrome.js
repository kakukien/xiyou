import { store } from '../core/store.js';
import { collab } from '../core/collab.js';
import { player } from '../core/playback.js';
import * as THREE from 'three';
import { iconMarkup } from './components/icon.js';

export function mount(wrap, viewport) {
  if (!wrap) return null;

  wrap.classList.add('vpchrome');

  const toolbar = document.createElement('div');
  toolbar.className = 'vp-toolbar';

  const rail = document.createElement('div');
  rail.className = 'vp-rail';

  const labels = document.createElement('div');
  labels.className = 'vp-labels';

  const minimap = document.createElement('canvas');
  minimap.className = 'vp-minimap';
  minimap.title = '俯视小地图';
  minimap.width = 220;
  minimap.height = 160;

  const hud = document.createElement('div');
  hud.className = 'vp-hud-play';
  hud.style.display = 'none';

  const selectionRect = document.createElement('div');
  selectionRect.className = 'sel-rect';
  selectionRect.style.display = 'none';

  wrap.append(toolbar, rail, labels, minimap, hud, selectionRect);

  const state = {
    view: 'perspective',
    selectMode: 'pick',
    gizmo: 'translate',
    lockGround: false,
    selecting: false,
    startX: 0,
    startY: 0,
    lastMapDraw: 0,
    savedCamera: null,
    labels: new Map(),
    dirtyMap: true
  };

  const getCamera = () => viewport.camera || viewport._camera;
  const getControls = () => viewport.controls || viewport._controls;
  const getGizmo = () => viewport.gizmo || viewport.transformControls;

  const callGizmo = (mode) => {
    state.gizmo = mode;
    if (typeof viewport.setGizmoMode === 'function') viewport.setGizmoMode(mode);
    else if (typeof viewport.setGizmo === 'function') viewport.setGizmo(mode);
  };

  const setGroundLock = (locked) => {
    state.lockGround = locked;
    if (typeof viewport.setLockGround === 'function') viewport.setLockGround(locked);
    else if (typeof viewport.setGroundLock === 'function') viewport.setGroundLock(locked);
  };

  const setActive = (group, value) => {
    group.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
    const item = group.querySelector(`[data-value="${value}"]`);
    if (item) item.classList.add('active');
  };

  const button = (text, className = 'tbtn', title = '', iconName = '') => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = className;
    if (iconName) el.innerHTML = `${iconMarkup(iconName, title || text)}<span>${text}</span>`;
    else el.textContent = text;
    if (title) {
      el.title = title;
      el.setAttribute('aria-label', title);
    }
    return el;
  };

  const makeSegment = (items, initial, onChange) => {
    const group = document.createElement('div');
    group.className = 'seg';
    items.forEach((item) => {
      const el = button(item.label, 'tbtn', item.title || item.label);
      el.dataset.value = item.value;
      if (item.value === initial) el.classList.add('active');
      el.addEventListener('click', () => {
        setActive(group, item.value);
        onChange(item.value);
      });
      group.appendChild(el);
    });
    return group;
  };

  const viewGroup = makeSegment(
    [
      { value: 'perspective', label: '透视' },
      { value: 'top', label: '顶视' },
      { value: 'camera', label: '摄像机' }
    ],
    'perspective',
    setView
  );

  toolbar.appendChild(viewGroup);

  const gizmoLabel = document.createElement('span');
  gizmoLabel.className = 'vp-toolbar-label';
  gizmoLabel.textContent = 'Gizmo';
  toolbar.appendChild(gizmoLabel);

  const gizmoGroup = makeSegment(
    [
      { value: 'translate', label: 'W', title: '移动' },
      { value: 'rotate', label: 'E', title: '旋转' },
      { value: 'scale', label: 'R', title: '缩放' }
    ],
    state.gizmo,
    (value) => {
      state.selectMode = 'pick';
      setActive(modeGroup, 'pick');
      callGizmo(value);
    }
  );
  toolbar.appendChild(gizmoGroup);

  const modeGroup = document.createElement('div');
  modeGroup.className = 'vp-toolbar-group';

  const boxButton = button('框选', 'tbtn');
  boxButton.dataset.value = 'box';
  const pickButton = button('滴选', 'tbtn active');
  pickButton.dataset.value = 'pick';
  modeGroup.append(boxButton, pickButton);
  toolbar.appendChild(modeGroup);

  const lockButton = button('锁地面', 'tbtn');
  lockButton.addEventListener('click', () => {
    setGroundLock(!state.lockGround);
    lockButton.classList.toggle('active', state.lockGround);
  });
  toolbar.appendChild(lockButton);

  const groundButton = button('回到地面', 'tbtn', '将当前选中对象的最低点吸附到地面', 'arrow-down-to-line');
  groundButton.addEventListener('click', () => viewport.snapSelectedToGround?.());
  toolbar.appendChild(groundButton);

  const navigationButton = button('切换操作', 'navigation-mode-button', '切换操作方式', 'shuffle-line');
  navigationButton.addEventListener('click', () => {
    const next = viewport.navigationStyle === 'blender' ? 'default' : 'blender';
    viewport.setNavigationStyle?.(next);
    navigationButton.classList.toggle('is-default', next === 'default');
    navigationButton.title = next === 'blender' ? '当前：Blender 触控板操作' : '当前：默认操作方式';
  });
  navigationButton.classList.toggle('is-default', viewport.navigationStyle === 'default');
  toolbar.appendChild(navigationButton);

  const railItems = [
    { value: 'none', label: '', icon: 'cursor-line', title: '点选' },
    { value: 'translate', label: '', icon: 'drag-move-2-line', title: '移动' },
    { value: 'rotate', label: '', icon: 'refresh-line', title: '旋转' },
    { value: 'scale', label: '', icon: 'expand-diagonal-line', title: '缩放' },
    { value: 'annotate', label: '', icon: 'edit-2-line', title: '标注', disabled: true }
  ];

  const railButtons = new Map();
  railItems.forEach((item) => {
    const el = button(item.label, 'vp-rail-btn', item.title, item.icon);
    if (item.disabled) {
      el.disabled = true;
      el.classList.add('disabled');
    }
    if (item.value === 'none') el.classList.add('active');
    el.addEventListener('click', () => {
      if (item.disabled) return;
      railButtons.forEach((entry) => entry.classList.remove('active'));
      el.classList.add('active');
      if (item.value === 'none') {
        const gizmo = getGizmo();
        if (gizmo && typeof gizmo.detach === 'function') gizmo.detach();
        state.selectMode = 'pick';
        setActive(modeGroup, 'pick');
      } else {
        state.selectMode = 'pick';
        setActive(modeGroup, 'pick');
        callGizmo(item.value);
      }
    });
    railButtons.set(item.value, el);
    rail.appendChild(el);
  });

  boxButton.addEventListener('pointerdown', event => event.stopPropagation());
  pickButton.addEventListener('pointerdown', event => event.stopPropagation());

  boxButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.selectMode = 'box';
    setActive(modeGroup, 'box');
    railButtons.get('none')?.classList.remove('active');
    const gizmo = getGizmo();
    if (gizmo && typeof gizmo.detach === 'function') gizmo.detach();
  });

  pickButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.selectMode = 'pick';
    setActive(modeGroup, 'pick');
    railButtons.forEach((entry, value) => entry.classList.toggle('active', value === 'none'));
  });

  function setView(view) {
    state.view = view;
    const camera = getCamera();
    const controls = getControls();
    if (!camera) return;

    if (!state.savedCamera) {
      state.savedCamera = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        target: controls && controls.target ? controls.target.clone() : new THREE.Vector3()
      };
    }

    if (view === 'top') {
      camera.position.set(0, 12, 0.001);
      camera.up.set(0, 0, -1);
      camera.lookAt(0, 0, 0);
      if (controls) {
        controls.enableRotate = false;
        if (controls.target) controls.target.set(0, 0, 0);
        if (typeof controls.update === 'function') controls.update();
      }
      return;
    }

    if (view === 'camera') {
      const cameraObject = findSceneCamera();
      if (cameraObject) {
        camera.position.copy(cameraObject.position);
        camera.quaternion.copy(cameraObject.quaternion);
      } else {
        restorePerspective();
      }
      if (controls) controls.enableRotate = true;
      if (typeof viewport.frameAll === 'function') viewport.frameAll();
      return;
    }

    restorePerspective();
  }

  function restorePerspective() {
    const camera = getCamera();
    const controls = getControls();
    if (!camera) return;
    if (state.savedCamera) {
      camera.position.copy(state.savedCamera.position);
      camera.quaternion.copy(state.savedCamera.quaternion);
      camera.up.set(0, 1, 0);
      if (controls && controls.target) controls.target.copy(state.savedCamera.target);
    }
    if (controls) {
      controls.enableRotate = true;
      if (typeof controls.update === 'function') controls.update();
    }
    if (typeof viewport.frameAll === 'function') viewport.frameAll();
  }

  function findSceneCamera() {
    const objects = store.scene.objects || [];
    const cameraDef = objects.find((obj) => obj.type === 'camera' || obj.name === '摄像机');
    if (!cameraDef) return null;
    const node = getViewportNode(cameraDef.id);
    return node || null;
  }

  function getViewportNode(id) {
    if (typeof viewport.node === 'function') return viewport.node(id);
    const map = viewport.meshById;
    if (map && typeof map.get === 'function') return map.get(id);
    if (map) return map[id];
    return null;
  }

  function getViewportEntries() {
    const map = viewport.meshById;
    if (map && typeof map.entries === 'function') return [...map.entries()];
    if (map) return Object.entries(map);
    return (store.scene.objects || [])
      .map((obj) => [obj.id, getViewportNode(obj.id)])
      .filter((entry) => entry[1]);
  }

  function objectScreenPosition(node) {
    const camera = getCamera();
    if (!camera || !node) return null;

    const rect = wrap.getBoundingClientRect();
    const world = new THREE.Vector3();
    node.getWorldPosition(world);
    const projected = world.clone().project(camera);

    if (projected.z < -1 || projected.z > 1) return null;

    return {
      x: (projected.x * 0.5 + 0.5) * rect.width,
      y: (-projected.y * 0.5 + 0.5) * rect.height,
      z: projected.z
    };
  }

  function updateLabels() {
    const selected = new Set(store.selected());
    const known = new Set();
    const camPos = viewport.camera ? viewport.camera.position : null;

    // 只显示最近的 10 个 + 选中项，防标签糊屏
    const candidates = [];
    (store.scene.objects || []).forEach((obj) => {
      const node = getViewportNode(obj.id);
      if (!node || obj.visible === false) return;
      const world = new THREE.Vector3();
      node.getWorldPosition(world);
      const dist = camPos ? world.distanceTo(camPos) : world.length();
      if (dist > 60) return;
      candidates.push({ obj, node, dist });
    });
    candidates.sort((a, b) => a.dist - b.dist);
    const shown = new Set(selected);
    candidates.slice(0, 10).forEach(c => shown.add(c.obj.id));

    candidates.forEach(({ obj, node, dist }) => {
      known.add(obj.id);
      let label = state.labels.get(obj.id);
      if (!label) {
        label = document.createElement('div');
        label.className = 'vp-label';
        labels.appendChild(label);
        state.labels.set(obj.id, label);
      }

      const pos = objectScreenPosition(node);
      const name = obj.type === 'splat_segment'
        ? `分块 ${obj.name || obj.id}`
        : (obj.name || obj.id);

      label.textContent = name;
      label.classList.toggle('sel', selected.has(obj.id));

      if (!pos || !shown.has(obj.id)) {
        label.style.display = 'none';
      } else {
        label.style.display = '';
        label.style.opacity = dist > 25 ? '0.55' : '';
        label.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -100%)`;
      }
    });

    state.labels.forEach((label, id) => {
      if (!known.has(id)) {
        label.remove();
        state.labels.delete(id);
      }
    });
  }

  function drawMinimap() {
    const ctx = minimap.getContext('2d');
    if (!ctx) return;

    const width = minimap.width;
    const height = minimap.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(19, 22, 27, 0.92)';
    ctx.fillRect(0, 0, width, height);

    const objects = store.scene.objects || [];
    const points = objects.map((obj) => {
      const p = obj.transform && obj.transform.p ? obj.transform.p : [0, 0, 0];
      return { obj, x: Number(p[0]) || 0, z: Number(p[2]) || 0 };
    });

    const baseRadius = store.scene.base && store.scene.base.transform
      ? Math.max(
        Math.abs(store.scene.base.transform.t?.[0] || 0),
        Math.abs(store.scene.base.transform.t?.[2] || 0),
        5
      )
      : 5;

    let minX = -baseRadius;
    let maxX = baseRadius;
    let minZ = -baseRadius;
    let maxZ = baseRadius;

    points.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    });

    const margin = 18;
    const spanX = Math.max(1, maxX - minX);
    const spanZ = Math.max(1, maxZ - minZ);
    const scale = Math.min((width - margin * 2) / spanX, (height - margin * 2) / spanZ);
    const toCanvas = (x, z) => ({
      x: margin + (x - minX) * scale,
      y: margin + (z - minZ) * scale
    });

    ctx.strokeStyle = 'rgba(125, 137, 153, .28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

    const colors = {
      quad: '#4e9bea',
      video_quad: '#b16cea',
      glb: '#e98942',
      splat_segment: '#9aa5ae',
      light: '#e8c94c'
    };

    const selected = new Set(store.selected());

    points.forEach(({ obj, x, z }) => {
      const point = toCanvas(x, z);
      const radius = selected.has(obj.id) ? 5 : 3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = colors[obj.type] || '#c5cbd3';
      ctx.fill();
      if (selected.has(obj.id)) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    const camera = getCamera();
    if (camera) {
      const point = toCanvas(camera.position.x, camera.position.z);
      const direction = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(camera.quaternion);
      const angle = Math.atan2(direction.x, direction.z);
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(4, 5);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fillStyle = '#f2f5f8';
      ctx.fill();
      ctx.restore();
    }
  }

  function projectSelection(x1, y1, x2, y2) {
    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    const ids = [];

    getViewportEntries().forEach(([id, node]) => {
      if (!node || node.userData?.isHelper) return;
      const pos = objectScreenPosition(node);
      if (!pos) return;
      if (pos.x >= left && pos.x <= right && pos.y >= top && pos.y <= bottom) ids.push(id);
    });
    viewport.zoneNodes?.forEach((node, id) => {
      if (!node || node.visible === false) return;
      const pos = objectScreenPosition(node);
      if (pos && pos.x >= left && pos.x <= right && pos.y >= top && pos.y <= bottom) ids.push(id);
    });

    if (ids.length) {
      store.select(ids[0]);
      ids.slice(1).forEach((id) => store.select(id, { add: true }));
    } else {
      store.select(null);
    }
  }

  function updateSelectionRect(x, y) {
    const left = Math.min(state.startX, x);
    const top = Math.min(state.startY, y);
    const width = Math.abs(x - state.startX);
    const height = Math.abs(y - state.startY);
    selectionRect.style.display = '';
    selectionRect.style.left = `${left}px`;
    selectionRect.style.top = `${top}px`;
    selectionRect.style.width = `${width}px`;
    selectionRect.style.height = `${height}px`;
  }

  wrap.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.vp-toolbar, .vp-rail, .vp-minimap, .vp-hud-play')) return;
    if (state.selectMode !== 'box' || event.button !== 0) return;
    const rect = wrap.getBoundingClientRect();
    state.selecting = true;
    state.startX = event.clientX - rect.left;
    state.startY = event.clientY - rect.top;
    updateSelectionRect(state.startX, state.startY);
    wrap.setPointerCapture?.(event.pointerId);
  });

  wrap.addEventListener('pointermove', (event) => {
    if (!state.selecting) return;
    const rect = wrap.getBoundingClientRect();
    updateSelectionRect(event.clientX - rect.left, event.clientY - rect.top);
  });

  wrap.addEventListener('pointerup', (event) => {
    if (!state.selecting) return;
    const rect = wrap.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    state.selecting = false;
    selectionRect.style.display = 'none';
    projectSelection(state.startX, state.startY, x, y);
    wrap.releasePointerCapture?.(event.pointerId);
  });

  let hudNodeId = null;
  store.on('node-goto', ({ nodeId } = {}) => { hudNodeId = nodeId || null; });

  function currentNode() {
    const story = store.scene.story;
    const all = (story?.chapters || []).flatMap((chapter) => chapter.nodes || []);
    return all.find((node) => node.id === hudNodeId) || all[0] || null;
  }

  function gotoNode(node) {
    if (!node) return;
    hudNodeId = node.id;
    store.emit?.('node-goto', { nodeId: node.id });
    renderHud();
  }

  function renderHud() {
    const node = currentNode();
    const all = (store.scene.story?.chapters || []).flatMap((chapter) => chapter.nodes || []);
    const index = node ? all.findIndex((entry) => entry.id === node.id) : -1;
    const prev = index > 0 ? all[index - 1] : null;
    const next = index >= 0 && index < all.length - 1 ? all[index + 1] : null;

    hud.innerHTML = '';

    const previousButton = button('', 'vp-hud-nav', '上一节点', 'arrow-left-line');
    const title = document.createElement('span');
    title.className = 'vp-hud-node';
    title.innerHTML = `<small>当前节点</small><strong>${node ? node.title || node.id : '尚未选择节点'}</strong>`;
    const nextButton = button('', 'vp-hud-nav', '下一节点', 'arrow-right-line');
    const resetButton = button('重置试玩', 'vp-hud-reset', '重置试玩', 'restart-line');
    const progress = document.createElement('span');
    progress.className = 'vp-hud-progress';
    progress.innerHTML = `<b>${node && index >= 0 ? index + 1 : 0}</b><span>/ ${all.length}</span>`;

    previousButton.disabled = !prev;
    nextButton.disabled = !next;
    resetButton.disabled = !all.length;
    previousButton.addEventListener('click', () => gotoNode(prev));
    nextButton.addEventListener('click', () => gotoNode(next));
    resetButton.addEventListener('click', () => {
      player.stop(true);
      gotoNode(all[0]);
    });

    hud.append(previousButton, title, nextButton, resetButton, progress);
  }

  function updateMode(mode) {
    const playing = mode === 'play';
    toolbar.style.display = playing ? 'none' : '';
    rail.style.display = playing ? 'none' : '';
    minimap.style.display = playing ? 'none' : '';
    hud.style.display = playing ? '' : 'none';
    if (playing) renderHud();
  }

  store.on('selection', () => {
    state.dirtyMap = true;
    updateLabels();
  });

  store.on('change', () => {
    state.dirtyMap = true;
    updateLabels();
  });

  store.on('mode', updateMode);
  store.on('node-goto', renderHud);

  if (collab && typeof collab.on === 'function') {
    collab.on('peers', () => store.emit?.('collab-peers'));
    collab.on('collab-peers', () => store.emit?.('collab-peers'));
  }

  let running = true;
  const loop = (time) => {
    if (!running) return;
    updateLabels();
    if (state.dirtyMap || time - state.lastMapDraw > 500) {
      drawMinimap();
      state.lastMapDraw = time;
      state.dirtyMap = false;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  updateMode(store.mode || 'edit');
  drawMinimap();

  return {
    destroy() {
      running = false;
      toolbar.remove();
      rail.remove();
      labels.remove();
      minimap.remove();
      hud.remove();
      selectionRect.remove();
    }
  };
}