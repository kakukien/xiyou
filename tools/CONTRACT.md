# xiyou-ar/editor 架构契约（所有模块必须遵守）

项目：西游·虚境 AR 空间编辑器（黑客松版）。Vite + Three.js，纯 ES module，无框架，无 TypeScript。
UI 风格：UE5 深色编辑器主题（CSS 变量在 style.css 已定义，直接用 var(--xxx)）。

## 场景数据（唯一数据源，对齐 PRD §5.2）
```js
scene = {
  schemaVersion: '2.0.0', projectId: '', siteId: '',
  base: { sog_url: '', collider_url: null, collider: { type: 'box', size: [20,2,20], center: [0,1,0], visible: false }, chunks: [], lod: { enabled: false, levels: ['high','medium','low'], current: 'high', urls: {}, thresholds: { near: 12, far: 30 } }, transform: { s: 1, R: [1,0,0,0,1,0,0,0,1], t: [0,0,0], scale_source: 'manual' } },
  objects: [ { id, name, zone_id: '', type: 'splat_segment'|'quad'|'video_quad'|'glb'|'light',
               transform: { p:[x,y,z], r:[x,y,z](deg euler), s:[x,y,z] },
               asset: '', material: {}, hitbox: { type:'auto'|'box'|'sphere'|'none', size:[x,y,z], center:[x,y,z] },
               visible: true, node_id: '', comments: [] } ],
  sequences: [ { id, name, duration, tracks: [ { target: objectId, kind: 'transform'|'opacity'|'clip'|'video'|'audio'|'event', keys: [ { t, v, ease } ] } ] } ],
  triggers:  [ { id, name, target: objectId|zoneId, when: 'tap'|'gaze'|'hold'|'enter'|'seq_event'|'node_done',
                 params: {}, do: [ { action: 'play_seq'|'show'|'hide'|'highlight'|'card'|'reward'|'goto_node', args: {} } ] } ],
  story: { chapters: [ { id, title, nodes: [ { id, title, anchor, on_enter, next, text, checklist: { copy:false, placed:false, trigger:false, located:false } } ] } ] },
  anchors: [ { id, type: 'vps'|'image', image_url: null, pose: {} } ],
  zones: [ { id, name, kind: 'editable'|'trigger'|'forbidden', transform: { p, r, s }, color, visible, locked, description } ],
  meta: { name: '未命名场景', assets: [], releases: [] }   // assets: [{id,name,type,size,url}]
}
```

## 模块清单与导出契约

### src/core/store.js —— `export const store`
- `store.scene` 当前场景文档（普通 JSON 对象）
- `store.selectMany(ids)` / `store.validate()`
- `store.selection: Set<string>`；`store.select(id|null, {add=false})`；`store.selected(): string[]`
- CRUD：`store.addObject(type, props={}) -> obj`（自动补默认值）；`store.getObject(id)`；`store.updateObject(id, patch, {transient=false})`（深合并 patch；transient=true 不记 undo，用于拖动中）；`store.removeObject(id)`
- `store.addSequence(props)->seq / updateSequence(id,patch,opts) / removeSequence(id)`
- `store.addTrigger(props)->tr / updateTrigger / removeTrigger`
- `store.addChapter(title)->ch / store.addNode(chapterId, props)->node / store.updateNode(chapterId,nodeId,patch) / store.removeNode(chapterId,nodeId)`
- `store.setBase(patch)`
- `store.addZone(props)` / `store.getZone(id)` / `store.updateZone(id, patch, opts)` / `store.removeZone(id)`
- `store.updateAsset(id, patch)` / `store.replaceAsset(id, file, url)` / `store.createRelease()` / `store.releaseDiff(leftId, rightId)` / `store.restoreRelease(id)`
- `store.batch(fn)` —— 将多次场景变更合并为单次 change/undo
- undo：`store.undo()/redo()/canUndo/canRedo`（整文档 JSON 快照栈，上限 100）
- 持久化：`store.save()`（localStorage 'xiyou.scene' + meta.dirty=false）；`store.load()`；`store.newScene(template?)`；`store.exportJSON() -> string`；`store.importJSON(jsonString)`
- 事件：`store.on(evt, fn)` / `store.off(evt, fn)`；evt ∈ `'change'`（场景数据变了，参数 {transient}）、`'selection'`、`'mode'`（edit|play）、`'assets'`（素材库变了）。所有 CRUD 触发 'change'；select 触发 'selection'。
- `store.mode: 'edit'|'play'`；`store.setMode(m)`
- 素材库：`store.addAsset({name,type,size,url})`、`store.removeAsset(id)`，存 scene.meta.assets，触发 'assets' + 'change'

### src/core/schema.js
- `export function defaults()` —— 空场景
- `export function newObject(type, props)` / `newSequence` / `newTrigger` / `newNode` / `newChapter` —— 生成带默认值的实体（id = `type_`+6位随机）
- `export function validate(scene) -> [{level:'error'|'warn', msg, target}]` —— 结构校验
- `export function publishCheck(scene) -> { blocks:[{kind,msg,target}], warns:[{kind,msg,target}] }`
  block: dangling_ref（trigger.do.args.seq/node、sequence.track.target、story.node.anchor/on_enter/next 指向不存在的 id）、no_start_node（无 chapter 或首节点）、asset_load_fail（asset url 非空但不在 meta.assets 且非内置占位）
  warn: unplaced_node（node.anchor 为空）、no_ending（无 node.next===null 的终点节点）、over_budget（见 budget）、open_comments（object.comments 有 unresolved）
- `export function budget(scene) -> { bytes, videos, tris, estFps, over: bool, fixes:[{msg,fix}] }`
  估算规则：quad 5KB/2tri；video_quad size 按 preset（S=1024x2048,P=768x2048,L=1280x1440）时长×0.5MB/s，2tri，计 1 路视频；glb 按 meta.assets 里登记的 size、1500tri 估；splat_segment 80KB/5000tri；light 0。over_budget: bytes>30MB || videos>3 || tris>200k；estFps 粗略 = 60 - tris/8000 - videos*6，下限 15。
- `export const OBJECT_TYPES = {...}` 每种类型的创建/编辑元数据（图标名、默认尺寸、可否挂交互、hitbox 默认）
- `export const CONDITIONS = [{id:'tap',label:'点击'},…]`、`ACTIONS = [{id:'play_seq',label:'播放时间线',argKinds:['sequence']},…]`（供触发器 UI 用）
- `export const VIDEO_PRESETS = { S:{w:1024,h:2048}, P:{w:768,h:2048}, L:{w:1280,h:1440} }`

### src/core/templates.js
- `export function demoScene()` —— 「花果山觉醒」3 节点验证骨架：
  chapter ch1(title=花果山觉醒)，nodes n1(进入半径2m→glb 出场), n2(看向1s→splat_segment 触发视频), n3(按住1s→glb/quad→结局卡)。
  配套：3 个占位 object（glb_悟空、seg_岩壁、quad_结界符），3 条 sequence（出场飞入/视频播放/消散），3 条 trigger（enter/gaze/hold），anchors 留空数组，base 用占位（sog_url=''）。
- `export const ACTION_CARDS = [{id:'fly_in',label:'飞入'},{'land','落地'},{'roll','翻滚'},{'dissolve','消散'},{'transform','变身'},{'orbit','环绕'},{'blink','闪现'},{'float','浮动'}]`
- `export function cardToSequence(cardId, targetId) -> sequence` —— 按卡片生成 1–2s 的 transform/opacity 关键帧轨道

### src/core/objects.js —— three 端对象工厂
- `export function createNode(objDef, assets) -> THREE.Object3D`（userData.id = objDef.id）
  - quad: PlaneGeometry + MeshBasicMaterial(map=asset.url 或占位棋盘格 texture，doubleSide, transparent)
  - video_quad: PlaneGeometry + ShaderMaterial（上下拼接采样：uv.y>0.5 取上半颜色，else 取下半 alpha；两侧各内收 0.5px）。asset.url 为空时显示占位「VIDEO」字样的 canvas 纹理
  - glb: asset.url 非空用 GLTFLoader 异步载入（先放占位 BoxGeometry 线框，载入后替换）；无 url 显示橙色线框盒
  - splat_segment: 用 THREE.Points 生成 2000 个随机点的椭球簇做占位（淡青色，size 0.02）
  - light: PointLight + 小球体可视壳
  - hitbox: objDef.hitbox.type!=='none' 时附加半透明绿色 box/sphere helper（编辑器可见，play 模式隐藏，用 userData.isHelper 标记）
- `export function applyTransform(node, objDef)` —— transform.p/r/s → position/rotation(deg→rad)/scale
- `export function stackedAlphaShader() -> {vertexShader, fragmentShader, uniforms}` 
- `export function placeholderTexture(text, bg='#3a3f4b', fg='#e8b93b') -> CanvasTexture`（棋盘格底+字）

### src/core/viewport.js —— `export const viewport`
- `viewport.init(container: HTMLElement)` —— renderer(antialias)、PerspectiveCamera、OrbitControls（右键旋转/中键平移/滚轮缩放）、TransformControls（挂到 camera+renderer.domElement，拖动时写回 store.updateObject transient=true，dragging-changed 结束提交一次非 transient）
- `viewport.setGizmo('translate'|'rotate'|'scale')`、`viewport.setSnap({t,r,s})`、`viewport.setGroundLock(bool)`
- `viewport.sync()` —— 按 store.scene.objects 增量同步（按 id diff，避免整树重建）
- `viewport.focus(id)` —— 相机飞到对象/空间区域
- `viewport.colliderContainsPoint(point)` —— 判断点是否落在已加载 Collider 内（GLB/GLTF 使用缓存三角形检测，Box Collider 回退）
- `viewport.setBase(scene.base)`
- `viewport.syncZones()` —— 渲染空间区域、区域边界和辅助层；区域可被拾取和 Gizmo 编辑
- 拾取：pointerdown+click 无拖动时 raycast 非 helper 对象 → `store.select(userData.id)`；play 模式下命中 → `triggers.fire('tap', id)`（playback 模块）
- `viewport.node(id) -> Object3D`；`viewport.tick(dt)`（在 rAF 循环里被 main 调）
- play 模式：隐藏 grid/helper/gizmo，`viewport.helpersVisible(false)`
- WASD/QE 飞行（按住右键时），F 聚焦选中

### src/core/playback.js —— `export const player` + `export const triggers`
- `player.play(seqId)`、`player.stop()`、`player.tick(dt)`：按 tracks.keys 线性/ease 插值写回 viewport.node 的 transform（不写 store），结束后 fire seq_event
- `triggers.fire(when, targetId)`：找 scene.triggers 里 target+when 匹配的，按 do[] 执行：play_seq→player.play；show/hide→store.updateObject visible；highlight→viewport 描边闪烁 0.6s；card→HUD 弹卡（ui event 'toast'）；goto_node→store.emit('node-goto', nodeId)；reward→toast
- enter/gaze/hold 由 UI 模拟按钮触发（桌面试玩）；enter 按距离自动检测：play 模式下每 tick 检查相机/虚拟游客点（(0,1.6,0) 缓动走向当前 node anchor 位）

### src/ui/*.js —— 每个 `export function mount(el)`，内部订阅 store 事件自刷新
- `outliner.js` 左栏：剧情树（chapters>nodes，点击 node 高亮其 objects）+ 对象树（按 node_id 分组，图标+眼睛开关+双击改名）+ 右键菜单（新建对象/删除/复制）
- `details.js` 右栏：选中对象的属性页 Tab（变换 p/r/s 数字输入、材质、命中体、交互=triggers 句子式编辑「当[条件]时[动作][参数]」+添加/删除行）+ 选中 node 时显示节点属性（title/text/anchor/on_enter/next/checklist 四勾）
- `dock.js` 底栏 Tab 页：ContentBrowser（素材网格，支持拖文件进来 addAsset+URL.createObjectURL，拖到画布=addObject）、Timeline（选中 sequence：轨道行+关键帧圆点+播放头拖动+播放按钮）、Log（store.on('log') 输出）
- `topbar.js` 顶栏：菜单（新建/打开JSON/导出JSON/保存）、模式切换（编辑/试玩）、gizmo 按钮(W/E/R)+吸附、预算条（bytes/视频路数/tris/estFps，超标红色）、发布按钮（弹 publishCheck 结果，block 列表红/warn 黄，block>0 禁止确认）、占位素材计数「已替换 x/y」
- `log.js`：`export function log(msg, level)` 供所有模块用，转发到 store.emit('log')

### src/main.js（我手写，模块只需符合上面契约）
bootstrap：import 全部 → store.load()||store.newScene(demoScene()) → viewport.init → mount 各 UI → rAF 循环 viewport.tick+player.tick → Ctrl+Z/Y、Delete、W/E/R 快捷键 → store.on('change') 自动 save + viewport.sync

## 通用要求
- 中文 UI 文案；不写一句多余注释以外的废话注释
- 任何 import 只允许：'three'、'three/addons/...'、同项目相对路径
- 不引入新依赖；DOM 操作原生 API；样式用 style.css 的 class（`.panel .btn .field .row .tab .tree-item` 等）
- 生成代码必须是完整文件，无占位省略

### 游客 Runtime 与 GPU Worker
- `runtime.html`：独立游客端入口，不挂载编辑器 UI；支持 scene/release/room/localize 参数。
- `tools/gpu-worker.mjs`：Node CLI/HTTP 队列，提供 analyze、convert-alpha、prepare-reconstruction。真实 GPU 重建通过 `XIYOU_RECONSTRUCTOR_BIN` 外部命令注入。
