# 本地 Gaussian 重建引擎

`tools/gpu-worker.mjs` 的真实重建链路不依赖远程服务器，运行在本机：

```text
FFmpeg / FFprobe → COLMAP → Brush → final.ply
```

## OOOSplat 复用方式

OOOSplat 0.5.0 的 macOS / Windows / Ubuntu 包会随应用携带经过验证的 FFmpeg、FFprobe、COLMAP 和 Brush。安装 OOOSplat 后可以让虚境 Worker 复用它的本地引擎目录，不需要上传视频，也不需要远程 GPU API。

macOS Apple Silicon 示例：

```bash
export XIYOU_ENGINE_DIR="/Applications/OOOSplat.app/Contents/Resources/engines/macos/arm64"
export XIYOU_ENABLE_BUNDLED_ENGINES=1
cd editor
npm run gpu:worker
```

Worker 会自动检测完整的本地引擎目录；也可以显式使用 `XIYOU_ENABLE_BUNDLED_ENGINES=1` 强制优先使用该目录。

如果引擎放在项目目录，也可以使用：

```text
xihack-xian-proj/
├─ engines/
│  └─ macos/arm64/
│     ├─ bin/ffmpeg
│     ├─ bin/ffprobe
│     ├─ bin/colmap
│     └─ bin/brush_app
```

Worker 的 `GET /health` 会返回每个引擎的路径和缺失状态。只有 FFmpeg、FFprobe、COLMAP、Brush 都存在时，工作台才具备“视频 → 真实 Gaussian”条件。

## 运行

```bash
XIYOU_ENGINE_DIR=/path/to/engines \
XIYOU_ENABLE_BUNDLED_ENGINES=1 \
node tools/gpu-worker.mjs serve --port 8787
```

`XIYOU_RECONSTRUCTOR_BIN` 仍可用于接入自定义重建器；它优先于内置的本地 COLMAP + Brush 编排。

## 许可证

如果随产品重新分发这些引擎，需要同时携带对应许可证和 NOTICE。OOOSplat 仓库中已列出 FFmpeg、COLMAP、Brush、CUDA Runtime 等组件的许可证；本项目只复用本地执行方式，不复制 OOOSplat 的 UI 或品牌。
