import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DropInViewer, SceneFormat } from '@mkkellogg/gaussian-splats-3d';
import { store } from './store.js';
import { createNode, applyTransform, placeholderTexture } from './objects.js';
import { player, triggers } from './playback.js';
import { log } from '../ui/log.js';

const DEG = Math.PI / 180;

// 底座加载状态，details 面板订阅 xiyou:base-status 事件刷新芯片
export const baseStatus = { state: 'idle', msg: '' };
function setBaseStatus(state, msg = '') {
  baseStatus.state = state;
  baseStatus.msg = msg;
  window.dispatchEvent(new CustomEvent('xiyou:base-status'));
}

function cloneTransform(node) {
  return {
    p: [node.position.x, node.position.y, node.position.z],
    r: [
      node.rotation.x / DEG,
      node.rotation.y / DEG,
      node.rotation.z / DEG
    ],
    s: [node.scale.x, node.scale.y, node.scale.z]
  };
}

function disposeNode(node) {
  node.traverse(child => {
    if (child.geometry) child.geometry.dispose();

    if (child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach(material => {
        if (material.map && material.map.userData?.xiyouDisposable) {
          material.map.dispose();
        }
        if (material.uniforms) {
          Object.values(material.uniforms).forEach(uniform => {
            if (uniform?.value?.isTexture && uniform.value.userData?.xiyouDisposable) {
              uniform.value.dispose();
            }
          });
        }
        material.dispose();
      });
    }
  });
}


function buildColliderMeshCache(root) {
  const meshes = []
  root.updateMatrixWorld(true)
  root.traverse(node => {
    if (!node.isMesh || !node.geometry?.attributes?.position) return
    const geometry = node.geometry
    const positions = geometry.attributes.position.array
    const index = geometry.index?.array || null
    const triangleCount = index ? Math.floor(index.length / 3) : Math.floor(positions.length / 9)
    const localBox = geometry.boundingBox?.clone() || new THREE.Box3().setFromBufferAttribute(geometry.attributes.position)
    const inverse = node.matrixWorld.clone().invert()
    const triangleBounds = new Array(triangleCount)
    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      const ia = index ? index[triangle * 3] * 3 : triangle * 9
      const ib = index ? index[triangle * 3 + 1] * 3 : triangle * 9 + 3
      const ic = index ? index[triangle * 3 + 2] * 3 : triangle * 9 + 6
      triangleBounds[triangle] = {
        minX: Math.min(positions[ia], positions[ib], positions[ic]),
        maxX: Math.max(positions[ia], positions[ib], positions[ic]),
        minY: Math.min(positions[ia + 1], positions[ib + 1], positions[ic + 1]),
        maxY: Math.max(positions[ia + 1], positions[ib + 1], positions[ic + 1]),
        minZ: Math.min(positions[ia + 2], positions[ib + 2], positions[ic + 2]),
        maxZ: Math.max(positions[ia + 2], positions[ib + 2], positions[ic + 2])
      }
    }
    meshes.push({ node, positions, index, triangleCount, triangleBounds, localBox, inverse, worldBox: new THREE.Box3().setFromObject(node) })
  })
  return { root, meshes, builtAt: Date.now() }
}

function rayHitsTriangle(origin, direction, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const edge1x = bx - ax
  const edge1y = by - ay
  const edge1z = bz - az
  const edge2x = cx - ax
  const edge2y = cy - ay
  const edge2z = cz - az
  const hx = direction.y * edge2z - direction.z * edge2y
  const hy = direction.z * edge2x - direction.x * edge2z
  const hz = direction.x * edge2y - direction.y * edge2x
  const det = edge1x * hx + edge1y * hy + edge1z * hz
  if (Math.abs(det) < 1e-8) return false
  const inverse = 1 / det
  const sx = origin.x - ax
  const sy = origin.y - ay
  const sz = origin.z - az
  const u = inverse * (sx * hx + sy * hy + sz * hz)
  if (u < -1e-7 || u > 1 + 1e-7) return false
  const qx = sy * edge1z - sz * edge1y
  const qy = sz * edge1x - sx * edge1z
  const qz = sx * edge1y - sy * edge1x
  const v = inverse * (direction.x * qx + direction.y * qy + direction.z * qz)
  if (v < -1e-7 || u + v > 1 + 1e-7) return false
  const distance = inverse * (edge2x * qx + edge2y * qy + edge2z * qz)
  return distance > 1e-7
}

function pointInsideColliderCache(cache, point) {
  if (!cache?.meshes?.length || !point) return null
  const worldPoint = point instanceof THREE.Vector3 ? point : new THREE.Vector3(...point)
  const worldDirection = new THREE.Vector3(1, 0.00031, 0.00017).normalize()
  let intersections = 0
  let considered = false

  for (const mesh of cache.meshes) {
    if (!mesh.worldBox.containsPoint(worldPoint)) continue
    const localPoint = worldPoint.clone().applyMatrix4(mesh.inverse)
    if (!mesh.localBox.containsPoint(localPoint)) continue
    considered = true
    const localDirection = worldDirection.clone().transformDirection(mesh.inverse).normalize()
    const { positions, index, triangleCount, triangleBounds } = mesh
    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      const bounds = triangleBounds[triangle]
      // Ray 只向 +X 发射；先用三角形 AABB 筛掉绝大多数无关面，
      // 保持精确三角形检测，同时避免相机每帧扫描整份 GLB 网格。
      const epsilon = 1e-7
      if (localPoint.y < bounds.minY - epsilon || localPoint.y > bounds.maxY + epsilon ||
          localPoint.z < bounds.minZ - epsilon || localPoint.z > bounds.maxZ + epsilon ||
          bounds.maxX < localPoint.x - epsilon) continue
      const ia = index ? index[triangle * 3] * 3 : triangle * 9
      const ib = index ? index[triangle * 3 + 1] * 3 : triangle * 9 + 3
      const ic = index ? index[triangle * 3 + 2] * 3 : triangle * 9 + 6
      if (rayHitsTriangle(
        localPoint, localDirection,
        positions[ia], positions[ia + 1], positions[ia + 2],
        positions[ib], positions[ib + 1], positions[ib + 2],
        positions[ic], positions[ic + 1], positions[ic + 2]
      )) intersections += 1
    }
  }

  return considered ? intersections % 2 === 1 : false
}

function objectSignature(obj) {
  return JSON.stringify({
    asset: obj.asset || '',
    material: obj.material || {},
    hitbox: obj.hitbox || {}
  });
}

// 确定性随机：同一段序号永远长出同样的段落
function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function anchorLabelSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = '600 30px system-ui, sans-serif';
  const w = Math.min(240, Math.ceil(ctx.measureText(text).width) + 28);
  const x0 = (256 - w) / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.roundRect(x0, 8, w, 48, 10);
  ctx.fill();
  ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#1c2733';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 33);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.xiyouDisposable = true;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  );
  sprite.scale.set(0.9, 0.225, 1);
  return sprite;
}

export const viewport = {
  container: null,
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  gizmo: null,
  nodes: new Map(),
  nodeSignatures: new Map(),
  streamGroup: null,
  streamSegs: new Map(),
  streamSig: '',
  baseGroup: null,
  baseHelpers: [],
  zoneGroup: null,
  zoneNodes: new Map(),
  pointerDown: null,
  lastPlacementPoint: null,
  keys: new Set(),
  rightMouseDown: false,
  draggingNodeId: null,
  draggingZoneId: null,
  dragLastValidTransform: null,
  dragConstraintWarned: false,
  dragY: null,
  groundLock: false,
  focusState: null,
  resizeObserver: null,
  _storeChangeHandler: null,
  _selectionHandler: null,
  _modeHandler: null,
  baseLoadToken: 0,
  baseLoadState: { total: 0, loaded: 0, failed: 0, progress: 0, lod: 'high', chunks: [] },
  baseLodLevel: 'high',
  colliderCache: null,
  navigationStyle: (() => {
    try { return localStorage.getItem('xiyou.navigationStyle') || 'blender' } catch { return 'blender' }
  })(),

  init(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#dfe6ef');

    this.camera = new THREE.PerspectiveCamera(
      60,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.05,
      500
    );
    this.camera.position.set(4, 3, 6);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(
      Math.max(1, container.clientWidth),
      Math.max(1, container.clientHeight)
    );
    container.appendChild(this.renderer.domElement);

    const hemisphere = new THREE.HemisphereLight(0xffffff, 0xb8c2d0, 1.7);
    hemisphere.position.set(0, 10, 0);
    this.scene.add(hemisphere);

    const directional = new THREE.DirectionalLight(0xffffff, 1.4);
    directional.position.set(5, 8, 4);
    this.scene.add(directional);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    // Blender 风格触控板：普通双指滑动旋转，Shift + 双指滑动平移，
    // Ctrl/⌘ + 双指捏合（浏览器通常表现为 ctrl/meta + wheel）缩放。
    this.renderer.domElement.addEventListener('wheel', event => {
      if (this.navigationStyle !== 'blender') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.handleTrackpadWheel(event);
    }, { passive: false, capture: true });

    this.gizmo = new TransformControls(this.camera, this.renderer.domElement);
    this.gizmo.setMode('translate');
    this.scene.add(this.gizmo.getHelper());

    this.gizmo.addEventListener('dragging-changed', event => {
      this.controls.enabled = !event.value;

      if (event.value) {
        // 时间线拖动预览可能暂时把节点放在关键帧位置；开始手动编辑时先还原预览快照，避免拖动被覆盖。
        player.endPreview?.();
        const selectedId = store.selected()[0]
        const selectedZone = selectedId ? store.getZone?.(selectedId) : null
        if (selectedZone?.locked) {
          this.gizmo.detach()
          this.draggingNodeId = null
          this.draggingZoneId = null
          log(`区域「${selectedZone.name || selectedZone.id}」已锁定`, 'warn')
          return
        }
        const selected = store.selected()[0];
        const obj = selected ? store.getObject(selected) : null;
        const zone = !obj && selected ? store.getZone?.(selected) : null;
        this.draggingNodeId = obj?.id || null;
        this.draggingZoneId = zone?.id || null;
        this.dragY = this.gizmo.object ? this.gizmo.object.position.y : null;
        this.dragLastValidTransform = this.gizmo.object ? cloneTransform(this.gizmo.object) : null;
        this.dragConstraintWarned = false;
      } else {
        if ((this.draggingNodeId || this.draggingZoneId) && this.gizmo.object) {
          const transform = cloneTransform(this.gizmo.object);
          if (this.groundLock && this.dragY !== null) {
            transform.p[1] = this.dragY;
            this.gizmo.object.position.y = this.dragY;
          }
          if (this.draggingNodeId) store.updateObject(this.draggingNodeId, { transform }, { transient: false });
          if (this.draggingZoneId) store.updateZone?.(this.draggingZoneId, { transform }, { transient: false });
        }
        this.draggingNodeId = null;
        this.draggingZoneId = null;
        this.dragLastValidTransform = null;
        this.dragConstraintWarned = false;
        this.dragY = null;
      }
    });

    this.gizmo.addEventListener('objectChange', () => {
      if (!this.gizmo.object || (!this.draggingNodeId && !this.draggingZoneId)) return;

      if (this.groundLock && this.dragY !== null) this.gizmo.object.position.y = this.dragY;
      const transform = cloneTransform(this.gizmo.object);
      const selectedObject = this.draggingNodeId ? store.getObject(this.draggingNodeId) : null;
      const invalidZone = selectedObject && this.positionViolatesZones(this.gizmo.object.position, selectedObject.zone_id);
      if (invalidZone && this.dragLastValidTransform) {
        applyTransform(this.gizmo.object, this.dragLastValidTransform);
        if (!this.dragConstraintWarned) {
          log(`无法移动「${selectedObject.name || selectedObject.id}」：目标位置受空间区域限制`, 'warn');
          this.dragConstraintWarned = true;
        }
        return;
      }
      this.dragLastValidTransform = transform;
      if (this.draggingNodeId) store.updateObject(this.draggingNodeId, { transform }, { transient: true });
      if (this.draggingZoneId) store.updateZone?.(this.draggingZoneId, { transform }, { transient: true });
    });

    this._storeChangeHandler = event => {
      if (event?.transient && (this.draggingNodeId || this.draggingZoneId)) return;
      this.sync();
    };
    this._selectionHandler = () => {
      player.endPreview?.();
      this._syncGizmo();
    };
    this._modeHandler = mode => {
      this.helpersVisible(mode !== 'play');
      this._syncGizmo();
    };

    store.on('change', this._storeChangeHandler);
    store.on('selection', this._selectionHandler);
    store.on('mode', this._modeHandler);

    const dom = this.renderer.domElement;

    dom.addEventListener('contextmenu', event => {
      event.preventDefault();
    });

    dom.addEventListener('pointerdown', event => {
      this.pointerDown = {
        x: event.clientX,
        y: event.clientY,
        button: event.button,
        ctrlKey: event.ctrlKey,
        pointerId: event.pointerId
      };

      if (event.button === 2) this.rightMouseDown = true;
    });

    dom.addEventListener('pointerup', event => {
      if (event.button === 2) this.rightMouseDown = false;
      if (!this.pointerDown) return;

      const dx = event.clientX - this.pointerDown.x;
      const dy = event.clientY - this.pointerDown.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const wasLeft = this.pointerDown.button === 0;

      if (wasLeft && distance < 4) {
        this.lastPlacementPoint = this.placementPoint(event.clientX, event.clientY);
        this._pick(event.clientX, event.clientY, event.ctrlKey);
      }

      this.pointerDown = null;
    });

    window.addEventListener('keydown', event => {
      this.keys.add(event.code);
      if (event.code === 'KeyF') {
        const selected = store.selected()[0];
        if (selected) this.focus(selected);
      }
      if (event.code === 'Escape' && this.anchorPlacement) {
        this.setAnchorPlacement(null);
        store.emit('anchor-placement', null);
      }
    });

    window.addEventListener('keyup', event => {
      this.keys.delete(event.code);
    });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.setBase(store.scene.base);
    this.sync();
    this._syncGizmo();
    this.helpersVisible(store.mode !== 'play');

    return this;
  },

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  },

  placementPoint(clientX, clientY) {
    if (!this.renderer || !this.camera) return [0, 0, -3]
    const rect = this.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(ndc, this.camera)
    const colliders = []
    if (this.colliderGroup) colliders.push(this.colliderGroup)
    const box = this.baseGroup?.getObjectByName?.('base-collider')
    if (box) colliders.push(box)
    if (colliders.length) {
      const hits = ray.intersectObjects(colliders, true)
      if (hits[0]?.point) return hits[0].point.toArray().map(value => Number(value.toFixed(2)))
    }
    return this.groundPoint(clientX, clientY)
  },

  zoneAtPoint(point, kind = '') {
    if (!point || !this.zoneGroup) return null
    for (const zone of store.scene?.zones || []) {
      if (kind && zone.kind !== kind) continue
      const node = this.zoneNodes.get(zone.id)
      if (node && new THREE.Box3().setFromObject(node).containsPoint(new THREE.Vector3(...point))) return zone
    }
    return null
  },

  groundPoint(clientX, clientY) {
    if (!this.renderer || !this.camera) return [0, 0, 0];
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, hit)) return [0, 0, -3];
    return [Number(hit.x.toFixed(2)), 0, Number(hit.z.toFixed(2))];
  },

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;

    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  },

  setGizmo(mode) {
    if (!this.gizmo) return;
    this.gizmo.setMode(mode);
  },

  setSnap({ t = null, r = null, s = null } = {}) {
    if (!this.gizmo) return;

    this.gizmo.setTranslationSnap(t == null ? null : t);
    this.gizmo.setRotationSnap(r == null ? null : r * DEG);
    this.gizmo.setScaleSnap(s == null ? null : s);
  },

  setGroundLock(value) {
    this.groundLock = Boolean(value);
    if (this.groundLock && this.gizmo.object) {
      this.dragY = this.gizmo.object.position.y;
    }
  },

  setNavigationStyle(style) {
    const next = style === 'default' ? 'default' : 'blender';
    this.navigationStyle = next;
    try { localStorage.setItem('xiyou.navigationStyle', next) } catch {}
    return next;
  },

  handleTrackpadWheel(event) {
    if (!this.camera || !this.controls) return;
    const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.container?.clientHeight || 800 : 1;
    const dx = Number(event.deltaX || 0) * factor;
    const dy = Number(event.deltaY || 0) * factor;
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;

    if (event.shiftKey) this.panBy(-dx, -dy);
    else if (event.ctrlKey || event.metaKey) this.dollyBy(dy || dx);
    else this.orbitBy(-dx, -dy);
    this.controls.update();
  },

  orbitBy(dx, dy) {
    const target = this.controls.target;
    const offset = this.camera.position.clone().sub(target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta -= dx * 0.004;
    spherical.phi -= dy * 0.004;
    spherical.phi = Math.max(0.08, Math.min(Math.PI - 0.08, spherical.phi));
    offset.setFromSpherical(spherical);
    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
  },

  panBy(dx, dy) {
    const target = this.controls.target;
    const distance = Math.max(0.1, this.camera.position.distanceTo(target));
    const scale = distance * 0.0016;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    const delta = right.multiplyScalar(-dx * scale).add(up.multiplyScalar(dy * scale));
    this.camera.position.add(delta);
    target.add(delta);
  },

  dollyBy(delta) {
    const target = this.controls.target;
    const offset = this.camera.position.clone().sub(target);
    const scale = Math.exp(delta * 0.0015);
    const nextDistance = Math.max(0.15, Math.min(500, offset.length() * scale));
    offset.setLength(nextDistance);
    this.camera.position.copy(target).add(offset);
  },

  node(id) {
    return this.nodes.get(id) || null;
  },

  sync() {
    if (!this.scene || !store.scene) return;

    const objects = Array.isArray(store.scene.objects)
      ? store.scene.objects
      : [];
    const nextIds = new Set(objects.map(obj => obj.id));

    for (const [id, node] of this.nodes) {
      if (!nextIds.has(id)) {
        if (this.gizmo.object === node) this.gizmo.detach();
        this.scene.remove(node);
        disposeNode(node);
        this.nodes.delete(id);
        this.nodeSignatures.delete(id);
      }
    }

    objects.forEach(objDef => {
      const existing = this.nodes.get(objDef.id);
      const signature = objectSignature(objDef);
      const oldSignature = this.nodeSignatures.get(objDef.id);
      const shouldRebuild = existing && oldSignature !== signature;

      if (!existing || shouldRebuild) {
        if (existing) {
          if (this.gizmo.object === existing) this.gizmo.detach();
          this.scene.remove(existing);
          disposeNode(existing);
        }

        try {
          const node = createNode(objDef, store.scene.meta?.assets || []);
          node.userData.id = objDef.id;
          this.scene.add(node);
          this.nodes.set(objDef.id, node);
          this.nodeSignatures.set(objDef.id, signature);
          applyTransform(node, objDef);
          node.visible = objDef.visible !== false;
        } catch (error) {
          console.error('[viewport] 对象渲染失败', objDef.id, error);
          this.nodeSignatures.set(objDef.id, signature);
        }
        return;
      }

      if (this.draggingNodeId !== objDef.id) {
        applyTransform(existing, objDef);
      }
      existing.visible = objDef.visible !== false;
      this.nodeSignatures.set(objDef.id, signature);
    });

    this.syncAnchors();
    this.syncZones();
    this._syncGizmo();
  },

  syncZones() {
    if (!this.scene) return
    if (this.zoneGroup) {
      this.scene.remove(this.zoneGroup)
      disposeNode(this.zoneGroup)
    }
    this.zoneGroup = new THREE.Group()
    this.zoneNodes.clear()
    this.zoneGroup.userData.isZoneLayer = true
    const zones = Array.isArray(store.scene?.zones) ? store.scene.zones : []
    zones.forEach(zone => {
      const transform = zone.transform || {}
      const p = transform.p || [0, 1, 0]
      const size = transform.s || [2, 2, 2]
      const color = new THREE.Color(zone.color || (zone.kind === 'forbidden' ? '#dc2626' : zone.kind === 'trigger' ? '#d97706' : '#2563eb'))
      const group = new THREE.Group()
      group.name = zone.name || zone.id
      group.position.fromArray(p.map(Number))
      group.rotation.set(...(transform.r || [0, 0, 0]).map(value => Number(value) * DEG))
      group.scale.fromArray(size.map(value => Math.max(0.01, Number(value) || 1)))
      group.userData.zoneId = zone.id
      group.userData.isHelper = true
      group.visible = zone.visible !== false
      const fill = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: zone.kind === 'forbidden' ? 0.10 : 0.08, depthWrite: false, side: THREE.DoubleSide }))
      fill.userData.isHelper = true
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: zone.kind === 'forbidden' ? 0.75 : 0.55 }))
      edges.userData.isHelper = true
      group.add(fill, edges)
      this.zoneGroup.add(group)
      this.zoneNodes.set(zone.id, group)
    })
    this.scene.add(this.zoneGroup)
    this.helpersVisible(store.mode !== 'play')
  },

  // 定位锚点渲染：八面体标记 + 立柱 + 名牌（编辑器可见，play 模式藏）
  syncAnchors() {
    if (!this.scene) return;
    if (this.anchorGroup) {
      this.scene.remove(this.anchorGroup);
      disposeNode(this.anchorGroup);
    }
    this.anchorGroup = new THREE.Group();
    this.anchorGroup.userData.isAnchorLayer = true;

    const anchors = Array.isArray(store.scene?.anchors) ? store.scene.anchors : [];
    for (const anchor of anchors) {
      const t = anchor.pose?.t || [0, 0, 0];
      const color = (anchor.kind === 'poster' || anchor.kind === 'image') ? 0x2e7cf6 : 0xf5822c;

      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.11),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
      );
      marker.position.fromArray(t.map(Number));
      marker.userData.id = anchor.id;
      marker.userData.isHelper = true;
      this.anchorGroup.add(marker);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, Math.max(0.05, t[1]), 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
      );
      stem.position.set(t[0], t[1] / 2, t[2]);
      stem.userData.isHelper = true;
      this.anchorGroup.add(stem);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.14, 0.2, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(t[0], t[1] + 0.01, t[2]);
      ring.userData.isHelper = true;
      this.anchorGroup.add(ring);

      const label = anchorLabelSprite(anchor.name || anchor.id, color);
      label.position.set(t[0], t[1] + 0.34, t[2]);
      label.userData.isHelper = true;
      this.anchorGroup.add(label);
    }
    this.scene.add(this.anchorGroup);
  },

  // 锚点放置模式：非空时下一次左键点击在地面(y=0平面)落锚
  anchorPlacement: null,
  setAnchorPlacement(kind) {
    this.anchorPlacement = kind || null;
    if (this.renderer?.domElement) {
      this.renderer.domElement.style.cursor = kind ? 'crosshair' : '';
    }
  },

  _syncGizmo() {
    if (!this.gizmo) return;

    const selectedId = store.selected()[0];
    const selectedObject = selectedId ? store.getObject(selectedId) : null;
    const zone = !selectedObject && selectedId ? store.getZone?.(selectedId) : null;
    const node = selectedObject ? this.nodes.get(selectedObject.id) : zone ? this.zoneNodes.get(zone.id) : null;

    if (store.mode === 'play' || !node || selectedObject?.visible === false || zone?.visible === false) {
      this.gizmo.detach();
      return;
    }

    if (this.gizmo.object !== node) this.gizmo.attach(node);
  },

  _pick(clientX, clientY, ctrlKey) {
    if (!this.camera || !this.renderer) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);

    if (this.anchorPlacement && store.mode !== 'play') {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const point = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, point)) {
        const anchor = store.addAnchor({
          kind: this.anchorPlacement,
          pose: { t: [point.x, point.y, point.z], r: [0, 0, 0] }
        });
        log(`锚点已放置：${anchor.id} @ (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`);
      }
      this.setAnchorPlacement(null);
      store.emit('anchor-placement', null);
      return;
    }

    const objects = [...this.nodes.values()].filter(node => node.visible);
    const zoneObjects = this.zoneGroup && store.mode !== 'play' ? [this.zoneGroup] : [];
    const hits = raycaster.intersectObjects([...objects, ...zoneObjects], true);

    for (const hit of hits) {
      let current = hit.object;
      let helper = false;
      let id = null;
      let zoneId = null;

      while (current) {
        if (current.userData?.isHelper) helper = true;
        if (!id && current.userData?.id) id = current.userData.id;
        if (!zoneId && current.userData?.zoneId) zoneId = current.userData.zoneId;
        current = current.parent;
      }

      if (zoneId && store.mode !== 'play') {
        store.select(zoneId, { add: Boolean(ctrlKey) });
        break;
      }
      if (helper || !id) continue;

      if (store.mode === 'play') {
        triggers.fire('tap', id);
      } else {
        store.select(id, { add: Boolean(ctrlKey) });
      }
      break;
    }
  },

  disposeBase() {
    if (!this.baseGroup) return Promise.resolve()
    const oldGroup = this.baseGroup
    const oldViewer = this.splatViewer
    this.baseLoadToken += 1
    this.baseGroup = null
    this.splatViewer = null
    this.colliderGroup = null
    this.colliderCache = null
    this.baseHelpers = []
    this.scene?.remove(oldGroup)

    // DropInViewer 自己持有 splat mesh、排序 worker 和可取消下载；必须优先释放，
    // 再释放普通 Three.js 子节点，避免旧 LOD 把显存和 worker 留在后台。
    if (oldViewer) {
      oldGroup.remove(oldViewer)
      Promise.resolve(oldViewer.dispose?.()).catch(error => {
        log(`底座资源释放失败：${error?.message || error}`, 'warn')
      })
    }
    oldGroup.children.slice().forEach(child => {
      oldGroup.remove(child)
      disposeNode(child)
    })
    oldGroup.clear()
    this.baseLoadState = { total: 0, loaded: 0, failed: 0, progress: 0, lod: this.baseLodLevel || 'high', chunks: [] }
    store.emit('base-load', { ...this.baseLoadState })
    return Promise.resolve()
  },

  applyBaseTransform(base) {
    const transform = base?.transform
    if (!transform || !this.baseGroup) return

    if (Array.isArray(transform.R) && transform.R.length === 9) {
      const matrix = new THREE.Matrix4().set(
        transform.R[0], transform.R[1], transform.R[2], 0,
        transform.R[3], transform.R[4], transform.R[5], 0,
        transform.R[6], transform.R[7], transform.R[8], 0,
        0, 0, 0, 1
      )
      this.baseGroup.quaternion.setFromRotationMatrix(matrix)
    }

    const scale = Number(transform.s)
    this.baseGroup.scale.setScalar(Number.isFinite(scale) && scale > 0 ? scale : 1)
    if (Array.isArray(transform.t)) this.baseGroup.position.fromArray(transform.t.map(Number))
  },

  setBase(base) {
    if (!this.scene) return;

    if (this.baseGroup) this.disposeBase()

    const token = ++this.baseLoadToken
    this.baseGroup = new THREE.Group();
    this.baseGroup.visible = base?.visible !== false;
    this.baseGroup.userData.isBase = true;
    this.baseHelpers = [];
    this.colliderCache = null
    this.baseLoadState = { total: 0, loaded: 0, failed: 0, progress: 0, lod: base?.lod?.current || 'high', chunks: [] };
    store.emit('base-load', { ...this.baseLoadState });

    const requestedLod = base?.lod?.current || this.baseLodLevel || 'high'
    const sourceUrl = base?.lod?.urls?.[requestedLod] || base?.sog_url || ''
    const chunks = Array.isArray(base?.chunks) ? base.chunks : []
    const resolveUrl = url => String(url || '').startsWith('local://')
      ? (window.__xiyouBlobMap?.get(url) || url)
      : url
    const sceneFormatFor = url => {
      const extension = String(url || '').split('?')[0].split('#')[0].toLowerCase().split('.').pop()
      if (extension === 'ply') return SceneFormat.Ply
      if (extension === 'splat') return SceneFormat.Splat
      if (extension === 'ksplat') return SceneFormat.KSplat
      if (extension === 'spz') return SceneFormat.Spz
      return undefined
    }
    const loadEntries = chunks
      .map((chunk, index) => {
        const rawUrl = chunk?.lod?.[requestedLod] || chunk?.url || ''
        return {
          id: chunk?.id || `chunk_${index + 1}`,
          name: chunk?.name || chunk?.id || `分块 ${index + 1}`,
          url: resolveUrl(rawUrl),
          format: sceneFormatFor(rawUrl)
        }
      })
      .filter(entry => entry.url)
    if (!loadEntries.length && sourceUrl) loadEntries.push({ id: 'base', name: '主底座', url: resolveUrl(sourceUrl), format: sceneFormatFor(sourceUrl) })
    this.baseLodLevel = requestedLod

    if (!loadEntries.length) {
      const grid = new THREE.GridHelper(
        20,
        20,
        0xa8b4c4,
        0xc8d0dc
      );
      grid.userData.isBaseHelper = true;
      this.baseGroup.add(grid);
      this.baseHelpers.push(grid);

      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(10, 64),
        new THREE.MeshBasicMaterial({
          color: 0xeef1f6,
          transparent: true,
          opacity: 0.55,
          depthWrite: false
        })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.006;
      ground.userData.isBaseHelper = true;
      this.baseGroup.add(ground);
      this.baseHelpers.push(ground);

      const wallData = [
        { text: '现场照片A', position: [0, 2, -6], rotation: [0, 0, 0] },
        { text: '现场照片B', position: [-4.2, 2, -4.2], rotation: [0, -Math.PI / 4, 0] },
        { text: '现场照片C', position: [4.2, 2, -4.2], rotation: [0, Math.PI / 4, 0] }
      ];

      wallData.forEach(item => {
        const texture = placeholderTexture(item.text);
        texture.userData.xiyouDisposable = true;

        const wall = new THREE.Mesh(
          new THREE.PlaneGeometry(4, 4),
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
          })
        );

        wall.position.set(...item.position);
        wall.rotation.set(...item.rotation);
        wall.userData.isBaseHelper = true;
        this.baseGroup.add(wall);
        this.baseHelpers.push(wall);
      });
    } else {
      // DropInViewer 的内部 Viewer 不允许并发 add/remove；按队列异步加载，
      // 单个分块失败只标记本块，后续分块继续加载。
      const viewer = new DropInViewer();
      this.baseGroup.add(viewer);
      this.splatViewer = viewer;
      this.baseLoadState = {
        total: loadEntries.length,
        loaded: 0,
        failed: 0,
        progress: 0,
        lod: requestedLod,
        chunks: loadEntries.map(entry => ({ id: entry.id, name: entry.name, status: 'queued', progress: 0, error: '' }))
      };
      store.emit('base-load', { ...this.baseLoadState });

      const loadNext = async () => {
        for (const [index, entry] of loadEntries.entries()) {
          if (token !== this.baseLoadToken || this.splatViewer !== viewer) return
          const item = this.baseLoadState.chunks[index]
          item.status = 'loading'
          store.emit('base-load', { ...this.baseLoadState, chunks: this.baseLoadState.chunks.map(chunk => ({ ...chunk })) })
          try {
            await Promise.resolve(viewer.addSplatScene(entry.url, {
              ...(entry.format ? { format: entry.format } : {}),
              showLoadingUI: false,
              progressiveLoad: false,
              splatAlphaRemovalThreshold: 1,
              sceneRevealMode: 2,
              onProgress: (percent) => {
                if (token !== this.baseLoadToken || this.splatViewer !== viewer) return
                item.progress = Number.isFinite(percent) ? Math.round(percent) : item.progress
                this.baseLoadState.progress = Math.round(this.baseLoadState.chunks.reduce((sum, chunk) => sum + (chunk.progress || 0), 0) / this.baseLoadState.total)
                store.emit('base-load', { ...this.baseLoadState, chunks: this.baseLoadState.chunks.map(chunk => ({ ...chunk })) })
              }
            }))
            if (token !== this.baseLoadToken || this.splatViewer !== viewer) return
            item.status = 'loaded'
            item.progress = 100
            this.baseLoadState.loaded += 1
          } catch (error) {
            if (token !== this.baseLoadToken || this.splatViewer !== viewer) return
            item.status = 'failed'
            item.error = error?.message || String(error)
            this.baseLoadState.failed += 1
            log(`底座分块「${entry.name}」加载失败：${item.error}`, 'warn')
          }
          this.baseLoadState.progress = Math.round(this.baseLoadState.chunks.reduce((sum, chunk) => sum + (chunk.progress || 0), 0) / this.baseLoadState.total)
          store.emit('base-load', { ...this.baseLoadState, chunks: this.baseLoadState.chunks.map(chunk => ({ ...chunk })) })
        }
        if (token !== this.baseLoadToken || this.splatViewer !== viewer) return
        if (this.baseLoadState.failed) log(`底座分块部分失败：${this.baseLoadState.loaded}/${this.baseLoadState.total} · LOD ${requestedLod}`, 'warn')
        else log(`3GS 底座已加载：${loadEntries.length} 个分块 · LOD ${requestedLod}`, 'info')
      }
      loadNext()
    }

    // Sim3 对齐：base.transform = {s(标量), R(3x3 行主序), t(米)}
    this.applyBaseTransform(base);

    const colliderUrl = base?.collider_url
      ? (String(base.collider_url).startsWith('local://') ? (window.__xiyouBlobMap?.get(base.collider_url) || base.collider_url) : base.collider_url)
      : ''
    if (colliderUrl && /\.(glb|gltf)(\?|$)/i.test(colliderUrl)) {
      const token = this.baseLoadToken
      const loader = new GLTFLoader()
      loader.load(colliderUrl, gltf => {
        if (token !== this.baseLoadToken || !this.baseGroup) {
          disposeNode(gltf.scene)
          return
        }
        this.colliderGroup = gltf.scene
        this.colliderGroup.name = 'base-collider-mesh'
        this.colliderGroup.traverse(child => {
          child.userData.isBaseHelper = true
          child.userData.isHelper = true
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach(material => {
              material.wireframe = true
              material.transparent = true
              material.opacity = 0.35
              material.color?.set('#dc2626')
            })
          }
        })
        this.baseGroup.add(this.colliderGroup)
        this.baseGroup.updateMatrixWorld(true)
        this.colliderCache = buildColliderMeshCache(this.colliderGroup)
        this.baseHelpers.push(this.colliderGroup)
        this.helpersVisible(store.mode !== 'play')
        log(`Collider 已加载并建立精确碰撞缓存：${this.colliderCache.meshes.length} 个网格`, 'info')
      }, undefined, error => log(`Collider 加载失败：${error?.message || error}`, 'warn'))
    }

    const collider = base?.collider || {}
    if (collider.visible) {
      const size = Array.isArray(collider.size) ? collider.size : [20, 2, 20]
      const center = Array.isArray(collider.center) ? collider.center : [0, 1, 0]
      const colliderMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0xdc2626, wireframe: true, transparent: true, opacity: 0.55 })
      )
      colliderMesh.name = 'base-collider'
      colliderMesh.position.fromArray(center.map(Number))
      colliderMesh.scale.fromArray(size.map(value => Math.max(0.01, Number(value) || 1)))
      colliderMesh.userData.isBaseHelper = true
      colliderMesh.userData.isHelper = true
      this.baseGroup.add(colliderMesh)
      this.baseHelpers.push(colliderMesh)
    }

    // 天空穹顶：base.env.sky = {top, horizon, bottom, sun, sunColor} 或 {image:'fx/sky_dusk.jpg'}
    const sky = base?.env?.sky;
    if (sky && sky.image) {
      const tex = new THREE.TextureLoader().load(sky.image);
      tex.colorSpace = THREE.SRGBColorSpace;
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(60, 48, 28),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false })
      );
      dome.name = 'sky-dome';
      dome.userData.isBase = true;
      this.baseGroup.add(dome);
      this.scene.background = null;
    } else if (sky) {
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(sky.top || '#3d6db5') },
          uHorizon: { value: new THREE.Color(sky.horizon || '#dfe8f2') },
          uBottom: { value: new THREE.Color(sky.bottom || '#8a97a8') },
          uSunDir: { value: new THREE.Vector3(...(sky.sun || [0.4, 0.35, -0.6])).normalize() },
          uSunColor: { value: new THREE.Color(sky.sunColor || '#ffd9a0') }
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          varying vec3 vDir;
          uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom;
          uniform vec3 uSunDir; uniform vec3 uSunColor;
          void main(){
            float h = vDir.y;
            vec3 col = h >= 0.0
              ? mix(uHorizon, uTop, pow(min(h*1.6,1.0), 0.75))
              : mix(uHorizon, uBottom, pow(min(-h*2.2,1.0), 0.8));
            float sun = pow(max(dot(vDir, uSunDir), 0.0), 600.0);
            float halo = pow(max(dot(vDir, uSunDir), 0.0), 18.0) * 0.35;
            col += uSunColor * (sun*2.2 + halo);
            gl_FragColor = vec4(col, 1.0);
          }`
      });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 20), skyMat);
      dome.name = 'sky-dome';
      dome.userData.isBase = true;
      this.baseGroup.add(dome);
      this.scene.background = null;
    } else if (this.scene.background === null) {
      this.scene.background = new THREE.Color('#dfe6ef');
    }

    this.scene.add(this.baseGroup);
    this.helpersVisible(store.mode !== 'play');
  },

  helpersVisible(visible) {
    if (this.baseHelpers) {
      this.baseHelpers.forEach(helper => {
        helper.visible = Boolean(visible);
      });
    }

    if (this.anchorGroup) {
      this.anchorGroup.traverse(child => {
        if (child.userData?.isHelper) child.visible = Boolean(visible);
      });
    }

    if (this.zoneGroup) {
      this.zoneGroup.children.forEach(group => {
        const zone = store.getZone?.(group.userData?.zoneId)
        group.visible = Boolean(visible) && zone?.visible !== false
      })
    }

    this.nodes.forEach(node => {
      node.traverse(child => {
        if (child.userData?.isHelper) {
          child.visible = Boolean(visible);
        }
      });
    });

    if (this.gizmo) {
      this.gizmo.visible = Boolean(visible) && store.mode !== 'play';
    }
  },

  pointInsideCollider(point) {
    if (!this.colliderGroup || !point) return null
    if (!this.colliderCache) {
      this.baseGroup?.updateMatrixWorld(true)
      this.colliderCache = buildColliderMeshCache(this.colliderGroup)
    }
    return pointInsideColliderCache(this.colliderCache, point)
  },

  positionViolatesZones(position, zoneId = '') {
    const point = position instanceof THREE.Vector3 ? position : new THREE.Vector3(...position)
    const boxCollider = this.baseGroup?.getObjectByName?.('base-collider')
    if ((this.colliderGroup || boxCollider) && !this.colliderContainsPoint(point)) {
      return { id: 'base-collider', name: '底座碰撞范围' }
    }

    const zones = store.scene?.zones || []
    const contains = zone => {
      const node = this.zoneNodes.get(zone.id)
      return Boolean(node && new THREE.Box3().setFromObject(node).containsPoint(point))
    }
    const forbidden = zones.find(zone => zone.kind === 'forbidden' && zone.visible !== false && contains(zone))
    if (forbidden) return forbidden

    const assigned = zoneId ? store.getZone?.(zoneId) : null
    if (assigned && assigned.kind !== 'forbidden' && assigned.visible !== false && !contains(assigned)) {
      return { ...assigned, name: `${assigned.name || assigned.id}范围` }
    }
    return null
  },

  colliderContainsPoint(point) {
    const exact = this.pointInsideCollider(point)
    if (exact !== null) return exact
    const mesh = this.baseGroup?.getObjectByName?.('base-collider')
    if (!mesh || !point) return false
    const vector = point instanceof THREE.Vector3 ? point : new THREE.Vector3(...point)
    return new THREE.Box3().setFromObject(mesh).containsPoint(vector)
  },

  focus(id) {
    const node = this.nodes.get(id) || this.zoneNodes?.get(id);
    if (!node || !this.camera || !this.controls) return;

    const box = new THREE.Box3().setFromObject(node);
    const sphere = box.getBoundingSphere(new THREE.Sphere());

    const center = sphere.center.clone();
    const radius = Math.max(sphere.radius, 0.25);
    const direction = new THREE.Vector3(1, 0.72, 1).normalize();
    const distance = radius * 2.5 + 0.8;
    const targetPosition = center.clone().add(direction.multiplyScalar(distance));

    this.focusState = {
      elapsed: 0,
      duration: 0.4,
      fromPosition: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      toPosition: targetPosition,
      toTarget: center
    };
  },

  _tickFocus(dt) {
    if (!this.focusState) return;

    const state = this.focusState;
    state.elapsed += dt;
    const t = Math.min(1, state.elapsed / state.duration);
    const eased = 1 - Math.pow(1 - t, 3);

    this.camera.position.lerpVectors(
      state.fromPosition,
      state.toPosition,
      eased
    );
    this.controls.target.lerpVectors(
      state.fromTarget,
      state.toTarget,
      eased
    );
    this.camera.lookAt(this.controls.target);

    if (t >= 1) this.focusState = null;
  },

  cameraMovementBlocked(position) {
    const point = position instanceof THREE.Vector3 ? position : new THREE.Vector3(...position)
    if (this.colliderGroup) {
      const inside = this.pointInsideCollider(point)
      if (inside === false) return { id: 'base-collider', name: '底座碰撞范围' }
    } else {
      const collider = this.baseGroup?.getObjectByName?.('base-collider')
      if (collider && !new THREE.Box3().setFromObject(collider).containsPoint(point)) return { id: 'base-collider', name: '底座碰撞范围' }
    }
    const forbidden = (store.scene?.zones || []).find(zone => {
      const node = this.zoneNodes.get(zone.id)
      return zone.kind === 'forbidden' && zone.visible !== false && node && new THREE.Box3().setFromObject(node).containsPoint(point)
    })
    return forbidden || null
  },

  _tickFlight(dt) {
    if (!this.rightMouseDown || !this.camera || !this.controls) return;

    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')
      ? 6
      : 2.5;
    const distance = speed * dt;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() > 0) forward.normalize();

    const right = new THREE.Vector3()
      .crossVectors(forward, this.camera.up)
      .normalize();

    const movement = new THREE.Vector3();

    if (this.keys.has('KeyW')) movement.add(forward);
    if (this.keys.has('KeyS')) movement.sub(forward);
    if (this.keys.has('KeyD')) movement.add(right);
    if (this.keys.has('KeyA')) movement.sub(right);
    if (this.keys.has('KeyE')) movement.y += 1;
    if (this.keys.has('KeyQ')) movement.y -= 1;

    if (movement.lengthSq() === 0) return;

    movement.normalize().multiplyScalar(distance);
    const nextPosition = this.camera.position.clone().add(movement);
    const blocked = this.cameraMovementBlocked(nextPosition);
    if (blocked) {
      if (this._lastMovementWarning !== blocked.id) {
        this._lastMovementWarning = blocked.id;
        log(`移动受限：${blocked.name || blocked.id}`, 'warn');
      }
      return;
    }
    this._lastMovementWarning = '';
    this.camera.position.copy(nextPosition);
    this.controls.target.add(movement);
  },

  _tickLOD(dt) {
    const base = store.scene?.base
    const lod = base?.lod
    if (!lod?.enabled || !this.camera || !lod.urls) return
    this.baseLodCooldown = Math.max(0, this.baseLodCooldown - dt)
    if (this.baseLodCooldown > 0) return
    const near = Number(lod.thresholds?.near) || 12
    const far = Number(lod.thresholds?.far) || 30
    const origin = new THREE.Vector3(...(base.transform?.t || [0, 0, 0]))
    const distance = this.camera.position.distanceTo(origin)
    const next = distance <= near ? 'high' : distance <= far ? 'medium' : 'low'
    if (next === this.baseLodLevel || !lod.urls[next]) return
    this.baseLodLevel = next
    this.baseLodCooldown = 1.5
    this.setBase({ ...base, lod: { ...lod, current: next } })
    log(`空间底座自动切换到 ${next === 'high' ? '高质量' : next === 'medium' ? '均衡' : '轻量'} LOD`)
  },

  tick(dt) {
    if (!this.camera || !this.controls) return;

    this._tickFlight(dt);
    this._tickFocus(dt);
    this._tickLOD(dt);
    this.controls.update();

    // 动画 shader + 粒子心跳
    this._shaderTime = (this._shaderTime || 0) + dt;
    if (this.scene) {
      const t = this._shaderTime;
      this.scene.traverse(node => {
        const uniforms = node.userData && node.userData.shaderUniforms;
        if (uniforms && uniforms.uTime) uniforms.uTime.value = t;
        if (node.userData && typeof node.userData.animate === 'function') node.userData.animate(t);
      });
    }
  }
};