# 虚境高斯场景工作台开发文档

> 状态：开发中；入口、工作台、Provider 契约和 Worker 任务链路已落地，真实 COLMAP / Brush 重建仍通过外部重建器接入
>
> 版本：v1.0
>
> 编写日期：2026-10-02
>
> 适用项目：`/Users/lex/Code/ProjDev/xihack-xian-proj/editor`
>
> 参考项目：[`ooolabdev/ooosplat`](https://github.com/ooolabdev/ooosplat.git)，审阅版本 `0.5.0`，当前提交 `4c6e0034f40f5e1ea03c15f661b3ac9450960042`

---

## 当前落地状态（2026-10-02）

已落地：

- 顶栏“空间底座”和 Details“创建空间底座”双入口；进入工作台后隐藏普通创作界面，返回时恢复。
- 视频 / 图片序列 / PLY、SOG、SPZ、SPLAT、KSPLAT 输入；本地 Companion multipart 上传与 Remote Provider 统一任务契约。
- Worker 的 `/jobs`、进度阶段、日志、取消、恢复、资产列表和下载路由；图片序列会以临时目录交给重建任务。
- Transform、可视化裁切框、非破坏式 `editing.crop` 修订、输出资产和质量报告面板。
- Capture Package 元数据写入 `scene.base`；`local://` 仅作为本机临时预览引用，发布检查会阻止未持久化资产。

限制：

- Worker 已补充本地引擎编排入口，目标链路为 FFmpeg / FFprobe → COLMAP → Brush → `final.ply`。当前仓库没有携带这些二进制；需要将 OOOSplat 已验证的本地引擎目录，或同版本引擎目录，通过 `XIYOU_ENGINE_DIR` 提供给 Worker。未提供时仍只生成输入包。
- 浏览器端裁切只保存非破坏式裁切参数并显示区域，不做逐点删除、`edit.ply` bake 或删除 Mask 运算；这些能力需要后续本地 Gaussian 编辑器 / PLY 导出器接入，不等同于需要远程服务器。

## 1. 文档目标

本文档定义将 OOOSplat 类高斯泼溅生成与编辑能力加入“西游·虚境”编辑器的产品、交互、技术和实施方案。

本次不直接开发功能，先明确：

- OOOSplat 的实际实现方式和可复用边界；
- 虚境编辑器新增入口和双模式切换方式；
- 视频/序列帧到高斯场景的处理链路；
- 高斯场景编辑结果如何回到虚境，成为可布置互动对象的空间底座；
- 碰撞体、坐标、LOD、资源持久化与多人协作的边界；
- 后续开发的模块拆分、验收标准和风险。

核心结论：**不直接把 OOOSplat 作为一个页面嵌入，也不把它的 Tauri 桌面应用整体搬进 Web 编辑器。应提取其“媒体处理流水线 + 高斯预览编辑器”的产品能力，接入虚境现有的场景底座模型。**

---

## 2. 现状审计

### 2.1 虚境当前已有能力

当前编辑器已经具备高斯底座接入的前半段：

| 模块 | 当前状态 | 对本需求的意义 |
|---|---|---|
| 编辑器壳层 | Vite + 原生 JavaScript + Three.js，已有顶栏、Outliner、Viewport、Details、Dock | 可以新增一个完整的工作模式，而不需要重做编辑器壳层 |
| 高斯渲染 | 使用 `@mkkellogg/gaussian-splats-3d` 的 `DropInViewer` | 可以继续复用现有 Web 视口加载 PLY / SOG / SPZ 等底座 |
| 底座数据 | `scene.base.sog_url`、`collider_url`、`lod`、`chunks`、`transform`、`env` | 已有“导入结果回到场景”的数据位置 |
| 底座入口 | Details 中可上传 PLY / SOG / SPZ / SPLAT / KSPLAT | 需要在该入口旁增加“创建空间底座”而不是只提供上传 |
| Collider | 支持 GLB / GLTF、盒体 Collider、精确网格缓存和放置约束 | 高斯导入后可继续用于实体碰撞和布置约束 |
| 本地媒体 Worker | `tools/gpu-worker.mjs` 支持分析、Alpha 转换、抽帧和 manifest | 可以作为重建任务编排的起点，但目前不是完整 3DGS 重建器 |
| 场景编辑 | 对象、区域、锚点、触发器、时间线、试玩、发布检查 | 高斯结果导入后可继续做实体互动编辑 |
| 协作 | Yjs 场景同步、Awareness、软锁、本地存档 | 可同步“任务状态和底座引用”，不应同步大体积 PLY 或删除位图 |

### 2.2 当前明确缺口

`tools/gpu-worker.mjs` 当前的 `prepare-reconstruction` 只会：

1. 使用 FFmpeg 抽帧，或读取图片序列；
2. 生成 `manifest.json`；
3. 在设置 `XIYOU_RECONSTRUCTOR_BIN` 时调用外部重建器；
4. 未设置时停留在“已准备重建输入包”。

它目前没有内置：

- COLMAP 特征提取、匹配和相机重建；
- Brush 或等价 Gaussian 训练器；
- GPU / CPU 能力检测；
- 训练 checkpoint、断点续跑和结果验证；
- 多平台引擎打包；
- 高斯编辑后的 PLY 非破坏式导出。

因此，本需求不能只通过新增一个前端按钮完成。必须补充一个**可替换的高斯重建 Provider**，前端页面只消费任务状态和结果资产。

---

## 3. OOOSplat 实现分析

### 3.1 产品定位

OOOSplat 不是单纯的 PLY 查看器，而是一个基于 Tauri 的本地桌面工作流：

```text
视频 / 图片序列
  → 画面分析与抽帧
  → 相机重建
  → Gaussian 训练
  → final.ply
  → 高斯预览与非破坏式编辑
  → edit.ply / 视频 / 离线 HTML
```

它默认在本机完成处理，原始视频、图片、重建数据、模型和日志不上传云端。

### 3.2 生成流水线

#### 阶段 A：输入探测与规划

支持：

- MP4、MOV 视频；
- JPG、JPEG、PNG 图片序列；
- 透明 MOV / PNG 的 Alpha 检测。

应用会读取视频时长、分辨率、FPS、编码和 Alpha 信息，再根据“快速 / 均衡 / 精细”档位规划抽帧数量、工作分辨率和训练参数。0.5.0 默认打开实验性自动优化，可依据素材、档位和显存规划参数。

#### 阶段 B：画面准备

使用 FFmpeg：

- 视频按规划的 FPS 抽帧；
- 图片序列按文件名排序并建立规范化输入；
- 透明素材生成 RGBA 画面；
- 透明区域生成 COLMAP Mask，避免透明背景参与特征提取；
- 生成可恢复的中间文件和阶段状态。

#### 阶段 C：COLMAP 相机重建

使用 COLMAP 完成：

- 特征提取；
- 顺序匹配或穷举匹配；
- 增量式相机与稀疏点重建；
- 注册率、三维点数量和相机模型校验。

NVIDIA 环境满足驱动和 Compute Capability 条件时使用 CUDA，否则回退 CPU。不同 COLMAP CLI 版本的 GPU 参数会被单独探测，不直接假设命令参数固定。

#### 阶段 D：Brush Gaussian 训练

使用 Brush 训练 Gaussian Splatting，并输出 `final.ply`。训练参数包括：

- 总迭代步数；
- 最大训练分辨率；
- refine 间隔；
- 最大 Splat 数量；
- 密化和生长策略。

训练阶段会依据显存选择方案，识别显存不足和 GPU 设备中断，并提供重试或降级提示。

#### 阶段 E：结果发布

结果写入一个本地项目目录，主要包括：

```text
project/
├─ final.ply
├─ project.json
├─ state.json
├─ source/
├─ work/
│  ├─ frames/
│  ├─ masks/
│  ├─ colmap/
│  └─ brush/
├─ edits/
└─ logs/
```

`state.json` 支持阶段级恢复；`project.json` 记录输入、质量档位、输出、Transform、编辑修订和状态。

### 3.3 高斯预览与编辑实现

OOOSplat 0.5.0 的高斯预览使用 PlayCanvas：

- `@playcanvas/react`；
- `playcanvas` 的 `GSplat` / `GSplatResource`；
- 优先尝试 WebGPU，回退 WebGL2；
- `useSplat` 加载 PLY；
- 自定义 Instance Texture 保存 `deleted`、`selected`、`scratch` 状态；
- `GSplatProcessor` 在 GPU 上执行选择和裁切计算。

编辑能力包括：

1. 模型整体位置、旋转、等比缩放；
2. 矩形框选 Gaussian；
3. Shift 添加选区、Ctrl 移除选区；
4. 球形和盒形裁切区域；
5. 将裁切区域外的 Gaussian 标记为删除；
6. Delete / Backspace 删除选中 Gaussian；
7. Ctrl+Z / Ctrl+Y 撤销重做；
8. 保存删除位图和编辑修订；
9. 导出新的 `edit.ply`，不覆盖原始 `final.ply`；
10. 导出视频和包含模型的离线 HTML。

它不是把每次删除立即重写整个 PLY，而是：

```text
GPU 临时编辑状态
  → packed deletion mask
  → 本地保存 revision mask
  → 导出时流式读取 PLY
  → 根据 mask / crop 过滤并变换 Gaussian
  → 原子发布 edit.ply
```

这是高斯编辑性能和可恢复性的关键，应作为虚境后续实现的参考。

### 3.4 OOOSplat 不负责的内容

以下能力不属于 OOOSplat 的核心输出，需要在虚境中另外实现：

- 场景对象、剧情节点、互动触发器和时间线；
- Web 编辑器的底座引用和发布版本；
- GLB / GLTF Collider；
- AR 锚点、VPS、GPS、二维码定位；
- 多人协作和项目权限；
- 高斯底座分块、LOD 和业务级资产复用。

尤其要注意：**高斯点云不是可靠的碰撞体。** 不能把 PLY 中的 Gaussian 直接当作地面、墙体或实体碰撞网格。

---

## 4. 总体产品方案

### 4.1 新增产品概念

新增“高斯场景工作台”，作为虚境编辑器中的一个全屏工作模式：

```text
虚境编辑器
├─ 场景创作模式：布置实体、Collider、互动、剧情和时间线
└─ 高斯场景工作台：导入素材、重建、编辑 Gaussian、确认空间底座
```

建议用户可见名称：

- 顶部模式：`场景创作` / `空间底座`；
- 主入口：`创建空间底座`；
- 工作台标题：`空间底座工作台`；
- 返回按钮：`返回场景创作`；
- 导入按钮：`应用到底座`。

不建议直接把产品命名为“OOOSplat 模式”，避免品牌混淆，也不要复制 OOOSplat 的 Logo、图标或产品名称。

### 4.2 入口位置

当前右侧 Details 的“空间底座”卡片改为：

```text
空间底座
[未绑定] / [已绑定] / [加载中]

[创建空间底座]   [上传已有文件]

高斯泼溅底座       [上传]
碰撞体             [上传]
资源地址           [输入]
```

点击“创建空间底座”后：

1. 保存当前场景草稿；
2. 暂停普通场景编辑快捷键；
3. 切换到高斯场景工作台；
4. 工作台完成或用户取消后返回原场景模式；
5. 返回时保留任务、相机和临时编辑状态。

如果当前已经存在底座，也允许从该入口进入工作台，对现有底座执行预览、裁切、Transform 或创建派生版本。

### 4.3 页面布局

工作台仍沿用虚境 Design Token 和现有编辑器密度，但不照搬 OOOSplat 的深色 UI：

```text
┌────────────────────────────────────────────────────────────┐
│ 虚境 / 空间底座工作台     [任务状态] [撤销] [重做] [返回] [应用到底座] │
├──────────────┬──────────────────────────────┬───────────────┤
│ 工作流 / 资源  │                              │ 属性 / 质量     │
│              │        Gaussian Viewport       │               │
│ 1 输入素材    │                              │ Transform      │
│ 2 生成任务    │     相机、网格、裁切辅助线     │ 裁切 / 选择     │
│ 3 编辑场景    │                              │ 输出信息       │
│ 4 应用底座    │                              │ Collider 状态   │
├──────────────┴──────────────────────────────┴───────────────┤
│ 任务进度 / 日志 / 输出资产 / 生成质量 / 资源加载状态          │
└────────────────────────────────────────────────────────────┘
```

推荐尺寸沿用现有设计系统：

- 左侧工作流：约 `304px`；
- 右侧 Inspector：约 `368px`；
- 底部 Dock：最小 `240px`；
- 顶栏：使用 Token 中的 `topbar` 高度；
- 面板、卡片、控件、间距、字号和图标全部映射 `docs/design-tokens.json`。

---

## 5. 交互流程

### 5.1 从素材创建高斯场景

```text
点击「创建空间底座」
  → 选择视频 / 图片序列
  → 选择质量档位
  → 查看素材分析与 GPU 状态
  → 开始生成
  → 查看阶段进度与日志
  → 生成完成
  → 自动打开 Gaussian 编辑视口
```

输入区应支持：

- 拖拽 MP4 / MOV；
- 选择图片序列目录；
- 显示文件名、大小、时长、分辨率、帧数；
- 显示是否包含 Alpha；
- 显示预计耗时和磁盘占用；
- 允许取消、失败重试和阶段恢复。

### 5.2 质量档位

继续采用 OOOSplat 的三档语义，但使用虚境文案：

| 档位 | 适用 | 默认策略 |
|---|---|---|
| 快速 | 现场试验、快速验证视角 | 少量抽帧、较低分辨率、较短训练 |
| 均衡 | 常规景区底座，推荐默认 | 平衡质量、耗时和显存 |
| 精细 | 正式交付和大屏展示 | 更多画面、更高分辨率、更长训练 |

附加开关：

- `自动优化`：根据输入素材、档位和硬件规划抽帧及训练参数；
- `保留 Alpha`：仅在检测到透明素材时显示；
- `生成预览代理`：可选生成轻量 SOG / SPZ / 低 LOD 版本。

### 5.3 高斯编辑

第一期必须支持：

- 旋转、平移、等比缩放；
- 顶视 / 正视 / 侧视 / 透视；
- 聚焦场景和重置视角；
- 盒形和球形裁切；
- 撤销和重做；
- 原始结果与当前编辑结果切换；
- 保存编辑版本；
- 取消编辑不影响原始输出。

第二期支持：

- GPU 框选 Gaussian；
- 增加 / 移除选区；
- Delete 删除选中点；
- 编辑修订差异；
- 派生版本和版本回滚；
- 预览动画和离线 HTML。

不建议第一期在浏览器中实现完整“逐点刷子”工具。高斯数量达到百万级后，CPU 逐点拾取和重写会直接导致卡顿，应优先使用 GPU mask 或服务端离线导出。

### 5.4 应用到底座

用户点击“应用到底座”时，打开确认面板：

```text
将当前结果应用到底座？

高斯资产：scene.sog / scene.ply
当前编辑：已裁切、已变换
Collider：已绑定 / 未绑定
LOD：高 / 中 / 低
坐标系：site-local-y-up

[取消] [仅保存为资源] [应用到底座]
```

应用成功后：

1. 创建或更新 `Capture Package`；
2. 将高斯资产引用写入 `scene.base`；
3. 写入底座变换和坐标系信息；
4. 写入 Collider 引用和 LOD / chunk 信息；
5. 返回普通场景创作模式；
6. 释放工作台临时渲染器和临时资源；
7. 让主 Viewport 重新加载新底座；
8. 自动打开底座加载状态和质量提示。

如果没有 Collider：

- 允许“仅应用高斯预览”；
- 发布检查给出 warning 或 block，按目标 Runtime 要求决定；
- 不得默默把高斯点云当作精确碰撞体；
- 可使用现有盒体 Collider 作为临时布置范围，但明确标注“临时”。

---

## 6. 推荐技术架构

### 6.1 前端、任务服务和渲染器分层

```text
虚境 Web 编辑器
  ├─ Splat Studio UI
  ├─ Splat Preview Adapter
  ├─ Reconstruction Job Client
  └─ Scene Import Adapter
          │
          ├─ Local Provider：本地 Companion / Tauri / CLI
          └─ Remote Provider：GPU 服务 / Job API
                    │
                    ├─ FFmpeg / FFprobe
                    ├─ COLMAP
                    ├─ Brush 或等价 3DGS Trainer
                    ├─ 结果验证
                    └─ 资产存储
```

前端不能直接依赖某一个重建器的命令行参数，而应定义统一 Provider：

```js
provider.createJob(input, options)
provider.getJob(jobId)
provider.cancelJob(jobId)
provider.resumeJob(jobId)
provider.getArtifacts(jobId)
provider.disposeJob(jobId)
```

这样可以先接本地 Provider，后续再接远程 GPU Provider，而不改页面交互。

### 6.2 本地与远程方案

#### 方案 A：远程 GPU Provider

```text
浏览器
  → 上传到对象存储
  → 创建重建 Job
  → GPU Worker 执行
  → 结果上传对象存储
  → 编辑器读取预览资产
```

优点：浏览器和用户设备要求低，适合商用 Web 产品。

缺点：视频和图片需要上传，产生存储、带宽、隐私和 GPU 成本；需要任务队列、鉴权、断点和清理机制。

#### 方案 B：本地 Companion Provider

```text
浏览器编辑器
  ↔ 本机 Companion / Tauri
      ├─ FFmpeg
      ├─ COLMAP
      └─ Brush
```

优点：接近 OOOSplat 的本地优先模式，适合大文件和隐私敏感的景区采集素材。

缺点：需要安装 Companion，浏览器和本机服务要做安全握手、版本兼容和权限控制。

#### 推荐

- 当前开发验证：先做本地 Provider，复用现有 `tools/gpu-worker.mjs` 的 Job 思路；
- 商用 Web：保留同一 Provider 接口，再增加远程 GPU Provider；
- 不建议把 `gpu-worker.mjs` 直接暴露到公网。当前服务只监听 `127.0.0.1`，若未来允许浏览器访问，必须增加一次性 token、Origin 校验、路径白名单、任务权限和文件清理。

### 6.3 渲染器选择

建议采用渐进方案：

#### 第一阶段：继续使用 Three.js / `gaussian-splats-3d`

用于：

- 加载 PLY / SOG / SPZ；
- 场景浏览；
- Transform；
- LOD、分块和底座切换；
- 与现有实体对象、Collider、锚点共存。

优点是与现有主编辑器一致，不引入第二套完整渲染器。

#### 第二阶段：独立接入 PlayCanvas Gaussian 编辑模块

如果需要 OOOSplat 级别的 GPU 选择、裁切、删除和大模型编辑，再把 PlayCanvas 作为**高斯场景工作台内部渲染器**，不要立即替换整个主 Viewport。

原因：

- OOOSplat 已经验证 PlayCanvas 的 GSplat 编辑、GPU mask 和 WebGPU / WebGL2 回退方案；
- 现有 Three.js Viewport 已承载实体对象、Collider、Gizmo 和交互逻辑；
- 两套渲染器完全合并的改造风险远高于建立工作台隔离层。

工作台和主 Viewport 之间只交换：

```text
assetUrl
assetManifest
transform
crop
editRevision
colliderUrl
coordinateSystem
```

不交换渲染器内部对象。

---

## 7. 数据模型设计

### 7.1 Capture Package

建议新增一个业务层抽象，不把 `sog_url` 作为全部底座语义：

```json
{
  "id": "capture_xxx",
  "siteId": "site_xxx",
  "name": "花果山入口高斯底座",
  "status": "ready",
  "source": {
    "type": "video",
    "name": "entrance.mp4",
    "sha256": "...",
    "duration": 42.5,
    "width": 3840,
    "height": 2160
  },
  "pipeline": {
    "provider": "local",
    "quality": "balanced",
    "plannerVersion": "quality-v2",
    "reconstructorVersion": "...",
    "colmapVersion": "...",
    "trainerVersion": "..."
  },
  "coordinateSystem": "site-local-y-up",
  "artifacts": {
    "splat": {
      "format": "sog",
      "url": "asset://capture_xxx/scene.sog",
      "sourcePlyUrl": "asset://capture_xxx/final.ply",
      "bytes": 0,
      "splatCount": 0
    },
    "collider": {
      "format": "glb",
      "url": "asset://capture_xxx/collider.glb",
      "source": "uploaded"
    },
    "lod": {
      "high": "asset://capture_xxx/high.sog",
      "medium": "asset://capture_xxx/medium.sog",
      "low": "asset://capture_xxx/low.sog"
    },
    "chunks": []
  },
  "editing": {
    "transform": {
      "position": [0, 0, 0],
      "rotation": [0, 0, 0],
      "scale": 1
    },
    "crop": null,
    "deletedMaskUrl": null,
    "revision": 0
  },
  "quality": {
    "registeredRatio": 0,
    "points3d": 0,
    "warnings": []
  }
}
```

`assetUrl`、`sourcePlyUrl` 和 `deletedMaskUrl` 必须是持久化资产引用，不能把浏览器 `blob:` / `ObjectURL` 写入正式发布数据。

### 7.2 与当前 `scene.base` 的兼容映射

第一期可以保持现有 Schema 兼容，同时增加可选字段：

```json
{
  "base": {
    "capture_id": "capture_xxx",
    "sog_url": "asset://capture_xxx/scene.sog",
    "collider_url": "asset://capture_xxx/collider.glb",
    "collider": {
      "type": "mesh",
      "visible": false
    },
    "lod": {
      "enabled": true,
      "current": "high",
      "urls": {
        "high": "asset://capture_xxx/high.sog",
        "medium": "asset://capture_xxx/medium.sog",
        "low": "asset://capture_xxx/low.sog"
      }
    },
    "chunks": [],
    "transform": {
      "s": 1,
      "R": [1, 0, 0, 0, 1, 0, 0, 0, 1],
      "t": [0, 0, 0],
      "scale_source": "splat-studio"
    },
    "coordinate_system": "site-local-y-up"
  }
}
```

注意：当前代码使用 `transform.R` 九元素矩阵，示例实现时必须严格保持九元素，不能误写成十元素。

### 7.3 协作同步边界

Yjs 只同步轻量状态：

- `capture_id`；
- 当前底座资产引用；
- 任务状态摘要；
- 编辑修订号；
- Transform、crop 等小型配置；
- 当前操作者和软锁。

不通过 Yjs 同步：

- 视频、图片序列、PLY、SOG、SPZ、GLB；
- Gaussian deletion mask；
- 训练日志全文；
- GPU 中间纹理；
- 本地绝对路径。

多人同时编辑同一个 Gaussian 工作台时，第一期采用“单人编辑锁 + 其他人只读预览”。多人可以共同编辑场景实体，但不要同时写同一份百万级点云删除位图。

---

## 8. 坐标、Collider 与导入规则

### 8.1 坐标系

OOOSplat 在 PlayCanvas 预览中对 PLY 使用了额外的坐标转换，代码中存在 PLY 与 Engine 坐标的 180° Z 轴处理。虚境当前 Three.js 高斯加载也可能有自己的坐标约定，因此导入时不能直接假设两者坐标一致。

必须统一定义：

```text
业务坐标：site-local-y-up
单位：米
上方向：+Y
前方向：由 Capture Package 记录
高斯源坐标：记录转换矩阵
编辑器坐标：记录转换矩阵
```

导入验收必须验证：

- 高斯底座、Collider、锚点和实体对象的原点一致；
- 不出现绕 Z 轴重复旋转 180°；
- Transform 在工作台和主 Viewport 中视觉一致；
- 旧场景不升级时仍能加载。

建议新增一组小型基准资产：带明显 X / Y / Z 标记、地面箭头和已知尺寸的高斯场景，用于每次改动的坐标回归测试。

### 8.2 Collider 策略

高斯重建流程本身只生成视觉点云，不应承诺生成精确 Collider。Collider 分为：

| 类型 | 用途 | 第一阶段 |
|---|---|---|
| 盒体 Collider | 临时地面、粗略放置范围 | 保留现有能力 |
| GLB / GLTF 网格 Collider | 精确地面、墙面、路径和禁布检测 | 必须支持 |
| 自动生成 Mesh Collider | 从重建结果或外部 Mesh 服务生成 | 后续能力 |

导入状态应明确展示：

- `高斯已就绪`；
- `Collider 已绑定`；
- `仅视觉预览，未绑定 Collider`；
- `Collider 加载失败`。

没有 Collider 时，允许用户编辑 Gaussian，但放置实体时显示提示，发布检查按项目配置决定是否阻断。

### 8.3 资产格式

建议按用途区分：

- 编辑源：PLY；
- Web 预览 / 运行：SOG、SPZ 或现有运行时支持格式；
- 高质量归档：原始 PLY；
- 碰撞：GLB / GLTF；
- 轻量预览：低 LOD SOG / SPZ。

不要把所有高斯格式强行转换为 PLY，也不要在场景 JSON 内嵌二进制内容。

---

## 9. 前端模块规划

未来开发建议按当前项目既有模块风格拆分：

```text
editor/src/
├─ core/
│  ├─ reconstruction.js       # Provider、Job 状态和结果摘要
│  ├─ splat-studio.js         # 工作台状态、编辑会话、导入映射
│  ├─ schema.js               # Capture Package / base 扩展和校验
│  ├─ store.js                # 模式、任务、资产和编辑状态
│  └─ viewport.js             # 主场景底座加载，继续复用现有逻辑
├─ ui/
│  ├─ splat-studio.js         # 工作台页面壳层
│  ├─ splat-input.js          # 视频 / 图片序列输入
│  ├─ splat-job.js            # 任务进度和日志
│  ├─ splat-inspector.js      # Transform / 裁切 / 资产信息
│  └─ details.js              # 创建空间底座入口和导入回填
└─ splat-studio/
   ├─ renderer.js             # 第一阶段复用 Three，后续可替换 PlayCanvas
   ├─ selection.js            # GPU 选区接口，第二阶段
   └─ export.js               # 编辑结果提交和导出
```

不建议第一期直接修改现有所有面板来“塞入”高斯工具。工作台应有独立挂载点，和普通场景模式通过状态切换隔离：

```js
store.editorMode = 'scene' | 'splat-studio'
```

切换时必须有生命周期：

```text
enterSplatStudio()
  → 保存普通场景状态
  → 挂载工作台
  → 启动 / 恢复编辑会话

exitSplatStudio()
  → 提交或放弃临时编辑
  → 释放工作台渲染器、Worker、Blob URL
  → 回到主 Viewport
  → 按 capture_id 重新加载底座
```

---

## 10. Provider API 和任务状态

### 10.1 统一任务状态

```text
created
  → analyzing
  → preparing_frames
  → extracting_features
  → matching
  → reconstructing
  → training_splats
  → validating
  → ready
```

异常状态：

```text
cancelled / failed / paused / needs_attention
```

每个状态应返回：

```json
{
  "jobId": "job_xxx",
  "stage": "training_splats",
  "progress": 62.5,
  "message": "正在训练 Gaussian Splatting",
  "current": 12000,
  "total": 20000,
  "engine": "brush",
  "canCancel": true,
  "canResume": true,
  "warnings": []
}
```

### 10.2 任务接口

远程 API 或本地 Companion 均实现同一语义：

```text
POST   /reconstruction/jobs              创建任务
GET    /reconstruction/jobs/:id          查询任务
GET    /reconstruction/jobs/:id/events  订阅进度 / 日志
POST   /reconstruction/jobs/:id/cancel  取消任务
POST   /reconstruction/jobs/:id/resume  恢复任务
GET    /reconstruction/jobs/:id/assets  获取输出资产
DELETE /reconstruction/jobs/:id          清理临时任务
```

任务事件优先使用现有项目的输出日志语义；如果是远程服务，可用 SSE 或 WebSocket，不能依赖前端定时轮询作为唯一状态来源。

### 10.3 错误分类

至少区分：

- 输入素材无效；
- 抽帧失败；
- 磁盘空间不足；
- COLMAP 注册率过低；
- GPU 不可用；
- GPU 显存不足；
- GPU 设备中断；
- Brush 训练失败；
- PLY 格式不兼容；
- 结果资产上传失败；
- 浏览器显存或纹理容量不足；
- Collider 缺失或加载失败。

错误文案要给出可执行建议，不直接把原始命令行日志作为主要用户体验。

---

## 11. 设计系统要求

新增页面必须遵守：

- 唯一 Token 源：`docs/design-tokens.json`；
- 组件、按钮、Chip、Input、Panel、Tab、Toast 沿用现有组件语义；
- 字体使用 `Inter`、系统字体和 `Microsoft YaHei` 回退；
- 图标统一使用 Remix Icon；
- 主要行动色使用 `brand.primary` 橙色；
- Viewport 使用 `surface.viewport` 冷蓝灰，不复制 OOOSplat 深色品牌 UI；
- 重要状态使用 info / success / warning / danger 语义色；
- 默认间距只使用 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64；
- 重要操作使用“图标 + 文字”，纯图标按钮必须有 `title` / `aria-label`；
- 页面不能出现 Emoji 作为功能图标；
- 任务状态、加载进度、失败、取消和恢复必须可见；
- 高斯工作台可以使用更强的视口对比度，但不能通过大面积装饰压过场景内容。

组件建议：

| 组件 | 用途 |
|---|---|
| `ModeToggle` | 场景创作 / 空间底座切换 |
| `WorkflowStep` | 输入、生成、编辑、应用四步流程 |
| `JobProgress` | 阶段、百分比、当前引擎、取消和恢复 |
| `AssetStatusChip` | Gaussian、Collider、LOD、坐标状态 |
| `SplatTransformPanel` | 位置、旋转、等比缩放 |
| `CropPanel` | 盒形 / 球形裁切和应用 |
| `ImportSummary` | 将结果应用到底座前的引用和风险确认 |
| `QualityReport` | 注册率、点数、显存、警告和质量分数 |

---

## 12. 开发分期

### Phase 0：契约和技术验证

目标：不做完整 UI，先证明链路可行。

- 定义 `Capture Package` 和 `scene.base` 映射；
- 定义 Local / Remote Provider 接口；
- 用一组小型视频和图片序列跑通 FFmpeg → COLMAP → Brush；
- 验证输出 PLY 能被当前 Three.js Viewer 加载；
- 验证 OOOSplat 输出与虚境的坐标转换；
- 确认 Apache-2.0、第三方引擎和模型输出的合规边界；
- 建立性能基线：帧数、注册率、Splat 数、PLY 大小、加载时间和显存。

出口：可以得到一份可加载的 `final.ply` 和完整任务 manifest。

### Phase 1：工作台壳层和模式切换

- Details 增加“创建空间底座”；
- 新增 `splat-studio` 模式；
- 完成返回、取消、任务恢复和草稿保护；
- 完成四步工作流 UI；
- 使用本地 mock Provider 验证交互和布局；
- 不接真实重建前，先能加载已有 PLY 进入编辑工作台。

出口：用户可以在两个编辑模式间切换，且不丢失普通场景状态。

### Phase 2：真实重建 Provider

- 完成输入文件上传或本地 Companion 通道；
- 接入 FFmpeg / FFprobe；
- 接入 COLMAP；
- 接入 Brush 或等价训练器；
- 实现进度事件、日志、取消、失败重试和阶段恢复；
- 输出 `project.json`、`state.json`、`final.ply` 和质量报告；
- 增加资源清理和磁盘空间保护。

出口：从视频或序列帧到可预览 PLY 的端到端任务成功率达到验收标准。

### Phase 3：Gaussian 编辑

- 第一阶段复用 Three Viewer 完成浏览、Transform、裁切；
- 需要逐点编辑时接入 PlayCanvas 独立工作台；
- 实现非破坏式编辑修订；
- 实现 deletion mask 的持久化和校验；
- 实现 edit PLY 原子导出；
- 实现大模型加载失败、WebGL / WebGPU 回退和资源释放。

出口：编辑后结果可以恢复、撤销、导出，原始输出不被覆盖。

### Phase 4：导入虚境场景

- 生成 Capture Package；
- 映射 `scene.base`；
- 接入 Collider GLB / GLTF；
- 接入 LOD 和 chunk；
- 做坐标校准和底座变换；
- 主 Viewport 加载结果；
- 实体对象可在 Collider 上放置、移动、约束；
- 发布检查识别未绑定 Collider、临时 URL 和缺失 LOD。

出口：完成“视频 → 高斯底座 → Collider → 实体对象 → 试玩”的闭环。

### Phase 5：生产化和协作

- 远程 GPU Provider；
- 对象存储和资产权限；
- 项目级任务历史和版本；
- 单人 Gaussian 编辑锁；
- 质量报告、版本对比和回滚；
- SOG / SPZ 预览资产和分块加载；
- 多设备兼容和大场景性能优化。

---

## 13. 验收标准

### 13.1 入口和模式

- 右侧空间底座卡片同时提供“创建空间底座”和“上传已有文件”；
- 点击后进入独立高斯场景工作台；
- 可返回场景创作模式；
- 返回不丢失普通场景的选择、对象、时间线和草稿；
- 工作台关闭时释放 Viewer、Worker、Blob URL 和事件监听。

### 13.2 生成

- 支持视频和图片序列；
- 显示分析结果、质量档位、预计耗时和 GPU 状态；
- 能看到抽帧、特征、匹配、重建、训练和校验阶段；
- 支持取消、失败重试和可恢复任务；
- 原始素材和中间文件有明确的存储位置和清理入口；
- 任务完成后提供 PLY / SOG / SPZ 资产信息和质量报告。

### 13.3 编辑

- 可浏览高斯场景并适配模型边界；
- 支持 Transform、视角切换和裁切；
- 编辑状态可撤销重做；
- 原始 `final.ply` 不被覆盖；
- 导出失败不会破坏原始结果；
- PLY 格式不兼容、模型过大或显存不足时有明确提示。

### 13.4 导入

- 可以把当前结果保存为资源或应用为主底座；
- `scene.base.sog_url` 和 Capture Package 引用一致；
- Collider 可单独绑定 GLB / GLTF；
- 无 Collider 时不会伪装成精确碰撞；
- 底座能在主 Viewport 中重新加载；
- 实体对象可以使用现有 Collider 约束和落点检测；
- 发布检查能识别临时 URL、缺失资源、底座加载失败和坐标信息缺失。

### 13.5 设计系统

- 新页面的颜色、间距、字号、圆角和阴影来自既有 Token；
- 不复制 OOOSplat 的 Logo、品牌色、产品名称和深色产品皮肤；
- 所有纯图标按钮可访问；
- 加载、错误、空状态、禁用和恢复状态完整；
- 视口仍然是页面的视觉重点。

---

## 14. 性能和安全要求

### 14.1 性能

- 不在 Yjs 或场景 JSON 中存储大文件；
- 大于浏览器能力的 PLY 必须在任务开始或预览前给出提示；
- 主 Viewport 和工作台切换时必须释放旧的排序 Worker、纹理、Geometry 和 Blob URL；
- 优先使用 SOG / SPZ、LOD 和 chunk 降低 Web 端加载压力；
- 任务日志限制前端内存长度，完整日志存服务端或本地项目目录；
- 预览编辑和导出使用异步队列，不能阻塞主线程；
- CPU 读取 PLY 只作为导出和降级方案，GPU 选择应放入 Renderer / Processor。

### 14.2 安全

- 远程任务必须绑定用户、项目和资产权限；
- 本地 Companion 不允许任意路径读写，使用任务级目录和路径白名单；
- 不允许把绝对本地路径写入可协作的场景 JSON；
- 远程 Worker 必须鉴权，不能直接暴露当前无鉴权的本地 Worker 协议；
- 任务取消后清理临时素材、源文件副本和失败中间文件；
- 上传视频、图片和 PLY 做大小、类型、数量和磁盘配额校验；
- 对用户输入的文件名、命令参数和 URL 做白名单处理，禁止字符串拼接执行命令。

---

## 15. 开源与品牌合规

OOOSplat 仓库声明使用 Apache License 2.0，同时包含 FFmpeg、COLMAP、Brush、PlayCanvas 等第三方组件及相应许可证文件。

当前只做方案设计，未复制 OOOSplat 源码。后续若复用代码或直接引入其模块，必须：

1. 保留 Apache-2.0 License 和版权声明；
2. 对修改过的文件添加修改说明；
3. 保留 `NOTICE` 和第三方许可证信息；
4. 按实际引入的依赖补充 `THIRD_PARTY_NOTICES`；
5. 不使用 OOOSplat 产品名称、Logo、图标作为虚境自身产品品牌；
6. 对外文档可以说明“参考 / 基于 OOOSplat 的兼容实现”，但不得暗示 ooolabdev 对虚境产品背书；
7. 对 FFmpeg、COLMAP、Brush 的分发方式、动态库、GPU Runtime 和安装包合规单独做法务审查；
8. 对生成的高斯模型，继续要求用户确认输入视频、图片、人物和场景内容的版权、隐私和肖像权。

---

## 16. 最终建议

推荐的产品和技术路线是：

```text
先新增「空间底座工作台」模式
  → 先接已有 PLY / SOG 做浏览、Transform 和裁切
  → 再接本地 Provider 跑视频 / 序列帧重建
  → 再补 Gaussian GPU 选区和非破坏式编辑
  → 最后接 Collider、LOD、坐标、协作和远程 GPU
```

不要从“把 OOOSplat 页面搬进来”开始，而要从虚境自身的数据闭环开始：

```text
采集素材
  → 生成 Capture Package
  → 编辑 Gaussian 视觉底座
  → 绑定 Collider 和坐标
  → 应用到 scene.base
  → 布置实体互动
  → 试玩与发布
```

第一期的成功标准不是“界面看起来像 OOOSplat”，而是：

> 用户可以从一段视频或一组序列帧开始，在虚境中得到一个可编辑、可校准、可绑定碰撞体、可继续布置互动内容的真实空间底座。


## 12. 2026-10-03 状态同步

Provider 契约、Worker 任务链路和工作台基础已在客户端存在；本轮未自动引入新的 Gaussian 二进制或外部重建器。

可以直接继续的工作：

- 使用现有 PLY 和本地 Worker 做输入分析、任务状态、失败/取消/恢复和结果引用验收；
- 在配置 `XIYOU_ENGINE_DIR` 后联调真实 FFmpeg / COLMAP / Brush 链路；
- 补本地 Release Server 作为开发期结果交付；
- 继续补 asset manifest、checksum、Collider/LOD 发布检查。

需要用户/部署环境提供：

- 已验证的 COLMAP / Brush / FFmpeg 引擎目录，或 `XIYOU_RECONSTRUCTOR_BIN`；
- 真实结果资产（PLY/SOG/SPZ/Collider）及可持久化 URL；
- 坐标系、尺度和 VPS/localize 坐标约定。
