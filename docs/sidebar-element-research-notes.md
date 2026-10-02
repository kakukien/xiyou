# 侧边栏固定元素分类与调研依据

> 用途：记录本轮分类不是按“模型文件类型”堆砌，而是按用户添加后的空间行为组织。外部资料仅用于方法参考，不代表项目已经接入第三方资产。

## 1. 分类方法

### 先按创作任务分组

1. **搭场景**：家居、建筑、自然、材质和体积。
2. **做关卡**：宝箱、开关、压力板、门、平台、传送和收集物。
3. **做游戏反馈**：粒子、光球、火花、烟雾、波纹和冲击波。
4. **做运动与载具**：坦克、小车、无人机、气球和飞掠对象。
5. **做逻辑控制**：触发区域、生成点、路径、镜头和空间辅助。

### 再按默认行为分组

- `static`：没有自动行为，适合先搭空间。
- `tap_feedback` / `gaze_feedback` / `hold_feedback`：用户直接操作后反馈。
- `openable` / `switchable`：两态或多态机关。
- `collectible`：收集、计数、隐藏和奖励反馈。
- `pickup_throw` / `physics`：抓取、投掷、碰撞和受力。
- `particle_emitter` / `flyby` / `volume_effect`：持续的空间生命感。
- `vehicle` / `moving` / `path`：可移动对象和路线。
- `helper` / `camera`：编辑与运行辅助，不等同于游客可见内容。

这样做的结果是：用户看到的不只是“盒子、桌子、椅子”，而是可以继续配置行为的空间积木。

## 2. 参考的通用编辑器概念

- **Prefab / reusable template**：Unity 官方文档将 Prefab 描述为包含组件、属性值和子对象的可复用模板，场景中通过实例使用。这个思路对应本项目的 `element_id` + 场景实例，而不是为每个元素发明一个新的对象 type。
- **程序化几何与粒子**：Three.js 官方对象文档提供 `Points` 和 `InstancedMesh` 作为点集合与重复网格的基础能力。当前项目已有点粒子和 `compound` 基础几何，因此第一阶段可以先用程序化预览，避免把 124 个元素都变成重型 GLB。
- **可复用的低成本游戏资产**：Kenney 官方支持页说明其游戏资产采用 CC0/Public Domain。这里仅作为“后续外部资产供应与授权检查”的参考，不表示本项目直接复制或依赖这些资源。

## 3. 外部参考链接

- [Three.js Points](https://threejs.org/docs/#api/en/objects/Points)
- [Three.js InstancedMesh](https://threejs.org/docs/#api/en/objects/InstancedMesh)
- [Unity Manual: Prefabs](https://docs.unity3d.com/Manual/Prefabs.html)
- [Kenney Support: licensing FAQ](https://kenney.nl/support)

访问日期：2026-10-03。

## 4. 对本项目的落地结论

- 固定元素目录是 **Prefab/行为模板目录**，不是上传文件目录。
- 元素目录应保持稳定 ID，真实模型、贴图或声音可以通过版本和变体替换。
- P0 先用 `compound`、`quad`、现有 FX 贴图、Shader 和点粒子完成可用闭环。
- 高模、复杂流体、群体飞行和真实载具放到 P1/P2，并增加 `maxCount`、LOD、碰撞和移动端降级策略。
- 每个元素必须同时声明默认落点、碰撞类型、是否 Runtime 可见和至少一个交互 Profile。
