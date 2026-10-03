重写 `src/ui/topbar.js`（覆盖现有）。`export function mount(el)`，顶栏按设计稿（瓷白）：

## 结构（左→右，均 flex 居中）
- `.tb-logo`：橙渐变方块 .mark + 「造梦 · 故事空间」+ 竖线分隔 + 场景名 store.scene.meta.name
- `.tb-saved`：「已保存 HH:MM」灰小字——store.save 后更新（订阅 'change' 非 transient 节流 2s；meta.dirty 时显示「编辑中」）
- `.mode-toggle`：创作/试玩 两钮切换 store.setMode
- 中段空（presence 组件由 main.js 追加在右侧前）
- `.draft-chip`：草稿码——取 URL ?draft= 或生成 'XXXX-XXXX'（大写字母数字）显示，点击复制房间链接（含 ?room=当前房间，从 presence 输入框取不到就用 URL 参数或 'demo'）
- `预览` 钮：store.validate() → 弹浮层列 blockers/warnings（中文，block 红 warn 黄），无问题显示 ✓ 可发布
- `发布` 钮（橙实心 .primary）：validate 有 blockers → 弹层展示并阻止；无 → emit('published') + log('已发布 demo')
- 已连接状态点 + `🔔` 通知钮（图标钮，点击弹 store.history() 最近 10 条浮层）
- 订阅 'mode'/'change'/'collab-status'

输出：仅完整文件内容，无围栏无解释。