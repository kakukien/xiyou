// 空间底座工具：PLY 解析 / 减体积 / 下载
// 纯前端实现：砍 SH 高阶系数（f_rest_*）+ 均匀抽稀，无需服务端。
const TYPE_SIZE = {
  char: 1, int8: 1, uchar: 1, uint8: 1,
  short: 2, ushort: 2, int16: 2, uint16: 2,
  int: 4, uint: 4, int32: 4, uint32: 4, float: 4, float32: 4,
  double: 8, float64: 8,
};

export function parsePly(buf) {
  const u8 = new Uint8Array(buf);
  const headText = new TextDecoder().decode(u8.subarray(0, Math.min(u8.length, 1 << 20)));
  if (!headText.startsWith('ply')) throw new Error('不是 PLY 文件');
  const eh = headText.indexOf('end_header');
  if (eh < 0) throw new Error('PLY 头不完整');

  // end_header 之后跳过换行到数据区
  let dataOff = eh + 'end_header'.length;
  while (u8[dataOff] === 0x0d || u8[dataOff] === 0x0a) dataOff++;

  const lines = headText.slice(0, eh).split(/\r?\n/);
  let format = '';
  const elements = [];
  let cur = null;
  for (const ln of lines) {
    const t = ln.trim().split(/\s+/);
    if (t[0] === 'format') format = t[1];
    else if (t[0] === 'element') { cur = { name: t[1], count: +t[2], props: [] }; elements.push(cur); }
    else if (t[0] === 'property' && cur) {
      if (t[1] === 'list') throw new Error('含 list 属性的顶点元素暂不支持');
      cur.props.push({ name: t[t.length - 1], type: t[1], size: TYPE_SIZE[t[1]] || 0 });
    }
  }
  if (format !== 'binary_little_endian') throw new Error(`仅支持 binary_little_endian，当前 ${format || '未知'}`);
  const vertex = elements.find(e => e.name === 'vertex');
  if (!vertex || !vertex.count) throw new Error('找不到 vertex 元素');
  if (vertex.props.some(p => !p.size)) throw new Error('存在未知属性类型');
  const stride = vertex.props.reduce((a, p) => a + p.size, 0);
  return {
    dataOff, vertex,
    stride,
    vertexCount: vertex.count,
    props: vertex.props,
    shDegree: (() => {
      const rests = vertex.props.filter(p => /^f_rest_\d+$/.test(p.name)).length;
      for (let d = 3; d >= 0; d--) if (rests >= 3 * ((d + 1) ** 2 - 1)) return d;
      return 0;
    })(),
    bytes: u8.length - dataOff,
  };
}

// 减体积：保留 sh 阶 SH + 均匀抽稀 keepRatio
export function compressPly(buf, { sh = 0, keepRatio = 1 } = {}) {
  const p = parsePly(buf);
  const restKeep = Math.max(0, 3 * ((sh + 1) ** 2 - 1)); // f_rest_0..restKeep-1
  const kept = p.props.filter(pr => {
    const m = /^f_rest_(\d+)$/.exec(pr.name);
    return !m || (+m[1]) < restKeep;
  });
  const keptOff = [];
  { let o = 0; for (const pr of p.props) { if (kept.includes(pr)) keptOff.push(o); o += pr.size; } }
  const outStride = kept.reduce((a, pr) => a + pr.size, 0);
  const inCount = p.vertexCount;
  const outCount = Math.max(1, Math.round(inCount * Math.min(1, Math.max(0.02, keepRatio))));
  const step = inCount / outCount;

  const header =
    'ply\nformat binary_little_endian 1.0\n' +
    `comment xiyou-optimized sh=${sh} keep=${keepRatio}\n` +
    `element vertex ${outCount}\n` +
    kept.map(pr => `property ${pr.type} ${pr.name}`).join('\n') +
    '\nend_header\n';
  const headBytes = new TextEncoder().encode(header);
  const out = new Uint8Array(headBytes.length + outCount * outStride);
  out.set(headBytes, 0);
  const dv = new DataView(out.buffer);
  const src = new Uint8Array(buf);
  let w = headBytes.length;
  const base = p.dataOff;
  const inStride = p.stride;
  for (let k = 0; k < outCount; k++) {
    const si = base + Math.min(inCount - 1, Math.floor(k * step)) * inStride;
    for (let j = 0; j < kept.length; j++) {
      const sz = kept[j].size;
      for (let b = 0; b < sz; b++) dv.setUint8(w + b, src[si + keptOff[j] + b]);
      w += sz;
    }
  }
  return {
    blob: new Blob([out.buffer], { type: 'application/octet-stream' }),
    bytes: out.byteLength,
    count: outCount,
    keptProps: kept.length,
    droppedProps: p.props.length - kept.length,
  };
}

export function downloadBlob(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function fmtSize(n) {
  return n > 1 << 20 ? (n / (1 << 20)).toFixed(1) + 'MB' : Math.round(n / 1024) + 'KB';
}
