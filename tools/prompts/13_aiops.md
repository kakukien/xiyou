生成文件 `src/core/aiops.js`。AI 场景操作执行器 + 上下文序列化 + system prompt。

import { store } from './store.js'; import { OBJECT_TYPES } from './schema.js'

## 导出
### `export function sceneSummary() -> string`
把 store.scene 压缩成给 LLM 看的清单文本（中文，紧凑）：对象行 `id|类型|名字|p(x,y,z)|node`；节点行 `章>节|title|anchor|next`；sequences/triggers 各一行摘要；base 一行。总长目标 < 2000 字。

### `export const SYSTEM_PROMPT`
中文 system prompt，内容要点：
- 你是「造梦 · 故事空间 AR 空间编辑器」的内置助手，帮合作伙伴用自然语言编辑三维 AR 场景
- 输出必须是**一个 JSON 对象**（无 markdown 围栏）：`{"reply":"给用户的中文回复（≤60字）","ops":[...]}`
- 支持的 ops（白名单，字段严格）：
  - `{"op":"add_object","type":"quad|video_quad|glb|light|splat_segment","name":"","transform":{"p":[x,y,z],"r":[0,0,0],"s":[1,1,1]},"node_id":"","material":{},"asset":""}`
  - `{"op":"update_object","id":"","patch":{}}`（patch 字段同对象结构，transform 用 p/r/s）
  - `{"op":"remove_object","id":""}`
  - `{"op":"add_trigger","id":"","target":"<objectId>","when":"tap|gaze|hold|enter|seq_event|node_done","params":{},"do":[{"action":"play_seq|show|hide|highlight|card|reward|goto_node","args":{}}]}`
  - `{"op":"add_sequence","id":"","name":"","duration":2,"tracks":[{"target":"<objectId>","kind":"transform|opacity","keys":[{"t":0,"v":{},"ease":"out"}]}]}`
  - `{"op":"add_node","chapter_id":"","id":"","title":"","text":"≤40字","next":""}`
  - `{"op":"update_node","chapter_id":"","id":"","patch":{}}`
  - `{"op":"set_base","patch":{}}`
- 规则：引用已有对象用其 id；拿不准时先按场景清单猜测并在 reply 说明；一次最多 8 个 op；文案 ≤40 字；不知道怎么做就 reply 说明、ops 空数组
- 只输出 JSON

### `export function applyOps(ops) -> {done:[], failed:[{op,err}]}`
- 逐个执行：按 op 类型调 store.addObject/updateObject/removeObject/addTrigger/addSequence/addNode/updateNode/setBase
- 校验：type 必须在 OBJECT_TYPES；transform 分量补默认；update/remove 的 id 必须存在否则记入 failed；add_trigger 的 target 必须存在；do.action 必须在合法集合
- add_* 如果给了 id 且冲突 → 自动生成新 id（用 schema 的 id 风格）
- 每个 op 包一层 try/catch，全部在最后一次 store 变更中生效（顺序执行即可，store 自带 undo 快照——每 op 一条撤销）
- 失败不中断后续 op；返回 done/failed 供 UI 展示

输出：仅完整文件内容，无围栏无解释。