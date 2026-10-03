# 侧边栏固定元素目录：文档索引

> 版本：v0.1.0｜状态：基础目录与实例链路已落地，完整互动仍在分阶段开发

## 交付内容

| 文件 | 用途 | 后续使用方式 |
|---|---|---|
| [`sidebar-element-asset-table.json`](sidebar-element-asset-table.json) | 机器可读的目录主表：8 个类目、124 个元素、23 个互动 Profile | 开发时转为内置 manifest，或由构建脚本生成模块 |
| [`sidebar-element-asset-table.csv`](sidebar-element-asset-table.csv) | 可筛选、排序和导入表格软件的平面资产表 | 产品评审、任务拆分、供应商/美术交付清单 |
| [`sidebar-element-asset-table.md`](sidebar-element-asset-table.md) | 面向评审的完整中文资产表 | 评审类目覆盖、P0/P1/P2 和默认碰撞/落点 |
| [`sidebar-element-cleanup-scope.md`](sidebar-element-cleanup-scope.md) | 区分用户请求、截图参考、清理范围和保留能力 | 开发前确认剧情内容不回流、固定元素不误入资源库 |
| [`sidebar-element-interaction-spec.md`](sidebar-element-interaction-spec.md) | 触发器、动作、互动 Profile、粒子和飞掠参数 | 开发交互面板、Runtime 执行和发布校验 |
| [`sidebar-element-development-plan.md`](sidebar-element-development-plan.md) | 侧边栏信息架构、数据契约、开发分期、验收和测试 | 开发排期和联调验收依据 |
| [`sidebar-element-asset-production-spec.md`](sidebar-element-asset-production-spec.md) | GLB、Shader、粒子、缩略图、命名和授权规范 | 后续制作真实资产时的交付标准 |

## 目录范围

- 家居与室内：12 个
- 建筑与自然环境：15 个
- 材质与空间效果：16 个
- 游戏道具与机关：22 个
- 载具与玩具：14 个
- 粒子、氛围与飞掠效果：18 个
- 交互装置与控制器：15 个
- 空间辅助与调试：12 个

优先级：P0 60 个、P1 58 个、P2 6 个。

## 当前判断

- **先做程序化，再补高模**：现有 `compound`、点粒子、透明贴图、Additive 和 Shader 已作为第一批 P0 预览基础；具体高精度资产和完整互动仍按阶段补齐。
- **精度/资源占用**：当前采用高精度程序化预制体，目录定义不携带二进制，元素通过少量几何部件、材质和受限粒子表达细节；真实 GLB/贴图作为可选增强。
- **目录与项目资源分开**：目录元素是可重复创建的模板；用户上传的图片、视频、GLB、音频和高斯底座仍归 `scene.meta.assets`。
- **互动优先于装饰**：P0 覆盖可点击、注视、按住、进入、收集、开合、开关、物理、粒子发射和飞掠等能力。
- **不回流剧情**：新目录不放人物、地点、章节、节点或专属故事文案；旧历史文档仅作为变更记录，不参与默认场景加载。

## 建议的下一步开发顺序

1. 已将 JSON 目录生成到 `editor/src/core/element-catalog.js`，接入“空间 > 固定元素”。
2. 已完成每个类目的程序化占位预览、点击添加和拖入 Viewport。
3. 已完成 `element_id` 实例字段、默认交互 Profile、放置约束和撤销/恢复。
4. 后续接入 Runtime 的完整状态机、粒子预算、真实 GLB 变体和资源授权。

## 实现进度（2026-10-03）

已完成第一层开发闭环：

- 124 项目录已生成 `editor/src/core/element-catalog.js`；
- `editor/src/core/elements.js` 提供程序化几何/粒子配方和实例工厂；
- 空间侧边栏显示 8 个类目，可搜索、点击添加、拖拽到 Viewport；
- 添加实例保存 `element_id`、`element_version`、`voice_token`、互动 Profile；
- AI `add_element` 支持 element ID / voice token / 中文别名解析；
- Runtime 已复用编辑器对象创建器，避免组装体退化成全是 Box；
- JSON/CSV 目录一致性、语音别名、添加实例、构建、Smoke、regression 已验证。

仍未宣称完成：完整 124 项高阶互动行为、真实高精度外部 GLB 资产包、跨设备性能验收，以及西游旧模板/剧情界面的全量清理。语音多实例候选确认已在编辑器聊天入口接入基础流程。
