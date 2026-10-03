import { existsSync } from 'node:fs'

const values = new Map()
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null },
  setItem(key, value) { values.set(key, String(value)) },
  removeItem(key) { values.delete(key) }
}

const constModule = await import('../src/core/store.js')
const { store } = constModule
const { applyOps } = await import('../src/core/aiops.js')
const { ELEMENT_CATALOG, ELEMENT_CATEGORIES, resolveElementVoice, elementObjectProps } = await import('../src/core/elements.js')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(ELEMENT_CATALOG.length === 124, 'element catalog count changed')
assert(ELEMENT_CATEGORIES.length === 8 && ELEMENT_CATEGORIES.every(category => ELEMENT_CATALOG.some(item => item.categoryId === category.id)), 'element categories incomplete')
const chairVoice = resolveElementVoice('椅子')
assert(chairVoice.element?.id === 'furniture.chair', 'chair voice alias did not resolve')
assert(resolveElementVoice('xj.element.furniture.chair').element?.id === 'furniture.chair', 'chair voice token did not resolve')
const chairProps = elementObjectProps('furniture.chair')
assert(chairProps.element_id === 'furniture.chair' && chairProps.voice_token === 'xj.element.furniture.chair' && chairProps.parts.length > 0, 'chair instance contract incomplete')

const key = 'xiyou.regression'
store.setStorageKey(key)
store.newScene()
store.scene.meta.name = '花果山觉醒'
store.addObject('compound', { name: '应该保留的对象' })
const before = store.exportJSON()
assert(store.save(), 'save failed')
store.newScene()
assert(store.load(), 'load failed')
assert(store.scene.meta.name === '花果山觉醒', 'named user scene was not restored')
assert(store.scene.objects.length === 1, 'saved object was not restored')

values.set(key, '{broken')
values.set(`${key}.backup`, before)
assert(store.load(), 'backup recovery failed')
assert(store.lastLoadStatus === 'backup', 'backup status missing')
assert(store.scene.objects.length === 1, 'backup object was not restored')

values.set(key, JSON.stringify({ broken: true }))
assert(store.load(), 'structurally invalid draft backup recovery failed')
assert(store.lastLoadStatus === 'backup', 'structurally invalid backup status missing')
assert(store.scene.objects.length === 1, 'structurally invalid backup object was not restored')

store.newScene()
const elementResult = applyOps([{ op: 'add_element', element_id: 'furniture.chair', name: '语音添加的椅子' }])
assert(elementResult.failed.length === 0, 'add_element op failed')
assert(store.scene.objects[0]?.id && store.scene.objects[0]?.element_id === 'furniture.chair', 'element instance id/element_id was not persisted')
assert(store.scene.objects[0]?.voice_token === 'xj.element.furniture.chair', 'voice token was not persisted')
const actionScene = store.scene
const chairId = actionScene.objects[0].id
const runtimeRule = applyOps([{ op: 'add_runtime_rule', target: chairId, when: 'collision', params: { radius: 0.8 }, do: [{ action: 'set_state', args: { targetId: chairId, state: 'active' } }] }])
assert(runtimeRule.failed.length === 0, 'runtime interaction rule failed')
assert(store.scene.triggers.some(trigger => trigger.runtimeOnly && trigger.when === 'collision'), 'runtime-only trigger was not persisted')
store.newScene()
const voiceElementResult = applyOps([{ op: 'add_element', element_id: 'xj.element.furniture.chair', name: '语音 token 椅子' }])
assert(voiceElementResult.failed.length === 0 && store.scene.objects[0]?.element_id === 'furniture.chair', 'voice token add_element failed')
const release = store.createRelease()
assert(release.payload?.releaseId === release.id && release.payload.scene?.objects?.length === 1, 'release payload missing')
store.newScene()
const result = applyOps([
  { op: 'add_object', type: 'compound', name: '事务对象' },
  { op: 'add_trigger', target: 'missing-object', when: 'tap', do: [] }
])
assert(result.failed.length === 1, 'atomic failure was not reported')
assert(store.scene.objects.length === 0, 'failed AI transaction was not rolled back')
assert(existsSync('dist/runtime.html'), 'runtime build output is missing; run npm run build first')
console.log('regression: OK')
