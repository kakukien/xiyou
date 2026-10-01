生成文件 `src/ui/dock.js`。`export function mount(el)`，底部停靠栏三 Tab：内容浏览器 / 时间线 / 输出日志。

要点：
- Tab 结构 .tabs>.tab + .tabpage
- 内容浏览器：
  - 素材卡片网格 .cb-grid>.cb-card（.thumb 显示 img/video/icon，.nm 文件名）
  - 顶部工具行：「导入素材」按钮（input[type=file] 多选，accept image/*,video/*,.glb）→ store.addAsset({name,type(image|video|glb),size,url:URL.createObjectURL(file)})；「+ 动作卡」下拉（ACTION_CARDS）拖到对象或点选应用到当前选中对象 → cardToSequence+store.addSequence
  - 占位素材行：OBJECT_TYPES 五类生成卡片（可拖）：拖到 #viewport 即 store.addObject(type,{transform:{p:dropPoint}})——dragstart 设 dataTransfer 'xo-type'；卡片点击→若选中对象则替换其 asset
  - 素材卡点击行为：当前选中对象且类型匹配（quad/video_quad←video|image，glb←glb）→ store.updateObject asset=id
  - 删除：卡右上角 ×（确认后 store.removeAsset，引用它的对象 asset 置 ''）
- 时间线：
  - sequence 下拉选择 + 「+ 新建时间线」+ duration 输入 + 播放/停止按钮 + 「添加轨道」（选对象+kind）
  - .tl：轨道行 .tl-track（.tl-name=对象名+kind，.tl-lane 宽=duration*40px 每秒 40px）、key 圆点 .tl-key 可左右拖改 t、双击 key 编辑 v（prompt 简单输入 JSON 或数值；transform 轨道的 v 编辑弹小面板也可简化为改 t 即可+双击删除？——实现：拖动改 t，alt+点击删除，双击弹输入）
  - ruler .tl-ruler 秒刻度，点击/拖动设播放头位置 → 若有 player.playing 效果，编辑模式仅显示 playhead
  - 播放头 .tl-playhead 随 player tick 移动（订阅 store 'log'? 不行——导出自 playback 的 player 状态轮询 rAF，本模块自己 rAF 更新 playhead）
- 输出日志：订阅 store 'log' 事件 append 行（时间+级别色），清空按钮，最多 500 行
- import { store } from '../core/store.js'; { OBJECT_TYPES, VIDEO_PRESETS } from '../core/schema.js'; { ACTION_CARDS, cardToSequence } from '../core/templates.js'; { player } from '../core/playback.js'; { log } from './log.js'

输出：仅输出完整文件内容，不要 markdown 代码围栏，不要任何解释。