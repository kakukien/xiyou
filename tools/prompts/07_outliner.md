生成文件 `src/ui/outliner.js`。`export function mount(el)`，左栏双树。

要点：
- 上树「剧情」：chapters → nodes。每行：icon 📖/◆ + title；点击 node → store.select(node.id)（node 也进 selection 集合，前缀用 'node:' 区分也可以，但契约定 selection 存纯 id——node.id 与 object.id 命名空间不同不会撞，直接 store.select(nodeId)）；node 行右侧显示 checklist 完成度（4 点 ●/○）
- 树头右上加「+章」「+节」按钮
- 下树「场景对象」：按 node_id 分组（空 node_id 归「未分配」），每行 icon(按 OBJECT_TYPES.icon)+name+眼睛（切 visible）；点击 store.select(id)、ctrl 多选、双击名字行内改名（input 失焦提交 store.updateObject name）
- 右键菜单（.ctx）：对象→聚焦/复制（深拷贝新 id）/删除；node→在此节点下新建对象（子菜单列 OBJECT_TYPES）/删除节点；空白→新建对象子菜单
- 选中高亮：订阅 'selection' 事件重渲染选中态（不必整树重建，toggle class 即可，整树重建只在 'change' 非 transient 时）
- 拖放：content browser 拖出的 asset 或对象卡片可在视口 drop 创建（viewport 的 drop 由 main/dock 处理，本文件不管）
- import { store } from '../core/store.js'; { OBJECT_TYPES } from '../core/schema.js'; { viewport } from '../core/viewport.js'
- 样式用 .tree-item .tree-children .tree-group-h .ctx

输出：仅输出完整文件内容，不要 markdown 代码围栏，不要任何解释。