生成文件 `src/ui/topbar.js`。`export function mount(el)`，顶部工具栏 + 发布检查弹窗 + toast 容器 + 桌面试玩 HUD。

要点：
- 左：logo「造梦 · 故事空间」+ 场景名 input（meta.name 同步）｜菜单按钮组：新建（确认后 store.newScene(demoScene())）、打开（file input .json→importJSON）、导出（Blob 下载 scene.json）、保存（store.save→toast）
- 中：模式切换「编辑|试玩」.btn 组（store.setMode）；gizmo 组 W/E/R（translate/rotate/scale，快捷键联动 active 态，监听 keydown 仅更新 UI）、吸附开关（snap 0.1/15°/0.1）、锁地面开关
- 右：预算条 .budget（字节MB/视频路数/tris/预估fps，来自 budget(scene)，over 项加 .over 红）→ 每 'change' 重算；「已替换 x/y」计数（objects 里 asset 非空占需素材对象的比例，quad/video_quad/glb 算需素材）；「发布」.btn.primary → 弹 modal：publishCheck 结果 blocks 红 warns 黄（.check-item，可点 jump→store.select(target)）；blocks>0 时确认按钮禁用；确认 → store.emit('published') + toast「已发布快照 v{n}」（版本号存 localStorage 计数）
- toast：页面 append #toasts div；store.on('card') → 剧情卡 toast（.toast 5s 自动消失）；export 也出 toast
- 试玩 HUD：mode=play 时 viewport-overlay 显示「模拟试玩 · 进度 n/3 · 提示：enter 自动检测；gaze/hold 在下方按钮模拟」+ 浮动按钮条（对当前选中对象：[看向1s][按住1s][点击] 按钮 → triggers.fire）+ node-goto 事件时更新进度显示 + node-done toast
- import { store } from '../core/store.js'; { publishCheck, budget } from '../core/schema.js'; { demoScene } from '../core/templates.js'; { triggers } from '../core/playback.js'; { viewport } from '../core/viewport.js'; { log } from './log.js'

输出：仅输出完整文件内容，不要 markdown 代码围栏，不要任何解释。