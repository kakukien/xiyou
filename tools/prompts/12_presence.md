生成文件 `src/ui/presence.js`。`export function mount(el)`——在顶栏右端挂载协作状态条。

import { store } from '../core/store.js'; import { collab } from '../core/collab.js'

- 显示：连接状态点（绿=已连/灰=未连/橙=连接中）+ 在线人数 + 每个 peer 一个头像圆点（26px 圆，底色=peer.color，字=name 首字符，title 悬浮显示 name）；未连接时显示「单机」
- 房间名输入框：默认从 location ?room= 读（无则 'demo'），改后回车 → collab.connect({url, room, user})；user 名存 localStorage 'xiyou.user'（首次随机「编辑-XXXX」）
- 连接 URL：线上使用当前站点的同源 WebSocket 路径 `/xiyou-yjs`，本地使用 `ws://` + 当前主机 + `:8022`；可用 `?ws=` 参数覆盖
- 订阅 store 'collab-peers'/'collab-status' 事件重渲染；'collab-status' connected=false 时状态点灰
- 软锁提示：订阅 'collab-peers' 与 'selection'，若当前选中对象被他人 lockedBy，在头像条下显示小提示行「张三 正在编辑此对象」（不阻止操作=可强制接管）
- 样式：原生 DOM + style.css 变量；圆点内联 style 写 peer.color

输出：仅完整文件内容，无围栏无解释。