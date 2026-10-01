生成文件 `src/core/store.js`。严格实现契约中 store 的全部 API。

要点：
- 内部维护 `scene`（JSON 文档）、`selection`、`mode`、undo/redo 快照栈（每次非 transient 变更前 push JSON.stringify(scene) 快照，redo 栈在非 undo 的新变更时清空）
- `updateObject(id, patch, {transient})` 用深合并（数组整体替换）；id/name 字段不允许 patch 覆盖
- `save()` 写 localStorage 'xiyou.scene'（整个 scene）并标 meta.dirty=false；`load()` 读回并校验基本结构（坏数据返回 false）；`newScene(template)` 无参时用 schema.js 的 `defaults()`
- `importJSON(str)` JSON.parse + 补齐 meta，失败返回 false 并 log
- 事件系统：Map<evt, Set<fn>>；emit 同步调用；'change' 事件参数 {transient:false|true}
- 依赖 import：`import { defaults, newObject, newSequence, newTrigger, newNode, newChapter } from './schema.js'`
- emit('change') 时不能阻塞异常：try/catch 每个监听器

输出：仅输出完整文件内容，不要 markdown 代码围栏，不要任何解释。