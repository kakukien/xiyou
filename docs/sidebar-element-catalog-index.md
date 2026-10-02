# 侧边栏固定元素目录：文档索引

> 版本：v0.1.0｜状态：规划与资产清单，尚未进入代码开发

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

- **先做程序化，再补高模**：现有 `compound`、点粒子、透明贴图、Additive 和 Shader 可作为第一批 P0 预览的技术基础；具体 preset 和互动仍待开发。
- **目录与项目资源分开**：目录元素是可重复创建的模板；用户上传的图片、视频、GLB、音频和高斯底座仍归 `scene.meta.assets`。
- **互动优先于装饰**：P0 覆盖可点击、注视、按住、进入、收集、开合、开关、物理、粒子发射和飞掠等能力。
- **不回流剧情**：新目录不放人物、地点、章节、节点或专属故事文案；旧历史文档仅作为变更记录，不参与默认场景加载。

## 建议的下一步开发顺序

1. 先把 JSON 目录转为 `editor/src/core/elements.js`，接入“空间 > 固定元素”。
2. 先实现每个类目的 P0 首屏元素和占位预览，保证所有类目都有可添加项。
3. 再实现 `element_id` 实例字段、默认交互 Profile、放置约束和撤销/恢复。
4. 最后接入 Runtime 的状态机、粒子预算、真实 GLB 变体和资源授权。
