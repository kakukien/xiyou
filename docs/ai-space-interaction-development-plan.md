# 造梦·故事空间：场景、试玩、发布与手机实时互动方案

> 版本：v0.1.0（方案与审查稿）  
> 状态：设计审查稿；Runtime 临时 AI 入口已落地，Release API/真实设备联调仍待推进。  
> 核心原则：Draft 可协作，Release 可交付，Runtime 可运行。

## 1. 三个板块的职责

### 创作页（Editor / Draft）

用于导入或生成高斯空间、管理资源、布置对象、配置区域/锚点/触发器/时间线、AI 辅助创作和试玩验证。修改对象是可编辑 Draft，允许撤销和多人协作。

### 场景页（Capture / Spatial Setup）

用于手机拍照/录像、上传 Capture Package、生成或导入 Gaussian Splat、设置坐标系、锚点、Collider、LOD、分块和质量状态。它负责“空间底座可靠”，不负责游客运行时临时状态。

### 试玩页（Preview / Runtime）

需要区分两种模式：

- **编辑器试玩**：在创作页中验证当前 Draft，不产生游客数据，不等同于正式发布；
- **游客 Runtime**：加载不可变 Release，使用相机、QR/图像锚点、VPS/GPS/手动参考点完成定位，再运行交互。

## 2. 推荐端到端流程

```text
手机拍照/录像
  → Capture Package
  → GPU Worker / 外部重建器
  → Gaussian + Collider + 坐标元数据
  → 场景页校准
  → 创作页布置元素与交互
  → 编辑器试玩
  → 发布检查
  → Release vN + 游客入口
  → 手机扫码/识别海报/现场定位
  → Runtime 加载 Release
  → 触发器与互动状态在本次游客 Session 中运行
```

## 3. 进入体验与定位

### 3.1 触发方式优先级

1. **二维码/短链接**：可靠、容易演示，携带 `experience`、`release`、可选 `entry`；
2. **图像/海报锚点**：用户扫描指定画面，建立相对坐标；
3. **VPS**：在有特征数据库和稳定网络时进行精定位；
4. **GPS**：只做粗定位，不能直接作为厘米级对象放置依据；
5. **手动参考点**：调试和无定位能力设备的兜底。

GPS 不能单独决定“箱子就在手机前方 1 米”。定位状态必须显示为“粗定位/已校准/精定位/待用户确认”。

### 3.2 进入状态机

```text
BOOT
 → LOAD_RELEASE
 → REQUEST_CAMERA
 → WAIT_FOR_ENTRY
 → LOCALIZING
 → CALIBRATING
 → RUNNING
 → UPDATE_AVAILABLE / ERROR
```

每个状态提供下一步操作。相机拒绝、定位超时、Release 不存在、资产加载失败都不能显示空白页面；应给出可重试按钮和调试信息。

## 4. 交互模型

### 4.1 设计时状态与运行时状态分离

场景文件只保存初始状态和规则：箱子初始关闭、点击后播放什么、奖励是什么。游客 Session 保存：箱子是否打开、奖励是否领取、当前节点、已触发事件。这些临时状态不能写回 Draft、Yjs 或 Release，除非产品明确设计为共享游戏进度。

```json
{
  "scene": { "objects": [], "triggers": [], "sequences": [] },
  "runtimeSession": {
    "sessionId": "...",
    "releaseId": "...",
    "objectState": { "box_1": { "opened": true } },
    "progress": { "node_1": "done" }
  }
}
```

### 4.2 触发器示例

```json
{
  "id": "trigger_box_tap",
  "target": "box_1",
  "when": "tap",
  "params": { "cooldownMs": 800 },
  "do": [
    { "action": "play_seq", "args": { "sequence": "box_open_seq" } },
    { "action": "card", "args": { "text": "箱子打开了" } }
  ]
}
```

靠近触发需要空间定位和 Collider/区域支持；没有可信位姿时必须降级为“点击/扫描后触发”，不能伪造距离判断。

### 4.3.1 当前 Runtime 已支持的基础动作

当前 Runtime 已执行以下低风险动作：`play_seq`、`card`、`reward`、`highlight`、`show`、`hide`、`set_state`、`collect`、`destroy`、`add_score`、`teleport`、`vibrate`、`camera_shake`、`spawn_element`；进入区域离开时会触发 `leave`。这些状态只存在于本次 Runtime Session，不回写 Release。

`collision` 已增加基于玩家邻近范围的基础触发，仍不是刚体物理；真实物理推动、多人共享分数和 `spawn_element` 的生产级实现仍需设备能力、物理系统或服务端 Session 支持，不能由当前邻近检测冒充。

### 4.3 移动端触碰语义

第一阶段使用屏幕点击/凝视/按住模拟触碰；WebXR 或 AR Hit Test 可用时再增强为真实空间射线。不要把“手机碰到箱子”直接承诺为物理碰撞：真实物理碰撞需要稳定位姿、深度/平面检测、碰撞体和设备支持，属于后续能力。

## 5. 发布与实时更新

### 5.1 发布语义

- Draft：可修改、可协作、可能不完整；
- Release：通过检查后生成不可变快照，包含资产引用、场景版本、定位元数据和 schema 版本；
- Runtime：只读取 Release；
- 本地 `localStorage`：仅作为编辑器本机草稿回退，不是跨设备发布存储。

发布包至少包含：

```json
{
  "releaseId": "release_x",
  "version": 3,
  "sceneSchemaVersion": "2.0.0",
  "sceneUrl": "https://assets.example/release.json",
  "assetManifestUrl": "https://assets.example/manifest.json",
  "entry": { "qr": "...", "posterAnchor": "anchor_1" },
  "publishedAt": "...",
  "checksum": "..."
}
```

### 5.2 更新策略

- 新会话默认加载 active Release；
- 已打开 Session 继续运行当前 Release；
- 发现新版本时显示“有新版本，重新加载”；
- 只允许明确白名单做热更新，如文案、显隐、简单动画；
- 底座、坐标系、锚点、Collider、对象 ID 结构变更必须重新初始化并提示用户。

### 5.3 实时同步边界

“实时”拆成三种语义，不能混为一谈：

| 语义 | 技术 | 作用 |
|---|---|---|
| 多人编辑实时同步 | Yjs/WebSocket | Draft 内多人共同编辑 |
| 发布通知实时到达 | SSE/WebSocket/轮询 | 告知 Runtime 有新 Release |
| 游客共享游戏状态 | 服务端 Session/事件总线 | 需要账号、权限、冲突和持久化，后续做 |

第一阶段只保证前两种。游客打开手机后不会自动读取创作者未发布的 Draft。

## 6. 服务端持久化最小模型

即使当前先用本地文件或轻量服务，也要按以下概念建模：

- `Project`：项目/空间归属；
- `Draft`：当前可编辑场景；
- `Release`：不可变发布版本；
- `Asset`：持久化资源和 checksum；
- `Anchor`：QR/图像/VPS/GPS 入口；
- `RuntimeSession`：游客一次体验；
- `Event`：可选的匿名互动事件。

Yjs 只负责在线协作，不等于永久保存。服务端必须定期或在发布时保存快照，并能在重启、换设备和回滚后恢复。

## 7. 现有演示文档的结论

`docs/hackathon-multiplayer-demo.html` 已表达正确的演示主线：

```text
多人协作 Draft → 发布 Release v2 → 手机扫码进入 Runtime → 发布 v3 → 旧 Session 提示更新
```

`docs/mobile-runtime-trigger-and-live-publish-plan.md` 也明确指出当前 `runtime.html?room=demo` 读取的是当前浏览器的 `localStorage`，这不能代表真实跨设备发布。后续实现必须优先把“发布 JSON URL/Release API”作为手机入口，不能拿本机 localStorage 代替跨设备同步。

## 8. 验收场景

1. 创作者导入高斯底座和一个箱子，配置点击打开动画，试玩页能验证。
2. 发布 v1 后，另一台手机扫码进入 Runtime，加载到箱子和动画。
3. 手机拒绝相机时，页面仍显示可理解的失败和重试路径。
4. 发布 v2 后，新手机加载 v2；旧手机保持 v1 并收到更新提示。
5. 创作者在 Draft 中继续加猴子/坦克时，游客端不会提前看到未发布内容。
6. AI 添加一个箱子后刷新编辑器仍存在，发布后 Runtime 才可见。
7. 多人同时编辑时，Draft 同步；游客状态不反向污染 Draft。

## 10. 当前实现状态（2026-10-03）

已落地：

- Editor AI：文本/浏览器语音输入、场景上下文、固定元素目录上下文、实例歧义选择、计划确认、原子执行和撤销；
- Provider：项目 Relay 与 OpenAI-compatible endpoint 配置，endpoint 协议校验，API Key 只保存在当前会话内；
- Runtime AI：右下角临时 AI 对话、语音输入、临时固定元素添加，明确不修改 Release；
- Runtime 互动：Session 状态、收集、分数、状态切换、离开区域、距离碰撞近似、粒子事件、震动、镜头反馈和临时生成；
- Release：发布 payload、游客入口复制、本地 Release JSON 下载。

未完成：服务端 Provider Adapter、服务端 STT、对象存储/Release API、跨设备实时发布通知、多人共享游客 Session、真实 WebXR/设备矩阵验证。当前实现不能把浏览器本地 Release JSON 下载入口描述为已经完成的跨设备发布服务。
