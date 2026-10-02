# 侧边栏互动元素资产表

> 状态：规划稿 v0.1.0。此表描述“侧边栏固定元素目录”，不是项目资源库，也不是二进制文件清单。
> 机器可读主表：[`sidebar-element-asset-table.json`](sidebar-element-asset-table.json)。

## 使用边界

- 用户点击或拖拽元素卡片后，创建一个新的场景对象；元素目录本身不被消耗。
- 新元素实例写入 `scene.objects`，不写入 `scene.meta.assets`；外部 GLB/贴图仅作为可选依赖。
- **本表全部为规划项**：`render.kind` / `preset` / `interactionProfiles` 不代表代码或 Runtime 已实现；实际状态以开发文档和验收为准。
- `sizeMeters` 是模型默认尺寸（宽、高、深，米），不应再次作为 `transform.s` 乘入。
- 每个一级类目都必须有可选元素；当前共 **8 个类目、124 个元素**。
- 本表不包含西游人物、章节、节点、地点或任何剧情专属内容。

## 类目总览

| 类目 ID | 类目 | 元素数 | P0 | P1 | P2 | 说明 |
|---|---|---:|---:|---:|---:|---|
| `furniture` | 家居与室内 | 12 | 5 | 7 | 0 | 家具、室内陈设和可推动物件；用于快速搭建可交互的小场景。 |
| `environment` | 建筑与自然环境 | 15 | 5 | 9 | 1 | 房子、建筑构件和自然元素；用于组成可探索的三维场景。 |
| `volume` | 材质与空间效果 | 16 | 6 | 9 | 1 | 水、冰、石块等材质/体积型元素；视觉上可实体化，也可作为范围效果。 |
| `game` | 游戏道具与机关 | 22 | 13 | 9 | 0 | 箱子、收集物、机关和关卡对象；优先保证点击、碰撞、进入和联动可配置。 |
| `toy` | 载具与玩具 | 14 | 5 | 7 | 2 | 坦克、玩具、机器人和简单载具；优先支持点击启动、自动巡航和碰撞反馈。 |
| `fx` | 粒子、氛围与飞掠效果 | 18 | 10 | 6 | 2 | 粒子发射、萤火虫、飘飞和环境效果；用于制造明显的游戏反馈和空间生命感。 |
| `interactive` | 交互装置与控制器 | 15 | 9 | 6 | 0 | 不只是装饰的可选装置；用于直接搭建触发、拾取、展示、声音和路径逻辑。 |
| `helper` | 空间辅助与调试 | 12 | 7 | 5 | 0 | 不一定出现在游客画面中的编辑辅助元素；用于定位、边界、导航、遮挡和重置。 |

## 完整资产表

### 家居与室内 (`furniture`)

| ID | 元素 | 渲染预设 | 交互能力 | 优先级 | 默认碰撞/落点 | 标签 |
|---|---|---|---|---|---|---|
| `furniture.box` | 盒子 | `compound/box` | static、pushable、pickup_throw | P0 | `box` / `surface` | 盒子、基础、可推动 |
| `furniture.crate` | 木箱 | `compound/crate` | static、pushable、pickup_throw、openable | P0 | `box` / `surface` | 木箱、容器、可打开 |
| `furniture.table` | 桌子 | `compound/table` | static、tap_feedback | P0 | `box` / `surface` | 桌子、家具、平台 |
| `furniture.chair` | 椅子 | `compound/chair` | static、pushable | P0 | `box` / `surface` | 椅子、家具、可推动 |
| `furniture.stool` | 凳子 | `compound/stool` | static、pushable | P0 | `box` / `surface` | 凳子、家具、可推动 |
| `furniture.bench` | 长凳 | `compound/bench` | static、pushable | P1 | `box` / `surface` | 长凳、家具、平台 |
| `furniture.cabinet` | 柜子 | `compound/cabinet` | static、openable | P1 | `box` / `surface` | 柜子、家具、开合 |
| `furniture.shelf` | 货架 | `compound/shelf` | static、tap_feedback | P1 | `box` / `surface` | 货架、家具、陈列 |
| `furniture.barrel` | 木桶 | `compound/barrel` | static、pushable、pickup_throw | P1 | `cylinder` / `surface` | 木桶、容器、滚动 |
| `furniture.lamp` | 台灯 | `compound/lamp` | static、tap_feedback、switchable | P1 | `box` / `surface` | 台灯、开关、灯光 |
| `furniture.rug` | 地毯 | `compound/rug` | static、tap_feedback | P1 | `box` / `surface` | 地毯、地面、装饰 |
| `furniture.screen` | 桌面屏幕 | `quad/screen` | static、display、tap_feedback | P1 | `box` / `surface` | 屏幕、展示、信息 |

### 建筑与自然环境 (`environment`)

| ID | 元素 | 渲染预设 | 交互能力 | 优先级 | 默认碰撞/落点 | 标签 |
|---|---|---|---|---|---|---|
| `environment.house` | 房子 | `compound/house` | static、tap_feedback | P0 | `box` / `surface` | 房子、建筑、场景 |
| `environment.cabin` | 小屋 | `compound/cabin` | static、openable | P1 | `box` / `surface` | 小屋、建筑、入口 |
| `environment.wall` | 墙体 | `compound/wall` | static、helper | P0 | `box` / `surface` | 墙、建筑、遮挡 |
| `environment.fence` | 栅栏 | `compound/fence` | static、pushable | P1 | `box` / `surface` | 栅栏、边界、建筑 |
| `environment.gate` | 大门 | `compound/gate` | static、openable、switchable | P0 | `box` / `surface` | 大门、机关、开合 |
| `environment.bridge` | 桥 | `compound/bridge` | static、triggerable | P1 | `box` / `surface` | 桥、通道、路径 |
| `environment.stairs` | 台阶 | `compound/stairs` | static、helper | P1 | `box` / `surface` | 台阶、地形、通道 |
| `environment.tree` | 树 | `compound/tree` | static、tap_feedback | P0 | `box` / `surface` | 树、自然、环境 |
| `environment.shrub` | 灌木 | `compound/shrub` | static | P1 | `box` / `surface` | 灌木、自然、装饰 |
| `environment.flower` | 花丛 | `compound/flower` | static、tap_feedback | P1 | `box` / `surface` | 花、自然、装饰 |
| `environment.rock` | 岩石 | `compound/rock` | static、pushable | P0 | `sphere` / `surface` | 岩石、自然、障碍 |
| `environment.boulder` | 巨石 | `compound/boulder` | static、pushable | P1 | `sphere` / `surface` | 巨石、自然、障碍 |
| `environment.signpost` | 路牌 | `compound/signpost` | static、display、tap_feedback | P1 | `box` / `surface` | 路牌、指引、文字 |
| `environment.lamp_post` | 路灯 | `compound/lamp_post` | static、switchable | P1 | `box` / `surface` | 路灯、灯光、环境 |
| `environment.well` | 井 | `compound/well` | static、openable、triggerable | P2 | `cylinder` / `surface` | 水井、建筑、探索 |

### 材质与空间效果 (`volume`)

| ID | 元素 | 渲染预设 | 交互能力 | 优先级 | 默认碰撞/落点 | 标签 |
|---|---|---|---|---|---|---|
| `volume.water_surface` | 水面 | `effect/water_surface` | static、volume_effect、tap_feedback | P0 | `none` / `surface` | 水、水面、反射 |
| `volume.stream` | 溪流 | `effect/stream` | static、volume_effect、triggerable | P1 | `none` / `surface` | 水、溪流、流动 |
| `volume.pool` | 水池 | `effect/pool` | static、volume_effect、triggerable | P1 | `box` / `surface` | 水、水池、区域 |
| `volume.ice_patch` | 冰面 | `compound/ice_patch` | static、physics、tap_feedback | P0 | `box` / `surface` | 冰、冰面、滑动 |
| `volume.ice_wall` | 冰墙 | `compound/ice_wall` | static、pushable | P1 | `box` / `surface` | 冰、墙、障碍 |
| `volume.stone_block` | 石块 | `compound/stone_block` | static、pushable、pickup_throw | P0 | `box` / `surface` | 石块、石头、基础 |
| `volume.sand_patch` | 沙地 | `effect/sand_patch` | static、volume_effect | P1 | `none` / `surface` | 沙地、地面、材质 |
| `volume.mud_patch` | 泥地 | `effect/mud_patch` | static、physics、volume_effect | P1 | `none` / `surface` | 泥地、地面、减速 |
| `volume.lava_flow` | 熔岩流 | `effect/lava_flow` | static、volume_effect、damage | P1 | `none` / `surface` | 熔岩、危险、流动 |
| `volume.fog` | 雾气体积 | `effect/fog_volume` | volume_effect、atmosphere | P0 | `none` / `volume` | 雾、体积、氛围 |
| `volume.wind` | 风场 | `effect/wind_volume` | volume_effect、physics | P1 | `none` / `volume` | 风、体积、受力 |
| `volume.force_field` | 力场 | `effect/force_field` | volume_effect、physics、triggerable | P0 | `sphere` / `volume` | 力场、范围、机关 |
| `volume.cloud` | 云团 | `effect/cloud_volume` | static、atmosphere、tap_feedback | P1 | `none` / `floating` | 云、天空、氛围 |
| `volume.snow_field` | 积雪 | `effect/snow_field` | static、volume_effect | P2 | `none` / `surface` | 雪、地面、季节 |
| `volume.grass_patch` | 草地 | `compound/grass_patch` | static、tap_feedback | P1 | `none` / `surface` | 草、地面、自然 |
| `volume.ripple` | 水波 | `effect/ripple_surface` | tap_feedback、volume_effect | P0 | `none` / `surface` | 水波、反馈、动画 |

### 游戏道具与机关 (`game`)

| ID | 元素 | 渲染预设 | 交互能力 | 优先级 | 默认碰撞/落点 | 标签 |
|---|---|---|---|---|---|---|
| `game.chest` | 宝箱 | `compound/chest` | static、openable、tap_feedback | P0 | `box` / `surface` | 宝箱、开合、奖励 |
| `game.treasure_chest` | 大型宝箱 | `compound/treasure_chest` | static、openable、collectible | P1 | `box` / `surface` | 宝箱、奖励、关卡 |
| `game.key` | 钥匙 | `compound/key` | collectible、tap_feedback | P0 | `sphere` / `floating` | 钥匙、收集、道具 |
| `game.coin` | 金币 | `compound/coin` | collectible、tap_feedback | P0 | `sphere` / `floating` | 金币、收集、计分 |
| `game.crystal` | 能量晶体 | `compound/crystal` | collectible、tap_feedback、gaze_feedback | P0 | `sphere` / `floating` | 晶体、收集、发光 |
| `game.health_pack` | 补给包 | `compound/health_pack` | collectible、tap_feedback | P1 | `box` / `surface` | 补给、生命、道具 |
| `game.checkpoint` | 检查点 | `effect/checkpoint` | triggerable、tap_feedback | P0 | `cylinder` / `surface` | 检查点、存档、进度 |
| `game.target` | 靶标 | `compound/target` | tap_feedback、physics | P0 | `box` / `surface` | 靶标、射击、反馈 |
| `game.switch` | 拨杆开关 | `compound/switch` | switchable、tap_feedback | P0 | `box` / `surface` | 开关、拨杆、联动 |
| `game.pressure_plate` | 压力板 | `compound/pressure_plate` | switchable、physics、triggerable | P0 | `box` / `surface` | 压力板、机关、进入 |
| `game.button` | 按钮 | `compound/button` | switchable、tap_feedback、hold_feedback | P0 | `box` / `surface` | 按钮、点击、按住 |
| `game.lever` | 拉杆 | `compound/lever` | switchable、hold_feedback | P1 | `box` / `surface` | 拉杆、机关、开关 |
| `game.gear` | 齿轮 | `compound/gear` | moving、physics、tap_feedback | P1 | `cylinder` / `surface` | 齿轮、旋转、机关 |
| `game.door` | 机关门 | `compound/door` | openable、switchable、triggerable | P0 | `box` / `surface` | 门、开合、机关 |
| `game.moving_platform` | 移动平台 | `compound/moving_platform` | moving、physics、triggerable | P0 | `box` / `surface` | 平台、移动、承载 |
| `game.spring_pad` | 弹跳板 | `compound/spring_pad` | physics、tap_feedback、moving | P1 | `box` / `surface` | 弹跳、平台、受力 |
| `game.launcher` | 发射器 | `compound/launcher` | switchable、physics、triggerable | P1 | `box` / `surface` | 发射、机关、投射 |
| `game.portal` | 传送门 | `effect/portal` | triggerable、tap_feedback、gaze_feedback | P0 | `box` / `surface` | 传送门、入口、空间 |
| `game.teleporter` | 传送台 | `effect/teleporter` | triggerable、tap_feedback | P1 | `cylinder` / `surface` | 传送、平台、移动 |
| `game.mine` | 地雷 | `compound/mine` | triggerable、physics、tap_feedback | P1 | `sphere` / `surface` | 地雷、危险、碰撞 |
| `game.beacon` | 信标 | `effect/beacon` | triggerable、tap_feedback、gaze_feedback | P0 | `cylinder` / `surface` | 信标、引导、定位 |
| `game.collectible_card` | 收集卡片 | `quad/collectible_card` | collectible、tap_feedback、display | P1 | `box` / `floating` | 卡片、收集、信息 |

### 载具与玩具 (`toy`)

| ID | 元素 | 渲染预设 | 交互能力 | 优先级 | 默认碰撞/落点 | 标签 |
|---|---|---|---|---|---|---|
| `toy.toy_tank` | 玩具坦克 | `compound/toy_tank` | vehicle、tap_feedback、physics | P0 | `box` / `surface` | 玩具、坦克、载具 |
| `toy.tank` | 坦克 | `compound/tank` | vehicle、physics、tap_feedback | P0 | `box` / `surface` | 坦克、载具、游戏 |
| `toy.car` | 小车 | `compound/car` | vehicle、physics、tap_feedback | P1 | `box` / `surface` | 小车、载具、移动 |
| `toy.drone` | 无人机 | `compound/drone` | vehicle、moving、tap_feedback | P0 | `box` / `floating` | 无人机、飞行、载具 |
| `toy.robot` | 机器人 | `compound/robot` | tap_feedback、moving、physics | P1 | `box` / `surface` | 机器人、角色、移动 |
| `toy.turret` | 炮台 | `compound/turret` | tap_feedback、moving、physics | P1 | `box` / `surface` | 炮台、瞄准、机关 |
| `toy.cannon` | 火炮 | `compound/cannon` | tap_feedback、physics、triggerable | P1 | `box` / `surface` | 火炮、发射、游戏 |
| `toy.ball` | 球体玩具 | `compound/ball` | physics、pickup_throw、pushable | P0 | `sphere` / `surface` | 球、投掷、物理 |
| `toy.cube` | 彩色方块 | `compound/cube_toy` | physics、pickup_throw、pushable | P0 | `box` / `surface` | 方块、玩具、物理 |
| `toy.windup` | 发条玩具 | `compound/windup_toy` | moving、tap_feedback | P1 | `box` / `surface` | 发条、玩具、自动移动 |
| `toy.balloon` | 气球 | `compound/balloon` | tap_feedback、moving、flyby | P1 | `sphere` / `floating` | 气球、漂浮、飞行 |
| `toy.saucer` | 飞碟 | `compound/flying_saucer` | vehicle、moving、flyby | P1 | `sphere` / `floating` | 飞碟、飞行、载具 |
| `toy.boat` | 小船 | `compound/boat` | vehicle、physics、moving | P2 | `box` / `surface` | 小船、水面、载具 |
| `toy.glider` | 滑翔机 | `compound/glider` | vehicle、moving、flyby | P2 | `box` / `floating` | 滑翔机、飞行、载具 |

### 粒子、氛围与飞掠效果 (`fx`)

| ID | 元素 | 渲染预设 | 交互能力 | 优先级 | 默认碰撞/落点 | 标签 |
|---|---|---|---|---|---|---|
| `fx.particle_emitter` | 粒子发射器 | `effect/particle_emitter` | particle_emitter、triggerable | P0 | `none` / `point` | 粒子、发射器、可配置 |
| `fx.spark_burst` | 火花爆发 | `effect/spark_burst` | particle_emitter、tap_feedback | P0 | `none` / `point` | 火花、爆发、反馈 |
| `fx.firefly_swarm` | 萤火虫群 | `effect/firefly_swarm` | particle_emitter、atmosphere、flyby | P0 | `none` / `volume` | 萤火虫、粒子、氛围 |
| `fx.flyby_motes` | 飘飞光点 | `effect/flyby_motes` | particle_emitter、flyby、atmosphere | P0 | `none` / `volume` | 飘飞、光点、经过 |
| `fx.bird_flock` | 飞鸟群 | `effect/bird_flock` | flyby、atmosphere | P1 | `none` / `volume` | 飞鸟、群体、飞掠 |
| `fx.falling_leaves` | 落叶 | `effect/falling_leaves` | particle_emitter、flyby、atmosphere | P1 | `none` / `volume` | 落叶、粒子、季节 |
| `fx.petals` | 花瓣飘落 | `effect/petals` | particle_emitter、flyby、atmosphere | P1 | `none` / `volume` | 花瓣、飘落、氛围 |
| `fx.snow_particles` | 雪花 | `effect/snow_particles` | particle_emitter、atmosphere | P2 | `none` / `volume` | 雪花、粒子、天气 |
| `fx.rain` | 雨幕 | `effect/rain` | particle_emitter、atmosphere、volume_effect | P2 | `none` / `volume` | 雨、天气、粒子 |
| `fx.dust` | 尘埃 | `effect/dust` | particle_emitter、atmosphere | P0 | `none` / `volume` | 尘埃、氛围、粒子 |
| `fx.smoke` | 烟雾 | `effect/smoke` | particle_emitter、atmosphere、volume_effect | P0 | `none` / `point` | 烟雾、体积、氛围 |
| `fx.steam` | 蒸汽 | `effect/steam` | particle_emitter、atmosphere、volume_effect | P1 | `none` / `point` | 蒸汽、体积、反馈 |
| `fx.fire` | 火焰 | `effect/fire` | particle_emitter、atmosphere、tap_feedback | P0 | `none` / `point` | 火焰、危险、粒子 |
| `fx.magic_trail` | 能量轨迹 | `effect/magic_trail` | particle_emitter、flyby、tap_feedback | P0 | `none` / `path` | 轨迹、能量、移动 |
| `fx.vortex` | 旋涡 | `effect/vortex` | particle_emitter、volume_effect、tap_feedback | P1 | `sphere` / `point` | 旋涡、空间、动画 |
| `fx.floating_orbs` | 漂浮光球 | `effect/floating_orbs` | particle_emitter、flyby、gaze_feedback | P0 | `sphere` / `volume` | 光球、漂浮、注视 |
| `fx.shockwave` | 冲击波 | `effect/shockwave` | particle_emitter、tap_feedback、physics | P0 | `none` / `surface` | 冲击波、点击、反馈 |
| `fx.confetti` | 彩纸喷射 | `effect/confetti` | particle_emitter、tap_feedback | P1 | `none` / `point` | 彩纸、庆祝、粒子 |

### 交互装置与控制器 (`interactive`)

| ID | 元素 | 渲染预设 | 交互能力 | 优先级 | 默认碰撞/落点 | 标签 |
|---|---|---|---|---|---|---|
| `interactive.tap_target` | 点击目标 | `helper/tap_target` | tap_feedback、triggerable | P0 | `box` / `surface` | 点击、目标、触发 |
| `interactive.gaze_target` | 注视目标 | `helper/gaze_target` | gaze_feedback、triggerable | P0 | `sphere` / `floating` | 注视、目标、触发 |
| `interactive.hold_target` | 长按目标 | `helper/hold_target` | hold_feedback、triggerable | P0 | `box` / `surface` | 长按、目标、触发 |
| `interactive.drag_handle` | 拖拽把手 | `helper/drag_handle` | pickup_throw、triggerable | P1 | `sphere` / `floating` | 拖拽、控制、交互 |
| `interactive.pickup_object` | 拾取点 | `helper/pickup_object` | pickup_throw、triggerable | P0 | `sphere` / `floating` | 拾取、抓取、交互 |
| `interactive.throwable` | 投掷物 | `helper/throwable` | pickup_throw、physics | P0 | `sphere` / `surface` | 投掷、物理、交互 |
| `interactive.link_beam` | 联动光束 | `effect/link_beam` | triggerable、tap_feedback | P1 | `none` / `between` | 光束、联动、连接 |
| `interactive.sound_source` | 空间音源 | `helper/sound_source` | audio、triggerable | P0 | `sphere` / `point` | 声音、音效、空间 |
| `interactive.display_panel` | 信息面板 | `quad/display_panel` | display、tap_feedback、gaze_feedback | P0 | `box` / `surface` | 面板、文字、展示 |
| `interactive.timer` | 倒计时器 | `quad/timer` | display、triggerable | P1 | `box` / `floating` | 倒计时、游戏、UI |
| `interactive.trigger_zone` | 触发区域 | `helper/trigger_zone` | triggerable、volume_effect | P0 | `none` / `volume` | 区域、进入、触发 |
| `interactive.spawn_point` | 生成点 | `helper/spawn_point` | triggerable、helper | P0 | `none` / `surface` | 生成、出生点、关卡 |
| `interactive.camera_rig` | 镜头轨道 | `helper/camera_rig` | camera、path | P1 | `none` / `path` | 镜头、轨道、相机 |
| `interactive.spline_path` | 移动路径 | `helper/spline_path` | path、helper | P1 | `none` / `path` | 路径、巡航、轨迹 |
| `interactive.animation_driver` | 动画控制器 | `helper/animation_driver` | triggerable、moving | P1 | `none` / `point` | 动画、控制器、状态 |

### 空间辅助与调试 (`helper`)

| ID | 元素 | 渲染预设 | 交互能力 | 优先级 | 默认碰撞/落点 | 标签 |
|---|---|---|---|---|---|---|
| `helper.ground_marker` | 地面标记 | `helper/ground_marker` | helper、tap_feedback | P0 | `none` / `surface` | 地面、标记、定位 |
| `helper.wall_anchor` | 墙面锚点 | `helper/wall_anchor` | helper | P0 | `none` / `surface` | 墙面、锚点、定位 |
| `helper.snap_point` | 吸附点 | `helper/snap_point` | helper | P0 | `none` / `point` | 吸附、定位、编辑 |
| `helper.waypoint` | 路径点 | `helper/waypoint` | path、helper | P0 | `none` / `point` | 路径点、导航、巡航 |
| `helper.checkpoint_marker` | 检查点标记 | `helper/checkpoint_marker` | helper、triggerable | P0 | `none` / `surface` | 检查点、标记、进度 |
| `helper.boundary_volume` | 边界体 | `helper/boundary_volume` | helper、volume_effect | P0 | `none` / `volume` | 边界、限制、区域 |
| `helper.nav_surface` | 导航面 | `helper/nav_surface` | helper、path | P1 | `none` / `surface` | 导航、地面、路径 |
| `helper.occluder` | 遮挡体 | `helper/occluder` | helper | P1 | `box` / `surface` | 遮挡、优化、性能 |
| `helper.light_probe` | 光照探针 | `helper/light_probe` | helper | P1 | `none` / `point` | 光照、探针、调试 |
| `helper.measurement_ruler` | 测量尺 | `helper/measurement_ruler` | helper | P1 | `none` / `between` | 测量、尺寸、调试 |
| `helper.camera_spawn` | 相机出生点 | `helper/camera_spawn` | camera、helper | P0 | `none` / `point` | 相机、出生点、预览 |
| `helper.reset_zone` | 重置区域 | `helper/reset_zone` | triggerable、helper | P1 | `none` / `volume` | 重置、区域、失败处理 |

## 目录字段说明

| 字段 | 语义 |
|---|---|
| `id` | 稳定的侧边栏目录 ID，不是对象实例 ID，也不是资源库文件 ID。 |
| `render.kind` / `render.preset` | 建议的渲染类别和配方名；`effect`、`helper` 尚不是当前项目对象 type。 |
| `interactionProfiles` | 规划中的默认能力集合；P0 必须经过触发器、编辑器试玩、独立 Runtime 三端验证。 |
| `default.sizeMeters` | 默认设计尺寸，单位米；在 JSON/CSV 中可检索，实例 `transform.s` 默认为 `[1,1,1]`。 |
| `default.collider` | 规划的碰撞形状；`cylinder` 需在现有 Box/Sphere/Auto/None 基础上实现或明确近似。 |
| `default.placement` | 落点策略：地表、漂浮、体积、点、路径或两点之间。 |
| `assetPolicy` | 资产制作策略，不表示相应 GLB/粒子/Shader 已经交付。 |

## 优先级定义

| 优先级 | 含义 |
|---|---|
| P0 | 第一批必须可从侧边栏添加并可试玩；覆盖用户明确提出的盒子、桌子、椅子、凳子、房子、树、石头、水、冰、石块、箱子、坦克、玩具、粒子发射、萤火虫、飘飞等。 |
| P1 | 第一批可选增强；用于丰富关卡机关、载具、音画反馈和空间组织。 |
| P2 | 低频或高成本效果；保留目录位置，后续按性能和真实需求补齐。 |

## 资产形态定义

| 形态 | 当前策略 |
|---|---|
| `compound` | 优先使用现有组装体/基础几何能力生成，后续仍需逐一实现每个 preset 的可视形状与互动。 |
| `effect` | 规划中的效果类别；复用现有粒子、透明贴图、Shader 和 `fx/*` 能力，需增加类型映射、开关、数量与预算。 |
| `quad` | 用于屏幕、信息面板、收集卡片和可视化反馈。 |
| `helper` | 规划中的编辑辅助/逻辑类别；默认 Runtime 不可见，需开发对应渲染/规则映射。 |
| `model` | 仅在程序化预览不足时接入 GLB/GLTF，必须有低模变体和碰撞体。 |
