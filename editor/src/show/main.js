// 西游·虚境 AR 体验端（/xiyou/show.html）
// 模式：poster = MindAR 海报图像追踪定位（iOS/Android 通用）
//       free   = 陀螺仪/拖拽自由漫游（无海报时的兜底）
//       vps    = 视觉定位（接 locdb 查询服务，?vps=<url> 时启用）
import * as THREE from 'three';
import { DropInViewer } from '@mkkellogg/gaussian-splats-3d';
import { createNode } from '../core/objects.js';
// MindAR 走 vendor 目录 + importmap 里的旧版 three（它依赖 sRGBEncoding，新 three 已移除）
let MindARThree = null;

const $ = id => document.getElementById(id);
const hudState = $('hud-state');
const setState = t => { hudState.textContent = t; };

// 动态视口自适应：地址栏/工具栏伸缩时同步相机与渲染尺寸
function syncViewport() {
  const w = visualViewport?.width || innerWidth, h = visualViewport?.height || innerHeight;
  if (freeCamera) { freeCamera.aspect = w / h; freeCamera.updateProjectionMatrix(); }
  freeRenderer?.setSize(w, h);
}
visualViewport?.addEventListener('resize', syncViewport);
addEventListener('resize', syncViewport);

// MindAR 注入的 <video> 可能带行内尺寸或挂到 body 下——观测 DOM 强制铺满
function pinVideos() {
  document.querySelectorAll('video').forEach(v => {
    v.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100dvh;object-fit:cover;z-index:0';
  });
}
new MutationObserver(pinVideos).observe(document.body, { childList: true, subtree: true });
setInterval(pinVideos, 2000);

// ---------- 场景数据 ----------
let sceneData = null;
async function loadScene() {
  const res = await fetch('show/scene.json?v=' + Date.now());
  sceneData = await res.json();
}

// ---------- 建场景内容组 ----------
const sceneContent = new THREE.Group(); // 世界根（poster 模式下会挂到追踪锚点上）
const nodeMap = new Map();

function buildScene() {
  const base = sceneData.base || {};

  // 3GS 底座：定位走 locdb（与泼溅无关），泼溅只作视觉底座。
  // 手机端默认不加载（70万高斯会把帧率压垮），调试时用 ?splat=1 打开。
  const wantSplat = new URLSearchParams(location.search).get('splat') === '1';
  if (base.sog_url && wantSplat) {
    const viewer = new DropInViewer({ sharedMemoryForWorkers: false });
    const baseGroup = new THREE.Group();
    const bt = base.transform;
    if (bt) {
      if (Array.isArray(bt.R) && bt.R.length === 9) {
        const m = new THREE.Matrix4().set(...bt.R, 0, 0, 0, 1);
        baseGroup.quaternion.setFromRotationMatrix(m);
      }
      baseGroup.scale.setScalar(Number(bt.s) > 0 ? Number(bt.s) : 1);
      if (Array.isArray(bt.t)) baseGroup.position.fromArray(bt.t.map(Number));
    }
    baseGroup.add(viewer);
    viewer.addSplatScene(base.sog_url, { showLoadingUI: false, progressiveLoad: false })
      .then(() => setState('底座就绪 · 对准海报'))
      .catch(err => console.warn('splat load fail', err));
    sceneContent.add(baseGroup);
  }

  // 灯光
  sceneContent.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffe8c0, 1.2);
  sun.position.set(4, 8, 6);
  sceneContent.add(sun);

  // 场景对象
  const assets = sceneData.meta?.assets || [];
  for (const [id, objDef] of Object.entries(sceneData.objects || {})) {
    if (objDef.visible === false) continue;
    try {
      const node = createNode({ ...objDef, id }, assets);
      nodeMap.set(id, node);
      sceneContent.add(node);
    } catch (e) { console.warn('object build fail', id, e); }
  }
}

// ---------- 迷你播放器（transform/opacity 轨道） ----------
const playing = [];
function easeValue(v, ease) {
  const t = Math.max(0, Math.min(1, v));
  return ease === 'in' ? t * t : ease === 'out' ? 1 - (1 - t) ** 2 : ease === 'inout' ? t * t * (3 - 2 * t) : t;
}
function sampleTrack(track, time) {
  const keys = [...(track.keys || [])].sort((a, b) => a.t - b.t);
  if (!keys.length) return null;
  if (time <= keys[0].t) return keys[0].v;
  if (time >= keys[keys.length - 1].t) return keys[keys.length - 1].v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (time >= a.t && time <= b.t) {
      const f = easeValue((time - a.t) / Math.max(1e-6, b.t - a.t), a.ease || 'linear');
      if (Array.isArray(a.v)) return a.v.map((va, k) => va + (b.v[k] - va) * f);
      return a.v + (b.v - a.v) * f;
    }
  }
  return null;
}
function playSeq(seqId) {
  const seq = (sceneData.sequences || []).find(s => s.id === seqId);
  if (!seq) return;
  const idx = playing.findIndex(p => p.seq.id === seqId);
  if (idx >= 0) playing.splice(idx, 1);
  playing.push({ seq, t: 0 });
}
function tickPlayer(dt) {
  for (let i = playing.length - 1; i >= 0; i--) {
    const p = playing[i];
    p.t += dt;
    let done = p.t > (p.seq.duration || 2) + 0.05;
    for (const track of p.seq.tracks || []) {
      const node = nodeMap.get(track.target);
      if (!node) continue;
      const v = sampleTrack(track, Math.min(p.t, p.seq.duration || 2));
      if (v == null) continue;
      if (track.kind === 'transform' && Array.isArray(v) && v.length >= 9) {
        node.position.fromArray(v.slice(0, 3));
        node.rotation.set(v[3] * Math.PI / 180, v[4] * Math.PI / 180, v[5] * Math.PI / 180);
        node.scale.fromArray(v.slice(6, 9));
      } else if (track.kind === 'opacity') {
        node.traverse(m => { if (m.material) { m.material.transparent = true; m.material.opacity = v; } });
      }
    }
    if (done) playing.splice(i, 1);
  }
}

// ---------- 触发器 ----------
function fireTap(objId) {
  for (const trg of sceneData.triggers || []) {
    if (trg.target !== objId || trg.when !== 'tap') continue;
    for (const act of trg.do || []) {
      if (act.action === 'play_seq') playSeq(act.args?.seqId || act.args?.seq || act.args?.id);
      else if (act.action === 'show_card' || act.action === 'card') showCard(act.args?.text || act.args?.copy || '');
      else if (act.action === 'highlight') flashNode(trg.target);
    }
  }
}
function showCard(text) {
  $('ar-card-text').textContent = text;
  $('ar-card').classList.add('show');
}
$('ar-card-close').onclick = () => $('ar-card').classList.remove('show');
function flashNode(id) {
  const node = nodeMap.get(id);
  if (!node) return;
  const t0 = performance.now();
  const iv = setInterval(() => {
    const k = (performance.now() - t0) / 600;
    if (k > 1) { clearInterval(iv); node.scale.divideScalar(1.15); return; }
    if (k < 0.5 && !node.userData._flashed) { node.scale.multiplyScalar(1.15); node.userData._flashed = true; }
  }, 50);
}

// ---------- 流式走廊（编辑器同款算法） ----------
const streamSegs = new Map();
const streamGroup = new THREE.Group();
let streamOriginAuto = null, streamSig = '';
function seededRand(seed) { let t = seed + 0x6D2B79F5; return () => { t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function tickStream(camera) {
  const spec = sceneData.stream;
  if (!spec || spec.enabled === false || !Array.isArray(spec.parts) || !spec.parts.length) return;
  let axis = spec.axis === 'x' ? 'x' : 'z';
  let dir = spec.dir === -1 ? -1 : 1;
  if (spec.axis === 'auto' || spec.autoDir || !['x', 'z'].includes(spec.axis)) {
    const fwd = camera.getWorldDirection(new THREE.Vector3());
    axis = Math.abs(fwd.x) > Math.abs(fwd.z) ? 'x' : 'z';
    dir = (axis === 'x' ? fwd.x : fwd.z) >= 0 ? 1 : -1;
  }
  const sig = JSON.stringify(spec) + axis + dir;
  if (sig !== streamSig) {
    streamSegs.forEach(n => streamGroup.remove(n));
    streamSegs.clear();
    streamSig = sig;
    streamOriginAuto = spec.origin === 'auto'
      ? new THREE.Vector3(camera.getWorldPosition(new THREE.Vector3()).x, 0, camera.getWorldPosition(new THREE.Vector3()).z)
      : null;
  }
  const segLen = Math.max(0.5, Number(spec.segLen) || 6);
  const ahead = Math.max(0, Number(spec.ahead ?? 8));
  const behind = Math.max(0, Number(spec.behind ?? 1));
  const origin = streamOriginAuto || new THREE.Vector3(...(spec.origin || [0, 0, 0]));
  const camW = camera.getWorldPosition(new THREE.Vector3());
  const camAx = camW[axis] * dir;
  const idx0 = Math.floor(camAx / segLen);
  for (const [idx, node] of [...streamSegs]) {
    if (idx < idx0 - behind || idx > idx0 + ahead) { streamGroup.remove(node); streamSegs.delete(idx); }
  }
  for (let i = idx0 - behind; i <= idx0 + ahead; i++) {
    if (streamSegs.has(i)) continue;
    const rand = seededRand((i * 2654435761) >>> 0);
    const jitter = Number(spec.jitter) || 0;
    const parts = spec.parts.map(part => {
      const p = { ...(part || {}) };
      if (jitter && Array.isArray(p.p)) p.p = [0, 1, 2].map(k => p.p[k] + (rand() - 0.5) * jitter * (k === 1 ? 0.4 : 1));
      return p;
    });
    const off = [0, 0, 0];
    off[axis === 'x' ? 0 : 2] = dir * i * segLen;
    const node = createNode({
      id: `stream_${i}`, type: 'compound', name: `流段${i}`, parts,
      transform: { p: [origin.x + off[0], origin.y + off[1], origin.z + off[2]] }
    }, sceneData.meta?.assets || []);
    streamGroup.add(node);
    streamSegs.set(i, node);
  }
}

// ---------- 主流程 ----------
const rootEl = $('ar-root');
let mode = 'poster'; // poster | free
let mindar = null;
let freeRenderer = null, freeScene = null, freeCamera = null, freeVideo = null;
let raycaster = new THREE.Raycaster();

function camErr(e) {
  const m = {
    NotAllowedError: '相机权限被拒绝 · 点地址栏左侧图标允许相机后刷新',
    NotFoundError: '未检测到相机设备',
    NotReadableError: '相机被其他应用占用 · 关闭占用程序后重试',
    OverconstrainedError: '相机参数不支持',
    SecurityError: '当前环境不允许相机（需 HTTPS）',
  };
  return m[e?.name] || ('相机启动失败：' + [e?.name, e?.message, String(e)].filter(Boolean).join(' ').slice(0, 80) || '未知错误');
}

// MindAR 失败后的裸相机探测：区分「相机本身不通」和「MindAR 内部初始化失败」
async function probeCam() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    s.getTracks().forEach(t => t.stop());
    return null;
  } catch (e) { return e; }
}

// 相机失败时亮「允许相机」按钮：点一次=以新手势重发系统授权框，能弹出来就不用进设置
function showCamRetry() { $('btn-cam').style.display = 'block'; }

$('btn-cam').onclick = async () => {
  setState('请求相机权限…（弹窗点「允许」）');
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    s.getTracks().forEach(t => t.stop());
    location.reload();
  } catch (e) {
    setState(camErr(e));
    showCard('该浏览器已记住「拒绝」。<br>① 点地址栏左侧锁形图标 → 权限 → 相机 → 允许<br>② 或换系统浏览器（Chrome/Safari）打开本链接<br>③ 微信内打开需点右上角「…」→ 浏览器打开');
  }
};

async function startPosterMode() {
  setState('启动相机与图像追踪…');
  $('scanline').classList.add('on');
  $('reticle').classList.add('on');
  try {
    if (!MindARThree) {
      const url = `${import.meta.env.BASE_URL}vendor/mindar/mindar-image-three.prod.js`;
      const mod = await import(/* @vite-ignore */ url);
      MindARThree = mod.MindARThree || window.MINDAR?.IMAGE?.MindARThree;
    }
  } catch (e) {
    setState('追踪组件加载失败 · 可切「自由漫游」');
    $('hud-actions').style.display = 'flex';
    console.error('[show] mindar import failed', e);
    return;
  }
  if (!MindARThree) {
    setState('追踪组件加载失败 · 可切「自由漫游」');
    $('hud-actions').style.display = 'flex';
    return;
  }
  mindar = new MindARThree({
    container: rootEl,
    imageTargetSrc: 'assets/poster.mind',
    uiLoading: 'no', uiScanning: 'no', uiError: 'no',
    maxTrack: 1
  });
  const { scene, camera } = mindar;

  // 海报锚点：场景锚点位姿的逆 → 让场景锚点落在物理海报上
  const posterAnchor = (sceneData.anchors || []).find(a => a.kind === 'poster');
  const anchor = mindar.addAnchor(0);
  const sceneHolder = new THREE.Group();
  if (posterAnchor?.pose) {
    const pose = new THREE.Matrix4().compose(
      new THREE.Vector3(...(posterAnchor.pose.t || [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(posterAnchor.pose.r || [0, 0, 0]).map(d => d * Math.PI / 180), 'XYZ')),
      new THREE.Vector3(1, 1, 1)
    );
    sceneHolder.matrixAutoUpdate = false;
    sceneHolder.matrix.copy(pose.invert());
  }
  sceneHolder.add(sceneContent);
  sceneHolder.add(streamGroup);
  anchor.group.add(sceneHolder);
  anchor.group.visible = false;

  anchor.onTargetFound = () => {
    anchor.group.visible = true;
    setState('已定位 · 虚境已贴合现实');
    $('scanline').classList.remove('on');
    $('reticle').classList.remove('on');
  };
  anchor.onTargetLost = () => {
    setState('追踪丢失 · 重新对准海报');
    $('scanline').classList.add('on');
    $('reticle').classList.add('on');
  };

  try {
    await mindar.start();
  } catch (e) {
    console.error('[show] mindar.start failed', e);
    const probe = await probeCam();
    if (probe) {
      setState(camErr(probe) + ' · 可切「自由漫游」');
      showCamRetry();
    } else {
      setState('追踪引擎初始化失败：' + String(e?.message || e).slice(0, 60) + ' · 可切「自由漫游」');
    }
    $('scanline').classList.remove('on');
    $('reticle').classList.remove('on');
    $('hud-actions').style.display = 'flex';
    return;
  }
  setState('对准海报定位…');
  $('hud-actions').style.display = 'flex';

  // 相机/追踪看门狗：MindAR 内部 getUserMedia 失败时 start() 可能不抛错，黑屏静默
  setTimeout(async () => {
    if (mode !== 'poster' || anchor.group.visible) return;
    const v = mindar?.video;
    const alive = v && v.srcObject && (v.srcObject.getVideoTracks?.() || []).some(t => t.readyState === 'live');
    if (!alive) {
      const probe = await probeCam();
      if (probe) { setState(camErr(probe)); showCamRetry(); }
      else setState('相机画面未就绪 · 检查权限/占用后刷新，或切「自由漫游」');
    }
  }, 12000);

  // 相机活着但 20s 没识别到海报 → 引导去 VPS
  setTimeout(() => {
    if (mode === 'poster' && !anchor.group.visible) {
      setState('未识别到海报 · 点「扫描定位」用环境定位');
    }
  }, 20000);

  // 点击触发
  rootEl.addEventListener('pointerup', e => {
    if (!anchor.group.visible) return;
    const x = (e.clientX / innerWidth) * 2 - 1, y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera({ x, y }, camera);
    const hits = raycaster.intersectObjects([...nodeMap.values()], true);
    if (hits.length) {
      let o = hits[0].object;
      while (o && !o.userData?.id) o = o.parent;
      if (o?.userData?.id) fireTap(o.userData.id);
    }
  });

  mindar.renderer.setAnimationLoop(() => {
    tickStream(camera);
    tickPlayer(1 / 60);
    mindar.renderer.render(scene, camera);
  });
}

async function startFreeMode() {
  setState('自由漫游 · 转动手机查看');
  freeVideo = document.createElement('video');
  freeVideo.autoplay = true; freeVideo.muted = true; freeVideo.playsInline = true;
  freeVideo.setAttribute('playsinline', '');
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new DOMException('unsupported', 'SecurityError');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    freeVideo.srcObject = stream;
    rootEl.appendChild(freeVideo);
  } catch (e) { setState(camErr(e) + ' · 拖动查看'); showCamRetry(); }

  freeScene = new THREE.Scene();
  freeCamera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 300);
  freeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  freeRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  freeRenderer.setSize(innerWidth, innerHeight);
  rootEl.appendChild(freeRenderer.domElement);

  // 场景摆在人面前 2m 处，地面在 -1.6m
  sceneContent.position.set(0, -1.6, -2);
  streamGroup.position.copy(sceneContent.position);
  freeScene.add(sceneContent, streamGroup);

  // 陀螺仪
  const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const onOrient = e => {
    if (e.alpha == null) return;
    const euler = new THREE.Euler(e.beta * Math.PI / 180, e.alpha * Math.PI / 180, -e.gamma * Math.PI / 180, 'YXZ');
    const q = new THREE.Quaternion().setFromEuler(euler).multiply(q1);
    const o = screen.orientation?.angle ?? window.orientation ?? 0;
    if (o) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -o * Math.PI / 180));
    freeCamera.quaternion.copy(q);
  };
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onOrient); });
  } else {
    addEventListener('deviceorientation', onOrient);
  }
  // 拖拽兜底
  let drag = null;
  rootEl.addEventListener('pointerdown', e => drag = { x: e.clientX, y: e.clientY, yaw: 0, pitch: 0 });
  rootEl.addEventListener('pointermove', e => {
    if (!drag) return;
    const yaw = (e.clientX - drag.x) / innerWidth * Math.PI;
    const pitch = (e.clientY - drag.y) / innerHeight * Math.PI;
    freeCamera.rotation.set(pitch, yaw, 0, 'YXZ');
  });
  rootEl.addEventListener('pointerup', () => drag = null);

  // 点击触发
  rootEl.addEventListener('pointerup', e => {
    const x = (e.clientX / innerWidth) * 2 - 1, y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera({ x, y }, freeCamera);
    const hits = raycaster.intersectObjects([...nodeMap.values()], true);
    if (hits.length) {
      let o = hits[0].object;
      while (o && !o.userData?.id) o = o.parent;
      if (o?.userData?.id) fireTap(o.userData.id);
    }
  });

  freeRenderer.setAnimationLoop(() => {
    tickStream(freeCamera);
    tickPlayer(1 / 60);
    freeRenderer.render(freeScene, freeCamera);
  });
}

// ---------- VPS 视觉定位 ----------
// 帧 -> hloc 服务 (DINOv2 检索 -> SuperPoint+LightGlue -> PnP) -> AR 坐标系位姿。
// 位姿是 COLMAP 约定（相机 +Z 向前、+Y 向下），转 three 需右乘 diag(1,-1,-1)。
const VPS_FALLBACK = 'https://rest-ann-home-chrome.trycloudflare.com'; // 演示隧道，变了就改这里
let VPS_URL = new URLSearchParams(location.search).get('vps')
  || VPS_FALLBACK;
let vpsTimer = null, vpsGyroQ = null, vpsCamQ0 = null, vpsGyroQ0 = null;

function capFrame(video, maxW = 960) {
  const w = video.videoWidth || 640, h = video.videoHeight || 480;
  const s = Math.min(1, maxW / w);
  const c = document.createElement('canvas');
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, 'image/jpeg', 0.72));
}

async function startVpsMode() {
  setState('VPS · 启动相机…');
  if (!navigator.mediaDevices?.getUserMedia) {
    setState(camErr(new DOMException('x', 'SecurityError'))); return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    freeVideo = document.createElement('video');
    freeVideo.autoplay = true; freeVideo.muted = true; freeVideo.playsInline = true;
    freeVideo.setAttribute('playsinline', '');
    freeVideo.srcObject = stream;
    rootEl.appendChild(freeVideo);
  } catch (e) { setState(camErr(e)); showCamRetry(); return; }

  freeScene = new THREE.Scene();
  freeCamera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.05, 300);
  freeCamera.matrixAutoUpdate = false;
  freeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  freeRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  freeRenderer.setSize(innerWidth, innerHeight);
  rootEl.appendChild(freeRenderer.domElement);

  // VPS 模式：场景就站在 AR 世界原点（locdb sfm 已与泼溅/对象同坐标系）
  // 首次定位成功前先隐藏，避免在原点视角下看到错位的对象
  sceneContent.position.set(0, 0, 0);
  sceneContent.quaternion.identity(); sceneContent.matrixAutoUpdate = true;
  sceneContent.visible = false;
  streamGroup.position.set(0, 0, 0);
  freeScene.add(sceneContent, streamGroup);

  const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const onOrient = e => {
    if (e.alpha == null) return;
    const euler = new THREE.Euler(e.beta * Math.PI / 180, e.alpha * Math.PI / 180, -e.gamma * Math.PI / 180, 'YXZ');
    const q = new THREE.Quaternion().setFromEuler(euler).multiply(q1);
    const o = screen.orientation?.angle ?? window.orientation ?? 0;
    if (o) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -o * Math.PI / 180));
    vpsGyroQ = q;
  };
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onOrient); });
  } else {
    addEventListener('deviceorientation', onOrient);
  }

  const flip = new THREE.Matrix4().makeScale(1, -1, -1);
  let busy = false;
  const locate = async () => {
    if (busy || mode !== 'vps' || !freeVideo.videoWidth) return;
    busy = true;
    try {
      const blob = await capFrame(freeVideo);
      const res = await fetch(`${VPS_URL}/locate`, { method: 'POST', body: blob });
      const j = await res.json();
      if (j.ok) {
        const m = new THREE.Matrix4().fromArray(j.cam2world).multiply(flip);
        vpsCamQ0 = new THREE.Quaternion().setFromRotationMatrix(m);
        vpsGyroQ0 = vpsGyroQ ? vpsGyroQ.clone() : null;
        freeCamera.position.setFromMatrixPosition(m);
        freeCamera.quaternion.copy(vpsCamQ0);
        freeCamera.updateMatrix();
        sceneContent.visible = true;
        setState(`已定位 · 内点 ${j.inliers} · ${j.ms}ms`);
      } else {
        console.warn('[vps] locate fail', j);
        const hint = j.max_inliers != null ? ` · 最佳匹配内点 ${j.max_inliers}` : (j.reason ? ` · ${j.reason}` : '');
        setState((vpsCamQ0 ? '定位刷新失败 · 保持上帧位姿' : '定位中…对准舞台/大屏区域缓慢移动') + hint);
      }
    } catch (e) {
      setState('定位服务不可达 · ' + VPS_URL);
    }
    busy = false;
  };
  setState('VPS · 对准环境，首次定位…');
  await locate();
  vpsTimer = setInterval(locate, 4000);

  rootEl.addEventListener('pointerup', e => {
    const x = (e.clientX / innerWidth) * 2 - 1, y = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera({ x, y }, freeCamera);
    const hits = raycaster.intersectObjects([...nodeMap.values()], true);
    if (hits.length) {
      let o = hits[0].object;
      while (o && !o.userData?.id) o = o.parent;
      if (o?.userData?.id) fireTap(o.userData.id);
    }
  });

  const dq = new THREE.Quaternion();
  freeRenderer.setAnimationLoop(() => {
    // 两次 VPS 修正之间，用陀螺仪旋转增量维持姿态（位置等下次定位）
    if (vpsGyroQ && vpsGyroQ0 && vpsCamQ0) {
      dq.copy(vpsGyroQ0).invert().premultiply(vpsGyroQ);
      freeCamera.quaternion.copy(dq).multiply(vpsCamQ0);
      freeCamera.updateMatrix();
    }
    tickStream(freeCamera);
    tickPlayer(1 / 60);
    freeRenderer.render(freeScene, freeCamera);
  });
}

// ---------- 启动 ----------
(async () => {
  // 相机能力前置体检：微信/QQ 内置浏览器等环境通常禁 getUserMedia
  const camOK = !!(navigator.mediaDevices?.getUserMedia) && window.isSecureContext;
  try {
    await loadScene();
    buildScene();
    if (!camOK) {
      $('boot-status').textContent = navigator.mediaDevices?.getUserMedia
        ? '当前页面环境不允许相机（需 HTTPS）'
        : '当前浏览器不支持相机调用 · 请复制链接到系统浏览器（Safari/Chrome）打开';
      $('btn-enter').style.display = 'block';
    } else {
      $('boot-status').textContent = '就绪 · 对准现场的「西游·虚境」海报';
      $('btn-enter').style.display = 'block';
    }
  } catch (e) {
    $('boot-status').textContent = '场景加载失败：' + e.message;
  }
})();

$('btn-vps').onclick = async () => {
  if (mode === 'vps') return; // 已在定位中；手动重扫用「重新定位」
  if (mindar) { try { mindar.stop(); } catch {} }
  clearInterval(vpsTimer);
  [...rootEl.children].forEach(c => c.remove());
  mode = 'vps';
  await startVpsMode();
};
$('btn-mode').onclick = async () => {
  if (mode === 'free') { location.reload(); return; }
  if (mindar) { try { mindar.stop(); } catch {} }
  clearInterval(vpsTimer);
  [...rootEl.children].forEach(c => c.remove());
  mode = 'free';
  sceneContent.position.set(0, -1.6, -2);
  sceneContent.quaternion.identity(); sceneContent.matrixAutoUpdate = true;
  $('btn-mode').textContent = '海报定位';
  await startFreeMode();
};
$('btn-rescan').onclick = () => location.reload();

$('btn-enter').onclick = () => {
  $('boot').style.display = 'none';
  startPosterMode().catch(async e => {
    console.warn('poster mode fail', e);
    setState('海报模式不可用 · 已切自由漫游');
    $('btn-mode').textContent = '海报定位';
    mode = 'free';
    await startFreeMode();
  });
};
