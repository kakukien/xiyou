# 侧边栏固定元素开发文档

> 状态：规划稿 v0.1.0；基础目录与实例链路已落地，完整能力仍按本文件分阶段开发。
>
> 目标：在现有浅色专业空间编辑器中，增加一个“空间 > 固定元素”入口，让用户可以选择、拖入并反复创建可互动元素。

## 1. 当前代码基线

已存在且可以复用：

- `editor/src/core/schema.js`：`objects`、`compound`、`quad`、`glb`、`light` 等对象基础模型；
- `editor/src/core/objects.js`：基础几何组装、点粒子、透明贴图、Additive、Shader、Hitbox；
- `editor/src/core/store.js`：对象增删改、选择、撤销/恢复、保存；
- `editor/src/core/viewport.js`：放置点、拾取、Gizmo、区域约束、碰撞约束；
- `editor/src/ui/outliner.js`：空间侧边栏中的场景对象、区域和锚点；
- `editor/src/ui/dock.js`：当前项目资源库和互动组件 Dock；
- `editor/public/fx/`：已有 `mote`、`spark`、`smoke`、`glow_orb` 等通用效果贴图。

当前缺口：

- `OBJECT_TYPES` 没有“桌子/椅子/坦克/萤火虫”等可复用语义元素；
- 当前底部“资源库”偏外部文件，不适合作为固定元素入口；
- 没有目录定义与场景实例的 `element_id` 关系；
- 当前 demo/template 仍能看出西游剧情历史数据，需要从默认创作路径隔离。

## 2. 产品结构

```text
空间侧边栏
├─ 固定元素
│  ├─ 搜索元素
│  ├─ 最近使用（仅当前用户本地记录）
│  ├─ 家居与室内
│  ├─ 建筑与自然环境
│  ├─ 材质与空间效果
│  ├─ 游戏道具与机关
│  ├─ 载具与玩具
│  ├─ 粒子、氛围与飞掠效果
│  ├─ 交互装置与控制器
│  └─ 空间辅助与调试
├─ 场景对象
├─ 空间区域
└─ 空间锚点
```

注意：固定元素放在空间侧边栏，不能塞进底部“资源库”。底部资源库继续负责用户上传的文件；固定元素卡片只负责创建实例。

## 3. 侧边栏交互

### 3.1 卡片状态

每张元素卡至少包含：

- 图标/缩略图；
- 中文名称；
- 交互能力 Chip，例如“可收集”“粒子”“可开合”；
- `+ 添加` 操作；
- 拖拽提示；
- P0/P1 不需要直接展示给用户，优先级只用于开发和运营配置。

卡片状态：默认、Hover、Focus、拖拽中、添加成功、禁用/不支持当前 Runtime。点击/键盘添加结果使用可访问文本提示，禁用卡说明原因；窄宽度下使用紧凑行式布局，不在侧边栏堆多列卡片。

### 3.2 添加方式

1. **点击添加**：使用上次有效选点/视口中心射线落点；没有有效落点时放到相机前方安全点并提示用户确认位置，体积/漂浮/路径元素按各自落点规则处理。
2. **拖入 Viewport**：使用 `text/x-xiyou-element`，在落点创建元素实例。
3. **连续添加**：按住 Shift 或点击“继续添加”保持当前元素，允许批量放置。
4. **从最近使用添加**：不复制项目资源，只再次创建相同 `element_id` 实例。
5. **添加后选中**：自动选中新实例并打开 Details，用户可立即改名/变换/互动。

### 3.3 搜索和过滤

- 搜索名称、别名、标签和交互能力；
- 类目折叠/展开，默认展示每个类目的 P0 元素；
- “只看可交互”“只看粒子”“只看可拾取”作为快捷筛选；“只看可交互”不包含仅声明 `static` / `helper` 的条目；
- 搜索无结果时，不显示空白，显示“没有匹配元素”和清除筛选按钮；
- 目录加载失败时，显示错误状态，但不影响已有场景对象编辑。

## 4. 数据契约

### 4.1 目录定义

目录以 `docs/sidebar-element-asset-table.json` 为规划主表，开发时建议转为代码内置 manifest：

```js
{
  id: 'game.chest',
  category: 'game',
  name: '宝箱',
  render: { kind: 'compound', preset: 'chest' },
  interactionProfiles: ['openable', 'tap_feedback'],
  default: {
    sizeMeters: [0.9, 0.8, 0.9],
    pivot: 'bottom-center',
    placement: 'surface',
    collider: 'box',
    visibleInRuntime: true
  }
}
```

### 4.2 场景实例

建议在现有对象结构上增加字段，不要为 124 个元素各自新增一个对象 type：

```json
{
  "id": "obj_element_a1b2c3",
  "type": "compound",
  "element_id": "furniture.table",
  "element_version": "0.1.0",
  "name": "桌子",
  "transform": { "p": [0, 0, -3], "r": [0, 0, 0], "s": [1, 1, 1] },
  "render_preset": "table",
  "material": { "preset": "wood" },
  "parts": [{ "shape": "box", "p": [0, 0.75, 0], "s": [1.2, 0.08, 1.2] }],
  "interaction": {
    "enabled": true,
    "profile": "static",
    "state": "default",
    "params": {},
    "on": []
  },
  "hitbox": { "type": "box", "size": [1.2, 1, 1.2], "center": [0, 0.5, 0] },
  "asset": "",
  "zone_id": "",
  "node_id": "",
  "visible": true
}
```

兼容规则：

- `element_id` 为空时，仍按旧对象逻辑渲染；
- `node_id` 保留读取能力，但新建固定元素默认空值；
- `asset` 只填外部资产 ID，不把目录 ID 塞到 `meta.assets`；
- 目录定义升级不应自动改变已存在实例，实例锁定 `element_version`，可通过“升级元素”显式迁移。

### 4.3 创建工厂

建议新增一个轻量工厂，而不是在各 UI 模块中拼对象：

```text
createElementInstance(elementId, placementPoint, overrides)
  → 查询目录定义
  → 复制 default / render / interaction
  → 生成 object id
  → 转换为现有 compound / quad / glb / light 对象
  → 经过 forbidden / editable / collider 约束
  → store.addObject()
  → select(instance.id)
```

推荐模块位置：`editor/src/core/elements.js`。本轮不创建该文件；后续收到开发指令再实施。

### 4.4 尺寸、碰撞与版本契约

- `default.sizeMeters` 表示元素设计尺寸（宽、高、深；米），不是实例的 `transform.s`；创建时 `transform.s` 默认 `[1, 1, 1]`。渲染工厂按 `sizeMeters` 生成真实几何，避免尺寸被重复乘两次。
- `pivot: bottom-center` 落在地面或 Collider 顶面；`center` 用于漂浮/体积物。`default.collider` 为计划中的语义，当前 `schema.js` 命中体仅支持 `box`、`sphere`、`auto`、`none`；圆柱项第一阶段降级为 Box/Sphere，需显式说明近似误差。
- `default.placement` 的 `surface` / `floating` / `volume` / `point` / `path` / `between` 是选点策略，不全是地面落点；`path` 和 `between` 必须先选目标点或提供可编辑的安全默认点。
- `element_version` 固定目录版本；快照保存 `render_preset`、`parts`（或等价的渲染参数）与互动默认值，确保目录升级/离线载入不改变旧实例。目录缺失时用快照继续渲染并显示“预设已失联”。
- **旧场景兼容**：不带 `element_id` 的对象继续走原有 `type` 分派；带 `element_id` 却缺少目录项时必须有可见占位、故障日志和修复入口。
- 外部音频/GLB/贴图仍需走 `meta.assets` 和持久化 URL；`local://`/blob 只供本机预览，发布前须阻断或上传，不得写大文件到 `scene` JSON/Yjs。

### 4.5 与现有触发/动作数据的映射

- 已有 `scene.triggers` 记录 `{ target: obj.id, when, params, do }`，`scene.sequences` 可驱动变换/透明度；新 `interaction` 字段承担配置与状态声明，工厂生成的触发器仍存现有集合，不能另造一套平行的触发引擎。
- `play_seq` 动作统一使用 `{ action: 'play_seq', args: { seqId: '<id>' } }`，编辑器与 Runtime 均可识别；不要沿用局部动作卡中的 `args.seq` 作为新目录契约。
- 新增的 `leave`、`collision`、`collect` 条件及 `set_state`、`collect`、`emit_particles`、`add_score`、`destroy`、`camera_shake`、`vibrate` 等基础动作已扩展到 `CONDITIONS`/`ACTIONS`、`playback.js`、Runtime、Details；真实物理、`spawn_element`、传送和声音仍不能标记为已完成。
- 点击/拖放一次创建对象 + 默认触发器 + 时间线/联动的操作必须是一个 Undo/Yjs 原子事务；现有 `store.batch()` 可用于本地历史归并，但 Yjs UndoManager 仍需专项联调，不能只凭本地 batch 宣称协作事务原子化；删除实例时清理相关触发器与时间线引用，解绑则不改变目录定义。当前 `removeObject` 只删除对象，需要补齐引用清理。

## 5. 渲染实现建议

### P0：程序化/现有能力优先

`effect`、`helper` 是目录渲染分类，不是现有 `OBJECT_TYPES`。创建时需转换为已有对象类型或新增经过编辑器和 Runtime 双端验证的类型。

- 家具、箱子、桌椅、石块、按钮、宝箱、坦克玩具：由 `compound` 基础部件生成；
- 水、冰、力场、传送门、波纹：由 `quad` / Shader / 透明材质生成；
- 粒子发射、萤火虫、飘飞光点、烟雾：复用 `points` 和现有 FX 贴图；
- 路牌、信息面板、计时器：由 `quad` + 文本/图像占位生成；
- 空间辅助：使用 helper 节点，Runtime 默认隐藏。

### P1/P2：外部模型和高阶效果

- 需要细节表现的房子、坦克、无人机、机器人等再接入 GLB/GLTF；
- 外部模型必须提供低模/中模/高模或可接受的单一轻量版本；
- 复杂粒子、流体、群体模拟不能无上限增加实例；必须有 maxCount、LOD 和关闭策略。

## 6. 开发分期

### Phase 0：目录与空状态（P0）

- 固定元素目录 manifest；
- 空间侧边栏“固定元素”区；
- 8 个类目全部出现且各有至少 1 张可添加的程序化卡片；
- 搜索、分类、卡片添加、拖拽添加；
- `element_id` 写入对象；
- 不加载西游剧情默认内容。

### Phase 1：第一批可试玩元素（P0）

- 盒子、桌子、椅子、凳子、房子、树、岩石；
- 水面、冰面、石块、雾、力场；
- 宝箱、按钮、开关、压力板、门、移动平台、传送门；
- 玩具坦克、坦克、球体、方块；
- 粒子发射器、萤火虫、飘飞光点、火花、烟雾、能量轨迹；
- 点击/注视/按住/进入/收集/粒子发射/飞掠至少可配置一轮。

### Phase 2：编辑体验和互动模板（P1）

- 最近使用、连续添加、复制/粘贴；
- 互动 Profile 面板和默认动作卡；
- 开合、开关、拾取投掷、移动平台、载具自动巡航；
- 粒子参数编辑、路径绑定、音效入口；
- 目录版本和实例升级。

### Phase 3：运行时与性能（P1/P2）

- Runtime 运行固定元素实例；
- helper 显隐策略；
- 粒子预算、对象数量、Draw Call、移动端 FPS 检查；
- 低端设备 Profile 和降级渲染；
- 资产加载失败时的占位和日志。

### Phase 出口

- Phase 0：8 类均有至少一张**真正可用**的卡片；仅显示占位、点击报错不算完成。
- Phase 1：资产表全部 60 个 P0 都可创建、保存、刷新回读和试玩，互动详情与触发器一致；不能只实现本节列出的示例。
- Phase 2：提升 P1 项、复制编辑与互动配置；不会把未完成 P1/P2 卡片当成可点击卡片展示。
- Phase 3：编辑器内试玩、`runtime.html` 和发布 JSON 行为对齐，性能预算与回滚可用。

## 7. 验收标准

### 7.1 目录完整性

- [ ] 8 个类目都能在侧边栏展开；
- [ ] 每个类目至少有 1 个可点击添加的元素；
- [ ] 资产表中的 P0 元素都可搜索到；
- [ ] 盒子、桌子、椅子、凳子、房子、树、石头、水、冰、石块、箱子、坦克、玩具、粒子发射器、萤火虫、飘飞光点全部存在。

### 7.2 创建与编辑

- [ ] 点击“添加”创建一个独立对象，并自动选中；
- [ ] 拖入 Viewport 在落点创建对象；
- [ ] 对象可移动、旋转、缩放、显隐、改名和删除；
- [ ] 删除一个实例不删除目录定义或其他实例；
- [ ] 现有快捷键 Ctrl+Z/Y 可恢复创建与删除；Mac 用户需提供 Command+Z / Shift+Command+Z 并在 UI 显示对应平台提示；
- [ ] 禁布区、可编辑区、Collider 约束继续生效。

### 7.3 互动

- [ ] 每个 P0 交互元素至少有一个有效默认 Profile；静态元素允许 `static`，其余 Profile 必须有可验证的实际事件与反馈；
- [x] 宝箱/门可开合状态、按钮/开关可联动、金币/钥匙/晶体可收集已接入基础状态机；
- [ ] 粒子发射器支持持续/脉冲两种模式；
- [x] 萤火虫和飘飞光点沿用点粒子动画与目录粒子预算；启动/停止/区域参数仍需进一步产品化。
- [ ] 粒子、声音、移动等行为有冷却或数量上限，不产生无限事件。
- [x] 编辑器与 Runtime 已支持 leave/collision/collect 基础事件，以及 set_state/collect/emit_particles/add_score/destroy/camera_shake/vibrate 基础动作；spawn_element、真实物理和生产级传送仍待完成。

### 7.4 内容清理

- [ ] 新建场景不出现章节、节点、剧情文案或西游专属对象；
- [ ] 默认侧边栏固定元素目录不含西游人物/地点/剧情；
- [ ] 旧历史文档保留不影响运行时；
- [ ] 页面搜索关键西游专名不命中默认场景和目录数据。

### 7.5 发布与协作

- [ ] 无剧情的纯游戏场景不因“缺少起始节点/终点节点”被 `publishCheck` 阻断；如加载旧剧情场景，仅在该模式下检查节点链。
- [ ] 无底座时可在网格空间创作；如发布模式要求真实底座，应单独说明限制，不能通过误用剧情校验拦截。
- [ ] 元素实例及默认触发器、序列在 Yjs 协作中同步，远端客户端无需再次执行目录创建逻辑，不产生重复实例。
- [ ] 编辑器内试玩与独立 `runtime.html` 的材质、几何部件、命中区域和事件效果一致；Runtime 已复用编辑器的 `createNode` 组装体渲染路径；仍需在目标设备上逐项校验材质、粒子预算和交互事件一致性。
- [ ] 动态元素资源在对象删除、试玩退出和场景切换后正确释放，无重复动画计时器或粒子循环泄漏。

## 8. 测试用例

| 编号 | 操作 | 预期 |
|---|---|---|
| E-01 | 打开空间侧边栏 | 看到 8 个类目，均有元素数量和可选卡片 |
| E-02 | 搜索“桌子”并点击添加 | Viewport 出现桌子实例，Outliner 有对象，目录数量不变 |
| E-03 | 拖动“玩具坦克”到禁布区 | 阻止创建并给出可理解的警告 |
| E-04 | 连续添加 3 个金币 | 生成 3 个不同实例 ID，均可独立选中/删除 |
| E-05 | 点击宝箱 | 进入 open 状态，触发高亮/粒子，重复点击按冷却处理 |
| E-06 | 启动萤火虫群 | 数量不超过 maxCount，可停止，不影响编辑器帧率 |
| E-07 | 添加 helper | 编辑器可见；进入 Runtime 后按配置隐藏 |
| E-08 | 刷新页面 | 场景实例保留，固定元素目录仍可用，不出现剧情演示 |
| E-09 | 删除外部资源库中的图片 | 不影响没有引用该图片的固定元素实例 |
| E-10 | 加载旧场景 | 旧对象可渲染，新目录功能不破坏旧 Schema |
| E-11 | 空剧情场景执行发布检查 | 不因起始/终点节点缺失阻断 |
| E-12 | 两位用户同时在同一房间添加元素 | 远端仅出现相同的单个实例及一组默认触发器/序列 |
| E-13 | 在独立 Runtime 中打开程序化坦克和粒子效果 | 几何/效果与编辑器试玩一致，不退化为一堆立方体 |
| E-14 | 元素目录升级/删除 preset 后重载旧发布快照 | 能按实例快照恢复，不静默替换已有实例 |
| E-15 | 删除带触发器的宝箱并撤销 | 引用被正确清理，撤销后同时恢复对象与关联互动 |

## 9. 交付文件建议

实现阶段预计新增/调整：

- `editor/src/core/elements.js`：目录读取、实例创建、默认互动配置；
- `editor/src/core/schema.js`：元素实例字段与校验；
- `editor/src/core/objects.js`：程序化 preset 渲染和粒子参数；
- `editor/src/core/playback.js`：统一的触发条件、状态与动作分派；
- `editor/src/ui/details.js`：固定元素交互参数编辑；
- `editor/src/ui/outliner.js`：空间侧边栏固定元素区；
- `editor/src/core/store.js`：元素实例创建历史、复制、删除和持久化；
- `editor/src/main.js`：拖拽事件与放置约束；
- `editor/src/runtime/main.js`：Runtime 对元素 preset/interaction 的执行；需复用相同渲染配方或同一序列化快照（当前 `compound` 部件被统一渲染成盒子）；
- `editor/src/style.css`：沿用现有 Token，不新增独立视觉风格；
- `docs/sidebar-element-asset-table.json`：目录规划主表，开发后作为 manifest 初始来源。

本轮文档阶段原计划只交付 `docs/`；在用户确认“先把资产做出来”后，已开始实现目录、程序化配方、侧边栏添加和语音 token 基础层。

## 10. 已落地的基础实现切片（2026-10-03）

本轮已落地目录与语音标识的基础层：

- `editor/src/core/element-catalog.js`：由 JSON 资产表生成的 124 项 manifest；
- `editor/src/core/elements.js`：元素查询、语音 token 解析、程序化几何配方、元素实例创建入口；
- `editor/src/ui/outliner.js`：空间侧边栏固定元素目录、搜索、点击添加、拖拽标识；已验证剧情页不显示固定元素，空间页显示 8 类 124 项；
- `editor/src/main.js`：接受 `text/x-xiyou-element` 拖入；
- `editor/src/core/schema.js` / `store.js`：实例持久化 `element_id`、版本、voice token、互动声明；
- `editor/scripts/generate-elements.mjs`：从文档 JSON 重新生成 manifest；
- `editor/package.json`：增加 `npm run elements:generate`。

这只是第一层：编辑器侧目录/实例已进入开发，不代表 124 个元素的所有运行时互动、Runtime 同构渲染、语音对话确认流和完整剧情清理已经完成。构建、Smoke、回归和 GPU 验证已通过；后续补齐语音候选确认、Runtime 互动状态与完整剧情清理。
