生成文件 `src/core/objects.js`。three.js 对象工厂，实现契约全部导出。

要点：
- import * as THREE from 'three'; GLTFLoader from 'three/addons/loaders/GLTFLoader.js'
- `createNode(objDef, assets=[])`：返回 Object3D，userData.id=objDef.id、userData.objType=type；内部按类型分发；用 applyTransform(node,objDef) 设置初始位姿
- quad：1x1 PlaneGeometry；material.map = assets 里匹配 asset 字段（assets 是 [{id,name,url}]，objDef.asset 存 asset.id）的 TextureLoader url，否则 placeholderTexture(objDef.name||'QUAD')；DoubleSide transparent
- video_quad：PlaneGeometry + ShaderMaterial（stackedAlphaShader）；uniforms.map 默认 placeholderTexture('VIDEO', '#1a2a1a')；有 url 用 VideoTexture(loop, muted, playsInline)；平面比例按 objDef.material.preset（VIDEO_PRESETS 的 S/P/L → w/h 比 h/2w）否则 0.75x1
- glb：无 url → 橙色线框 Box(1,1,1)+对角线；有 url 异步 GLTFLoader.load，loaded 后 remove 占位 add gltf.scene，把 gltf.animations 存 node.userData.animations
- splat_segment：椭球内 2000 随机点 PointsMaterial{size:0.02,color:0x7fd4c1,sizeAttenuation:true} + 半透明椭球壳（低透明）
- light：PointLight(色/强度/距离从 material.color/intensity/range，默认 0xffe0a0,1.5,6) + 可视小球
- hitbox：type box/sphere 时生成 EdgesGeometry 线框 Mesh 或半透明 Mesh，userData.isHelper=true，命名 'hitbox'；type 'auto' 时按包围盒自动 box
- `applyTransform`：position.fromArray(p)；rotation.set(deg2rad)；scale.fromArray(s)
- `stackedAlphaShader()`：顶点传 uv；片元：vec2 uv= vUv; 上半 uv.y∈[0.5,1] 显示 color=texture(map,vec2(u, uv.y*2-1))；下半从下半纹理取 alpha。即 final uv: color sample at vec2(vUv.x, vUv.y*2.0) 的上半图和 alpha at vec2(vUv.x, vUv.y*2.0-1.0)——按 PRD「上半颜色下半透明度」实现成 quad 上半采样贴图上半、下半采样贴图下半并合成 alpha：color=tex(vUv.x, vUv.y*2).rgb? 用约定：quad 的 v 坐标 0..1 映射到贴图上半（颜色）和下半（alpha）：colorTex = texture2D(map, vec2(vUv.x, 0.5+vUv.y*0.5)); alphaTex = texture2D(map, vec2(vUv.x, vUv.y*0.5)); fragColor = vec4(colorTex.rgb, alphaTex.r)。两侧内收 halfPixel。
- `placeholderTexture`：128x128 canvas，棋盘格 16px 格 + 底部文字条
- `hitboxOf(objDef)->{type,size,center}` 辅助导出

输出：仅输出完整文件内容，不要 markdown 代码围栏，不要任何解释。