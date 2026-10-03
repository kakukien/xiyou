// 空间底座处理管线：PLY 解析（标准/PlayCanvas 压缩两种）→ 降噪 → 体素均匀抽稀
// → 结构代理（面片墙 + box 站位 + 聚色贴图）→ 干净 PLY 回写。
// 纯 JS、无 THREE 依赖，可在 Web Worker 中运行。

const SH_C0 = 0.28209479177387814;
const TYPE_READERS = {
  char: [1, 'getInt8'], int8: [1, 'getInt8'], uchar: [1, 'getUint8'], uint8: [1, 'getUint8'],
  short: [2, 'getInt16'], int16: [2, 'getInt16'], ushort: [2, 'getUint16'], uint16: [2, 'getUint16'],
  int: [4, 'getInt32'], int32: [4, 'getInt32'], uint: [4, 'getUint32'], uint32: [4, 'getUint32'],
  float: [4, 'getFloat32'], float32: [4, 'getFloat32'],
  double: [8, 'getFloat64'], float64: [8, 'getFloat64']
};

const sigmoid = x => 1 / (1 + Math.exp(-x));
const logit = a => { const v = Math.min(0.9999, Math.max(0.0001, a)); return Math.log(v / (1 - v)); };
const lerp = (a, b, t) => a + (b - a) * t;
const unpack111011 = (v, out) => {
  out[0] = ((v >>> 21) & 2047) / 2047;
  out[1] = ((v >>> 11) & 1023) / 1023;
  out[2] = (v & 2047) / 2047;
};
const unpackRot = (v, out) => {
  const norm = 1 / (Math.SQRT2 * 0.5);
  const a = (((v >>> 20) & 1023) / 1023 - 0.5) * norm;
  const b = (((v >>> 10) & 1023) / 1023 - 0.5) * norm;
  const c = ((v & 1023) / 1023 - 0.5) * norm;
  const m = Math.sqrt(Math.max(0, 1 - a * a - b * b - c * c));
  switch (v >>> 30) {
    case 0: out[0] = a; out[1] = b; out[2] = c; out[3] = m; break;
    case 1: out[0] = m; out[1] = b; out[2] = c; out[3] = a; break;
    case 2: out[0] = a; out[1] = m; out[2] = c; out[3] = b; break;
    default: out[0] = a; out[1] = b; out[2] = m; out[3] = c;
  }
};

function parseHeader(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const headText = new TextDecoder().decode(u8.subarray(0, Math.min(u8.length, 1 << 20)));
  if (!headText.startsWith('ply')) throw new Error('不是 PLY 文件');
  const eh = headText.indexOf('end_header');
  if (eh < 0) throw new Error('PLY 头不完整');
  let dataOff = eh + 'end_header'.length;
  while (u8[dataOff] === 0x0d || u8[dataOff] === 0x0a) dataOff++;
  const elements = [];
  let cur = null;
  let format = '';
  for (const ln of headText.slice(0, eh).split(/\r?\n/)) {
    const t = ln.trim().split(/\s+/);
    if (t[0] === 'format') format = t[1];
    else if (t[0] === 'element') { cur = { name: t[1], count: +t[2], props: [] }; elements.push(cur); }
    else if (t[0] === 'property' && cur && t[1] !== 'list') cur.props.push({ name: t[t.length - 1], type: t[1] });
  }
  if (format !== 'binary_little_endian') throw new Error(`仅支持 binary_little_endian：${format || '未知'}`);
  return { u8, dataOff, elements };
}

function layoutOf(el) {
  let off = 0;
  const props = el.props.map(p => {
    const spec = TYPE_READERS[p.type];
    if (!spec) throw new Error(`未知属性类型 ${p.type}`);
    const item = { ...p, size: spec[0], reader: spec[1], off };
    off += spec[0];
    return item;
  });
  return { props, stride: off };
}

// → { count, format, pos, scale(linear), opacity(0..1), rgb, rot(XYZW), min, max, diag }
export function parseSplatCloud(buf) {
  const { u8, dataOff, elements } = parseHeader(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const vertex = elements.find(e => e.name === 'vertex');
  if (!vertex?.count) throw new Error('找不到 vertex 元素');

  const n = vertex.count;
  const pos = new Float32Array(n * 3);
  const scale = new Float32Array(n * 3);
  const rot = new Float32Array(n * 4);
  const opacity = new Float32Array(n);
  const rgb = new Uint8Array(n * 3);

  if (elements.find(e => e.name === 'chunk') && vertex.props.some(p => p.name === 'packed_position')) {
    // PlayCanvas 压缩格式：chunk 每 256 splat 给 min/max 边界
    const chunk = elements.find(e => e.name === 'chunk');
    const cl = layoutOf(chunk);
    const vl = layoutOf(vertex);
    const cBase = dataOff;
    const vBase = cBase + chunk.count * cl.stride;
    const cf = {};
    for (const p of cl.props) cf[p.name] = p.off;
    const vf = {};
    for (const p of vl.props) vf[p.name] = p.off;
    const t = [0, 0, 0, 0];
    for (let i = 0; i < n; i++) {
      const ci = cBase + Math.floor(i / 256) * cl.stride;
      const vi = vBase + i * vl.stride;
      unpack111011(dv.getUint32(vi + vf.packed_position, true), t);
      pos[i * 3] = lerp(dv.getFloat32(ci + cf.min_x, true), dv.getFloat32(ci + cf.max_x, true), t[0]);
      pos[i * 3 + 1] = lerp(dv.getFloat32(ci + cf.min_y, true), dv.getFloat32(ci + cf.max_y, true), t[1]);
      pos[i * 3 + 2] = lerp(dv.getFloat32(ci + cf.min_z, true), dv.getFloat32(ci + cf.max_z, true), t[2]);
      unpack111011(dv.getUint32(vi + vf.packed_scale, true), t);
      scale[i * 3] = Math.exp(lerp(dv.getFloat32(ci + cf.min_scale_x, true), dv.getFloat32(ci + cf.max_scale_x, true), t[0]));
      scale[i * 3 + 1] = Math.exp(lerp(dv.getFloat32(ci + cf.min_scale_y, true), dv.getFloat32(ci + cf.max_scale_y, true), t[1]));
      scale[i * 3 + 2] = Math.exp(lerp(dv.getFloat32(ci + cf.min_scale_z, true), dv.getFloat32(ci + cf.max_scale_z, true), t[2]));
      unpackRot(dv.getUint32(vi + vf.packed_rotation, true), t);
      rot.set(t, i * 4);
      const c = dv.getUint32(vi + vf.packed_color, true);
      rgb[i * 3] = Math.round(lerp(dv.getFloat32(ci + cf.min_r, true), dv.getFloat32(ci + cf.max_r, true), ((c >>> 24) & 255) / 255) * 255);
      rgb[i * 3 + 1] = Math.round(lerp(dv.getFloat32(ci + cf.min_g, true), dv.getFloat32(ci + cf.max_g, true), ((c >>> 16) & 255) / 255) * 255);
      rgb[i * 3 + 2] = Math.round(lerp(dv.getFloat32(ci + cf.min_b, true), dv.getFloat32(ci + cf.max_b, true), ((c >>> 8) & 255) / 255) * 255);
      opacity[i] = (c & 255) / 255;
    }
    return finalize({ count: n, format: 'packed', pos, scale, rot, opacity, rgb });
  }

  // 标准浮点格式：按属性名读取，普通点云（red/green/blue）也兼容
  const vl = layoutOf(vertex);
  const fp = {};
  for (const p of vl.props) fp[p.name] = p;
  const has = name => Boolean(fp[name]);
  const read = (i, name, fb = 0) => {
    const p = fp[name];
    return p ? dv[p.reader](dataOff + i * vl.stride + p.off, true) : fb;
  };
  const colorIsDc = has('f_dc_0');
  const colorIsRgb = has('red') || has('f_dc_0') === false && has('r');
  const rName = has('red') ? 'red' : has('r') ? 'r' : null;
  const gName = has('green') ? 'green' : has('g') ? 'g' : null;
  const bName = has('blue') ? 'blue' : has('b') ? 'b' : null;
  const scaleIsLog = has('scale_0'); // 3DGS 约定存 log
  const opacityIsLogit = has('opacity');
  for (let i = 0; i < n; i++) {
    pos[i * 3] = read(i, 'x');
    pos[i * 3 + 1] = read(i, 'y');
    pos[i * 3 + 2] = read(i, 'z');
    for (let k = 0; k < 3; k++) {
      const s = read(i, `scale_${k}`, -20);
      scale[i * 3 + k] = scaleIsLog ? Math.exp(s) : Math.max(1e-6, s);
    }
    const o = read(i, 'opacity', 10);
    opacity[i] = opacityIsLogit ? sigmoid(o) : Math.min(1, Math.max(0, o / 255));
    for (let k = 0; k < 4; k++) rot[i * 4 + k] = read(i, `rot_${k}`, k === 3 ? 1 : 0);
    if (colorIsDc) {
      rgb[i * 3] = Math.max(0, Math.min(255, Math.round((0.5 + SH_C0 * read(i, 'f_dc_0')) * 255)));
      rgb[i * 3 + 1] = Math.max(0, Math.min(255, Math.round((0.5 + SH_C0 * read(i, 'f_dc_1')) * 255)));
      rgb[i * 3 + 2] = Math.max(0, Math.min(255, Math.round((0.5 + SH_C0 * read(i, 'f_dc_2')) * 255)));
    } else if (rName) {
      rgb[i * 3] = read(i, rName);
      rgb[i * 3 + 1] = gName ? read(i, gName) : rgb[i * 3];
      rgb[i * 3 + 2] = bName ? read(i, bName) : rgb[i * 3];
    } else {
      rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = 180;
    }
  }
  return finalize({ count: n, format: 'std', pos, scale, rot, opacity, rgb });
}

function finalize(cloud) {
  const { pos, count } = cloud;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 3; k++) {
      const v = pos[i * 3 + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  cloud.min = min;
  cloud.max = max;
  cloud.diag = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
  return cloud;
}

function quantile(arr, q) {
  const tmp = Float32Array.from(arr);
  tmp.sort();
  return tmp[Math.min(tmp.length - 1, Math.floor(q * tmp.length))];
}

// 降噪：低透明度碎点 + 巨型漂浮团 + 低密度离群飞点
export function denoise(cloud, {
  opacityMin = 0.05,
  volQ = 0.99,
  volMargin = 12,
  scaleCapRatio = 0.06,
  densityCellRatio = 1 / 180,
  minVoxel = 3
} = {}) {
  const { count, pos, scale, opacity, diag } = cloud;
  const keep = new Uint8Array(count);
  const vols = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    vols[i] = scale[i * 3] * scale[i * 3 + 1] * scale[i * 3 + 2];
    if (opacity[i] < opacityMin) continue;
    const smax = Math.max(scale[i * 3], scale[i * 3 + 1], scale[i * 3 + 2]);
    if (smax > diag * scaleCapRatio) continue; // 罩住半面墙的巨型漂浮团
    keep[i] = 1;
  }
  const keptVols = [];
  for (let i = 0; i < count; i++) if (keep[i]) keptVols.push(vols[i]);
  const volLimit = (keptVols.length ? quantile(keptVols, volQ) : 1) * volMargin;
  let dropped = 0;
  for (let i = 0; i < count; i++) if (keep[i] && vols[i] > volLimit) { keep[i] = 0; dropped++; }

  // 体素密度：所在格点数过少 → 离群飞点
  const cell = Math.max(1e-4, diag * densityCellRatio);
  const vmap = new Map();
  const { min } = cloud;
  for (let i = 0; i < count; i++) {
    if (!keep[i]) continue;
    const k = vkey(pos, i, min, cell);
    vmap.set(k, (vmap.get(k) || 0) + 1);
  }
  let isolated = 0;
  for (let i = 0; i < count; i++) {
    if (!keep[i]) continue;
    if ((vmap.get(vkey(pos, i, min, cell)) || 0) < minVoxel) { keep[i] = 0; isolated++; }
  }
  let alive = 0;
  for (let i = 0; i < count; i++) alive += keep[i];
  return { keep, stats: { opacityDropped: count - alive - dropped - isolated, giantDropped: dropped, isolatedDropped: isolated, alive } };
}

const vkey = (pos, i, min, cell) =>
  `${Math.floor((pos[i * 3] - min[0]) / cell)},${Math.floor((pos[i * 3 + 1] - min[1]) / cell)},${Math.floor((pos[i * 3 + 2] - min[2]) / cell)}`;

// 体素均匀抽稀：每格保留权重最高的代表点（opacity × ³√体积），空间覆盖率与文件序无关
export function voxelSample(cloud, keep, { targetCount = 300000 } = {}) {
  const { count, pos, scale, opacity, min, diag } = cloud;
  const weight = i => opacity[i] * Math.cbrt(scale[i * 3] * scale[i * 3 + 1] * scale[i * 3 + 2]);
  const pick = cell => {
    const best = new Map();
    for (let i = 0; i < count; i++) {
      if (!keep[i]) continue;
      const k = vkey(pos, i, min, cell);
      const cur = best.get(k);
      if (cur === undefined || weight(i) > weight(cur)) best.set(k, i);
    }
    return best;
  };
  // 活点不足目标时全保留；否则对 log(cell) 二分逼近目标体素数
  let alive = 0;
  for (let i = 0; i < count; i++) alive += keep[i];
  if (alive <= targetCount) {
    const all = new Uint32Array(alive);
    let w = 0;
    for (let i = 0; i < count; i++) if (keep[i]) all[w++] = i;
    return { keepIdx: all, cell: 0, stats: { voxels: alive, cell: 0, allKept: true } };
  }
  let lo = diag / 2048;      // 细端：几乎逐点
  let hi = diag / 8;         // 粗端
  let cell = Math.cbrt((cloud.max[0] - min[0]) * (cloud.max[1] - min[1]) * (cloud.max[2] - min[2]) / Math.max(1, targetCount));
  cell = Math.min(hi, Math.max(lo, cell));
  let best = null;
  for (let round = 0; round < 10; round++) {
    const b = pick(cell);
    if (!best || Math.abs(b.size - targetCount) < Math.abs(best.size - targetCount)) best = b;
    if (Math.abs(b.size - targetCount) < targetCount * 0.12) { best = b; break; }
    if (b.size > targetCount) { lo = cell; cell = (cell + hi) / 2; }
    else { hi = cell; cell = (cell + lo) / 2; }
    if (hi - lo < diag / 4096) break;
  }
  const keepIdx = Uint32Array.from(best.values()).sort();
  return { keepIdx, cell, stats: { voxels: best.size, cell } };
}

// 回写标准 14 属性 PLY（std/packed 输入统一走解码值；f_rest 视角色差不保留）
export function writeStdPly(cloud, keepIdx) {
  const { pos, scale, rot, opacity, rgb } = cloud;
  const n = keepIdx.length;
  const props = ['x', 'y', 'z', 'scale_0', 'scale_1', 'scale_2', 'rot_0', 'rot_1', 'rot_2', 'rot_3',
    'f_dc_0', 'f_dc_1', 'f_dc_2', 'opacity'];
  const header = 'ply\nformat binary_little_endian 1.0\n' +
    'comment xiyou-optimized denoise+voxel\n' +
    `element vertex ${n}\n` + props.map(p => `property float ${p}`).join('\n') + '\nend_header\n';
  const head = new TextEncoder().encode(header);
  const out = new Uint8Array(head.length + n * 56);
  out.set(head, 0);
  const dv = new DataView(out.buffer);
  let w = head.length;
  for (let k = 0; k < n; k++) {
    const i = keepIdx[k];
    dv.setFloat32(w, pos[i * 3], true); dv.setFloat32(w + 4, pos[i * 3 + 1], true); dv.setFloat32(w + 8, pos[i * 3 + 2], true);
    dv.setFloat32(w + 12, Math.log(Math.max(1e-9, scale[i * 3])), true);
    dv.setFloat32(w + 16, Math.log(Math.max(1e-9, scale[i * 3 + 1])), true);
    dv.setFloat32(w + 20, Math.log(Math.max(1e-9, scale[i * 3 + 2])), true);
    dv.setFloat32(w + 24, rot[i * 4], true); dv.setFloat32(w + 28, rot[i * 4 + 1], true);
    dv.setFloat32(w + 32, rot[i * 4 + 2], true); dv.setFloat32(w + 36, rot[i * 4 + 3], true);
    dv.setFloat32(w + 40, (rgb[i * 3] / 255 - 0.5) / SH_C0, true);
    dv.setFloat32(w + 44, (rgb[i * 3 + 1] / 255 - 0.5) / SH_C0, true);
    dv.setFloat32(w + 48, (rgb[i * 3 + 2] / 255 - 0.5) / SH_C0, true);
    dv.setFloat32(w + 52, logit(opacity[i]), true);
    w += 56;
  }
  return out.buffer;
}

const b64 = u8 => {
  let s = '';
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return btoa(s);
};

// 结构代理：地面/墙面片 + 连通域 box 站位，面片附聚色贴图（b64 RGB 栅格）
export function buildProxy(cloud, keepIdx, {
  cell = null,
  minCompVoxels = 5,
  maxBoxes = 240,
  wallMinLen = 4,
  gridRes = 8
} = {}) {
  const { pos, rgb, opacity, min, max, diag } = cloud;
  const n = keepIdx.length;
  cell = cell || diag / 128;
  const nx = Math.max(1, Math.ceil((max[0] - min[0]) / cell));
  const ny = Math.max(1, Math.ceil((max[1] - min[1]) / cell));
  const nz = Math.max(1, Math.ceil((max[2] - min[2]) / cell));
  const idx3 = (ix, iy, iz) => (iy * nz + iz) * nx + ix;

  const voxCount = new Int32Array(nx * ny * nz);
  const voxR = new Float32Array(nx * ny * nz);
  const voxG = new Float32Array(nx * ny * nz);
  const voxB = new Float32Array(nx * ny * nz);
  const ixs = new Int32Array(n), iys = new Int32Array(n), izs = new Int32Array(n);
  const occupied = [];
  for (let k = 0; k < n; k++) {
    const i = keepIdx[k];
    const ix = Math.min(nx - 1, Math.floor((pos[i * 3] - min[0]) / cell));
    const iy = Math.min(ny - 1, Math.floor((pos[i * 3 + 1] - min[1]) / cell));
    const iz = Math.min(nz - 1, Math.floor((pos[i * 3 + 2] - min[2]) / cell));
    ixs[k] = ix; iys[k] = iy; izs[k] = iz;
    const vi = idx3(ix, iy, iz);
    if (!voxCount[vi]) occupied.push(vi);
    voxCount[vi]++;
    const w = Math.max(0.05, opacity[i]);
    voxR[vi] += rgb[i * 3] * w; voxG[vi] += rgb[i * 3 + 1] * w; voxB[vi] += rgb[i * 3 + 2] * w;
  }
  const wsum = new Float32Array(nx * ny * nz);
  for (let k = 0; k < n; k++) {
    const i = keepIdx[k];
    wsum[idx3(ixs[k], iys[k], izs[k])] += Math.max(0.05, opacity[i]);
  }

  // 地面 / 天花：y 直方图两端的显著聚集带
  const yBins = new Float32Array(ny);
  for (const vi of occupied) yBins[Math.floor(vi / (nx * nz))] += voxCount[vi];
  let yMax = 0;
  for (let b = 0; b < ny; b++) yMax = Math.max(yMax, yBins[b]);
  let floorBin = -1, ceilBin = -1;
  for (let b = 0; b < ny; b++) if (yBins[b] > yMax * 0.08) { floorBin = b; break; }
  for (let b = ny - 1; b > floorBin + 2; b--) if (yBins[b] > yMax * 0.12) { ceilBin = b; break; }
  const floorY = floorBin >= 0 ? min[1] + floorBin * cell : min[1];
  const ceilY = ceilBin >= 0 ? min[1] + (ceilBin + 1) * cell : null;
  const groundBand = floorBin >= 0 ? floorBin + 1 : -1; // 地面带体素不进物体连通域

  const avgColor = vi => {
    const w = Math.max(1e-6, wsum[vi]);
    return [voxR[vi] / w, voxG[vi] / w, voxB[vi] / w];
  };

  // XZ 占用投影（地面带以上）→ 四面边界墙
  const walls = [];
  const xzOcc = new Uint8Array(nx * nz);
  const xzTop = new Int32Array(nx * nz).fill(-1);
  for (const vi of occupied) {
    const iy = Math.floor(vi / (nx * nz));
    if (iy <= groundBand) continue;
    const rem = vi % (nx * nz);
    const ix = rem % nx, iz = Math.floor(rem / nx);
    xzOcc[iz * nx + ix] = 1;
    if (iy > xzTop[iz * nx + ix]) xzTop[iz * nx + ix] = iy;
  }
  const wallHeight = (x0, z0, x1, z1) => {
    let top = groundBand + 1;
    const dx = Math.sign(x1 - x0), dz = Math.sign(z1 - z0);
    let x = x0, z = z0;
    for (let s = 0; s <= Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0)); s++) {
      top = Math.max(top, xzTop[z * nx + x]);
      x += dx; z += dz;
    }
    return (top + 1) * cell + min[1] - floorY;
  };
  const bakeWallTex = (getVi) => {
    const g = gridRes;
    const tex = new Uint8Array(g * g * 3);
    for (let u = 0; u < g; u++) for (let v = 0; v < g; v++) {
      const vi = getVi(u, v);
      const c = vi >= 0 && voxCount[vi] ? avgColor(vi) : [96, 104, 116];
      const o = (v * g + u) * 3;
      tex[o] = c[0]; tex[o + 1] = c[1]; tex[o + 2] = c[2];
    }
    return b64(tex);
  };
  const dirs = [
    { axis: 'x', sign: 1, find: iz => { for (let ix = nx - 1; ix >= 0; ix--) if (xzOcc[iz * nx + ix]) return ix; return -1; } },
    { axis: 'x', sign: -1, find: iz => { for (let ix = 0; ix < nx; ix++) if (xzOcc[iz * nx + ix]) return ix; return -1; } },
    { axis: 'z', sign: 1, find: ix => { for (let iz = nz - 1; iz >= 0; iz--) if (xzOcc[iz * nx + ix]) return iz; return -1; } },
    { axis: 'z', sign: -1, find: ix => { for (let iz = 0; iz < nz; iz++) if (xzOcc[iz * nx + ix]) return iz; return -1; } }
  ];
  for (const d of dirs) {
    const line = d.axis === 'x' ? nz : nx; // 沿另一条轴扫描
    let segStart = -1, segVal = -1;
    const flush = endIdx => {
      if (segStart >= 0 && endIdx - segStart >= wallMinLen) {
        const h = Math.max(cell * 2, d.axis === 'x'
          ? wallHeight(segVal, segStart, segVal, endIdx - 1)
          : wallHeight(segStart, segVal, endIdx - 1, segVal));
        const y = floorY + h / 2;
        let c, size, nrm;
        if (d.axis === 'x') {
          const wx = min[0] + (segVal + (d.sign > 0 ? 1 : 0)) * cell;
          const z0 = min[2] + segStart * cell, z1 = min[2] + endIdx * cell;
          c = [wx, y, (z0 + z1) / 2]; size = [z1 - z0, h]; nrm = [-d.sign, 0, 0];
        } else {
          const wz = min[2] + (segVal + (d.sign > 0 ? 1 : 0)) * cell;
          const x0 = min[0] + segStart * cell, x1 = min[0] + endIdx * cell;
          c = [(x0 + x1) / 2, y, wz]; size = [x1 - x0, h]; nrm = [0, 0, -d.sign];
        }
        walls.push({ kind: 'wall', c, n: nrm, size, tex: bakeWallTex((u, v) => {
          const along = Math.min(endIdx - 1, segStart + Math.floor(u / gridRes * (endIdx - segStart)));
          const topIdx = d.axis === 'x' ? along * nx + segVal : segVal * nx + along;
          const top = Math.max(groundBand + 1, xzTop[topIdx]);
          const iy = Math.min(ny - 1, groundBand + 1 + Math.floor(v / gridRes * Math.max(1, top - groundBand)));
          return idx3(d.axis === 'x' ? segVal : along, iy, d.axis === 'x' ? along : segVal);
        }) });
      }
      segStart = -1;
    };
    for (let l = 0; l <= line; l++) {
      const v = l < line ? d.find(l) : -2;
      if (v >= 0) {
        if (segStart < 0) { segStart = l; segVal = v; }
        else if (Math.abs(v - segVal) > 1) { flush(l); segStart = l; segVal = v; }
      } else flush(l);
    }
  }

  // 连通域 → box 站位（地面带以上，6 邻接洪泛）
  const label = new Int32Array(nx * ny * nz).fill(-1);
  const comps = [];
  for (const vi of occupied) {
    const iy = Math.floor(vi / (nx * nz));
    if (iy <= groundBand || label[vi] >= 0) continue;
    const stack = [vi];
    label[vi] = comps.length;
    const members = [];
    while (stack.length) {
      const v = stack.pop();
      members.push(v);
      const vy = Math.floor(v / (nx * nz)), rem = v % (nx * nz);
      const vx = rem % nx, vz = Math.floor(rem / nx);
      for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
        const ax = vx + dx, ay = vy + dy, az = vz + dz;
        if (ax < 0 || ay <= groundBand || az < 0 || ax >= nx || ay >= ny || az >= nz) continue;
        const nv = idx3(ax, ay, az);
        if (voxCount[nv] && label[nv] < 0) { label[nv] = comps.length; stack.push(nv); }
      }
    }
    if (members.length >= minCompVoxels) comps.push(members);
  }
  comps.sort((a, b) => b.length - a.length);
  const boxes = [];
  for (const members of comps.slice(0, maxBoxes)) {
    const bmin = [Infinity, Infinity, Infinity], bmax = [-Infinity, -Infinity, -Infinity];
    let r = 0, g = 0, b = 0, wsum2 = 0;
    for (const vi of members) {
      const vy = Math.floor(vi / (nx * nz)), rem = vi % (nx * nz);
      const vx = rem % nx, vz = Math.floor(rem / nx);
      const cc = [vx, vy, vz];
      for (let a = 0; a < 3; a++) {
        bmin[a] = Math.min(bmin[a], cc[a]); bmax[a] = Math.max(bmax[a], cc[a] + 1);
      }
      const c = avgColor(vi);
      const w = voxCount[vi];
      r += c[0] * w; g += c[1] * w; b += c[2] * w; wsum2 += w;
    }
    const c = [0, 1, 2].map(a => min[a] + (bmin[a] + bmax[a]) / 2 * cell);
    const s = [0, 1, 2].map(a => Math.max(cell, (bmax[a] - bmin[a]) * cell));
    // 6 面聚色：该面朝向侧最外一层体素的均色
    const fr = gridRes === 8 ? 4 : gridRes;
    const faces = new Uint8Array(6 * fr * fr * 3);
    const faceIdx = [[0, bmax[0] - 1, 1, 2], [0, bmin[0], 1, 2], [1, bmax[1] - 1, 0, 2], [1, bmin[1], 0, 2], [2, bmax[2] - 1, 0, 1], [2, bmin[2], 0, 1]];
    const faceCount = new Int32Array(6 * fr * fr);
    for (const vi of members) {
      const vy = Math.floor(vi / (nx * nz)), rem = vi % (nx * nz);
      const vx = rem % nx, vz = Math.floor(rem / nx);
      const cc = [vx, vy, vz];
      const col = avgColor(vi);
      for (let f = 0; f < 6; f++) {
        const [axis, bound, u1, u2] = faceIdx[f];
        if (cc[axis] !== bound) continue;
        const u = Math.min(fr - 1, Math.floor((cc[u1] - bmin[u1]) / Math.max(1, bmax[u1] - bmin[u1]) * fr));
        const v = Math.min(fr - 1, Math.floor((cc[u2] - bmin[u2]) / Math.max(1, bmax[u2] - bmin[u2]) * fr));
        const fi = (f * fr * fr + v * fr + u) * 3;
        faces[fi] += col[0]; faces[fi + 1] += col[1]; faces[fi + 2] += col[2];
        faceCount[f * fr * fr + v * fr + u]++;
      }
    }
    const flat = wsum2 ? [r / wsum2, g / wsum2, b / wsum2] : [120, 120, 124];
    for (let f = 0; f < 6; f++) for (let v = 0; v < fr; v++) for (let u = 0; u < fr; u++) {
      const cellIdx = f * fr * fr + v * fr + u;
      const o = cellIdx * 3;
      if (faceCount[cellIdx]) {
        faces[o] /= faceCount[cellIdx]; faces[o + 1] /= faceCount[cellIdx]; faces[o + 2] /= faceCount[cellIdx];
      } else { faces[o] = flat[0]; faces[o + 1] = flat[1]; faces[o + 2] = flat[2]; }
    }
    boxes.push({ c, s, color: flat.map(v => Math.round(v)), tex: b64(faces), tres: fr });
  }

  // 地面面片（含少量颜色烘焙：8×8 网格均色）
  const planes = [];
  const ex = max[0] - min[0], ez = max[2] - min[2];
  if (floorBin >= 0) {
    const g = gridRes;
    const tex = new Uint8Array(g * g * 3);
    const cnt = new Int32Array(g * g);
    for (const vi of occupied) {
      const vy = Math.floor(vi / (nx * nz));
      if (vy > groundBand) continue;
      const rem = vi % (nx * nz);
      const vx = rem % nx, vz = Math.floor(rem / nx);
      const gu = Math.min(g - 1, Math.floor(vx / nx * g)), gv = Math.min(g - 1, Math.floor(vz / nz * g));
      const c = avgColor(vi);
      const o = (gv * g + gu) * 3;
      tex[o] += c[0]; tex[o + 1] += c[1]; tex[o + 2] += c[2]; cnt[gv * g + gu]++;
    }
    for (let i = 0; i < g * g; i++) {
      const o = i * 3;
      if (cnt[i]) { tex[o] /= cnt[i]; tex[o + 1] /= cnt[i]; tex[o + 2] /= cnt[i]; }
      else { tex[o] = 178; tex[o + 1] = 182; tex[o + 2] = 190; }
    }
    planes.push({ kind: 'floor', c: [(min[0] + max[0]) / 2, floorY, (min[2] + max[2]) / 2], n: [0, 1, 0], size: [ex, ez], tex: b64(tex), tres: g });
  }
  if (ceilY != null) planes.push({ kind: 'ceiling', c: [(min[0] + max[0]) / 2, ceilY, (min[2] + max[2]) / 2], n: [0, -1, 0], size: [ex, ez], tex: null, tres: 0 });
  planes.push(...walls.map(w => ({ ...w, tres: gridRes })));

  return {
    v: 1, cell,
    extent: { min, max },
    planes,
    boxes,
    stats: {
      sourcePoints: n, occupiedVoxels: occupied.length, components: comps.length,
      walls: walls.length, boxes: boxes.length, floorY, ceilY
    }
  };
}
