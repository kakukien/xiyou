import * as THREE from 'three'

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
