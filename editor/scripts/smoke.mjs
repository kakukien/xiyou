import { defaults, newZone, publishCheck } from '../src/core/schema.js'
import { store } from '../src/core/store.js'
import { applyOps } from '../src/core/aiops.js'
import { demoScene } from '../src/core/templates.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const scene = defaults()
scene.story.chapters = [{ id: 'chapter_smoke', title: '测试章节', nodes: [{ id: 'node_smoke', title: '起点', next: null, anchor: '' }] }]
store.newScene(scene)

const ops = applyOps([
  { op: 'add_zone', id: 'zone_smoke', name: '测试触发区', kind: 'trigger', transform: { p: [0, 1, -2], r: [0, 0, 0], s: [2, 2, 2] } },
  { op: 'add_object', id: 'object_smoke', type: 'quad', name: '测试对象', zone_id: 'zone_smoke', transform: { p: [0, 1, -2], r: [0, 0, 0], s: [1, 1, 1] } },
  { op: 'add_trigger', id: 'trigger_smoke', target: 'zone_smoke', when: 'enter', params: {}, do: [{ action: 'card', args: { text: '进入区域' } }] }
])
assert(ops.failed.length === 0, `AI ops failed: ${JSON.stringify(ops.failed)}`)
assert(store.scene.zones.length === 1, 'zone was not created')
store.updateTrigger('trigger_smoke', { params: { radius: 3.5, secs: 2.25 } })
assert(store.scene.triggers[0].params.radius === 3.5 && store.scene.triggers[0].params.secs === 2.25, 'trigger params were not persisted')
assert(publishCheck(store.scene).blocks.length === 0, 'valid scene was blocked')

store.setBase({ chunks: [{ id: 'chunk_smoke', name: '测试分块', url: 'https://assets.example/chunk.sog', lod: { high: 'https://assets.example/chunk-high.sog' } }] })
assert(publishCheck(store.scene).blocks.length === 0, 'valid chunk config was blocked')
const asset = store.addAsset({ id: 'asset_smoke', name: '测试资源', type: 'image', kind: 'image', size: 10, url: 'local://asset.png' })
const objectRef = store.addObject('quad', { id: 'object_asset_ref', asset: asset.id, name: '资源引用对象' })
store.setBase({ sog_url: asset.url, chunks: [{ id: 'chunk_asset_ref', url: asset.url, lod: { high: asset.url } }] })
const referencesBefore = store.assetReferences(asset.id)
assert(referencesBefore.objects.some(item => item.id === objectRef.id), 'asset object reference missing')
assert(referencesBefore.base.length === 3, 'asset base references missing')
const fakeFile = { size: 20, type: 'image/png' }
store.replaceAsset(asset.id, fakeFile, 'local://asset-v2.png')
assert(store.scene.meta.assets.find(item => item.id === asset.id).version === '2.0.0', 'asset replacement version failed')
assert(store.getObject(objectRef.id).asset === asset.id, 'asset object id reference was rewritten')
assert(store.scene.base.sog_url === 'local://asset-v2.png', 'base asset URL was not replaced')
assert(store.scene.base.chunks[0].lod.high === 'local://asset-v2.png', 'chunk LOD asset URL was not replaced')

const release = store.createRelease()
assert(release.version === 1 && release.snapshot, 'release snapshot missing')
store.updateZone('zone_smoke', { name: '修改后的区域' })
assert(store.restoreRelease(release.id), 'release restore failed')
assert(store.getZone('zone_smoke').name === '测试触发区', 'release restore did not restore zone')

store.batch(() => {
  store.addZone({ id: 'zone_a' })
  store.addZone({ id: 'zone_b' })
})
assert(store.scene.zones.length === 3, 'batch add failed')
assert(store.undo(), 'batch undo failed')
assert(!store.getZone('zone_a') && !store.getZone('zone_b'), 'batch undo did not remove both zones')
assert(store.redo(), 'batch redo failed')
assert(store.getZone('zone_a') && store.getZone('zone_b'), 'batch redo did not restore both zones')
store.updateZone('zone_smoke', { name: '第二版区域' })
const second = store.createRelease()
const diff = store.releaseDiff(release.id, second.id)
assert(diff && diff.zones.changed.includes('zone_smoke'), 'release diff failed')

store.newScene(demoScene())
assert(Array.isArray(store.scene.zones) && store.scene.zones.length >= 3, 'demo zones missing')
console.log('smoke: OK')
