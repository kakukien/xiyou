# 本地 Release Server

用于在开发机或局域网中验收“Editor 发布 → 手机 Runtime 加载”的最小闭环。

## 启动

```bash
cd editor
npm run release:serve
```

默认监听：

```text
http://0.0.0.0:8790
```

接口：

```text
GET  /health
GET  /
GET  /release/:id.json
POST /release/:id.json
```

## 使用方式

把 Editor 下载的 Release JSON 放入 `editor/releases/`，然后让 Runtime 使用：

```text
runtime.html?scene=http://<局域网IP>:8790/release/release_x.json
```

也可以 POST JSON：

```bash
curl -X POST \\
  -H 'content-type: application/json' \\
  --data-binary @release_x.json \\
  http://127.0.0.1:8790/release/release_x.json
```

## 限制

这是开发验收服务器：

- 无账号、权限和生产鉴权；
- 无对象存储；
- 无版本审批和回滚权限；
- 不应直接暴露到公网；
- 生产环境仍需要 Release API + 对象存储/CDN + 鉴权。
