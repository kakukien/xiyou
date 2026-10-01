重写 `src/ui/outliner.js`（覆盖现有）。`export function mount(el)`，按设计稿：

## 结构（瓷白主题，新 CSS 类已备好）
- 顶部 `.ol-tabs`：「内容」(默认)/「世界大纲」两 tab。内容=现在这棵树；世界大纲=只显示章节+节点（纯剧情视角，点节点只选中不改对象选择）
- `.ol-search`：搜索框过滤「章节/节点/对象名」
- `.ol-addrow`：`+章节` + `+节点`（+节点加到当前选中节点所在章，无选中加最后一章）
- 内容树两段：
  1. **剧情章**：每章 `.ch-row`（章名 + 节点计数如 3/3 + 折叠箭头，点击折叠整章）；展开后节点 `.node-card`：`.node-thumb` 占位缩略块（首字符）+ `.node-meta`（.t=title .s=text 截断）+ `.node-checks`：四个小字 文/摆/触/位，已满足的条件亮绿（.done）——文=node.text 非空，摆=有对象 node_id 指向它或 node.anchor 非空，触=有 trigger target 属于它或 node 有 on_enter，位=node.anchor 非空。起点节点前显示▶标记
  2. **场景对象**：标题行「场景对象」+ `+添加`（点击弹出类型菜单：5 种 OBJECT_TYPES 中文名，选中即 store.addObject 落原点）；下面按 type 分组 `.obj-group-h`（中文类型名+计数），组内对象行可点击选中/双击聚焦视口/右键或长按删除？——简化：行尾 ×删除钮
- 选中高亮：`.active`；被他人软锁的对象行尾显示彩点+人名缩写（订阅 'collab-peers'，collab.lockedBy）
- 行重排/拖拽不做。所有点击后 store.select([id])
- 订阅 'change'/'selection'/'collab-peers'/'mode' 重渲染；mode==='play' 时树只读（点击只选中，隐藏 +添加/删除钮）

输出：仅完整文件内容，无围栏无解释。