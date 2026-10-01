生成文件 `src/core/collab.js`。给编辑器加 Yjs 实时协作层，导出 `export const collab`。

依赖（已安装）：`import * as Y from 'yjs'`、`import { WebsocketProvider } from 'y-websocket'`、本项目 `import { store } from './store.js'`、`import { log } from '../ui/log.js'`。

## 数据模型（粗粒度即可，黑客松够用）
一个 Y.Doc，根结构 `doc.getMap('entities')`，按集合分桶：`entities.get('objects') / sequences / triggers / chapters / anchors / base / meta` 各为一个 Y.Map；实体级条目以 `id -> JSON字符串` 存储（chapters 数组按 chapter.id 存，nodes 嵌在 chapter JSON 里；base 用固定 key 'base'；meta 用 'meta'）。

## API
- `collab.connect({url, room, user}) -> Promise<bool>`：建 doc/provider/awareness；`provider.on('status')` 更新 `collab.connected`；连接失败 reject
- `collab.connected`、`collab.peers() -> [{clientId,name,color,sel:[ids]}]`（awareness 快照，排除自己）
- `collab.lockedBy(objectId) -> {name,color}|null`（别的 peer 的 sel 含该 id）
- `collab.undo() / collab.redo() / canUndo() / canRedo()`：内部 UndoManager，scope = entities map，`trackedOrigins = new Set(['local'])`
- `collab.disconnect()`
- 事件转发：`store.emit('collab-peers', peers)`（awareness 变化时）、`store.emit('collab-status', {connected})`

## 同步逻辑（防回声是关键）
- 出站：监听 `store.on('change', ...)`。把 scene 按集合 diff：逐集合对比 `JSON.stringify(entity)` 与 Y.Map 里现存值；不一致 → `doc.transact(()=>{...set/delete...}, 'local')`。用 `_applying` 标志位挡远端回流（远端应用时置 true，store 的 change 监听器里见到就跳过）。
- 入站：`entities.observeDeep(events, txn)`，txn.origin!=='local' 时收集变更 → 写回 `store.scene` 对应集合（按 id 增删改，保持数组顺序=迭代顺序）→ `_applying=true` 包裹调用 `store.emit('change',{remote:true})` + `store.save()`
- 首次连接：`provider.on('sync', ...)` 后若远端为空且本地 scene 非空 → 全量推本地；远端有数据 → 拉取覆盖本地（store.scene 被替换后 emit 'change' + 'scene-loaded'）
- awareness 本地态 `{name,color,sel}`：颜色从调色板按 clientID 取模；`store.on('selection')` 时更新 sel
- UndoManager 撤销的写回也走同一 transact 通道；undo/redo 后需要把 doc 状态重新 diff 回 store（复用入站逻辑）

要求：断线重连由 WebsocketProvider 自带；log 中文关键事件。输出：仅完整文件内容，无围栏无解释。