# 打开后场景信息消失：诊断记录与修复方案

> 这是本轮开发前审查得到的现状诊断，不代表修复已经完成。

## 1. 结论摘要

当前“打开后信息没有了”最可能由以下问题共同造成，优先级从高到低：

1. `editor/src/main.js` 启动时把名为“花果山觉醒”的已加载场景当成 retired preset，直接执行 `store.newScene()`，导致本地已有数据被主动清空并保存。
2. `store.save()` 只写当前浏览器的 `localStorage`。换浏览器、换设备、清缓存或使用另一 `room` 时自然看不到原数据；它不是发布存储。
3. Yjs 协作初始同步可能用远端房间数据覆盖本地已加载草稿。远端若是旧房间/空房间/未持久化房间，用户会感觉“刷新后没了”。
4. `vite.config.js` 的 production input 没有包含 `runtime.html`，所以构建产物不会生成独立 Runtime 页面；直接打开线上 `/xiyou/runtime.html` 可能是 404 或旧文件。
5. 本地上传资源使用 `blob:` Object URL，刷新后 URL 失效；场景记录可能还在，但图片/模型/高斯底座看起来像“消失”。

## 2. 代码证据

### 2.1 启动覆盖已存场景

当前启动流程：

```text
setStorageKey(xiyou.scene.v2.<room>)
→ store.load()
→ 如果 loadedScene 且 meta.name=花果山觉醒/章节同名
→ store.newScene()
→ store.save()
```

这段逻辑把“旧演示场景”与“用户真实场景”混为一谈。不能用名称判断数据是否应被删除；升级应当使用 schema migration，并保留用户数据。

### 2.2 本地存储不是跨设备持久化

`store.save()` 使用：

```js
localStorage.setItem(storageKey, JSON.stringify(scene))
```

其 key 还包含 URL 的 `room` 参数：

```text
xiyou.scene.v2.demo
xiyou.scene.v2.wukong
```

只要房间名不同，就会得到完全不同的草稿。`localStorage` 也不会在手机和电脑间共享。

### 2.3 协作初始同步的覆盖风险

`collab.finishInitialSync()` 当前策略是：

- 远端 Y.Map 有数据：`applyRemoteScene()` 覆盖当前本地场景；
- 远端没有数据：把本地场景写到房间。

该策略没有比较 `updatedAt/revision`，也没有让用户选择“保留本地/采用远端/备份后合并”。远端旧数据会覆盖本地新数据。

### 2.4 Runtime 未进入 production input

当前 `editor/vite.config.js` 的输入只有：

```js
main: 'index.html'
show: 'show.html'
```

虽然仓库存在 `runtime.html`，但 Vite 多页面构建不会自动把未声明的入口复制进产物。部署时必须把 `runtime: 'runtime.html'` 加入输入，或者由部署流程明确复制并验证。

### 2.5 临时资源引用

`editor/src/ui/dock.js` 和 `details.js` 使用 `URL.createObjectURL(file)`，并将 `local://...` 记录到场景。Object URL 只对当前浏览器会话有效，不能作为 Release 的正式资源地址。

## 3. 修复设计

### 3.1 启动恢复策略

启动时按以下顺序执行：

1. 解析 `room`，显示当前房间名；
2. 读取本地草稿；
3. 校验 JSON、schema version 和资源引用；
4. 只做显式 schema migration，不按场景名称清空；
5. 若发现旧演示数据，显示“检测到旧版本草稿”，提供“打开/新建”选择；
6. 自动保存前先生成备份键：`<storageKey>.backup.<timestamp>`；
7. 所有读取失败显示可恢复错误，而不是静默新建空场景。

### 3.2 本地草稿元数据

在 `scene.meta` 或独立 envelope 中记录：

```json
{
  "storageVersion": 2,
  "draftId": "draft_x",
  "room": "demo",
  "revision": 18,
  "updatedAt": "2026-10-03T00:00:00.000Z",
  "lastSavedBy": "user_x",
  "source": "local|remote|import"
}
```

不要把 `dirty` 当成版本号。保存成功后再设置 clean，写入失败必须保留 dirty。

### 3.3 协作初始同步策略

连接后先取得远端摘要：`revision/updatedAt/draftId/checksum`。

- 远端为空：本地发布到远端；
- 本地为空：读取远端；
- 两边一致：直接进入协作；
- 两边都有且不同：弹出选择并自动备份本地；
- 当前用户确认“以本地覆盖远端”后才写远端；
- 当前用户确认“以远端为准”后才替换本地；
- 可选：对实体集合做三方合并，但不能静默覆盖底座/资源引用。

### 3.4 资源持久化

正式方案：

```text
选择文件 → 上传 Asset API/Object Storage → 得到稳定 URL + checksum
→ scene.meta.assets 引用 assetId
→ Release manifest 校验资源
```

过渡方案：

- `blob:`/`local:` 仅允许本机预览；
- 发布检查明确 block；
- 刷新后显示“临时资源已失效”，保留对象和资源元信息，允许重新绑定文件。

### 3.5 Runtime 构建与部署检查

- Vite input 显式包含 `index.html`、`show.html`、`runtime.html`；
- CI 检查 `dist/runtime.html`、相关 JS/CSS 和 vendor 文件存在；
- 部署后检查 `/xiyou/`、`/xiyou/show.html`、`/xiyou/runtime.html` 均返回 200；
- 检查 base path、静态资产、跨域 Release URL 和缓存策略；
- Release JSON 禁止被长期 CDN 缓存为旧 active 版本，采用版本化 URL 或明确 cache-control。

## 4. 修复后的验收

- 已保存场景刷新后仍有对象、区域、触发器、资源元数据。
- `meta.name` 为“花果山觉醒”的用户数据不会被自动清空。
- 改变 `room` 后页面明确提示正在打开另一份草稿。
- 远端旧数据不会静默覆盖本地新数据。
- 本地临时资源失效时能定位原因并重新绑定，而不是显示空白。
- production build 产物包含 `runtime.html`，部署探针可访问。
- 任何恢复失败都有备份或可导入 JSON 兜底。
