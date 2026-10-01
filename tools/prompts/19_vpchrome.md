生成新文件 `src/ui/vpchrome.js`。`export function mount(wrap, viewport)`——wrap 是 #viewport-wrap 容器、viewport 是 core/viewport.js 的实例。往 wrap 里叠加视口 UI 层，按设计稿：

import { store } from '../core/store.js'; import { collab } from '../core/collab.js'; import { playback } from '../core/playback.js'; 需要时 `import * as THREE from 'three'`

## 顶部工具条 `.vp-toolbar`（视口顶部居中悬浮）
- `.seg` 视图组：透视(默认)/顶视/摄像机 —— 切视图调 `viewport.frameAll()` 的变体：顶视=camera 移到 (0,12,0.001) lookAt 原点、OrbitControls enableRotate=false；透视=恢复默认位+enableRotate=true；摄像机=若场景有 meta 相机对象用之否则同透视
- 静态标签「Gizmo」+ `.seg` W/E/R（`viewport.setGizmoMode('translate'|'rotate'|'scale')`，active 高亮）
- `.tbtn` 框选 / `.tbtn` 滴选：选择模式 toggle
  - 滴选=默认单击点选（不动现状）
  - 框选：激活后视口上拖出 `.sel-rect` 虚线框，松手后把屏幕投影落在框内的对象 select（viewport.screenPos(mesh) 或直接给 viewport.meshById 里每个 Object3D 调 project）。mode 只激活其一，互斥
- 右端 `.tbtn` 锁地面 toggle（`viewport.setLockGround`）

## 左侧图标轨 `.vp-rail`
按钮列：点选(↖)/移动(✥)/旋转(⟳)/缩放(⤢)/标注(✎禁用态)——前四对应 gizmo none/translate/rotate/scale；none=gizmo detach？不对——none=只选不 gizmo：调 setGizmoMode 后 detach：给 viewport.gizmo.detach()

## 浮动对象标签 `.vp-label`
- 每帧（在 viewport 渲染循环挂回调：viewport._tick 里或自己在 requestAnimationFrame 独立循环也行——用独立 rAF）把每个 Object3D 世界坐标 project 到屏幕，标签 `<div class=vp-label>` 显示 `store.scene.objects` 里对应 name（mesh.userData.id 或按 position 匹配——用 viewport.meshById map）；被选中加 .sel；在相机背面/超 60m 隐藏；splat_segment 标签显示「分块 xx」
- 只挂 wrap 内部，absolute

## 右下小地图 `.vp-minimap` canvas
- 俯视投影：scene.objects 的 transform.p → canvas 点（x→右,z→下，自动 fit 全部对象+底座半径+余量，中心基准）；点按类型着色：quad 蓝/video_quad 紫/glb 橙/splat_segment 灰/light 黄；选中者大点+白圈；相机位置画小三角朝 -Z。change/selection 事件 + rAF 每 ~500ms 重绘即可
- title=「俯视小地图」

## play 模式
- mode='play'：工具条/图标轨/小地图 display:none；显示 `.vp-hud-play`：「◀ 上一节点 / 节点名 / 下一节点 ▶」+「重置」钮（调 playback.gotoNode/current/stop）+ 节点进度
- mode='edit' 恢复

事件：'change' 'selection' 'mode' 'collab-peers'。输出：仅完整文件内容，无围栏无解释。