生成文件 `src/ui/details.js`。`export function mount(el)`，右侧属性检查器。

要点：
- 无选中：显示「未选中」dim 提示 + 场景 base 属性（sog_url 输入、transform.s/t、scale_source 只读展示）
- 选中 object（id 在 scene.objects 里）：Tab 头 [变换|材质|命中体|交互]
  - 变换：name、type 只读、node_id 下拉（所有 node + 无）、p/r/s 各三轴 number input（step 0.1，r 步 5°）→ input 事件 store.updateObject transient=true、change 事件非 transient
  - 材质：quad→asset 下拉（meta.assets 里 type image 的 + 无）、doubleSide checkbox、glow（material.glow 0-2）；video_quad→asset 下拉（video 类）、preset 下拉 S/P/L、loop/speed；glb→asset 下拉（glb）、clip 下拉（载入后填充，存 material.clip）、loop、speed；light→color/intensity/range；splat_segment→tint 颜色、outline 高亮色
  - 命中体：type 下拉 auto/box/sphere/none；box/sphere 时 size 三输入、center 三输入；「自动包围盒」按钮（hitbox.type='auto'）
  - 交互：列出 target=该对象的 triggers，每行 .trig-row「当 [条件下拉] [参数行内输入] 时，[动作下拉] [参数]」+ del 按钮；底部「+ 添加触发」；条件参数：gaze/hold→secs 数字；enter→radius 数字；seq_event→seqId 下拉；动作参数：play_seq→seq 下拉；card/reward→text；goto_node→node 下拉。修改即 updateTrigger
  - 通用底部：comments（列出 + 添加 + resolve 勾选）
- 选中 node（id 在 story nodes 里）：title/text(≤40字计数)/anchor 下拉(可选 object 或 anchor id)/on_enter 下拉(sequence)/next 下拉(同章 node+无=终点)/checklist 四勾（copy 文案、placed 摆放、trigger 触发、located 定位）
- 多选：显示数量 + 「成组」「对齐地面」按钮（成组=创建空 group object？简化为提示 toast 未实现）
- import { store } from '../core/store.js'; { OBJECT_TYPES, CONDITIONS, ACTIONS, VIDEO_PRESETS } from '../core/schema.js'
- 订阅 'selection' 与 'change'（非 transient 或 blur 后）重渲染；输入框正在 focus 时不重渲染该 tab（用 el.contains(document.activeElement) 判断跳过）

输出：仅输出完整文件内容，不要 markdown 代码围栏，不要任何解释。