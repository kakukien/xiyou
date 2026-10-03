const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1]

function numericType(type) {
  return {
    char: ['i8', 1], int8: ['i8', 1], uchar: ['u8', 1], uint8: ['u8', 1],
    short: ['i16', 2], int16: ['i16', 2], ushort: ['u16', 2], uint16: ['u16', 2],
    int: ['i32', 4], int32: ['i32', 4], uint: ['u32', 4], uint32: ['u32', 4],
    float: ['f32', 4], float32: ['f32', 4], double: ['f64', 8], float64: ['f64', 8]
  }[String(type).toLowerCase()] || null
}

function readValue(view, offset, type) {
  switch (type) {
    case 'i8': return view.getInt8(offset)
    case 'u8': return view.getUint8(offset)
    case 'i16': return view.getInt16(offset, true)
    case 'u16': return view.getUint16(offset, true)
    case 'i32': return view.getInt32(offset, true)
    case 'u32': return view.getUint32(offset, true)
    case 'f32': return view.getFloat32(offset, true)
    case 'f64': return view.getFloat64(offset, true)
    default: return 0
  }
}

export async function inspectPly(input) {
  if (!input?.arrayBuffer) return null
  const buffer = await input.arrayBuffer()
  const probe = new TextDecoder().decode(buffer.slice(0, Math.min(buffer.byteLength, 1024 * 1024)))
  const headerEnd = probe.indexOf('end_header')
  if (headerEnd < 0 || !/^ply\s/i.test(probe)) return null
  const newlineEnd = probe.indexOf('\n', headerEnd)
  if (newlineEnd < 0) return null
  const header = probe.slice(0, newlineEnd + 1)
  const format = header.match(/^format\s+(\S+)/m)?.[1] || ''
  if (!format.startsWith('binary_little_endian')) return null
  const vertexCount = Number(header.match(/^element\s+vertex\s+(\d+)/m)?.[1] || 0)
  if (!vertexCount) return null
  const lines = header.split(/\r?\n/)
  let inVertex = false
  const properties = []
  let verticalAxis = 'Y'
  lines.forEach(line => {
    if (line.startsWith('comment Vertical axis:')) verticalAxis = line.split(':').slice(1).join(':').trim().toUpperCase() || 'Y'
    if (line.startsWith('element vertex')) inVertex = true
    else if (line.startsWith('element ') && inVertex) inVertex = false
    else if (inVertex && line.startsWith('property ') && !line.startsWith('property list ')) {
      const [, type, name] = line.trim().split(/\s+/)
      const info = numericType(type)
      if (info) properties.push({ name, type: info[0], size: info[1] })
    }
  })
  const indices = Object.fromEntries(properties.map((item, index) => [item.name, index]))
  if (!['x', 'y', 'z'].every(key => indices[key] !== undefined)) return null
  const stride = properties.reduce((sum, item) => sum + item.size, 0)
  const dataOffset = newlineEnd + 1
  if (dataOffset + stride * vertexCount > buffer.byteLength) return null
  const offsets = {}
  let offset = 0
  properties.forEach((item, index) => { offsets[index] = offset; offset += item.size })
  const view = new DataView(buffer)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  const keys = ['x', 'y', 'z']
  const propIndexes = keys.map(key => indices[key])
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const base = dataOffset + vertex * stride
    for (let axis = 0; axis < 3; axis += 1) {
      const property = properties[propIndexes[axis]]
      const value = readValue(view, base + offsets[propIndexes[axis]], property.type)
      if (!Number.isFinite(value)) continue
      min[axis] = Math.min(min[axis], value)
      max[axis] = Math.max(max[axis], value)
    }
  }
  if (!min.every(Number.isFinite) || !max.every(Number.isFinite)) return null
  const center = min.map((value, index) => (value + max[index]) / 2)
  return {
    format,
    vertexCount,
    verticalAxis,
    bounds: { min, max, center },
    transform: { s: 1, R: IDENTITY.slice(), t: [-center[0], -min[1], -center[2]], scale_source: 'ply-centered-ground' },
    coordinateSystem: { up: verticalAxis || 'Y', forward: '-Z', handedness: 'right', units: 'meters', origin: 'centered-ground' }
  }
}

export async function inspectPlyUrl(url) {
  if (!url || !String(url).toLowerCase().includes('.ply')) return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return inspectPly(await response.blob())
  } catch { return null }
}
