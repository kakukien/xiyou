// PLY 空间优化 Worker：解析 → 降噪 → 体素抽稀 → 回写干净 PLY → 结构代理
// 输入 {buf:ArrayBuffer, opts:{preset}}，回报 {stage,pct} 进度与最终结果。
import { parseSplatCloud, denoise, voxelSample, writeStdPly, buildProxy } from './plyproc.js'

const PRESETS = {
  light: { opacityMin: 0.04, targetCount: 500000, minVoxel: 2, volMargin: 16 },
  balanced: { opacityMin: 0.06, targetCount: 300000, minVoxel: 3, volMargin: 12 },
  strong: { opacityMin: 0.1, targetCount: 160000, minVoxel: 4, volMargin: 8 }
}

const progress = (stage, pct) => self.postMessage({ stage, pct })

self.onmessage = e => {
  const { buf, opts = {} } = e.data || {}
  try {
    const preset = PRESETS[opts.preset] || PRESETS.balanced
    progress('parse', 2)
    const cloud = parseSplatCloud(buf)
    progress('parse', 18)

    const dn = denoise(cloud, {
      opacityMin: opts.opacityMin ?? preset.opacityMin,
      volMargin: preset.volMargin,
      minVoxel: preset.minVoxel
    })
    progress('denoise', 42)

    const vs = voxelSample(cloud, dn.keep, { targetCount: opts.targetCount ?? preset.targetCount })
    progress('sample', 62)

    const cleanBuf = writeStdPly(cloud, vs.keepIdx)
    progress('write', 80)

    let proxy = null
    if (opts.proxy !== false) {
      proxy = buildProxy(cloud, vs.keepIdx, {})
      progress('proxy', 96)
    }

    self.postMessage({
      stage: 'done', pct: 100,
      cleanBuf, proxy,
      stats: {
        format: cloud.format,
        raw: cloud.count,
        denoise: dn.stats,
        kept: vs.keepIdx.length,
        cell: vs.cell,
        cleanBytes: cleanBuf.byteLength,
        proxy: proxy?.stats || null
      }
    }, [cleanBuf])
  } catch (err) {
    self.postMessage({ stage: 'error', error: err?.message || String(err) })
  }
}
