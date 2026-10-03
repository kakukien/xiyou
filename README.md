# xiyou-ar · 西游·虚境 AR 空间编辑器

黑客松 24h 项目（PRD：`../黑客松-AR空间编辑-PRD.md` + `../黑客松-PRD-程序版.yaml`）。

## 本轮已落地

UE 式布局的 Web 编辑器（`editor/`，Vite + Three.js，浅色专业空间编辑器主题）：

- 左栏 Outliner：剧情树（章节>节点，含四项交接勾）+ 场景对象树（按节点分组、显隐、改名、右键菜单）
- 中栏 Viewport：网格底座 + 现场照片墙占位（底座就绪前按 PRD 用占位）、W/E/R 变换手柄、吸附、锁地面、点击拾取、F 聚焦、右键+WASD 飞行
- 右栏 Details：变换 / 材质 / 命中体 / 交互（「当…时…」句子式触发编辑）、节点属性
- 底栏 Dock：内容浏览器（拖文件入库、拖卡到画布建对象、动作卡）、时间线（轨道/关键帧/播放头）、输出日志
- 顶栏：新建/打开/导出/保存、编辑|试玩切换、预算条、「已替换 x/y」、发布检查（block 拦截 / warn 警告两级）
- 试玩模式：模拟 enter 自动检测 + gaze/hold/tap 按钮 + 节点进度 HUD + 剧情卡 toast
- 预置「花果山觉醒」3 节点验证骨架模板；场景 JSON 导入导出 + localStorage 自动保存 + Ctrl+Z/Y

## 多人协作权限（已上线）

- 三个独立工程房间（互不影响，同房间多人实时协同）：`wukong` / `bajie` / `seng`，访问格式 `?room=<名>&key=<令牌>`，令牌存 `%LOCALAPPDATA%\Hanrenteam\secrets\xiyou_rooms.json`，不入库
- 门禁：服务端 `XIYOU_ROOM_TOKENS`（agentpay `.env.production`），`xiyou_ws.py` 校验 room+key，错/缺拒绝
- 本地存档按房间分键：`xiyou.scene.<room>`；`?reset=1` 只清当前房间
- AI 权限：只能改场景内容（对象/触发器/时间线/节点），`set_base`/素材库/编辑器本身无 op 可达

## AI 对话框（已上线）

- 右下角橙色「AI」按钮 → 聊天面板，自然语言编辑场景（例：「在悟空右边两米放个橙色点光源，点击时弹卡」）
- 链路：页面 → `POST /xiyou-ai/chat`（agentpay app `xiyou_ai.py` 代理，key 存 `.env.production` 的 `SUB88_API_KEY`）→ gpt-6 → `{reply, ops[]}` → `aiops.applyOps` 白名单执行 → 经 Yjs 同步到所有在线端
- 护栏：ops 白名单（建/改/删对象、触发器、时间线、节点、底座）+ 引用别名解析 + 每 op 一条撤销 + 按 IP 40 次/小时限流 + 110s 超时

## 协作（已上线）

- 线上：`https://agentpay.xx.kg/xiyou/`；协作房间 `wss://agentpay.xx.kg/xiyou-yjs/<room>`（默认房间 `demo`，顶栏右侧可改，`?room=` 或 `?ws=` 可覆盖）
- 链路：浏览器 → Cloudflare Tunnel → agentpay app `xiyou_ws.py`（WS 代理）→ `xiyou-collab` 容器（y-websocket-server，xy-net 网络，宿主 127.0.0.1:8022）
- 能力：scene 实体级 CRDT 同步、在线头像/选中态 awareness、软锁提示、Ctrl+Z 走 Y.UndoManager（只撤自己）；四层回退只实现了第 1 层
- 服务器文件：`/www/wwwroot/xiyou-collab/`（容器源码）、`/www/wwwroot/agentpay/app/xiyou_ws.py`、main.py 挂载块备份在 `agentpay/backups/main.py.pre-xiyou-ws-*`；nginx conf 留了 `/xiyou-yjs/` 反代（公网不走它，留作备用路径）

## 本轮剩余目标状态

- 已补齐 Collider 精确网格点内检测缓存：GLB/GLTF 加载后预构建三角形 AABB，拖动对象和相机移动优先走缓存检测；Box Collider 保留回退。
- 已补齐底座分块/LOD 卸载：分块串行异步加载、单块失败隔离、切换 token 防旧请求污染，切换底座时释放 DropInViewer、排序 worker 与 Three.js 资源。
- 已补齐资源替换影响范围：对象引用、主底座、Collider、天空图、LOD 变体、分块 URL 都会列出并同步替换。
- 多人协作客户端已完成正式联调防护：房间/令牌参数、连接状态、重连竞态、远端场景和 zones CRDT 同步均已接入；线上服务器可用性仍需在目标部署环境做最后一次联机验收。
- 游客 Runtime 与 GPU Worker 已补齐：`editor/runtime.html` 支持发布场景加载、相机/方向、WebXR 能力探测、VPS /localize、QR/Barcode、GPS、手动参考点、tap/gaze/hold/enter 触发；`tools/gpu-worker.mjs` 支持媒体分析、透明视频转换、重建抽帧清单和可接入外部 GPU 重建器。


## 游客 Runtime

启动编辑器后打开：

```text
http://127.0.0.1:5199/xiyou/runtime.html?room=demo
```

也可以指定发布场景 JSON：

```text
runtime.html?scene=https://example.com/release.json&release=release_id
```

定位顺序：`VPS /localize`（传入 `?localize=`）→ WebXR AR 能力探测 → QR/Barcode → GPS 粗定位 → 手动参考点。Runtime 会读取当前房间的 localStorage 场景或 `scene` URL，加载底座、对象、区域和互动触发器。

## GPU Worker

无需额外服务即可执行：

```bash
node tools/gpu-worker.mjs analyze --input ./input.mp4
node tools/gpu-worker.mjs convert-alpha --input ./input.mp4 --output ./output.webm
node tools/gpu-worker.mjs prepare-reconstruction --input ./input.mp4 --output ./reconstruction --fps 2 --max-frames 120
node tools/gpu-worker.mjs serve --port 8787
```

Worker HTTP API：`GET /health`、`POST /jobs`、`GET /jobs/:id`、`POST /jobs/:id/cancel`、`POST /jobs/:id/resume`、`GET /jobs/:id/assets` 和资产下载路由。

真实本地重建链路为 `FFmpeg / FFprobe → COLMAP → Brush → final.ply`，不需要远程服务器。设置 `XIYOU_ENGINE_DIR` 指向本地引擎目录，并设置 `XIYOU_ENABLE_BUNDLED_ENGINES=1`（或让 Worker 自动检测到完整引擎）即可启用。也可以设置 `XIYOU_RECONSTRUCTOR_BIN` 接入兼容的自定义重建器。未配置 COLMAP / Brush 时只会生成可复现的 `manifest.json` 和质量报告输入包，不能宣称完成真实 Gaussian 训练。详见 `tools/LOCAL-GAUSSIAN-ENGINES.md`。

完整变更记录与验收项见：`docs/xiyou-editor-change-log.md`。

## 本轮开发文档与审查

- `docs/data-persistence-refresh-diagnosis.md`：打开后数据消失的代码证据、修复和验收；
- `docs/ai-space-interaction-development-plan.md`：AI 对话、语音、Provider 和安全操作协议；
- `docs/scene-runtime-realtime-interaction-plan.md`：创作/场景/试玩、Release、手机定位和实时更新边界；
- `docs/requirements-traceability-and-review.md`：需求追踪、P0 审查结论、开发准入和测试门槛。

本分支已先修复草稿恢复、协作初始覆盖风险、Runtime 构建入口，并落地 AI 计划确认/撤销和固定元素目录基础链路。

当前进度和外部资产盘点见：`docs/current-progress-inventory.md`。当前仓库没有自动接入其他项目中的外部 GLB；跨项目资产需先确认授权、纹理依赖、坐标系和允许复制范围。

本地跨设备 Release 验收服务：

```bash
cd editor
npm run release:serve
# 手机同一局域网访问：runtime.html?scene=http://<电脑局域网IP>:8790/release/<id>.json
```

该服务仅用于开发验收，不是生产 Release API。

## 跑起来

```
cd editor
npm install
npm run dev     # http://127.0.0.1:5199
npm run build   # dist/
```

## 工具

`tools/gpt6.mjs` —— sub.88api.ai 的 gpt-6 驱动（`API88_KEY` 环境变量），`tools/CONTRACT.md` 是模块架构契约，`tools/prompts/` 是各模块生成规格。改模块结构先改 CONTRACT.md 再重新生成。


## 设计系统

- Design Token：`docs/design-tokens.json`（v3.0.0）
- 设计规范：`docs/xujing-editor-design-system.md`
- 视觉方向：参考专业空间编辑器，采用白色工作区、浅灰工具层、冷蓝灰 Viewport 和暖橙语义强调色。
- 资源卡片和“导入素材”卡片统一为 `100 × 112px`，缩略图统一 `56px` 高。
