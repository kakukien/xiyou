// 西安钟楼·体块版 → GLB
// 青砖方形基座(十字券洞) + 双层楼阁 + 三重檐攒尖顶 + 鎏金宝顶
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const S = 0.45;
const cells = new Map();
const key = (x, y, z) => `${x},${y},${z}`;
const set = (x, y, z, c, k = 'o') => cells.set(key(x | 0, y | 0, z | 0), { c, k });
const del = (x, y, z) => cells.delete(key(x | 0, y | 0, z | 0));
const has = (x, y, z) => cells.has(key(x, y, z));
const box = (x0, y0, z0, x1, y1, z1, c, k) => {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, c, k);
};

const BRICK = [[0x74, 0x7d, 0x88], [0x68, 0x71, 0x7c], [0x7e, 0x88, 0x93]];
const WOOD = [0x8f, 0x2f, 0x22], WOODD = [0x6e, 0x22, 0x18];
const GTILE = [[0x2e, 0x5a, 0x4a], [0x39, 0x6e, 0x59]];           // 绿琉璃
const GOLD = [0xf2, 0xc2, 0x4e], CREAM = [0xf0, 0xe0, 0xc0], LANT = [0xff, 0xa8, 0x40];
const pick = a => a[(Math.random() * a.length) | 0];

function belltower(cx, cy, cz) {
  // --- 青砖基座 18x6x18，十字券洞贯通 ---
  for (let x = -9; x <= 9; x++) for (let z = -9; z <= 9; z++) for (let y = 0; y <= 5; y++)
    set(cx + x, cy + y, cz + z, pick(BRICK));
  // 南北向券洞 + 东西向券洞（拱形收窄）
  for (let z = -9; z <= 9; z++) for (let x = -2; x <= 2; x++) for (let y = 0; y <= 3; y++)
    if (!(y === 3 && Math.abs(x) === 2)) del(cx + x, cy + y, cz + z);
  for (let x = -9; x <= 9; x++) for (let z = -2; z <= 2; z++) for (let y = 0; y <= 3; y++)
    if (!(y === 3 && Math.abs(z) === 2)) del(cx + x, cy + y, cz + z);
  // 基座顶部石栏一圈
  for (let x = -9; x <= 9; x++) for (let z = -9; z <= 9; z++)
    if (Math.abs(x) === 9 || Math.abs(z) === 9) set(cx + x, cy + 6, cz + z, [0x9a, 0xa2, 0xac]);

  // --- 一层楼阁：周匝红柱 + 木墙身 + 窗 ---
  const col = [[-6, -6], [0, -6], [6, -6], [-6, 0], [6, 0], [-6, 6], [0, 6], [6, 6]];
  for (const [px, pz] of col) box(cx + px, cy + 7, cz + pz, cx + px, cy + 13, cz + pz, WOOD);
  box(cx - 4, cy + 8, cz - 4, cx + 4, cy + 12, cz + 4, CREAM);      // 内墙身
  box(cx - 1, cy + 8, cz + 4, cx + 1, cy + 11, cz + 4, WOODD);      // 南槅门
  for (const p of [[-5, 4], [5, 4], [4, -5], [4, 5], [-5, -4], [5, -4], [-4, -5], [-4, 5]])
    box(cx + p[0], cy + 9, cz + p[1], cx + p[0], cy + 11, cz + p[1], [0x4a, 0x30, 0x1e]); // 窗棂
  // 一重檐（大挑檐 + 檐口金色）
  box(cx - 8, cy + 14, cz - 8, cx + 8, cy + 14, cz + 8, pick(GTILE));
  box(cx - 7, cy + 15, cz - 7, cx + 7, cy + 15, cz + 7, GTILE[1]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    set(cx + sx * 8, cy + 15, cz + sz * 8, GTILE[1]);              // 角起翘
    set(cx + sx * 8, cy + 14, cz + sz * 8, GOLD);
    set(cx + sx * 7, cy + 13, cz + sz * 7, LANT, 'g');             // 檐角灯
  }

  // --- 二层楼阁：收窄 ---
  for (const [px, pz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) box(cx + px, cy + 16, cz + pz, cx + px, cy + 21, cz + pz, WOOD);
  box(cx - 3, cy + 17, cz - 3, cx + 3, cy + 20, cz + 3, CREAM);
  box(cx - 1, cy + 17, cz + 3, cx + 1, cy + 19, cz + 3, WOODD);
  // 二重檐
  box(cx - 6, cy + 21, cz - 6, cx + 6, cy + 21, cz + 6, GTILE[0]);
  box(cx - 5, cy + 22, cz - 5, cx + 5, cy + 22, cz + 5, GTILE[1]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) set(cx + sx * 6, cy + 22, cz + sz * 6, GTILE[1]);
  // 三重檐
  box(cx - 4, cy + 23, cz - 4, cx + 4, cy + 23, cz + 4, GTILE[0]);

  // --- 攒尖顶：逐级收分 ---
  box(cx - 3, cy + 24, cz - 3, cx + 3, cy + 24, cz + 3, GTILE[1]);
  box(cx - 2, cy + 25, cz - 2, cx + 2, cy + 25, cz + 2, GTILE[0]);
  box(cx - 1, cy + 26, cz - 1, cx + 1, cy + 26, cz + 1, GTILE[1]);
  set(cx, cy + 27, cz, GTILE[0]);
  // 鎏金宝顶
  set(cx, cy + 28, cz, GOLD); set(cx, cy + 29, cz, GOLD); set(cx, cy + 30, cz, GOLD);
  set(cx - 1, cy + 28, cz, GOLD); set(cx + 1, cy + 28, cz, GOLD);
  set(cx, cy + 28, cz - 1, GOLD); set(cx, cy + 28, cz + 1, GOLD);
}

belltower(0, 0, 0);

const FACES = [
  { d: [1, 0, 0], v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { d: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { d: [0, 1, 0], v: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { d: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { d: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { d: [0, 0, -1], v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];
const buckets = { o: { pos: [], nor: [], col: [] }, g: { pos: [], nor: [], col: [] } };
for (const [k, cell] of cells) {
  const [x, y, z] = k.split(',').map(Number);
  const B = buckets[cell.k] || buckets.o;
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
scene.add(mk(buckets.g, new THREE.MeshBasicMaterial({ vertexColors: true })));
console.log('cells', cells.size);

window.__export = () => new Promise(res => {
  const g = new THREE.Group(); g.name = 'xiyou_belltower';
  scene.children.filter(c => c.isMesh).forEach(m => g.add(m));
  new GLTFExporter().parse(g, out => res(out), e => res({ err: String(e) }), { binary: true });
});

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0xf2b06a);
scene.add(new THREE.AmbientLight(0xffe0c0, 1.2));
const sun = new THREE.DirectionalLight(0xffd9a0, 1.6); sun.position.set(15, 25, 12); scene.add(sun);
const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
cam.position.set(11, 9, 14); cam.lookAt(0, 6, 0);
renderer.render(scene, cam);
console.log('ready');
