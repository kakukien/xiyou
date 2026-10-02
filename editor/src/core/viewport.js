import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { DropInViewer } from '@mkkellogg/gaussian-splats-3d';
import { store } from './store.js';
import { createNode, applyTransform, placeholderTexture } from './objects.js';
import { triggers } from './playback.js';
import { log } from '../ui/log.js';

const DEG = Math.PI / 180;

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
  pointerDown: null,
  keys: new Set(),
  rightMouseDown: false,
  draggingNodeId: null,
  dragY: null,
  groundLock: false,
  focusState: null,
  resizeObserver: null,
  _storeChangeHandler: null,
  _selectionHandler: null,
  _modeHandler: null,

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

    this.gizmo = new TransformControls(this.camera, this.renderer.domElement);
    this.gizmo.setMode('translate');
    this.scene.add(this.gizmo.getHelper());

    this.gizmo.addEventListener('dragging-changed', event => {
      this.controls.enabled = !event.value;

      if (event.value) {
        const selected = store.selected()[0];
        const obj = selected ? store.getObject(selected) : null;
        this.draggingNodeId = obj?.id || null;
        this.dragY = this.gizmo.object ? this.gizmo.object.position.y : null;
      } else {
        if (this.draggingNodeId && this.gizmo.object) {
          const transform = cloneTransform(this.gizmo.object);
          if (this.groundLock && this.dragY !== null) {
            transform.p[1] = this.dragY;
            this.gizmo.object.position.y = this.dragY;
          }
          store.updateObject(
            this.draggingNodeId,
            { transform },
            { transient: false }
          );
        }
        this.draggingNodeId = null;
        this.dragY = null;
      }
    });

    this.gizmo.addEventListener('objectChange', () => {
      if (!this.gizmo.object || !this.draggingNodeId) return;

      if (this.groundLock && this.dragY !== null) {
        this.gizmo.object.position.y = this.dragY;
      }

      store.updateObject(
        this.draggingNodeId,
        { transform: cloneTransform(this.gizmo.object) },
        { transient: true }
      );
    });

    this._storeChangeHandler = event => {
      if (event?.transient && this.draggingNodeId) return;
      this.sync();
    };
    this._selectionHandler = () => this._syncGizmo();
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
    this._syncGizmo();
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
    const node = selectedObject ? this.nodes.get(selectedObject.id) : null;

    if (store.mode === 'play' || !node || selectedObject?.visible === false) {
      this.gizmo.detach();
      return;
    }

    if (this.gizmo.object !== node) {
      this.gizmo.attach(node);
    }
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
    const hits = raycaster.intersectObjects(objects, true);

    for (const hit of hits) {
      let current = hit.object;
      let helper = false;
      let id = null;

      while (current) {
        if (current.userData?.isHelper) helper = true;
        if (!id && current.userData?.id) id = current.userData.id;
        current = current.parent;
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

  applyBaseTransform(base) {
    const bt = base?.transform;
    if (!bt || !this.baseGroup) return;
    if (Array.isArray(bt.R) && bt.R.length === 9) {
      const m = new THREE.Matrix4().set(
        bt.R[0], bt.R[1], bt.R[2], 0,
        bt.R[3], bt.R[4], bt.R[5], 0,
        bt.R[6], bt.R[7], bt.R[8], 0,
        0, 0, 0, 1
      );
      this.baseGroup.quaternion.setFromRotationMatrix(m);
    }
    this.baseGroup.scale.setScalar(Number(bt.s) > 0 ? Number(bt.s) : 1);
    if (Array.isArray(bt.t)) this.baseGroup.position.fromArray(bt.t.map(Number));
  },

  setBase(base) {
    if (!this.scene) return;

    const url = base?.sog_url || '';
    // 同源快路径：只改显隐/变换时不再重载 PLY（大模型重载要几秒）
    if (this.baseGroup && this._baseUrl === url) {
      this.baseGroup.visible = base?.visible !== false;
      this.applyBaseTransform(base);
      return;
    }
    this._baseUrl = url;

    if (this.baseGroup) {
      this.scene.remove(this.baseGroup);
      this.splatViewer?.viewer?.dispose?.();
      this.splatViewer = null;
      disposeNode(this.baseGroup);
    }

    this.baseGroup = new THREE.Group();
    this.baseGroup.visible = base?.visible !== false;
    this.baseGroup.userData.isBase = true;
    this.baseHelpers = [];

    if (!base?.sog_url) {
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
      // 3GS/PLY 底座：gaussian-splats-3d 支持 .ply/.compressed.ply/.splat/.ksplat/.spz 直读
      // sharedMemoryForWorkers:false —— 静态托管无 COOP/COEP 头，SAB 会炸
      const viewer = new DropInViewer({ sharedMemoryForWorkers: false });
      this.baseGroup.add(viewer);
      this.splatViewer = viewer;
      viewer.addSplatScene(base.sog_url, { showLoadingUI: false, progressiveLoad: false })
        .then(() => log(`3GS 底座已加载：${base.sog_url}`, 'info'))
        .catch(error => log(`底座加载失败：${error?.message || error}`, 'error'));
    }

    // Sim3 对齐：base.transform = {s(标量), R(3x3 行主序), t(米)}
    this.applyBaseTransform(base);

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

  focus(id) {
    const node = this.nodes.get(id);
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
    this.camera.position.add(movement);
    this.controls.target.add(movement);
  },

  // ===== 流式走廊：相机往前走，虚拟路段不断往前铺 =====
  // scene.stream = { enabled, axis:'z'|'x', dir:1|-1, segLen, ahead, behind, origin:[x,y,z], jitter, parts:[compound part…] }
  _tickStream() {
    const spec = store.scene?.stream;
    if (!spec || spec.enabled === false || !Array.isArray(spec.parts) || !spec.parts.length) {
      if (this.streamSegs.size) {
        this.streamSegs.forEach(node => { this.streamGroup.remove(node); disposeNode(node); });
        this.streamSegs.clear();
      }
      this.streamSig = '';
      return;
    }
    if (!this.streamGroup) {
      this.streamGroup = new THREE.Group();
      this.streamGroup.userData.isHelper = true;
      this.scene.add(this.streamGroup);
      log(`流式走廊已启用：${spec.axis || 'z'}轴 · 段长${spec.segLen || 6}m · 前${spec.ahead ?? 8}段`, 'info');
    }

    // axis:'auto'（或未指定合法轴）时跟随相机朝向（面向哪个轴就往哪铺）
    let axis = spec.axis === 'x' ? 'x' : 'z';
    let dir = spec.dir === -1 ? -1 : 1;
    const axisAuto = spec.axis === 'auto' || spec.autoDir || !['x', 'z'].includes(spec.axis);
    if (axisAuto) {
      const fwd = this.camera.getWorldDirection(new THREE.Vector3());
      axis = Math.abs(fwd.x) > Math.abs(fwd.z) ? 'x' : 'z';
      dir = (axis === 'x' ? fwd.x : fwd.z) >= 0 ? 1 : -1;
    }

    const sig = `${JSON.stringify(spec)}|${axis}${dir}`;
    if (sig !== this.streamSig) {
      this.streamSegs.forEach(node => { this.streamGroup.remove(node); disposeNode(node); });
      this.streamSegs.clear();
      this.streamSig = sig;
      // origin:'auto' → 以当下相机脚下为走廊起点（只取一次，转向重建时重取）
      this.streamOriginAuto = spec.origin === 'auto'
        ? [this.camera.position.x, 0, this.camera.position.z]
        : null;
    }

    const segLen = Math.max(0.5, Number(spec.segLen) || 6);
    const ahead = Math.max(0, Number(spec.ahead ?? 8));
    const behind = Math.max(0, Number(spec.behind ?? 1));
    const origin = this.streamOriginAuto || (Array.isArray(spec.origin) ? spec.origin : [0, 0, 0]);

    const camAx = this.camera.position[axis] * dir;
    const idx0 = Math.floor(camAx / segLen);
    const lo = idx0 - behind;
    const hi = idx0 + ahead;

    for (const [idx, node] of [...this.streamSegs]) {
      if (idx < lo || idx > hi) {
        this.streamGroup.remove(node);
        disposeNode(node);
        this.streamSegs.delete(idx);
      }
    }

    for (let i = lo; i <= hi; i++) {
      if (this.streamSegs.has(i)) continue;
      const rand = seededRand((i * 2654435761) >>> 0);
      const jitter = Number(spec.jitter) || 0;
      const parts = spec.parts.map(part => {
        const p = { ...(part || {}) };
        if (jitter && Array.isArray(p.p)) {
          p.p = [0, 1, 2].map(k => p.p[k] + (rand() - 0.5) * jitter * (k === 1 ? 0.4 : 1));
        }
        if (rand() > (p.chance ?? 1)) return null;
        if (p.vary_color && Array.isArray(spec.palette) && spec.palette.length) {
          p.color = spec.palette[Math.floor(rand() * spec.palette.length)];
        }
        return p;
      }).filter(Boolean);

      const offset = [0, 0, 0];
      offset[axis === 'x' ? 0 : 2] = dir * i * segLen;
      const node = createNode({
        id: `stream_${i}`,
        type: 'compound',
        name: `流段 ${i}`,
        parts,
        transform: { p: [origin[0] + offset[0], origin[1] + offset[1], origin[2] + offset[2]] }
      }, store.scene.meta?.assets || []);
      // 流段不进 nodes 表：不可选中、不进拾取；命中盒辅助线一并隐藏
      node.userData.isHelper = true;
      node.traverse(child => { if (child !== node && child.userData?.isHelper) child.visible = false; });
      this.streamGroup.add(node);
      this.streamSegs.set(i, node);
    }
  },

  tick(dt) {
    if (!this.camera || !this.controls) return;

    this._tickFlight(dt);
    this._tickFocus(dt);
    this._tickStream();
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