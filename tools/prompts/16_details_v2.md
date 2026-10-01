重写 `src/ui/details.js`（覆盖现有）。`export function mount(el)`，右侧属性检查器，按设计稿：

## 结构
- 未选中：居中灰字「在左侧或视口中选择对象」
- 选中对象 → `.obj-head`：对象名（.t）+ `.chips` 状态徽章行：素材已加载(ok)/素材缺失(warn)、引用完整(ok)/悬挂引用(warn)、所属节点(显示 node_id 或「未入节点」warn)、n 项确认→可省
- `.subtabs`：基础(默认)/材质/显隐/高级 —— 切 tab 换下方内容区
  - **基础**：.det-card「变换」——位置/旋转(度)/缩放 各一行三输入 X/Y/Z（数字输入，step 0.1，改→updateObject transform p/r/s，s 同步锁：旁边⛓钮 toggle uniform）
  - **材质**：.det-card「材质与显隐」——类型下拉（按对象类型给可选材质/别名）、.slider-row 透明度 0-1（material.opacity）、`.toggle` 是否可见（visible）、splat_segment 额外：point_size slider
  - **高级**：.det-card「命中体」——命中类型下拉 hitbox.kind、命中半径半径输入 hitbox.r；.det-card「归属」——node_id 下拉（全部节点+无）；杂项：名称输入、id 只读行
- **交互** .det-card 常显（不随 tab）：
  - 句式渲染：「当 [条件chips] 时 → [动作chips] +」——取该对象第一个 trigger 渲染；点条件 chip 切换 when（点击/看向/按住/进入区域=CONDITION_IDS 中文）、点动作行弹出追加动作菜单（播放时间线=play_seq args.seqId 下拉全部时间线 / 高亮=highlight / 弹卡片=card args.text 输入 / 跳转节点=goto_node args.nodeId 下拉节点）；`+` 钮 → store.addTrigger(target=当前对象)；多条 trigger 纵向列出
  - `.cond-chips` 两行：「触发条件」「触发动作」
- **对象历史** .det-card 常显底部：store.history(对象id) 倒序最多 8 条，`.hist-row`（.who/.what/.when=HH:MM），订阅 'history'
- 变换输入持续输入时 transient（oninput→{transient:true}），change 提交正式（change→transient:false），保持撤销粒度
- 订阅 'selection'/'change'/'history'/'collab-peers'；mode='play' 全部控件 disabled
- 被他人软锁（collab.lockedBy(id) 非空）时头部加「XX 正在编辑」warn chip（仍可改=强制接管）

输出：仅完整文件内容，无围栏无解释。