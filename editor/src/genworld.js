// 体素「造梦 · 故事空间」世界生成器 → GLB
// 跑法: npx vite dev → 开 /xiyou/genworld.html → window.__export() 拿 ArrayBuffer
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const S = 0.45; // 体素边长(米)
const cells = new Map(); // "x,y,z" -> {c:[r,g,b], k:'o'|'g'|'w'}
const key = (x, y, z) => `${x},${y},${z}`;
const set = (x, y, z, c, k = 'o') => cells.set(key(x | 0, y | 0, z | 0), { c, k });
const has = (x, y, z) => cells.has(key(x, y, z));
const box = (x0, y0, z0, x1, y1, z1, c, k) => {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, c, k);
};
// 调色板
const GRASS = [[0x6f, 0xb2, 0x3d], [0x88, 0xc4, 0x4b], [0x5d, 0xa0, 0x35]];
const DIRT = [[0x8a, 0x5a, 0x32], [0x76, 0x4a, 0x28], [0x94, 0x64, 0x3a]];
const ROCK = [[0x8e, 0x94, 0x9e], [0x7d, 0x83, 0x8e]];
const RED = [0xa8, 0x32, 0x1e], CREAM = [0xf0, 0xe4, 0xcc], TILE = [0x39, 0x46, 0x66];
const GOLD = [0xf2, 0xb8, 0x42], LANT = [0xff, 0xa8, 0x40], LANT2 = [0xff, 0xd2, 0x57];
const PINK = [[0xf5, 0xb0, 0xd0], [0xec, 0x93, 0xbb], [0xfa, 0xc6, 0xde]];
const WATER = [0x6f, 0xd3, 0xff], TRUNK = [0x6b, 0x44, 0x2a];
const pick = a => a[(Math.random() * a.length) | 0];

// 浮岛：顶面草皮、中层泥土、底部收锥形
function island(cx, cy, cz, r, depth = Math.round(r * 0.55)) {
  for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
    const d = Math.hypot(x, z) + (Math.random() - 0.5) * 1.2;
    if (d > r) continue;
    set(cx + x, cy, cz + z, pick(GRASS));
    for (let k = 1; k <= depth; k++) {
      const rr = r * (1 - k / (depth + 1)) - (Math.random() * 0.8);
      if (d > rr) continue;
      set(cx + x, cy - k, cz + z, k < 3 ? pick(DIRT) : pick(ROCK));
    }
  }
}
// 中式楼阁（台基-红柱-素墙-重檐歇山顶）
function temple(cx, cy, cz) {
  box(cx - 8, cy, cz - 6, cx + 8, cy, cz + 6, ROCK[0]);            // 台基一层
  box(cx - 7, cy + 1, cz - 5, cx + 7, cy + 1, cz + 5, [0xa8, 0xae, 0xb8]); // 台基二层
  for (const px of [-6, 0, 6]) for (const pz of [-4, 4])
    box(cx + px, cy + 2, cz + pz, cx + px, cy + 8, cz + pz, RED);  // 六根红柱
  box(cx - 5, cy + 2, cz - 4, cx + 5, cy + 7, cz + 3, CREAM);      // 素墙身
  box(cx - 1, cy + 2, cz + 3, cx + 1, cy + 6, cz + 4, [0x4a, 0x2c, 0x1a]); // 正门
  // 下檐：两层挑檐 + 四角起翘 + 金色檐口
  box(cx - 9, cy + 8, cz - 7, cx + 9, cy + 8, cz + 7, TILE);
  box(cx - 8, cy + 9, cz - 6, cx + 8, cy + 9, cz + 6, TILE);
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    set(cx + sx * 9, cy + 9, cz + sz * 7, TILE), set(cx + sx * 8, cy + 9, cz + sz * 6, TILE);
  box(cx - 9, cy + 8, cz - 7, cx + 9, cy + 8, cz + 7, TILE);
  // 檐下灯笼串
  for (const px of [-6, -2, 2, 6]) {
    set(cx + px, cy + 7, cz + 5, LANT, 'g'); set(cx + px, cy + 6, cz + 5, LANT2, 'g');
  }
  // 上层阁 + 歇山顶
  box(cx - 5, cy + 10, cz - 4, cx + 5, cy + 13, cz + 4, CREAM);
  box(cx - 6, cy + 14, cz - 5, cx + 6, cy + 14, cz + 5, TILE);
  box(cx - 4, cy + 15, cz - 3, cx + 4, cy + 15, cz + 3, TILE);
  box(cx - 4, cy + 16, cz - 1, cx + 4, cy + 16, cz + 1, GOLD);     // 正脊鎏金
  for (const sx of [-1, 1]) set(cx + sx * 5, cy + 16, cz, GOLD);   // 鸱吻
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) set(cx + sx * 6, cy + 15, cz + sz * 5, TILE);
}
// 樱花树
function tree(cx, cy, cz) {
  box(cx, cy + 1, cz, cx, cy + 4, cz, TRUNK);
  for (let x = -2; x <= 2; x++) for (let y = -1; y <= 2; y++) for (let z = -2; z <= 2; z++)
    if (x * x + y * y + z * z < 6 && Math.random() > 0.15)
      set(cx + x, cy + 5 + y, cz + z, pick(PINK));
}
// 瀑布：岛缘向下泻流
function falls(cx, cy, cz, len = 12) {
  for (let k = 0; k < len; k++) {
    set(cx, cy - k, cz, WATER, 'w');
    if (k % 3 === 0) set(cx + (Math.random() < 0.5 ? 1 : 0), cy - k, cz, [0xb8, 0xec, 0xff], 'w');
  }
}
// 悬挂灯笼
function lantern(cx, cy, cz) {
  set(cx, cy, cz, [0x3a, 0x2c, 0x20]);
  set(cx, cy - 1, cz, LANT, 'g'); set(cx, cy - 2, cz, LANT2, 'g'); set(cx, cy - 3, cz, LANT, 'g');
}
// 方块小人（像素仔）
function figure(cx, cy, cz) {
  box(cx, cy, cz, cx + 1, cy + 2, cz, [0x3a, 0x55, 0xa8]);        // 腿+身
  box(cx, cy + 3, cz, cx + 1, cy + 4, cz, [0xe8, 0xb0, 0x88]);    // 脸
  box(cx, cy + 5, cz, cx + 1, cy + 5, cz, [0x22, 0x1a, 0x14]);    // 发
}

// ---- 世界布局：主岛包覆场地，环列浮岛 ----
island(0, 0, 0, 22, 13);                       // 主岛 ~20m 直径，草皮在 y=0
temple(0, 1, -16);                             // 殿居岛后（舞台背板之后）
tree(-14, 0, -3); tree(15, 0, 2); tree(-8, 0, 10);
falls(-20, -1, 4); falls(19, -1, -2); falls(6, -1, 20);   // 三处岛缘瀑布
figure(4, 1, 8);
for (let i = 0; i < 7; i++) lantern(-8 + i * 2.5, 7, 8);  // 檐前灯笼串
// 环绕浮岛 + 碎块（包裹观众区）
const ring = [[30, 6, -14, 5], [-32, 8, -10, 4], [26, 12, 16, 4], [-26, 10, 18, 5],
              [4, 14, -30, 4], [-10, 16, -28, 3], [38, 18, 2, 3], [-38, 14, 4, 3]];
for (const [x, y, z, r] of ring) { island(x, y, z, r, Math.round(r * 0.5)); if (Math.random() < 0.7) tree(x, y + 1, z); }
for (let i = 0; i < 40; i++) {                  // 漂浮碎块/光块
  const a = Math.random() * Math.PI * 2, rr = 24 + Math.random() * 22;
  const c = Math.random() < 0.35 ? (Math.random() < 0.5 ? LANT : GOLD) : pick(ROCK);
  set(Math.cos(a) * rr, 2 + Math.random() * 16, Math.sin(a) * rr, c, c === ROCK[0] || c === ROCK[1] ? 'o' : 'g');
}

// ---- 体素 → 网格（只画外露面）----
const FACES = [
  { d: [1, 0, 0], v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { d: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { d: [0, 1, 0], v: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { d: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { d: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { d: [0, 0, -1], v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];
const buckets = { o: { pos: [], nor: [], col: [] }, g: { pos: [], nor: [], col: [] }, w: { pos: [], nor: [], col: [] } };
for (const [k, cell] of cells) {
  const [x, y, z] = k.split(',').map(Number);
  const B = buckets[cell.k];
  for (const f of FACES) {
    if (has(x + f.d[0], y + f.d[1], z + f.d[2])) continue;
    const quad = f.v.map(v => [(x + v[0]) * S, (y + v[1]) * S, (z + v[2]) * S]);
    for (const vi of [0, 1, 2, 0, 2, 3]) {
      B.pos.push(...quad[vi]); B.nor.push(...f.d); B.col.push(...cell.c.map(c => c / 255));
    }
  }
}
const scene = new THREE.Scene();
const mk = (B, mat) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3));
  return new THREE.Mesh(g, mat);
};
scene.add(mk(buckets.o, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })));
scene.add(mk(buckets.g, new THREE.MeshBasicMaterial({ vertexColors: true })));           // 发光体素
scene.add(mk(buckets.w, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.72, roughness: 0.2 }))); // 水
console.log('cells', cells.size, 'faces', Object.values(buckets).reduce((a, b) => a + b.pos.length / 9, 0));

window.__scene = scene;
window.__export = () => new Promise(res => {
  const meshes = scene.children.filter(c => c.isMesh);   // 只导出网格，剔除灯光/相机
  const g = new THREE.Group(); g.name = 'xiyou_world'; meshes.forEach(m => g.add(m));
  new GLTFExporter().parse(g, out => res(out), e => res({ err: String(e) }), { binary: true });
});

// 预览渲染（截图用）
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0xf2b06a);
scene.add(new THREE.AmbientLight(0xffe0c0, 1.2));
const sun = new THREE.DirectionalLight(0xffd9a0, 1.6); sun.position.set(20, 30, 15); scene.add(sun);
const cam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 300);
cam.position.set(16, 10, 20); cam.lookAt(0, 3, -3);
renderer.render(scene, cam);
console.log('ready');
