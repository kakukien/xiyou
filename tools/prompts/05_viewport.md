生成文件 `src/core/viewport.js`。实现契约中 viewport 全部 API。

要点：
- import * as THREE from 'three'; OrbitControls、TransformControls from 'three/addons/controls/...'
- init(container)：WebGLRenderer antialias、setPixelRatio、ACES tone mapping 不需要；Scene 背景 #101013；HemisphereLight+DirectionalLight 基础照明；PerspectiveCamera(60, aspect, 0.05, 500) 初始 (4,3,6) 看原点
- OrbitControls：mouseButtons 左键 ROTATE？按 UE 习惯：右键 orbit、中键 pan、滚轮 zoom（LEFT 留空给拾取）；controls.mouseButtons={RIGHT:ROTATE,MIDDLE:PAN}；右键时 WASD/QE 飞行移动 camera+target
- TransformControls：addEventListener('dragging-changed')：drag 中禁用 orbit；objectChange 时把 Object3D 的 pos/rot(rad→deg)/scale 写回 store.updateObject(id,{transform},transient=true)；dragging 结束提交 transient=false 一次。TransformControls 附着在 store.selection 第一个 object 对应 node；selection 事件里 attach/detach
- setGizmo('translate'|'rotate'|'scale') 也响应契约快捷键（快捷键在 main.js，不在此文件）
- setSnap({t,r,s})：controls.setTranslationSnap/RotationSnap(deg→rad)/ScaleSnap；null 关闭
- setGroundLock(b)：开时 objectChange 后 clamp position.y>=0（对 objDef 语义为落地）——简化：拖动中 y 锁当前值
- sync()：对比 store.scene.objects 的 id 集合与现有 node map：新增 createNode、删除 remove+dispose、其余 applyTransform+visible 更新（transform 由 store 为准，除非该 node 正被 gizmo 拖动）；material.asset/hitbox 变化时整 node 重建（比较 JSON 快照，简单起见对 updateObject 触发的 change 事件里如果 asset/material/hitbox 变了就重建该 node）
- setBase(base)：无 sog_url → GridHelper(20,20,0x444444,0x2a2a30) + y=0 地面阴影盘 + 三面照片墙（placeholderTexture('现场照片A/B/C') 4m 宽 quad 围半圈放 z=-6 弧线上）；有 url → TODO stub + log
- 拾取：renderer.domElement pointerdown 记 xy，pointerup 位移<4px 时 raycast：跳过 userData.isHelper，命中 node（向上找 userData.id 的祖先）→ edit 模式 store.select(id, ev.ctrlKey add)；play 模式 triggers.fire('tap', id)
- focus(id)： tween 相机到 node 包围球 2.5 倍距离（简单 lerp 动画 0.4s）
- helpersVisible(b)：隐藏 grid/照片墙?（底座保留，只隐 hitbox helper+gizmo）
- node(id)/tick(dt)（飞行移动、focus 动画推进）/resize 用 ResizeObserver
- import { store } from './store.js'; { createNode, applyTransform } from './objects.js'; { triggers } from './playback.js'; { log } from '../ui/log.js'
- 循环渲染在 main.js：暴露 render() 方法 renderer.render

输出：仅输出完整文件内容，不要 markdown 代码围栏，不要任何解释。