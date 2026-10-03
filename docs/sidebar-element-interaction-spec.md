# 侧边栏元素互动规格

> 状态：v0.2.0。目录与第一批 Runtime/编辑器交互已开始落地；下文中仍标注为“规划”的能力表示尚未达到生产级验收。

## 1. 交互对象的统一模型

每个固定元素由“目录定义”和“场景实例”组成：

```json
{
  "id": "obj_xxx",
  "type": "compound",
  "element_id": "game.chest",
  "element_version": "0.1.0",
  "name": "宝箱",
  "transform": { "p": [0, 0, -3], "r": [0, 0, 0], "s": [1, 1, 1] },
  "interaction": {
    "profile": "openable",
    "enabled": true,
    "state": "closed",
    "params": {},
    "cooldown": 0.3,
    "on": []
  },
  "hitbox": { "type": "box", "size": [0.9, 0.8, 0.9], "center": [0, 0.4, 0] },
  "visible": true,
  "asset": ""
}
```

约束：

- `element_id` 指向固定元素目录，不指向 `meta.assets`；
- `asset` 只有在元素需要外部 GLB/贴图时才填写；
- `interaction.profile` 来自目录表的 `interactionProfiles`，避免每个对象各自发明字段；若有多个 Profile，可由 `profiles` 数组选择主要 `profile` 和增强能力；
- 每个实例都可以独立改名、移动、缩放、旋转、复制、删除和撤销；
- 删除实例不删除目录定义，也不影响其他实例。
- `interaction.state` 是运行状态；运行时状态应存试玩 Session，不能将宝箱打开/金币收集的临时状态回写 `scene.objects` 或 Yjs，除非用户明确保存关卡初始状态。

## 2. 实现状态标记

当前已接入 `tap`、`gaze`、`hold`、`enter`、`leave`、`collision`、`collect` 的数据契约；编辑器和独立 Runtime 已能执行 `set_state`、`collect`、`destroy`、`add_score`、`emit_particles`、`camera_shake`、`vibrate` 等基础反馈。真实物理推动、可复制生成、空间传送和完整飞掠路径仍需后续实现和设备联调。

## 3. 触发器与动作

### 规划中的 P0 触发器

| 触发器 | 适用元素 | 默认参数 | 常见动作 |
|---|---|---|---|
| 点击 `tap` | 宝箱、按钮、靶标、晶体、台灯 | 无 | 高亮、播放动画、发射粒子、播放音效、加分 |
| 注视 `gaze` | 信标、能量晶体、注视目标 | `secs: 1` | 高亮、显示提示、开启机关 |
| 按住 `hold` | 按钮、拉杆、长按目标 | `secs: 1` | 进度填充、开启门、持续发射 |
| 进入区域 `enter` | 触发区域、检查点、水池、传送门 | `radius: 2` | 生成对象、传送、播放环境效果 |
| 离开区域 `leave` | 雾、风场、边界体、重置区域 | `radius: 2` | 停止效果、恢复状态、清理对象 |
| 碰撞 `collision` | 球、地雷、弹跳板、靶标 | `layer: default` | 受力、爆发、扣血、计分 |
| 收集 `collect` | 金币、钥匙、晶体、收集卡片 | `once: true` | 隐藏、加分、解锁、播放反馈 |

### 规划中的 P0 动作

| 动作 | 说明 |
|---|---|
| `show` / `hide` | 显示或隐藏目标实例 |
| `highlight` | 目标高亮，支持颜色和持续时间 |
| `play_seq` | 播放已有时间线动作 |
| `emit_particles` | 在目标位置发射指定粒子效果 |
| `play_audio` | 播放空间音效，可设置循环和衰减 |
| `set_state` | 修改 `open/closed/on/off/collected/active` 等状态 |
| `move` / `rotate` / `scale` | 对目标执行补间或路径运动 |
| `spawn_element` | 从固定元素目录生成新实例 |
| `destroy` | 删除运行时实例，不改编辑器目录 |
| `add_score` | 增加计分或收集数量 |
| `teleport` | 将玩家/目标移动到传送点 |
| `camera_shake` | 轻量镜头反馈，必须有强度上限 |
| `vibrate` | 移动端触感反馈，支持短时长 |

### 与剧情相关的旧动作

`card`、`reward`、`goto_node` 可以作为旧场景兼容动作保留，但不属于本轮固定元素的默认动作，不得出现在新建对象的默认配置中。

## 4. 交互预设

| 预设 | 默认行为 | 示例 |
|---|---|---|
| `static` | 无自动行为，支持变换和显隐 | 桌子、房子、树 |
| `tap_feedback` | 点击后高亮 + 短动画 | 箱子、按钮、靶标 |
| `openable` | 两态切换 + 开合时间线 | 宝箱、柜子、门 |
| `switchable` | 开/关状态 + 联动目标 | 开关、压力板、台灯 |
| `collectible` | 收集一次后隐藏并计数 | 金币、钥匙、晶体 |
| `pickup_throw` | 拾取、拖动、投掷、碰撞 | 球、石块、方块 |
| `moving` | 往返/旋转/路径移动 | 移动平台、齿轮、发条玩具 |
| `particle_emitter` | 持续或脉冲发射粒子 | 粒子发射器、火花、萤火虫 |
| `flyby` | 随机或按路径飘飞经过 | 飘飞光点、飞鸟、气球 |
| `volume_effect` | 进入体积后改变视觉/物理 | 雾、风、力场、水池 |
| `vehicle` | 点击启动或自动巡航 | 坦克、无人机、小车 |
| `display` | 显示内容或数值状态 | 信息面板、倒计时器 |
| `helper` | 仅用于编辑、定位或约束 | 吸附点、边界体、导航面 |

## 5. 粒子和飞掠元素的最低参数

粒子类不能只提供一个“播放/停止”按钮，至少需要：

```json
{
  "emission": { "mode": "continuous", "rate": 80, "burst": 0 },
  "lifetime": [0.8, 2.2],
  "velocity": { "min": [0, 0.2, 0], "max": [0.2, 1, 0.2] },
  "spread": [2, 1.5, 2],
  "size": [0.03, 0.08],
  "color": ["#FFE28A", "#FFFFFF"],
  "blend": "additive",
  "loop": true,
  "maxCount": 300
}
```

飞掠类额外需要：

- 方向：随机、朝向目标、沿路径；
- 速度范围和转向平滑度；
- 进入/离开视野事件；
- 是否循环、延迟和最小间隔；
- 最大同时实例数，避免移动端过载；
- 可选 `spline_path` 绑定。

### 粒子相关现状与后续实现

现有 `compound.points` 的行为是点集合随机上升；`count` 在渲染代码内被限制为 10–2000，但没有统一的发射方向、径向爆发、粒子生命周期、路径控制或与场景触发器绑定的标准 API。上面的参数需要单独实现；即使某张现有 FX 贴图存在，也不能视为相应元素已经可用。

## 6. 互动的安全默认值

- 新增元素默认不自动播放高成本效果；粒子数量默认低档；
- 不允许默认交互无限生成对象；所有 `spawn_element` 必须有数量和生命周期上限；
- 触发器默认有冷却时间，避免点击、碰撞导致事件风暴；
- Helper 默认在编辑器可见、Runtime 隐藏；
- 危险元素（熔岩、地雷、炮台）必须有明确的可视反馈和可关闭状态；
- 每个元素都要支持“重置实例状态”，试玩结束不能污染编辑数据。

## 7. 语音/文本指代协议

### 7.1 稳定 ID

- 目录元素使用 `element_id`，例如 `furniture.chair`。
- 每个目录元素使用不可变 `voice.token`，例如 `xj.element.furniture.chair`。
- 场景实例额外保存 `voice_token`，但实例唯一编辑目标仍是 `object.id`。

### 7.2 解析顺序

```text
exact token / exact element_id
→ 中文名称精确匹配
→ aliases / tags / preset 归一化匹配
→ 模糊匹配返回候选
→ 多候选时暂停执行并向用户确认
```

示例：

```text
用户：在这里加一把椅子
ASR：在这里加一把椅子
解析：add_element(element_id="furniture.chair")
结果：创建 object_id=obj_xxx，写入 voice_token=xj.element.furniture.chair
```

```text
用户：把那把椅子移过来
解析：先列出当前场景中所有 element_id=furniture.chair 的 object_id 和名称
结果：若多于一个，询问“是椅子 A、椅子 B，还是最近选中的椅子？”；确认后才生成 update_object
```

禁止：把“椅子”直接当成唯一 `object.id`；把展示名称写进 `meta.assets`；在多个同名实例之间静默猜测。
