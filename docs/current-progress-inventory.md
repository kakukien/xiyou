# 当前项目进度与资产盘点

> 盘点日期：2026-10-03  
> 当前工作分支：`codex/feature-fixes-audit-tests`  
> 基线提交：`ff38cb0`  
> 说明：本文件只记录当前工作区和本机可见资料，不把其他项目资产自动视为本项目已接入资产。

## 1. Git 与工作区状态

- `master`、`codex/product-strategy-editor`、`codex/feature-fixes-audit-tests` 当前都指向 `ff38cb0`。
- 本轮大量修改仍在 `codex/feature-fixes-audit-tests` 的未提交工作区中。
- 因此“其他对话中做过的资产”如果没有出现在当前仓库、当前工作区文件或可访问 URL 中，不能被代码自动发现。
- 当前没有发现另一个包含猴子、坦克、汽车等资产提交的 Git 分支或 commit。

## 2. 当前仓库已确认的资产

### 已在 `editor/public/` 中

| 类型 | 当前资产 | 状态 |
|---|---|---|
| Gaussian / PLY | `assets/hks204606.compressed.ply` | 已在仓库，可作为高斯底座候选 |
| GLB | `assets/xiyou_world.glb` | 已在仓库，体素故事空间 |
| AR 图像 | `assets/poster.mind`、`assets/poster.png` | 已在仓库，可用于图像锚点演示 |
| 现场图片 | `site/f01.jpg`、`f05.jpg`、`f09.jpg`、`f13.jpg`、`f17.jpg`、`f21.jpg`、`f25.jpg`、`f28.jpg`、`floor.jpg`、`speakers.jpg` | 已在仓库 |
| 视频 | `site/clip.mp4` | 已在仓库 |
| 特效 | `fx/*.png`、`fx/sky_*.jpg` | 已在仓库 |
| MindAR / Three vendor | `vendor/mindar/*`、`vendor/three-legacy/*` | 已在仓库 |

### 当前仓库没有确认的资产

- 猴子/悟空 GLB；
- 坦克 GLB；
- 汽车 GLB；
- 箱子/宝箱高精度 GLB；
- 可用于正式发布的持久化资产 URL；
- 项目专用 TTS 音色和 STT 服务配置；
- 可直接作为生产 VPS 数据库的定位服务地址。

当前固定元素目录的 124 项主要是程序化预制体和互动声明，不等于 124 套真实高模资产已经交付。

## 3. 本机其他项目中发现的候选资产

在 `/Users/lex/Code/ProjDev/travel_route_app/ios/travelroute/travelroute/Resources/3DModels/` 发现了 `car.glb`、`supercar.glb`、`truck.glb`、`jeep.glb`、`suv.glb` 等车辆模型。

这些文件**没有自动复制或接入本项目**，原因是：

1. 它们属于另一个项目；
2. 当前无法仅凭文件名确认授权和使用范围；
3. 复制二进制会改变当前工作区范围；
4. 还需要确认坐标、材质、纹理依赖和 Runtime 许可证。

如果这些就是你说的“汽车资产”，请明确回复允许复用，并最好指定允许使用的文件列表。

## 4. 当前可直接继续完成的工作

### 可以直接做，不需要你提供外部服务

1. **本地 Release 验收服务**：已加入 `tools/release-server.mjs`，支持本地 `health`、Release JSON 上传和下载；
2. **固定元素完整映射**：继续把 124 项的 Profile 映射到可配置触发器、状态和 Runtime 动作；
3. **Editor/Runtime 互动一致性**：继续补齐 collect、state、score、leave、collision 近似、spawn 临时实例；
4. **本地 AI Provider contract**：继续补 mock Provider、非法 JSON、超时、错误和 fallback 测试；
5. **资产清单与发布校验**：扫描已登记资源，补 `assetId`、checksum、临时 URL 和缺失文件检查；
6. **本地 Release → 手机同网验收**：使用本地 Release Server，让手机通过局域网地址加载 JSON；
7. **文档同步**：继续更新 README、变更记录、Gaussian Provider、协作和 Runtime 文档的状态段落。

### 需要你提供后才能完成生产联调

| 事项 | 需要提供 |
|---|---|
| 真实模型 Provider | endpoint、协议（OpenAI-compatible/其他）、模型名、是否允许服务端代理 |
| 服务端 AI | 部署地址、鉴权方式、API Key/环境变量名、结构化 JSON 协议 |
| STT | 选择浏览器 SpeechRecognition、Whisper 本地服务或第三方 STT；若第三方需 endpoint、Key、语言和音频格式 |
| TTS | 是否需要 AI 回复朗读；需要 voice、语言、endpoint、Key 和是否保存音频 |
| 对象存储 | S3/OSS/COS/R2 等服务、bucket、上传签名 API、CDN 域名 |
| Release API | 发布域名、GET/POST API、鉴权、版本切换和二维码入口格式 |
| 实时协作 | WebSocket 服务地址、房间鉴权、Yjs 持久化方式 |
| VPS | `/localize` 地址、请求/响应示例、坐标系和误差阈值 |
| 真机验收 | iOS/Android 机型、浏览器、测试地点、海报或图像锚点 |
| 外部 3D 资产 | 文件路径/URL、许可证、纹理依赖、坐标系、碰撞体、LOD |
| 共享游客状态 | 是否需要跨用户共享分数/箱子状态、用户身份、Session 过期规则 |

## 5. TTS / STT 澄清

- **STT（Speech-to-Text）**：用户说话 → 文字 → AI 意图。当前浏览器端已支持基础 `SpeechRecognition`，但跨浏览器和移动端稳定性不足。
- **TTS（Text-to-Speech）**：AI 文字回复 → 语音播放。当前项目还没有生产 TTS 链路。
- 两者不是同一个服务：如果只要语音输入，需要 STT；如果要 AI 用声音回复，还需要 TTS。
- 第一阶段建议：浏览器 STT + 文字回复；第二阶段再接服务端 STT/TTS，避免把 API Key 放在浏览器。

## 6. 不能凭现有文件宣称完成的内容

- 找到本机另一个项目中的 `car.glb` 不等于本项目已接入汽车资产；
- 目录中有 `tank` / `monkey` 的程序化占位不等于有真实高模；
- `runtime.html?room=demo` 能在同一浏览器读到 localStorage 不等于跨设备发布；
- Release JSON 下载不等于对象存储和发布 API；
- 浏览器 SpeechRecognition 可用不等于生产 STT；
- 距离阈值 collision 不等于真实物理碰撞。
