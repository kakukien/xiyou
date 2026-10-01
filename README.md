# xiyou-ar · 西游·虚境 AR 空间编辑器

黑客松 24h 项目（PRD：`../黑客松-AR空间编辑-PRD.md` + `../黑客松-PRD-程序版.yaml`）。

## 本轮已落地

UE 式布局的 Web 编辑器（`editor/`，Vite + Three.js，瓷白+橙光主题）：

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

## 还没做（留给现场/下轮）

- 真实 SOG 高斯底座加载（`viewport.setBase` 有 stub）
- 四层回退的 2–4 层（撤回单条改动/对象历史/快照）+ 评论钉通知
- 游客端 runtime（8th Wall SLAM + VPS /localize + 海报兜底）—— `runtime/` 空
- GPU worker：重建、视频透明转换（ffmpeg 命令在 PRD §3.3）

## 跑起来

```
cd editor
npm install
npm run dev     # http://127.0.0.1:5199
npm run build   # dist/
```

## 工具

`tools/gpt6.mjs` —— sub.88api.ai 的 gpt-6 驱动（`API88_KEY` 环境变量），`tools/CONTRACT.md` 是模块架构契约，`tools/prompts/` 是各模块生成规格。改模块结构先改 CONTRACT.md 再重新生成。
