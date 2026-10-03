# 西游·虚境：商用化账号、工作空间与多人协作开发方案

> 版本：v1.0
>
> 状态：开发设计文档；客户端 Draft/Yjs 基础已存在，账号、服务端鉴权、持久化和正式发布仍未实施
>
> 适用项目：`xihack-xian-proj/editor`
>
> 目标并发：单个项目同时在线编辑 5～10 人以内
>
> 文档目标：把当前“`room + key + WebSocket` 的演示协作”升级为可上线使用的“账号/邀请/权限/项目/实时协作/持久化”完整链路。

---

## 1. 先说结论

### 1.1 `localhost` 只适合开发，不是商用协作方案

当前本地开发模式是：

```text
本机浏览器
  ├─ http://127.0.0.1:5199     Vite 开发服务器
  └─ ws://本机:8022             本地协作 WebSocket 服务
```

这种模式只有当前电脑可以方便访问。其他人无法直接依赖你的 `localhost`，因为：

- `localhost` 对每个人来说都指向他自己的电脑；
- 你的电脑关机、网络变化或进程退出后，服务就不可用；
- 没有正式的账号、项目、权限和数据持久化；
- 不适合把编辑器地址交给客户或团队长期使用。

### 1.2 商用版本需要“长期在线的服务端”，但不一定只有一台服务器

至少需要以下长期在线的服务：

```text
浏览器
  → HTTPS 网站服务
  → API 服务：登录、工作空间、项目、成员、权限、邀请
  → WebSocket 协作服务：Yjs 实时同步
  → 数据库：用户、项目、权限、版本、审计记录
  → 对象存储：图片、视频、GLB、高斯底座、Collider 等大文件
```

对当前 5～10 人的规模，**MVP 完全可以先部署在一台云服务器上**，例如通过 Docker Compose 运行：

```text
Caddy/Nginx
├─ 静态前端 dist/
├─ API 容器
├─ y-websocket 协作容器
├─ PostgreSQL
└─ 备份任务
```

但从产品架构上，不应该把“用户电脑上的 localhost”当作协作服务器，也不应该把“房间令牌”当作正式的用户权限系统。

### 1.3 推荐的最终用户体验

```text
用户打开 https://app.example.com
  → 注册/登录
  → 进入自己的工作空间
  → 查看有权限的项目
  → 打开某个项目
  → 连接该项目的实时协作房间
  → 多人同时编辑
```

也支持直接打开项目地址：

```text
https://app.example.com/workspaces/ws_123/projects/prj_456
```

如果用户没有权限：

```text
无权限
  → 申请加入
  → 项目管理员收到待审批申请
  → 管理员批准并选择角色
  → 用户刷新或自动进入编辑器
```

也支持邀请链接：

```text
https://app.example.com/invite/inv_xxxxxxxxx
```

邀请链接只负责“邀请/申请加入”，不能直接替代长期账号身份和项目权限。

---

## 2. 当前实现审计

### 2.1 当前已经具备的能力

当前项目已经有实时协作的核心技术基础：

- `editor/src/core/collab.js` 使用 `Y.Doc`；
- 使用 `y-websocket` 的 `WebsocketProvider`；
- 场景按 `objects`、`sequences`、`triggers`、`chapters`、`anchors`、`zones`、`base`、`meta` 分桶同步；
- 使用 Yjs Awareness 同步在线用户、颜色、选中对象；
- 已有软锁提示：其他人选中对象时提示“正在编辑此对象”；
- 协作撤销使用 `Y.UndoManager`，目标是只撤销自己的操作；
- `editor/src/ui/presence.js` 已有房间输入、连接状态和在线人数；
- 顶栏可以复制带房间参数的地址；
- 线上协作地址已经存在：

```text
wss://agentpay.xx.kg/xiyou-yjs
```

### 2.2 当前实现的连接方式

当前客户端的关键逻辑是：

```js
new WebsocketProvider(url, room, doc, {
  connect: true,
  params: { key }
})
```

也就是：

```text
浏览器
  → room = demo / wukong / bajie / seng
  → key = 查询参数或 localStorage
  → y-websocket 服务器
```

当前 `room` 是协作隔离单位，`key` 是服务端门禁参数。

### 2.3 当前实现还不是正式的账号/权限体系

当前方式存在以下问题：

1. **房间名由客户端提供**：用户可以直接输入任意 `room`。
2. **权限不绑定用户**：服务器主要校验 room/key，无法完整知道“这个人是谁”。
3. **key 可能出现在 URL 中**：URL 可能被浏览器历史、日志、截图或转发泄露。
4. **复制链接没有完整处理 key**：当前顶栏复制逻辑主要复制 `room`，而 `presence.js` 才从 URL 读取 `key`。如果没有额外处理，发给他人的链接可能打不开协作连接。
5. **本地存档仍然是主要兜底**：`main.js` 按房间使用 `localStorage`，例如 `xiyou.scene.v2.<room>`。
6. **当前看到的服务端是否持久化 Yjs 文档并不明确**：如果只运行内存型 WebSocket 服务，重启后可能没有完整房间数据。
7. **软锁不是权限控制**：提示“某人正在编辑”不等于服务器阻止其他人修改。
8. **前端隐藏按钮不等于安全**：即使前端隐藏删除、发布或编辑按钮，用户仍可能直接发送 API 或 WebSocket 请求。

### 2.4 当前代码需要保留和改造的边界

建议保留：

- `Yjs + y-websocket` 作为实时协作底层；
- 场景实体级同步模型；
- Awareness 在线状态；
- 本地开发时的 `room` 调试能力；
- `collab.undo()` / `collab.redo()` 的用户级撤销体验。

需要改造：

- `room` 不再由用户随意输入，而由后端根据 `projectId` 生成；
- `key` 不再作为长期项目密码；
- `localStorage` 不再作为正式数据源；
- 进入编辑器前必须完成登录和项目权限检查；
- WebSocket 连接必须经过服务端鉴权；
- 项目场景必须有数据库/对象存储/快照持久化；
- 协作状态条从“房间输入框”升级为“当前项目 + 在线成员”。

---

## 3. 目标产品模型

### 3.1 核心对象关系

```text
User 用户
  ↓ 成员关系
Workspace 工作空间
  ↓ 包含
Project 项目
  ↓ 包含
Scene 场景文档
  ↓ 使用
Asset 素材、底座、Collider、锚点

Project
  ├─ Members 项目成员
  ├─ Invitations 邀请
  ├─ AccessRequests 加入申请
  ├─ CollabDocument Yjs 协作文档
  ├─ Releases 发布版本
  ├─ AuditLogs 操作记录
  └─ Assets 素材文件
```

### 3.2 工作空间、项目和房间的区别

| 概念 | 用途 | 用户是否直接看到 |
|---|---|---|
| 工作空间 Workspace | 团队、公司或组织的边界 | 是 |
| 项目 Project | 一个景区、活动或空间编辑任务 | 是 |
| 场景 Scene | 项目中的可编辑内容文档 | 通常是项目详情的一部分 |
| 协作房间 Room | Yjs 的实时同步通道 | 不建议直接暴露 |
| 邀请 Invitation | 让用户加入某个工作空间/项目 | 用户看到邀请链接，但不看到内部 room |

推荐规则：

```text
一个 Project 对应一个稳定的 Yjs 协作文档
一个 Yjs 文档对应一个内部 roomName
roomName 不由用户输入，也不作为产品 URL
```

例如：

```text
projectId = prj_8H2...
roomName  = project:prj_8H2...
```

### 3.3 建议的角色

第一版不要设计过多角色，建议先实现以下五种：

| 角色 | 查看项目 | 编辑场景 | 管理素材 | 邀请成员 | 审批申请 | 发布版本 | 管理项目 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ | ✓ | 否 | 否 | 申请发布 | 否 |
| Commenter | ✓ | 评论 | 否 | 否 | 否 | 否 | 否 |
| Viewer | ✓ | 否 | 否 | 否 | 否 | 否 | 否 |

第一阶段可以只开放：

```text
Owner / Admin / Editor / Viewer
```

`Commenter` 可以在评论功能实现时补充。

### 3.4 成员权限和实时连接权限必须分开判断

打开项目需要两次判断：

```text
HTTP API 鉴权：
  用户是否可以看到项目、读取项目配置、上传素材、发布版本？

WebSocket 鉴权：
  用户是否允许加入该项目的实时协作房间？
```

不能因为用户拿到了项目 URL，就默认允许加入 WebSocket。

---

## 4. 推荐的总体架构

### 4.1 MVP 架构

```text
                                  ┌──────────────────────┐
                                  │  PostgreSQL           │
                                  │  用户/项目/权限/版本  │
                                  └──────────▲───────────┘
                                             │
┌──────────────┐      HTTPS       ┌──────────┴───────────┐
│ 浏览器前端    │ ───────────────→ │ API 服务             │
│ Vite dist     │                  │ 登录/项目/权限/邀请  │
│ Three.js      │                  └──────────▲───────────┘
└──────┬───────┘                             │
       │ WSS                                  │ 签发短期 ticket
       ▼                                      │
┌──────────────────────────────┐              │
│ 协作网关 / WebSocket 服务     │ ◀────────────┘
│ 校验 ticket + project 权限    │
│ 转发 Yjs update / awareness   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Yjs 持久化                    │
│ LevelDB / PostgreSQL / 快照   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ 对象存储                      │
│ 图片/视频/GLB/SOG/Collider    │
└──────────────────────────────┘
```

### 4.2 推荐技术方案

结合当前项目，推荐按以下方式增量建设：

| 模块 | MVP 推荐 | 说明 |
|---|---|---|
| 前端 | 现有 Vite + Three.js | 保持纯 ES module 和现有编辑器结构 |
| API | 独立 API 服务 | 可使用 Python FastAPI，和现有 agentpay/Python 体系较容易衔接 |
| 实时协作 | 现有 Yjs + y-websocket | 保留底层，不重新发明 CRDT |
| WebSocket 门禁 | 现有 `xiyou_ws.py` 改造 | 由 room/key 校验升级为短期 ticket + 项目成员校验 |
| 数据库 | PostgreSQL | 用户、成员、项目、邀请、版本、审计记录 |
| 大文件 | S3 兼容对象存储 | 不把视频、GLB、高斯底座放 PostgreSQL |
| 反向代理 | Caddy 或 Nginx | 同时处理 HTTPS、静态文件和 WSS |
| 部署 | Docker Compose 起步 | 5～10 人规模足够；后续再拆服务 |
| 监控 | 基础日志 + 健康检查 + Sentry/同类服务 | 先保证连接失败、API 错误可发现 |

### 4.3 一台服务器是否够用

对于“单个项目 5～10 人同时编辑、项目数量不大”的 MVP：

```text
1 台 2 vCPU / 4 GB RAM 云服务器
+ PostgreSQL
+ API
+ y-websocket
+ Caddy/Nginx
```

通常可以作为起点，但这是容量起点，不是可用性承诺。需要注意：

- 协作消息本身不一定很重，真正占空间的是视频、GLB、高斯底座和 Collider；
- 大文件应放对象存储，不要直接堆在应用容器磁盘；
- PostgreSQL 最好做自动备份；
- Yjs 持久化文件不能只放在临时容器层；
- 服务重启后必须能从持久化数据恢复项目。

正式商业客户较多后，建议拆成：

```text
静态前端/CDN
API 服务
WebSocket 协作服务
托管 PostgreSQL
对象存储/CDN
监控与备份
```

---

## 5. 登录、进入和授权流程

## 5.1 方案 A：账号登录后进入工作空间

```text
1. 用户打开 /login
2. 用户使用邮箱验证码、密码或 OAuth 登录
3. API 返回登录会话
4. 前端请求 /api/me
5. 前端请求 /api/workspaces
6. 用户选择工作空间
7. 前端请求 /api/workspaces/{workspaceId}/projects
8. 用户点击项目
9. 前端请求项目详情和协作 ticket
10. 前端连接 WSS
11. 服务端同步项目场景
```

### 5.2 方案 B：直接打开项目地址

```text
https://app.example.com/workspaces/ws_123/projects/prj_456
```

处理规则：

| 状态 | 行为 |
|---|---|
| 未登录 | 跳转登录，登录后回到原项目地址 |
| 已登录且有权限 | 直接进入编辑器 |
| 已登录但无权限 | 显示无权限，并提供“申请加入” |
| 项目不存在 | 显示项目不存在或已删除 |
| 项目已归档 | 只读或提示项目已归档 |

### 5.3 方案 C：邀请链接

邀请链接建议使用不可猜测的随机 Token：

```text
https://app.example.com/invite/inv_7xK... 
```

打开后：

```text
未登录
  → 登录/注册
  → 登录后继续接受邀请

已登录
  → 查看邀请的工作空间、项目和角色
  → 接受邀请
  → 创建或更新成员关系
  → 跳转项目
```

邀请 Token 必须具备：

- 使用期限，例如 7 天；
- 角色，例如 Editor；
- 可选最大使用次数；
- 可撤销；
- 数据库只保存 Token 的 hash，不保存明文；
- 被接受后可以标记为已使用；
- 不在前端长期保存为项目访问密码。

### 5.4 方案 D：申请加入后由管理员批准

这是用户描述的“给他权限通过之后，他就可以在线编辑”的正式流程：

```text
1. 用户打开项目地址
2. 登录账号
3. API 判断无项目成员关系
4. 用户点击“申请加入”
5. 写入 access_requests
6. 管理员在成员管理页面看到申请
7. 管理员选择角色并批准
8. API 创建 project_members 记录
9. 用户轮询/收到通知
10. 用户重新获取 project access
11. 连接协作 WebSocket
```

第一版可以不做实时通知，用户刷新即可；后续再加站内通知、邮件或 WebSocket 通知。

---

## 6. WebSocket 协作鉴权设计

### 6.1 不建议继续使用长期 `key`

当前方式：

```text
?room=wukong&key=长期令牌
```

适合演示，但不适合商用。问题是：

- 令牌容易转发；
- 无法精确绑定到用户；
- 无法知道是谁修改了内容；
- 无法单独撤销某个成员；
- 不能方便地设置过期时间和项目角色。

### 6.2 推荐使用短期协作 Ticket

用户打开项目后，先通过普通 HTTP API 获取短期 ticket：

```http
POST /api/projects/prj_456/collab-ticket
Cookie: session=...
```

服务端检查：

```text
1. session 是否有效
2. 用户是否属于目标工作空间
3. 用户是否属于目标项目
4. 项目是否允许协作
5. 用户角色是否允许加入编辑房间
```

成功返回：

```json
{
  "ticket": "一次性随机字符串",
  "expiresIn": 60,
  "room": "project:prj_456",
  "wsUrl": "wss://app.example.com/xiyou-yjs"
}
```

前端再连接：

```js
new WebsocketProvider(wsUrl, room, doc, {
  connect: true,
  params: { ticket }
})
```

服务端 WebSocket 网关验证 ticket 后：

```text
ticket → userId → projectId → role → room
```

### 6.3 为什么不直接把登录 Cookie 当作 WebSocket 权限

理论上可以让 WebSocket 握手携带 Cookie，但当前 `y-websocket` 客户端和反向代理链路容易出现：

- 跨域 Cookie 限制；
- SameSite 配置问题；
- 代理转发 Cookie 配置问题；
- 生产环境调试困难。

短期 ticket 更适合当前项目的增量改造：

- API 用正式会话做权限判断；
- ticket 只短时间有效；
- WebSocket 仍然可以沿用 `params`；
- 现有 `xiyou_ws.py` 改造范围较小。

### 6.4 WebSocket 网关必须检查的内容

连接建立时至少检查：

```text
- ticket 是否存在
- ticket 是否过期
- ticket 是否已使用或仍在允许重连窗口
- ticket 对应的 userId
- ticket 对应的 projectId
- userId 是否仍是项目成员
- 用户角色是否允许进入该 room
- room 是否与 projectId 一致
- 项目是否被归档/锁定
```

不能只检查客户端传来的 room：

```text
错误：客户端说 room=project:abc，就直接放行
正确：服务端从 ticket 解析 projectId，再比对 room
```

### 6.5 Viewer 和 Editor 的注意事项

当前 Yjs WebSocket 协议本质上允许客户端发送更新。如果只在 UI 上隐藏编辑按钮，Viewer 仍可能通过改写客户端发送数据。

因此：

- MVP 可以先只开放 `Editor` 进入可写协作房间，`Viewer` 读取项目快照或进入单独只读预览；
- 如果要实现真正的 Viewer，只读客户端建议使用 HTTP 获取场景快照，不给它写入型 Yjs 通道；
- 如果必须让 Viewer 实时看到变化，需要在服务端实现只读订阅或服务端更新过滤，不能只依赖前端 `disabled`。

---

## 7. 数据持久化设计

### 7.1 正式数据源不能继续只有 `localStorage`

当前 `localStorage` 仍然有价值，但只能作为：

- 断线时的本地缓存；
- 最近一次场景的恢复草稿；
- 开发模式的离线兜底。

正式数据源应改为：

```text
项目权限和元数据 → PostgreSQL
场景协作内容 → Yjs 持久化 + 项目快照
大文件 → 对象存储
发布版本 → 不可变快照
```

### 7.2 Yjs 持久化不能默认假设存在

`y-websocket` 负责实时同步，不代表项目一定已经持久化。需要明确配置一种持久化方式：

#### 选项 1：Yjs 服务端 LevelDB

适合单机 MVP：

```text
容器内 y-websocket
  → /data/yjs/<room>
  → 宿主机持久化目录或 Docker volume
```

优点：实现快，适合 5～10 人。

缺点：不适合多实例横向扩展；需要自己备份和恢复。

#### 选项 2：数据库/对象存储快照

定期将 Yjs 文档导出为场景 JSON 快照：

```text
Yjs document
  → 每次重要变更/定时 debounce
  → scene snapshot
  → PostgreSQL 或对象存储
```

优点：方便版本、发布、回滚和审计。

缺点：需要实现快照同步任务。

#### 推荐：两层保存

```text
实时层：Yjs 文档，负责在线协作
持久层：定时场景快照，负责重启、版本、发布、回滚
```

对于当前项目，推荐至少完成：

1. Yjs room 数据持久化；
2. 每隔 5～30 秒或每次稳定变更生成场景 JSON 快照；
3. 点击“发布”时生成不可变 release snapshot；
4. 服务重启时优先从最后快照恢复；
5. 提供手动导出 JSON 作为最后兜底。

### 7.3 场景保存策略

建议将保存状态分为四层：

```text
本地草稿：浏览器 localStorage / IndexedDB
在线协作：Yjs
项目快照：服务器定时保存
发布版本：不可变 Release
```

状态关系：

```text
编辑变更
  → Yjs 实时广播
  → debounce 触发 snapshot
  → snapshot 写入数据库/对象存储
  → 点击发布后生成 release
```

不能在每个键盘输入事件都直接写 PostgreSQL；应使用 debounce 和版本号。

---

## 8. 数据库模型

以下为推荐的最小数据库模型，不要求第一天全部实现，但表关系应提前固定。

### 8.1 `users`

```text
id                  UUID / string primary key
email               unique nullable
phone               unique nullable
display_name        string
avatar_url          string nullable
status              active / disabled
created_at
updated_at
last_login_at
```

### 8.2 `workspaces`

```text
id                  primary key
name                string
slug                unique string
owner_id            users.id
status              active / archived
created_at
updated_at
```

### 8.3 `workspace_members`

```text
workspace_id        foreign key
user_id             foreign key
role                owner / admin / member
status              active / suspended
created_at
updated_at
unique(workspace_id, user_id)
```

### 8.4 `projects`

```text
id                  primary key
workspace_id        foreign key
name                string
slug                string
scene_snapshot_key  object storage key nullable
collab_room         internal unique string
status              active / archived / locked
created_by          users.id
created_at
updated_at
last_snapshot_at
```

`collab_room` 由服务器生成，不允许客户端自定义。

### 8.5 `project_members`

```text
project_id          foreign key
user_id             foreign key
role                owner / admin / editor / commenter / viewer
status              pending / active / suspended / removed
invited_by          users.id nullable
approved_by         users.id nullable
created_at
updated_at
unique(project_id, user_id)
```

### 8.6 `invitations`

```text
id                  primary key
token_hash          unique
workspace_id        foreign key
project_id          foreign key nullable
role                string
invited_by          users.id
email               nullable
expires_at          timestamp
max_uses            integer
used_count          integer
revoked_at          nullable
created_at
```

### 8.7 `access_requests`

```text
id                  primary key
project_id          foreign key
user_id             foreign key
message             text nullable
status              pending / approved / rejected / cancelled
reviewed_by         users.id nullable
reviewed_at         nullable
created_at
updated_at
unique(project_id, user_id, status=pending)
```

### 8.8 `project_releases`

```text
id                  primary key
project_id          foreign key
version              integer
snapshot_key        object storage key
snapshot_hash       string
created_by           users.id
validation_result    JSONB
created_at
unique(project_id, version)
```

### 8.9 `assets`

```text
id                  primary key
project_id          foreign key nullable
workspace_id        foreign key nullable
name                string
kind                image / video / glb / splat / collider / audio
storage_key         string
mime                string
bytes               bigint
checksum            string
metadata            JSONB
created_by          users.id
created_at
updated_at
```

### 8.10 `audit_logs`

```text
id                  primary key
workspace_id        foreign key
project_id          foreign key nullable
user_id             foreign key nullable
action              string
entity_type         string
entity_id           string nullable
payload             JSONB
created_at
```

审计记录不需要记录每个鼠标移动，但应该记录：

- 登录和登出；
- 邀请创建、接受、撤销；
- 成员批准、移除、角色变化；
- 项目创建、归档、删除；
- 发布、回滚；
- 素材上传、删除；
- 权限错误和 WebSocket 拒绝。

---

## 9. API 设计

API 前缀统一为：

```text
/api/v1
```

### 9.1 会话接口

```http
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
POST   /api/v1/auth/request-login-code
POST   /api/v1/auth/verify-login-code
```

如果第一版使用第三方身份认证服务，可以不自己实现密码存储，但 API 层仍建议提供统一的 `/auth/me`。

### 9.2 工作空间接口

```http
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/workspaces/{workspaceId}
PATCH  /api/v1/workspaces/{workspaceId}
GET    /api/v1/workspaces/{workspaceId}/members
PATCH  /api/v1/workspaces/{workspaceId}/members/{userId}
DELETE /api/v1/workspaces/{workspaceId}/members/{userId}
```

### 9.3 项目接口

```http
GET    /api/v1/workspaces/{workspaceId}/projects
POST   /api/v1/workspaces/{workspaceId}/projects
GET    /api/v1/projects/{projectId}
PATCH  /api/v1/projects/{projectId}
POST   /api/v1/projects/{projectId}/archive
GET    /api/v1/projects/{projectId}/members
PATCH  /api/v1/projects/{projectId}/members/{userId}
DELETE /api/v1/projects/{projectId}/members/{userId}
```

### 9.4 加入申请和邀请接口

```http
POST   /api/v1/projects/{projectId}/access-requests
GET    /api/v1/projects/{projectId}/access-requests
POST   /api/v1/access-requests/{requestId}/approve
POST   /api/v1/access-requests/{requestId}/reject

POST   /api/v1/projects/{projectId}/invitations
GET    /api/v1/projects/{projectId}/invitations
POST   /api/v1/invitations/{token}/accept
POST   /api/v1/invitations/{invitationId}/revoke
GET    /api/v1/invitations/{token}
```

### 9.5 编辑器启动接口

建议用一个接口把编辑器需要的启动信息一次返回：

```http
GET /api/v1/projects/{projectId}/editor-session
```

响应示例：

```json
{
  "project": {
    "id": "prj_456",
    "name": "花果山觉醒",
    "status": "active"
  },
  "membership": {
    "role": "editor",
    "canEdit": true,
    "canPublish": false,
    "canManageMembers": false
  },
  "scene": {
    "snapshotVersion": 12,
    "snapshotUrl": "/api/v1/projects/prj_456/scene-snapshot"
  },
  "collab": {
    "enabled": true,
    "wsUrl": "wss://app.example.com/xiyou-yjs",
    "room": "project:prj_456",
    "ticket": "short-lived-ticket",
    "ticketExpiresAt": "2026-10-02T12:00:00Z"
  }
}
```

### 9.6 场景和版本接口

```http
GET    /api/v1/projects/{projectId}/scene-snapshot
PUT    /api/v1/projects/{projectId}/scene-snapshot
GET    /api/v1/projects/{projectId}/releases
POST   /api/v1/projects/{projectId}/releases
GET    /api/v1/projects/{projectId}/releases/{releaseId}
POST   /api/v1/projects/{projectId}/releases/{releaseId}/restore
```

### 9.7 协作 Ticket 接口

```http
POST /api/v1/projects/{projectId}/collab-ticket
```

响应：

```json
{
  "ticket": "opaque-random-value",
  "room": "project:prj_456",
  "wsUrl": "wss://app.example.com/xiyou-yjs",
  "expiresIn": 60
}
```

Ticket 可以存 Redis，也可以在第一版使用带签名的短期 token。若使用数据库，必须设置过期清理。

---

## 10. 前端改造方案

### 10.1 增加统一配置，不再硬编码线上地址

当前代码中存在根据 hostname 判断线上地址的逻辑：

```js
location.hostname === 'agentpay.xx.kg'
  ? 'wss://agentpay.xx.kg/xiyou-yjs'
  : `ws://${location.hostname}:8022`
```

商用化后改为配置驱动：

```js
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  collabUrl: import.meta.env.VITE_COLLAB_URL || '/xiyou-yjs'
}
```

建议新增：

```text
editor/.env.example
VITE_API_BASE_URL=/api/v1
VITE_COLLAB_URL=/xiyou-yjs
VITE_APP_MODE=production
```

开发环境：

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_COLLAB_URL=ws://127.0.0.1:8022
```

生产环境：

```text
VITE_API_BASE_URL=/api/v1
VITE_COLLAB_URL=/xiyou-yjs
```

### 10.2 新增启动流程

当前 `editor/src/main.js` 一启动就：

1. 读取 URL 中的 `room`；
2. 读取本地场景；
3. 挂载编辑器；
4. 自动连接协作房间。

正式版本应改成：

```text
main.js
  → 解析 workspaceId/projectId
  → 获取当前会话
  → 没有登录：显示登录页或跳转登录
  → 有登录：获取 editor-session
  → 无权限：显示无权限/申请加入页
  → 有权限：加载场景快照
  → 获取 collab ticket
  → 挂载编辑器
  → 连接 Yjs
```

伪代码：

```js
async function bootstrap() {
  const route = parseProjectRoute(location)
  if (!route.projectId) {
    mountWorkspaceHome()
    return
  }

  const session = await api.get('/auth/me')
  if (!session.user) {
    redirectToLogin(location.href)
    return
  }

  const editorSession = await api.get(
    `/projects/${route.projectId}/editor-session`
  )

  if (editorSession.status === 403) {
    mountAccessRequestPage(route.projectId)
    return
  }

  await loadProjectSnapshot(editorSession.scene)
  mountEditor({ project: editorSession.project })
  await collab.connect({
    url: editorSession.collab.wsUrl,
    room: editorSession.collab.room,
    ticket: editorSession.collab.ticket,
    user: session.user
  })
}
```

### 10.3 `collab.js` API 改造

当前：

```js
collab.connect({ url, room, user: { name, key } })
```

建议改为：

```js
collab.connect({
  url,
  room,
  ticket,
  user: { id, name, avatar, color },
  role: 'editor'
})
```

不要再由 `presence.js` 读取或生成项目 key。`presence.js` 只负责：

- 显示当前项目名称；
- 显示在线成员；
- 显示连接状态；
- 显示重连和错误；
- 显示当前用户。

### 10.4 生产模式隐藏房间输入框

当前房间输入框适合开发调试，但商用用户不应看到：

```text
房间名：demo
```

生产模式改为：

```text
花果山觉醒 · 3 人在线 · 已连接
```

可以保留一个开发开关：

```text
VITE_APP_MODE=development
```

只有开发模式显示 `room` 调试输入。

### 10.5 本地缓存策略

保留本地缓存，但改成项目维度：

```text
xiyou.scene.cache.<projectId>
```

并明确缓存用途：

```text
- 仅用于断线恢复或首屏草稿
- 从服务器成功同步后覆盖缓存
- 不作为权限判断依据
- 不作为发布版本依据
- 退出项目或切换账号时清理敏感缓存
```

如果场景和资源变大，建议从 `localStorage` 升级到 IndexedDB，避免超过浏览器存储限制。

---

## 11. 服务端改造方案

### 11.1 推荐目录结构

当前仓库没有正式的商用 API 服务目录，建议新增：

```text
server/
├─ app/
│  ├─ main.py
│  ├─ config.py
│  ├─ db.py
│  ├─ models/
│  ├─ schemas/
│  ├─ routers/
│  │  ├─ auth.py
│  │  ├─ workspaces.py
│  │  ├─ projects.py
│  │  ├─ invitations.py
│  │  ├─ access_requests.py
│  │  ├─ editor_session.py
│  │  ├─ collab.py
│  │  ├─ assets.py
│  │  └─ releases.py
│  ├─ services/
│  │  ├─ permission.py
│  │  ├─ invitation.py
│  │  ├─ collab_ticket.py
│  │  ├─ scene_snapshot.py
│  │  └─ audit.py
│  └─ migrations/
├─ tests/
├─ Dockerfile
└─ requirements.txt

infra/
├─ docker-compose.dev.yml
├─ docker-compose.prod.yml
├─ Caddyfile
├─ .env.example
└─ backup/
```

如果最终继续使用现有 agentpay 作为 API 宿主，也应把上述模块按独立路由和服务层组织，不要把账号权限逻辑继续散落在 `main.py` 的临时处理代码中。

### 11.2 权限判断必须集中

新增统一权限函数：

```python
require_workspace_role(user, workspace_id, roles=["owner", "admin"])
require_project_role(user, project_id, roles=["owner", "admin", "editor"])
can_edit_project(user, project_id)
can_publish_project(user, project_id)
```

所有 API 路由和 WebSocket ticket 都调用同一套权限服务，不能每个接口各写一套判断。

### 11.3 服务端永远不信任客户端 role

以下字段不能由浏览器直接决定：

```json
{
  "role": "admin",
  "canPublish": true,
  "projectId": "other-project"
}
```

这些信息必须由服务器根据 session、数据库成员关系和项目状态计算。

---

## 12. 资源上传和大文件处理

当前编辑器使用 `URL.createObjectURL(file)`，这种 URL 只在当前浏览器有效，不适合多人和正式发布。

### 12.1 正确上传流程

```text
1. 前端选择文件
2. POST /assets/upload-url
3. API 检查用户是否有素材上传权限
4. API 返回对象存储的 signed URL
5. 浏览器直接上传到对象存储
6. 前端 POST /assets/complete
7. API 写入 assets 表
8. 场景对象引用 assetId，而不是本地 blob URL
9. 其他协作者通过 assetId 获取统一 URL
```

### 12.2 场景中应该保存什么

不要保存：

```json
{
  "url": "blob:http://localhost/..."
}
```

应该保存：

```json
{
  "asset": "asset_123",
  "url": "https://cdn.example.com/assets/asset_123/original.glb"
}
```

正式场景最好只保存 `assetId`，展示时由 API 或资源服务解析 URL，避免替换域名时批量改场景文档。

### 12.3 大文件分类

建议对象存储承载：

- 高斯底座和分块文件；
- Collider；
- LOD 文件；
- GLB/GLTF；
- 图片和视频；
- 音频；
- 发布包和历史快照。

应用服务器只处理：

- 元数据；
- 上传授权；
- 引用关系；
- 校验结果；
- 权限和生命周期。

---

## 13. 协作数据和发布版本

### 13.1 Yjs 文档只代表“当前草稿”

建议将状态明确分成：

```text
Draft 当前协作草稿
Release 已审核发布版本
Archive 历史归档版本
```

多人实时编辑修改的是 Draft。点击发布后：

```text
Draft
  → publishCheck
  → 生成 JSON snapshot
  → 记录 release version
  → 可供 Runtime 或下载使用
```

### 13.2 发布流程

```text
1. Editor 完成编辑
2. 运行场景结构检查
3. 运行资源引用检查
4. 运行性能预算检查
5. 生成预览结果
6. Editor 提交发布申请
7. Admin/Owner 审核
8. 生成不可变 release
9. 记录发布人、时间、版本和检查结果
10. 支持回滚到上一版本
```

如果当前阶段不需要复杂审核，可以先让 Owner/Admin 直接发布，Editor 只能提交申请。

### 13.3 自动保存和发布不能混为一谈

```text
实时协作保存 ≠ 发布

实时协作保存：让团队不丢编辑过程
发布版本：让游客端/客户端拿到稳定版本
```

---

## 14. 部署方案

### 14.1 本地开发环境

```text
浏览器
  → Vite :5199
  → API :8000
  → y-websocket :8022
  → PostgreSQL :5432
  → MinIO（可选）
```

启动方式示例：

```bash
# 前端
cd editor
npm install
npm run dev

# API
cd server
uvicorn app.main:app --reload --port 8000

# 协作服务
# 使用 docker compose 或 node 服务启动 y-websocket
```

### 14.2 单服务器 MVP 环境

```text
https://app.example.com/xiyou/
https://app.example.com/api/v1/...
wss://app.example.com/xiyou-yjs
```

反向代理路由：

```text
/xiyou/        → 静态前端 dist/
/api/v1/       → API 容器 :8000
/xiyou-yjs     → WebSocket 协作服务 :8022
/assets/       → 对象存储/CDN 或签名下载
```

必须配置：

- HTTPS 证书；
- WebSocket Upgrade；
- `Connection: Upgrade`；
- 足够的请求体限制；
- API 超时；
- 静态资源缓存；
- WebSocket 长连接不被代理提前关闭。

### 14.3 生产环境建议

```text
前端：CDN / 静态托管
API：至少 1～2 个无状态实例
数据库：托管 PostgreSQL
协作：独立 y-websocket 服务
文件：S3 兼容对象存储 + CDN
缓存：Redis（ticket、限流、在线状态可选）
监控：日志、错误追踪、健康检查、告警
```

在当前 5～10 人阶段不必过度微服务化，但服务边界应先分清：

```text
控制面 Control Plane：账号、项目、权限、邀请、版本
数据面 Data Plane：Yjs 实时协作、场景同步
文件面 Asset Plane：素材上传和下载
```

---

## 15. 安全要求

### 15.1 必做

- 全站 HTTPS；
- WebSocket 使用 WSS；
- 密码不明文存储；
- session 使用 HttpOnly、Secure Cookie，或使用成熟身份认证服务；
- 邀请 Token 使用高熵随机值；
- 数据库只保存邀请 Token hash；
- 邀请支持过期、撤销和使用次数；
- 所有 API 按 workspace/project 做权限过滤；
- WebSocket 连接按 ticket 验证；
- 限制单用户连接数和消息频率；
- 限制场景 JSON 和上传文件大小；
- 记录敏感操作审计日志；
- 删除项目和成员移除必须可追溯；
- PostgreSQL 和 Yjs 数据必须有备份；
- 不在日志中输出密码、session、invite token、collab ticket。

### 15.2 不应继续使用的方式

```text
不推荐：永久 key 放在项目 URL
不推荐：所有人共用一个 room key
不推荐：仅依赖前端隐藏按钮实现权限
不推荐：只保存 localStorage，不保存服务器版本
不推荐：把上传文件转成 blob URL 后写入协作文档
不推荐：客户端自行传 userId 和 role 后由服务端信任
```

### 15.3 XSS 和场景内容安全

当前场景中包含名称、文案、评论、AI 生成内容。渲染时必须：

- 默认使用 `textContent`，避免直接拼接 HTML；
- 如果必须使用 `innerHTML`，对文本进行转义；
- AI 返回的 ops 必须继续走白名单；
- 服务端保存前可以做 schema 校验；
- 发布前再次校验，不能只依赖前端校验。

---

## 16. 分阶段开发路径

## Phase 0：先修当前协作体验

目标：不改变产品结构，先让当前邀请链接可用。

### 工作项

- [ ] 统一线上前端地址、API 地址和 WebSocket 地址配置；
- [ ] 复制邀请链接时不要遗漏 `key`，或暂时明确生成完整连接参数；
- [ ] 验证线上 `room + key` 是否能被其他浏览器使用；
- [ ] 验证房间数据在协作服务重启后的行为；
- [ ] 为 y-websocket 配置持久化目录；
- [ ] 为 `xiyou-collab` 增加健康检查和自动重启；
- [ ] 为当前 `wukong`、`bajie`、`seng` 建立房间迁移说明；
- [ ] 继续保留 `?room=` 作为开发模式参数；
- [ ] 生产模式隐藏房间输入框。

### 验收

```text
两台不同网络的电脑打开同一个完整链接
→ 进入同一个房间
→ 任意一方添加对象
→ 另一方 2 秒内看到对象
→ 一方关闭页面，另一方仍可继续工作
→ 服务重启后，场景不会丢失
```

## Phase 1：账号和工作空间

目标：用户不再通过共享 key 进入系统。

### 工作项

- [ ] 建立 users 表；
- [ ] 完成注册/登录/退出；
- [ ] 完成 `/auth/me`；
- [ ] 建立 workspace 和 workspace_members；
- [ ] 创建第一个默认工作空间；
- [ ] 建立登录后的工作空间首页；
- [ ] 加入路由守卫；
- [ ] 增加用户名称和头像；
- [ ] 所有 API 统一从 session 获取 userId。

### 推荐的第一种登录方式

如果暂时没有复杂企业身份要求，优先选择：

```text
邮箱验证码/魔法链接
```

原因：

- 不需要自己维护密码重置；
- 减少密码安全风险；
- 对内部团队和受邀用户足够简单。

如果目标用户主要使用企业微信、钉钉或 Google Workspace，再增加对应 OAuth/SSO，不要第一版同时接太多登录渠道。

## Phase 2：项目和成员权限

目标：用户可以在工作空间中看到项目，并按角色编辑。

### 工作项

- [ ] 建立 projects 表；
- [ ] 建立 project_members 表；
- [ ] 建立最小角色矩阵；
- [ ] 项目列表页；
- [ ] 项目创建/归档；
- [ ] 成员列表页；
- [ ] 添加、移除、修改成员角色；
- [ ] 所有项目 API 接入权限检查；
- [ ] 编辑器入口改为 `/workspaces/:workspaceId/projects/:projectId`。

### 验收

```text
用户 A 只能看到自己有权限的项目
用户 B 没有项目权限时不能获得场景内容
Editor 可以编辑但不能管理成员
Viewer 可以查看项目快照但不能写入协作文档
Admin 可以邀请和审批成员
```

## Phase 3：邀请链接和加入申请

目标：支持“发链接邀请”和“用户申请加入”。

### 工作项

- [ ] 生成随机邀请 Token；
- [ ] 邀请详情页；
- [ ] 登录后接受邀请；
- [ ] 邀请过期、撤销、使用次数；
- [ ] 项目加入申请；
- [ ] 管理员审批/拒绝；
- [ ] 批准后创建 project_members；
- [ ] 成员状态刷新；
- [ ] 记录审计日志；
- [ ] 生产链接不再显示 room/key。

### 验收

```text
管理员生成 Editor 邀请链接
用户打开链接并登录
用户接受邀请后自动进入项目
撤销邀请后旧链接不能继续使用
未授权用户打开项目可以申请加入
管理员批准后用户才可进入编辑器
```

## Phase 4：把 Yjs 协作绑定到账号和项目

目标：实时协作不再依赖共享 room key。

### 工作项

- [ ] 项目创建时由服务端生成 collab_room；
- [ ] 新增 editor-session 接口；
- [ ] 新增 collab-ticket 接口；
- [ ] 改造 `collab.connect()` 接受 ticket；
- [ ] 改造 `xiyou_ws.py` 校验 ticket；
- [ ] WebSocket 连接绑定 userId/projectId/role；
- [ ] 成员移除后禁止新连接；
- [ ] 项目归档后禁止编辑连接；
- [ ] 在线头像使用账号资料而不是本地随机名称；
- [ ] 生产模式移除房间输入框；
- [ ] 增加连接失败、权限不足和 ticket 过期提示。

### 验收

```text
同一个用户可以在不同项目中有不同角色
删除成员后，他不能重新连接该项目
修改项目权限后，下一次 ticket 获取立即生效
伪造 projectId 或 room 不会进入其他项目
复制项目 URL 给无权限用户不会泄露场景内容
```

## Phase 5：场景、快照、发布和回滚

目标：服务器重启、用户换电脑和版本发布都不会丢数据。

### 工作项

- [ ] Yjs 持久化；
- [ ] 场景快照表/对象存储；
- [ ] 定时 debounce 快照；
- [ ] 服务启动恢复快照；
- [ ] 发布版本；
- [ ] 发布检查结果存档；
- [ ] 版本对比；
- [ ] 版本恢复；
- [ ] 手动导出和导入；
- [ ] 云端版本和本地缓存冲突提示。

## Phase 6：素材云端化

目标：不同用户都能看到同一个素材，不再依赖本地 Object URL。

### 工作项

- [ ] 对象存储；
- [ ] signed upload URL；
- [ ] assets 表；
- [ ] 资源 hash 和大小校验；
- [ ] 资源引用替换；
- [ ] 上传进度；
- [ ] 失败重试；
- [ ] 资源删除前引用检查；
- [ ] CDN/缓存；
- [ ] 高斯底座分块和 LOD 的远程加载。

## Phase 7：商用可靠性

- [ ] PostgreSQL 自动备份；
- [ ] Yjs 数据备份；
- [ ] API 健康检查；
- [ ] WebSocket 在线人数和连接数监控；
- [ ] 错误追踪；
- [ ] 限流；
- [ ] 服务器磁盘告警；
- [ ] 证书自动续期；
- [ ] Docker 容器自动重启；
- [ ] 灰度发布和回滚；
- [ ] 数据删除和导出流程；
- [ ] 隐私政策和数据保留策略。

---

## 17. 需要改动的当前文件

以下是将现有实现接入商用账号体系时的主要改动范围。

### 17.1 `editor/src/main.js`

当前职责：直接加载本地场景并自动连接 room。

目标职责：

- 解析项目路由；
- 获取 session；
- 获取 editor session；
- 判断权限；
- 加载云端快照；
- 获取 collab ticket；
- 再挂载编辑器和连接 Yjs。

### 17.2 `editor/src/core/collab.js`

需要改动：

- `user.key` 改为 `ticket`；
- `room` 由服务器返回；
- Awareness 使用服务端用户资料；
- 连接失败区分网络失败、ticket 过期、权限拒绝；
- 支持 ticket 过期后的重新获取和重连；
- 加入项目级 `projectId`；
- 保存当前连接的 `role`，用于 UI 状态提示，但不作为安全依据。

### 17.3 `editor/src/ui/presence.js`

需要改动：

- 删除生产环境的 room 输入框；
- 显示项目名；
- 显示“已连接/连接中/离线/权限不足”；
- 显示在线成员；
- 显示当前登录用户；
- 增加“重新连接”按钮；
- 开发环境才显示 room 调试信息。

### 17.4 `editor/src/ui/topbar.js`

需要改动：

- 邀请按钮改为调用创建 invitation API；
- 复制真正的邀请链接，而不是复制 room 链接；
- 根据角色显示/隐藏发布、项目设置和成员管理；
- 显示当前项目名和保存状态；
- 显示“草稿已同步/正在同步/离线草稿”。

### 17.5 `editor/src/core/store.js`

需要改动：

- 本地存档 key 从 room 改为 projectId；
- 增加云端快照版本号；
- 增加远程保存状态；
- 增加冲突/离线状态；
- 不允许未授权用户写入场景；
- 保持现有场景 schema 兼容。

### 17.6 `editor/src/ui/dock.js` 和资源相关逻辑

需要改动：

- 本地 `URL.createObjectURL` 改为对象存储 URL；
- 添加上传状态；
- 添加资源权限和引用检查；
- 素材引用只写 assetId；
- 协作者收到 assetId 后能够解析相同 URL。

### 17.7 `tools` 和部署文件

建议新增：

```text
infra/docker-compose.dev.yml
infra/docker-compose.prod.yml
infra/Caddyfile
infra/.env.example
server/
```

现有 `/www/wwwroot/agentpay/app/xiyou_ws.py` 可以先继续作为协作网关，但需要把校验逻辑从：

```text
room + key
```

改为：

```text
ticket → userId/projectId/role → room
```

---

## 18. 测试计划

### 18.1 单元测试

- Token 生成、hash、过期和撤销；
- workspace/project/member 权限矩阵；
- invitation 接受和重复使用；
- access request 审批；
- collab ticket 签发和验证；
- room 与 projectId 绑定；
- 场景快照序列化和恢复；
- 发布版本号递增；
- 角色不能越权。

### 18.2 API 集成测试

- 未登录访问项目返回 401；
- 无权限访问项目返回 403；
- 被移除成员不能获取 ticket；
- 过期 invitation 不能接受；
- 过期 ticket 不能建立 WebSocket；
- `projectId=A` 的 ticket 不能连接 `projectId=B` 的 room；
- Viewer 不能调用编辑和发布接口；
- 删除资源时存在引用应被阻止。

### 18.3 浏览器端协作测试

至少用两个独立浏览器上下文：

```text
Browser A：管理员/Editor
Browser B：另一个 Editor/Viewer
```

测试：

- 登录和退出；
- 项目列表；
- 邀请加入；
- 申请加入和审批；
- 两人同时移动对象；
- 两人同时修改不同对象；
- 一人断网后恢复；
- WebSocket 重连；
- 刷新页面后场景还原；
- 服务端重启后场景还原；
- 版本发布和回滚；
- 被移除成员无法继续写入。

### 18.4 容量测试

目标为单项目 10 个连接：

```text
10 个浏览器同时在线
持续修改对象位置
持续发送 awareness
上传一个中型 GLB
刷新和断线重连
```

需要观察：

- WebSocket 连接数；
- API 延迟；
- 内存；
- CPU；
- 数据库写入频率；
- Yjs 文档大小；
- 断线重连是否产生重复数据；
- 快照保存耗时。

---

## 19. 第一版验收标准

满足以下条件，才算从当前演示协作升级为可内部商用的 MVP：

### 用户和进入

- [ ] 用户可以注册或登录；
- [ ] 用户可以退出；
- [ ] 用户可以看到自己所属工作空间；
- [ ] 用户可以看到自己有权限的项目；
- [ ] 无权限用户不能读取项目场景；
- [ ] 用户可以通过项目地址进入；
- [ ] 用户可以通过邀请链接进入；
- [ ] 用户可以申请加入项目；
- [ ] 管理员可以批准/拒绝申请。

### 权限

- [ ] 项目成员有明确角色；
- [ ] Editor 可以编辑；
- [ ] Viewer 不可以写入；
- [ ] 被移除成员无法重新拿到协作 ticket；
- [ ] 发布权限由服务端校验；
- [ ] 前端隐藏按钮不是唯一权限防线。

### 协作

- [ ] 两个以上用户可同时在线；
- [ ] 10 人以内连接稳定；
- [ ] 同项目用户可以看到实时变更；
- [ ] 在线头像显示真实账号名；
- [ ] 软锁和选中状态正常；
- [ ] 断线后自动重连；
- [ ] ticket 过期可以重新获取；
- [ ] 不同项目之间绝不串数据。

### 数据

- [ ] 场景不再只依赖 localStorage；
- [ ] Yjs 数据或场景快照可持久化；
- [ ] 服务重启后场景可恢复；
- [ ] 发布版本可以查看；
- [ ] 发布版本可以回滚；
- [ ] 大文件不保存为本地 blob URL；
- [ ] 至少有一份自动备份。

### 运维

- [ ] 网站使用 HTTPS；
- [ ] 协作使用 WSS；
- [ ] API、数据库、协作服务均有健康检查；
- [ ] 服务可以自动重启；
- [ ] 关键错误有日志；
- [ ] 磁盘和数据库有备份告警；
- [ ] 线上部署不依赖开发者个人电脑。

---

## 20. 推荐的最小落地顺序

如果现在开始开发，不建议一次性做完整 SaaS。建议按以下顺序推进：

```text
第 1 步：修复当前线上邀请链接和协作持久化
第 2 步：增加登录和 /auth/me
第 3 步：增加 workspace/project/member 表和 API
第 4 步：项目 URL 进入编辑器，前端按权限加载
第 5 步：邀请链接和申请加入
第 6 步：collab ticket 替换 room key
第 7 步：Yjs 快照、发布版本和回滚
第 8 步：素材上传到对象存储
第 9 步：监控、备份和限流
```

其中最关键的技术切换是：

```text
当前：room + key + localStorage
目标：user session + project membership + collab ticket + server snapshot
```

---

## 21. 最终建议

### 21.1 对当前规模的实际选择

对于 5～10 人以内的协作，不需要一开始部署复杂的 Kubernetes 或微服务平台。建议：

```text
一个域名
一台起步云服务器
一个 API 服务
一个 y-websocket 服务
一个 PostgreSQL
一个对象存储
一个反向代理
```

这已经可以支撑内部测试和小规模商业试用。

### 21.2 但要从第一天避免三个架构误区

#### 误区一：把 `localhost` 当协作服务器

正确理解：

```text
localhost = 开发者本机开发服务
云服务器/API/WebSocket = 商用协作基础设施
```

#### 误区二：把一个共享 key 当账号权限

正确理解：

```text
key = 临时过渡门禁
账号 + 成员关系 + 角色 = 正式权限系统
```

#### 误区三：把 Yjs 实时同步当永久保存

正确理解：

```text
Yjs = 实时协作层
PostgreSQL/对象存储/快照 = 数据持久层
Release = 稳定发布层
```

### 21.3 这套方案和当前项目的关系

当前项目不需要推倒重写。最合理的路径是：

```text
保留现有编辑器和 Yjs
  → 增加 API 控制面
  → 把 room 从产品概念隐藏起来
  → 用项目成员关系产生协作 ticket
  → 把本地存档升级为云端快照
  → 把本地素材升级为对象存储
```

这样既能保留已经完成的实时协作能力，又能逐步具备真正商用工具需要的账号、空间、项目、权限、持久化和发布能力。


## 22. 2026-10-03 客户端与服务端边界复核

客户端已具备房间参数、Yjs 实体同步、Awareness、断线状态和初始同步保护；本轮新增的本地 Release Server 仅用于开发期 JSON 交付。

尚未实现且不能由前端假装完成：账号/成员权限、服务端发布权限、Yjs 持久化、对象存储、Release API、Viewer 只读订阅和游客共享 Session。
