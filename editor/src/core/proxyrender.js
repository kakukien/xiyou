import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

function color(value, fallback = '#9aa8b5') {
  try { return new THREE.Color(value || fallback) } catch { return new THREE.Color(fallback) }
}

export function buildProxyGroup(proxy = {}) {
  const group = new THREE.Group()
  group.name = '结构代理'
  group.userData.isBaseHelper = true
  const planes = Array.isArray(proxy.planes) ? proxy.planes : []
  const boxes = Array.isArray(proxy.boxes) ? proxy.boxes : []
  planes.forEach((item, index) => {
    const size = Array.isArray(item.size) ? item.size : [1, 1]
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(Number(size[0]) || 1, Number(size[1]) || 1), new THREE.MeshBasicMaterial({ color: color(item.color, '#9aa8b5'), transparent: true, opacity: Number(item.opacity ?? 0.35), side: THREE.DoubleSide, depthWrite: false }))
    mesh.position.fromArray((item.p || [0, 0, 0]).map(Number))
    mesh.rotation.fromArray((item.r || [0, 0, 0]).map(value => Number(value) * Math.PI / 180))
    mesh.userData.isBaseHelper = true
    mesh.name = item.name || `proxy-plane-${index + 1}`
    group.add(mesh)
  })
  boxes.forEach((item, index) => {
    const size = Array.isArray(item.size) ? item.size : [1, 1, 1]
    const groupBox = new THREE.Group()
    groupBox.position.fromArray((item.p || [0, 0, 0]).map(Number))
    groupBox.rotation.fromArray((item.r || [0, 0, 0]).map(value => Number(value) * Math.PI / 180))
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: color(item.color, '#7c8a98'), transparent: true, opacity: Number(item.opacity ?? 0.2), wireframe: Boolean(item.wireframe), depthWrite: false }))
    mesh.scale.fromArray(size.map(Number))
    mesh.userData.isBaseHelper = true
    mesh.name = item.name || `proxy-box-${index + 1}`
    groupBox.add(mesh)
    group.add(groupBox)
  })
  return group
}

// 碰撞壳体：占用范围 × [floorY, ceilY] 的闭合棱柱——奇偶射线判定永远有效
export function proxyToColliderGroup(proxy) {
  const group = new THREE.Group()
  group.name = 'proxy-collider'
  const { extent, stats } = proxy || {}
  if (!extent) return group
  const { min, max } = extent
  const y0 = Number.isFinite(stats?.floorY) ? stats.floorY : min[1]
  const y1 = Number.isFinite(stats?.ceilY) ? stats.ceilY : max[1]
  const w = Math.max(0.05, max[0] - min[0])
  const h = Math.max(0.05, y1 - y0)
  const d = Math.max(0.05, max[2] - min[2])
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial()
  )
  mesh.position.set((min[0] + max[0]) / 2, (y0 + y1) / 2, (min[2] + max[2]) / 2)
  group.add(mesh)
  return group
}

export function proxyToGlbBuffer(proxy) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter()
    exporter.parse(
      proxyToColliderGroup(proxy),
      result => resolve(result),
      error => reject(error || new Error('GLB 导出失败')),
      { binary: true }
    )
  })
}
