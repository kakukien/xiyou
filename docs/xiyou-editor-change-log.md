# 造梦 · 故事空间 AR 空间编辑器：完整变更与验收记录

> 截止：2026-10-02。本文汇总项目初始版本、历次提交、本轮编辑器补齐，以及新增的游客 Runtime 和 GPU Worker。源码根目录：`editor/`。

## 1. 项目目标

「造梦 · 故事空间」是一套面向景区/展陈运营人员的 Web AR 空间编辑器：在真实空间重建底座上布置对象、编排剧情节点和时间线、配置区域与触发器，再通过发布版本交付给游客 Runtime。

核心数据源是 `scene` JSON，覆盖：

- `base`：高斯底座、Collider、LOD、分块资源、空间对齐、天空环境；
- `objects`：图片、视频、GLB、点云片段、灯光、组装体；
- `zones`：可编辑区、触发区、禁布区；
- `triggers`：tap / gaze / hold / enter / sequence / node 事件；
- `sequences`：变换、透明度、视频和事件轨道；
- `story`：章节、节点、锚点、节点检查清单；
- `meta.assets` / `meta.releases`：素材引用和发布快照。

## 2. 最初版本：编辑器基础闭环

对应初始提交 `44ed0af`：

- Vite + Three.js 的 UE 式三栏编辑器布局；
- Outliner 剧情树和对象树；
- Viewport 网格底座、对象拾取、聚焦、W/E/R Gizmo；
- Details 变换、材质、命中体、交互配置；
- Dock 内容浏览器、动作卡、时间线、输出日志；
- 场景 JSON 导入/导出、localStorage 自动保存、Ctrl+Z/Y；
- Yjs 协作基础链路；
- AI 对话编辑和白名单 ops 执行；
- 发布检查、预算检查、试玩模式。

初始对象类型包括 `quad`、`video_quad`、`glb`、`splat_segment`、`light`，并以占位资源保证无真实素材时仍可预览。

## 3. 现场内容、视觉和演示场景

### 3.1 视觉与编辑体验

对应 `ef78d84`：

- 统一专业浅色空间编辑器主题；
- 加入半透明、透明贴图、Additive 发光、镂空贴图；
- 扩充「花果山觉醒」演示场景和现场素材缩略图；
- 补齐 Design Token、设计系统文档、组件化图标/按钮/Chip/Empty State。

### 3.2 现场重建占位

对应 `bcbf573`：

- 会场视频抽帧照片墙；
- 舞台、音箱和现场照片对象；
- 本地 blob 素材缩略图；
- 普通视频 Quad（plain video）支持；
- 顶栏「演示」按钮可载入完整演示场景。

### 3.3 AI 生成 3D 与特效

对应 `22ee4a5`：

- `compound` 组装体和多种基础几何部件；
- nebula / flame / sigil / holo / ripple 等动态 Shader；
- 天空穹顶、天空图和环境颜色；
- AI 场景编辑操作扩展到材质、特效、天空和对象；
- 渲染容错，单对象失败不阻塞编辑器。

## 4. 游客视角、时间线和编辑器打磨

### 4.1 游客视角基础能力

对应 `ab29433`：

- 摄像头背景；
- 陀螺仪方向；
- 无陀螺仪时拖动视角；
- 点击对象触发 tap；
- 地理位置显示；
- 剧情卡片、粒子和 PIL 特效素材。

### 4.2 存档和演示场景

对应 `80fdf68`：

- 场景存档键升级为 `xiyou.scene.v2.<room>`；
- `reset=1` 只清当前房间；
- 演示场景强制载入最新结构；
- 视口标签限制最近对象，避免遮挡和糊屏。

### 4.3 时间线和编辑面

对应 `807ba73`：

- 预设动作改为对象绝对坐标，避免飞入时先瞬移到原点；
- 关键帧可拖动；
- 变换关键帧支持 P/R/S 分轴编辑；
- 播放头可拖动并实时预览；
- compound 组装体支持统一材质编辑；
- 节点点击可定位到关联对象。

### 4.4 3GS 底座、锚点和语音

对应 `d85266f`：

- 3GS / PLY / SOG / SPZ 等底座加载方向；
- 锚点放置、编辑、节点绑定；
- AI 语音输入；
- 内容浏览器、详情面板、时间线面板重新整理；
- Viewport Chrome 工具栏、顶视/摄像机视图、框选、锁地面、迷你地图。

## 5. 本轮编辑器功能补齐

本轮在已有工作区未提交改动上继续补齐以下闭环。

### 5.1 区域模型

- 新增 `zones` 场景集合；
- 支持 `editable`、`trigger`、`forbidden`；
- 区域显示/隐藏；
- 区域锁定；
- 区域范围编辑；
- 区域拾取、聚焦、Gizmo 拖动；
- 对象绑定区域；
- 禁布区拦截对象放置；
- 可编辑区域限制对象落点；
- 删除区域时自动解除对象区域引用。

### 5.2 区域触发参数

Details 的交互面板直接编辑：

```json
{
  "when": "enter",
  "params": { "radius": 2 }
}
```

以及：

```json
{
  "when": "gaze",
  "params": { "secs": 1 }
}
```

```json
{
  "when": "hold",
  "params": { "secs": 1 }
}
```

运营人员不再需要手动编辑 JSON。

### 5.3 发布版本

- 创建发布快照；
- 发布恢复；
- 发布版本差异；
- 对象、区域、资源的新增/删除/修改统计；
- 差异列表中的对象 ID、区域 ID 可点击定位；
- 当前不存在的实体显示为禁用态；
- 发布检查 block / warn 支持点击定位。

### 5.4 底座分块与 LOD

- 底座主资源和分块资源；
- 分块 LOD 变体；
- 当前 LOD；
- 串行异步分块加载；
- 单分块失败不阻塞其余分块；
- 当前加载数、百分比、LOD、失败数；
- 顶栏 Tooltip 显示具体失败分块与错误；
- LOD 距离切换；
- 底座切换释放旧 DropInViewer、Splat Mesh、排序 Worker、Geometry、Material、Texture；
- load token 防止旧请求在新底座上写入状态。

### 5.5 Collider 与空间约束

- GLB / GLTF Collider；
- Box Collider；
- Collider 可视化；
- Collider 精确三角形点内检测；
- 三角形 AABB 缓存，减少重复扫描；
- 资源落点优先投射到 Collider；
- 相机移动受底座 Collider 和禁布区约束；
- 对象 Gizmo 拖动受底座、禁布区、所属区域约束；
- 锁定区域禁止移动。

### 5.6 素材替换影响范围

`store.assetReferences(assetId)` 会扫描：

- 所有对象的 asset ID / URL；
- `base.sog_url`；
- `base.collider_url`；
- `base.env.sky.image`；
- `base.lod.urls.*`；
- `base.chunks[*].url`；
- `base.chunks[*].lod.*`。

替换时显示完整影响数量，并同步更新 URL 引用。

### 5.7 协作

- zones 加入 Yjs 实体集合；
- 协作状态支持 connected / connecting / disconnected；
- 房间和令牌参数；
- 连接 generation token，避免重复连接竞态；
- 远端场景、区域、选中态和软锁继续沿用现有链路。

## 6. 新增：游客 Runtime

文件：

- `editor/runtime.html`；
- `editor/src/runtime/main.js`；
- `editor/src/runtime/style.css`。

访问：

```text
/xiyou/runtime.html?room=demo
/xiyou/runtime.html?scene=https://example.com/release.json&release=release_id
```

功能：

- 读取当前房间 localStorage 场景；
- 通过 `scene` URL 加载外部发布 JSON；
- 通过 `release` 选择发布快照；
- 加载对象、GLB、图片、视频、compound、灯光；
- 加载 SOG/PLY/SPZ 等 DropInViewer 底座；
- 相机背景与移动端安全区布局；
- WebXR immersive-ar 能力探测；
- `?localize=` 调用 VPS /localize 接口；
- QR/BarcodeDetector 探测；
- GPS 粗定位；
- 手动参考点兜底；
- tap / gaze / hold / enter；
- 播放发布场景中的序列动作；
- 剧情卡、奖励卡、高亮、显隐、节点跳转；
- 无相机预览模式；
- 无陀螺仪时拖拽浏览。

Runtime 不依赖编辑器 UI，不会把游客状态写回编辑器场景。

## 7. 新增：GPU Worker

文件：

- `tools/gpu-worker.mjs`；
- `editor/scripts/gpu-smoke.mjs`。

### 7.1 媒体分析

```bash
node tools/gpu-worker.mjs analyze --input input.mp4
```

输出视频宽高、编码、帧率、时长、帧数、像素格式和文件大小。

### 7.2 透明视频转换

```bash
node tools/gpu-worker.mjs convert-alpha \
  --input input.mp4 \
  --output output.webm \
  --color-key 0x00ff00
```

使用 FFmpeg `colorkey + yuva420p + VP9` 输出 WebM Alpha，供 `video_quad` 透明素材使用。

### 7.3 重建前处理与 GPU 接入

```bash
node tools/gpu-worker.mjs prepare-reconstruction \
  --input reconstruction.mp4 \
  --output reconstruction-job \
  --fps 2 \
  --max-frames 120
```

输出：

- 抽帧目录；
- 每帧 SHA-1；
- `manifest.json`；
- 重建任务来源、采样率、帧数和后续处理说明。

设置：

```bash
export XIYOU_RECONSTRUCTOR_BIN=/path/to/gaussian-reconstructor
```

设置后 Worker 会调用外部 GPU Gaussian Splat 重建器，约定输入 `--input <job-dir> --output <job-dir>/scene.sog`。未设置时仍完成可复现的准备任务，不伪造“已完成重建”。

### 7.4 HTTP Job API

```bash
node tools/gpu-worker.mjs serve --port 8787
```

- `GET /health`；
- `POST /jobs`：`{"type":"analyze|convert-alpha|prepare-reconstruction","payload":{...}}`；
- `GET /jobs`；
- `GET /jobs/:id`。

支持队列、并发上限、任务状态、失败原因和结果记录。

## 8. 文件与模块变更索引

### 核心

- `editor/src/core/schema.js`：scene schema、zones、publish check、budget；
- `editor/src/core/store.js`：CRUD、历史、批处理、发布、差异、资源影响范围；
- `editor/src/core/viewport.js`：底座、分块、LOD、Collider、区域约束、释放；
- `editor/src/core/playback.js`：触发器和序列播放；
- `editor/src/core/collab.js`：Yjs 协作和连接状态；
- `editor/src/core/objects.js`：对象工厂、材质、特效；
- `editor/src/core/templates.js`：演示场景、动作卡、互动模板；
- `editor/src/core/aiops.js`：AI ops 白名单和场景摘要。

### UI

- `editor/src/ui/topbar.js`：发布、版本、底座进度、Runtime 入口；
- `editor/src/ui/details.js`：区域、Collider、LOD、分块、触发参数；
- `editor/src/ui/dock.js`：资源影响范围、资源替换、时间线；
- `editor/src/ui/outliner.js`：区域和对象树；
- `editor/src/ui/presence.js`：协作房间、在线状态、软锁；
- `editor/src/ui/vpchrome.js`：Viewport 工具层；
- `editor/src/style.css`：工作台、Runtime 之外的编辑器视觉系统。

## 9. 验证记录

已执行：

```text
JavaScript syntax check: OK
npm run test:smoke: OK
npm run test:gpu: OK
npm run build: OK
git diff --check: OK
```

Build：

```text
vite v5.4.21
✓ 70 modules transformed
✓ built successfully
```

Smoke 覆盖：

- 分块配置；
- 资源替换和对象/底座引用迁移；
- 发布版本创建、恢复、差异；
- 区域触发参数；
- 批量 undo/redo；
- 演示场景初始化。

GPU Smoke 覆盖：

- FFmpeg 生成测试视频；
- Worker 视频分析；
- VP9 Alpha 转换；
- 抽帧和重建 manifest；
- 帧数、输出文件和 manifest 校验。

## 10. 仍需部署侧确认的事项

这些不是本地功能空缺，而是接入真实生产环境前的验收项：

1. 配置真实 `?localize=` VPS 服务，并确认返回坐标系与编辑器坐标系一致；
2. 在具备相机权限的 iOS/Android 真机上验证 WebXR、方向权限和 QR fallback；
3. 将 `XIYOU_RECONSTRUCTOR_BIN` 接到实际 GPU 重建服务，并约定模型/输出格式；
4. 在目标公网域名确认 WebSocket 反代、房间令牌和 Yjs 服务；
5. 用真实大体积 SOG/GLB 做显存峰值与长期运行测试。


## 8. 当前分支进度盘点（2026-10-03）

当前工作在 `codex/feature-fixes-audit-tests` 未提交工作区进行。已落地：

- 草稿加载保护、备份恢复、协作初始同步保护和 Runtime 多页面构建；
- Editor AI 计划确认、原子执行、撤销、实例歧义选择、Provider endpoint 配置；
- 124 项固定元素目录、程序化预制体、voice token、编辑器添加和 Runtime 临时添加；
- Runtime Session 状态、收集/分数/状态切换/离开区域/距离碰撞近似/临时生成；
- Release payload、Release JSON 下载和开发用本地 Release Server。

当前仓库中实际可确认的二进制资产包括 PLY、`xiyou_world.glb`、海报、现场图片、现场视频和 FX 贴图。当前仓库没有确认猴子、坦克、汽车专用 GLB；其他项目中的模型不能在未确认授权和依赖前自动接入。

仍需外部输入才能完成生产联调：AI/STT/TTS 服务地址和鉴权、对象存储、Release API、VPS/localize、Yjs 持久化、真机和场地信息。
