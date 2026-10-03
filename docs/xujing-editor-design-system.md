# 造梦 · 故事空间景区互动空间编辑器设计系统

> 版本：v3.0.0
>
> 适用范围：编辑器顶栏、左侧大纲、中间 Viewport、右侧 Inspector、底部 Dock、弹窗、Toast、空状态和后续新增模块。
>
> 设计目标：让界面成为稳定、克制、可扩展的空间内容工作台，而不是一组临时拼装的面板。

---

## 1. 设计定位

### 1.1 视觉方向

**浅色专业空间工作台 × 白色面板 × 暖橙行动色 × 冷蓝灰 Viewport**。

编辑器的主要视觉对象是中间真实景区高斯场景，因此界面需要做到：

- 面板清晰，但不压过场景；
- 控件密度高，但不拥挤；
- 橙色有明确语义，不作为大面积装饰；
- 信息层级优先于视觉效果；
- 所有功能的状态可发现、可理解、可恢复。

### 1.2 核心设计原则

1. **空间优先**：Viewport 是主工作区，面板是辅助工具。
2. **操作优先**：主要操作必须有清晰的视觉层级和快捷反馈。
3. **语义优先**：对象、组件、资源、节点、锚点使用稳定且可理解的名称。
4. **状态完整**：默认、悬停、按下、选中、禁用、加载、成功、警告、错误都要定义。
5. **密度可控**：默认紧凑，重要信息通过间距、分组和标题拉开层级，而不是全靠颜色。
6. **一致复用**：新增功能先找已有组件；没有组件时先补设计系统，不允许局部发明。
7. **图标统一**：统一使用 Remix Icon；图标承担辅助语义，不能代替重要文字。
8. **渐进披露**：常用字段第一层展示，高级配置放入折叠区或高级 Tab。
9. **可逆操作**：删除、批量修改、AI 修改和发布都要可预览、可撤销或可回滚。

---

## 2. Design Token

Token 唯一源文件：[`docs/design-tokens.json`](design-tokens.json)。

代码实现时应将 Token 映射到 `editor/src/style.css` 的 CSS Variables；禁止在业务模块中随意新增颜色、字号、间距和圆角值。

### 2.1 色彩语义

#### 品牌与行动色

| Token | 值 | 用途 |
|---|---|---|
| `--color-brand-primary` | `#F97316` | 主按钮、发布、当前选中、关键行动 |
| `--color-brand-primary-hover` | `#EA580C` | 主按钮悬停 |
| `--color-brand-primary-pressed` | `#C2410C` | 主按钮按下 |
| `--color-brand-primary-soft` | `#FFF7ED` | 主色浅背景 |
| `--color-brand-primary-subtle` | `#FFEDD5` | 选中背景、浅提示 |

#### 状态色

| 语义 | 主色 | 浅色背景 | 使用范围 |
|---|---|---|---|
| 信息 | `#2563EB` | `#EFF6FF` | 信息、链接、辅助提示 |
| 成功 | `#16A34A` | `#F0FDF4` | 已完成、通过、在线 |
| 警告 | `#D97706` | `#FFFBEB` | 待处理、性能风险、未绑定 |
| 错误 | `#DC2626` | `#FEF2F2` | 阻断、删除、加载失败 |

#### 表面色

| Token | 值 | 用途 |
|---|---|---|
| `--color-surface-canvas` | `#EEF2F6` | 编辑器外层背景 |
| `--color-surface-panel` | `#FCFCFA` | 主面板 |
| `--color-surface-panel-muted` | `#F4F4F0` | 面板次层、标题栏、Tab 背景 |
| `--color-surface-panel-raised` | `#FFFFFF` | 卡片、输入框、浮层 |
| `--color-surface-viewport` | `#DCE5EE` | Viewport 无底座背景 |

#### 文本与边框

| Token | 值 | 用途 |
|---|---|---|
| `--color-text-primary` | `#1F2937` | 主文字 |
| `--color-text-secondary` | `#64748B` | 辅助说明 |
| `--color-text-tertiary` | `#94A3B8` | 弱提示、占位 |
| `--color-text-disabled` | `#CBD5E1` | 禁用文字 |
| `--color-border-default` | `#D7DDE5` | 默认边框 |
| `--color-border-strong` | `#C3CBD7` | 分割线、强调边框 |
| `--color-border-subtle` | `#E8ECF1` | 轻分割线 |
| `--color-border-focus` | `#F97316` | 焦点边框 |

### 2.2 间距系统

以 4px 为基础单位：

```text
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64
```

使用规则：

| 场景 | 推荐间距 |
|---|---|
| 图标与文字 | 4px 或 6px |
| 同一行字段 | 4px / 8px |
| 表单字段上下 | 8px |
| 卡片内部 | 12px / 16px |
| 面板标题与内容 | 12px / 16px |
| 组件组之间 | 16px / 24px |
| 大区块之间 | 24px / 32px |
| 页面级留白 | 32px / 40px |

禁止：

- 使用 `5px`、`7px`、`9px`、`13px` 等没有语义的随机间距；
- 同一组件内部出现超过三种间距；
- 通过负 margin 修复本应由布局解决的对齐问题。

### 2.3 圆角

```text
0px   无圆角：分割线、表格结构
4px   sm：输入框、紧凑按钮
6px   md：普通按钮、行、标签
8px   lg：卡片、面板、浮层
12px  xl：大卡片、重要提示
999px pill：状态 Chip、圆形按钮、头像
```

### 2.4 字体

```css
--font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
--font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
```

字号层级：

| Token | 尺寸 | 用途 |
|---|---:|---|
| `xs` | 10px | 辅助、时间、预算单位 |
| `sm` | 12px | 默认控件、列表 |
| `md` | 13px | 默认正文 |
| `lg` | 14px | 面板标题、重要控件 |
| `xl` | 16px | 区块标题 |
| `2xl` | 18px | 页面/弹窗主标题 |

字重：默认 400；字段标题和 Tab 500；区块标题 600；页面主标题 700。

### 2.5 图标

统一使用 [Remix Icon](https://remixicon.com/)。

推荐引入方式：

```html
<link href="https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css" rel="stylesheet">
```

如果生产环境不能访问 CDN，应将 Remix Icon 字体或 SVG 子集放到项目自身资源中，不能退回 Emoji。

图标尺寸：

| Token | 尺寸 | 用途 |
|---|---:|---|
| `icon-xs` | 12px | 辅助标记 |
| `icon-sm` | 14px | 列表、行内操作 |
| `icon-md` | 16px | 默认按钮、Tab |
| `icon-lg` | 18px | 工具栏、重要按钮 |
| `icon-xl` | 20px | 空状态、主入口 |
| `icon-2xl` | 24px | 浮动工具、强调操作 |

图标命名建议：

| 场景 | Remix Icon |
|---|---|
| 新建 | `ri-add-line` |
| 保存 | `ri-save-3-line` |
| 导出 | `ri-download-2-line` |
| 导入 | `ri-upload-2-line` |
| 删除 | `ri-delete-bin-6-line` |
| 设置 | `ri-settings-3-line` |
| 搜索 | `ri-search-line` |
| 可见 | `ri-eye-line` |
| 隐藏 | `ri-eye-off-line` |
| 复制 | `ri-file-copy-line` |
| 播放 | `ri-play-fill` |
| 停止 | `ri-stop-fill` |
| 时间线 | `ri-film-line` |
| 资源 | `ri-folder-3-line` |
| 场景/空间 | `ri-landscape-line` |
| 位置/锚点 | `ri-map-pin-2-line` |
| 协作 | `ri-team-line` |
| AI | `ri-sparkling-2-line` |
| 发布 | `ri-rocket-2-line` |
| 警告 | `ri-alert-line` |
| 错误 | `ri-error-warning-line` |
| 成功 | `ri-checkbox-circle-line` |
| 更多 | `ri-more-2-fill` |
| 展开 | `ri-arrow-right-s-line` |
| 收起 | `ri-arrow-down-s-line` |
| 变换 | `ri-drag-move-2-line` |
| 旋转 | `ri-refresh-line` |
| 缩放 | `ri-expand-diagonal-line` |

图标使用规则：

- 重要操作使用“图标 + 文字”，不要只放图标；
- 纯图标按钮必须有 `title` 或可访问标签；
- 同一语义全局只能使用一个图标；
- 禁止使用 Emoji 作为功能图标；
- 图标和文字基线对齐，默认间距 6px；
- 删除、危险和发布图标不要使用装饰性动画。

---

## 3. 基础组件规范

### 3.1 Button

变体：

- `primary`：页面唯一或极少量主行动，如“发布”“确认”；
- `secondary`：普通操作，如“保存”“导入”；
- `ghost`：工具栏、次要操作；
- `danger`：删除、清空、撤销发布；
- `icon`：仅图标操作；
- `link`：跳转或查看详情。

状态：default / hover / pressed / active / disabled / loading。

规则：

- 默认高度 30px；紧凑场景 24px；弹窗主操作 36px；
- 按钮左右内边距 12px；图标与文字间距 6px；
- 一个操作区最多一个 primary；
- “发布”必须使用 primary，“删除”必须使用 danger 或 danger ghost；
- 按钮文案使用动词：保存、导入、发布、添加、删除、应用。

### 3.2 IconButton

适用于视口工具栏、列表行操作、时间线工具。

- 16px 图标，30px 点击区域；
- hover 使用 `surface.panelMuted`；
- active 使用 `selection.background` + `selection.border`；
- disabled 降低透明度，但保留操作位置；
- 必须有 `aria-label`。

### 3.3 Input / Select

- 默认高度 30px；
- 标签与输入框横向排列时，标签宽度统一；
- 数字输入要显示单位或轴向；
- 变换字段使用 X/Y/Z 的固定顺序；
- focus 只用橙色边框和浅色外环，不使用浏览器默认蓝色；
- 错误状态在字段下方显示简短原因，不只使用红色边框。

### 3.4 Chip / Badge

Chip 用于状态和分类，不用于承载长文案。

- 状态 Chip：成功、警告、错误、信息；
- 分类 Chip：资源类型、对象类型、节点标签；
- 操作 Chip：动作卡、筛选项，可点击；
- 文本尽量不超过 8 个汉字；
- 不使用阴影堆叠多个 Chip。

### 3.5 Panel / Card

面板结构：

```text
Panel
├─ PanelHeader：标题、数量、工具
├─ PanelToolbar：搜索、筛选、批量操作
├─ PanelBody：内容
└─ PanelFooter：状态、分页、确认
```

卡片只用于表达一个完整的配置组，不要每一行都包一张卡片。

### 3.6 Tree / List

- 行高默认 30px，紧凑行高 24px；
- 左侧图标、名称、辅助信息、右侧操作固定分区；
- 选中态使用浅橙背景 + 左侧 2px 橙色边线；
- hover 只改变背景，不改变布局；
- 删除、隐藏等操作默认弱化，hover 或聚焦时出现；
- 空列表必须显示原因和下一步行动。

### 3.7 Tabs

- 一级 Tab：面板级导航；
- 二级 Tab：对象属性分组；
- Tab 使用文字，不用图标替代；
- 选中态用文字颜色 + 2px 底边，不使用厚重胶囊；
- Tab 顺序保持稳定，不因内容临时变化而跳动。

### 3.8 Toast / Alert / Modal

| 组件 | 使用场景 |
|---|---|
| Toast | 已保存、已创建、已复制等短反馈 |
| Inline Alert | 某面板内持续存在的问题 |
| Modal | 发布检查、删除确认、重要配置 |
| Drawer/Popover | 局部高级配置、时间线关键帧编辑 |

规则：

- Toast 不承载需要用户决策的错误；
- 阻断发布的问题必须可点击定位；
- 删除确认必须说明影响对象；
- Modal 标题使用明确动词或结果，如“发布检查”“删除互动元素”；
- 所有弹层支持 Escape 关闭，确认按钮位置固定。

### 3.9 Empty / Loading / Error

每个异步模块至少定义：

- Empty：为什么为空 + 下一步按钮；
- Loading：加载对象和预计等待，不用无限旋转遮住整个编辑器；
- Error：发生什么 + 重试/替代方案；
- Partial：部分资源失败时，允许继续编辑并列出失败项。

示例：

```text
还没有空间底座
导入 SOG、PLY 或空间资源包后，可以开始布置互动元素
[导入空间底座]
```

---

## 4. 编辑器页面模板

### 4.1 顶栏模板

从左到右固定为：

```text
品牌/产品名 → 当前项目/场景 → 保存状态 → 编辑/试玩 → 协作 → 预览 → 发布
```

原则：

- 顶栏不塞入低频设置；
- 发布保持在右侧并使用 primary；
- 保存状态必须可见；
- 场景名过长使用省略，不挤压核心操作；
- 协作人数使用头像 + 数字，不使用长句。

### 4.2 左侧大纲模板

```text
[内容] [世界大纲]
[搜索]
[+ 章节] [+ 节点] / [+ 互动元素]

剧情/体验
├─ 章节
│  └─ 节点卡

场景对象
├─ 空间底座
├─ 互动元素
├─ 视觉素材
└─ 灯光/特效
```

左栏解决“我正在编辑什么”和“场景里有哪些东西”，不承担复杂属性编辑。

### 4.3 Viewport 模板

Viewport 顶部：视图切换、Gizmo、吸附、框选、锁地面。

Viewport 左侧：点选、移动、旋转、缩放、锚点/标注。

Viewport 内：对象标签、锚点、触发区域、底座分块、加载状态。

Viewport 右下：小地图、性能状态、当前选中对象摘要。

### 4.4 Inspector 模板

```text
对象名称 + 类型 + 状态 Chip
[基础] [材质] [交互] [高级]

变换
资源与显示
空间归属
交互规则
评论与历史
```

字段分组要以运营人员理解的语义为主，底层字段名称只作为高级信息出现。

### 4.5 Dock 模板

```text
[资源] [互动组件] [时间线] [日志]

资源筛选 / 搜索 / 导入
资源卡片或列表

底部：资源体积 · 对象数 · 视频路数 · 预估 FPS · 检查状态
```

素材、组件、时间线必须能互相跳转：选中资源可以定位引用对象，选中组件可以定位空间对象和交互规则。

---

## 5. 资源库组件规范

资源库要从“素材卡片”升级为“空间互动资源库”。每张资源卡片至少显示：

- 缩略图或类型图标；
- 名称；
- 资源类型；
- 版本；
- 文件大小/时长/尺寸；
- 状态：已加载、缺失、待处理、冲突；
- 使用次数；
- 当前项目是否引用。

筛选维度：

- 资源类型：底座、模型、图片、视频、音频、特效、字体、图标、模板；
- 来源：内置、项目、景区公共库、组织公共库、生成；
- 状态：可用、缺失、处理中、需要替换；
- 标签：区域、主题、季节、活动、语言、设备；
- 性能：轻量、标准、高质量。

推荐的资源详情侧栏：

```text
资源预览
基本信息
版本与来源
使用位置
依赖资源
目标设备变体
授权与备注
```

---

## 6. 互动组件模板库

新增互动功能时，优先作为“组件模板”设计，而不是在对象上继续增加零散字段。

### 基础组件

- 点击展示卡片；
- 注视高亮；
- 进入区域触发；
- 按住完成；
- 路径/区域触发；
- 音频讲解点；
- 视频讲解点；
- 线索收集点；
- 奖励/徽章点；
- 角色出场；
- 灯光/粒子反馈；
- 多对象联动；
- 定时活动内容。

### 组件配置结构

```text
组件名称
├─ 空间目标：对象 / 区域 / 锚点
├─ 触发条件：点击 / 注视 / 进入 / 时间 / 前置完成
├─ 响应动作：显示 / 播放 / 高亮 / 弹卡 / 跳转 / 奖励
├─ 内容参数：文案 / 素材 / 音频 / 多语言
├─ 重复策略：只执行一次 / 可重复 / 冷却时间
├─ 设备策略：桌面 / 移动 / AR / 大屏
└─ 运行检查：依赖、资源、性能、定位
```

组件卡片必须提供：

- 一句话说明；
- 适用场景；
- 需要的资源；
- 可配置参数；
- 预览效果；
- 添加后创建的实体列表；
- 删除或解绑的影响。

---

## 7. 图标与可访问性规则

- 所有按钮、图标和状态颜色不能只依赖颜色表达；
- 警告、错误和成功必须同时配图标或文字；
- 可点击区域至少 30×30px；
- 颜色对比度满足 WCAG AA 的基本要求；
- 键盘可访问：Tab、Enter、Escape、方向键和快捷键不冲突；
- 输入框有 label 或 aria-label；
- Tooltip 只解释图标，不替代关键业务文案；
- Viewport 工具必须在 hover 时显示名称和快捷键。

---

## 8. 代码落地规则

### 8.1 CSS

- 所有颜色、间距、圆角、字号、阴影引用 CSS Token；
- Token 统一写在 `:root`；
- 业务模块禁止写新的十六进制颜色；
- 业务模块禁止临时写 `style.cssText` 定义组件视觉，除非是动态位置或动态尺寸；
- 组件状态用 class 表达，不用行内样式表达；
- 优先复用 `.btn`、`.tab`、`.field`、`.det-card`、`.chip`、`.panel` 等基础类。

### 8.2 JavaScript

建议提供统一的图标辅助方法：

```js
export function icon(name, label = '') {
  const el = document.createElement('i')
  el.className = `ri-${name}`
  if (label) el.setAttribute('aria-label', label)
  return el
}
```

建议提供统一的按钮和状态组件工厂：

```js
button({ label, icon: 'save-3-line', variant: 'secondary', size: 'md' })
statusChip({ label: '素材已加载', tone: 'success' })
emptyState({ icon: 'folder-open-line', title, description, action })
```

组件工厂应统一处理：

- class；
- 图标；
- disabled；
- loading；
- title/aria-label；
- click 事件；
- tooltip。

### 8.3 新功能提交前检查

新增 UI 功能必须回答：

- 是否复用了现有组件？
- 是否使用 Design Token？
- 是否使用 Remix Icon？
- 是否定义 hover/active/disabled/error 状态？
- 是否支持空、加载、错误状态？
- 是否影响 Viewport 主工作区？
- 是否需要同步更新组件文档？
- 是否需要补充发布检查或资源检查？

---

## 9. 当前代码库的设计系统落地顺序

### 第一步：清理基础 Token

- 用 `docs/design-tokens.json` 对齐 `editor/src/style.css`；
- 清理重复 CSS 变量和历史命名；
- 将颜色、字号、圆角、间距统一到 Token；
- 统一按钮、输入框、Tab、Card、Chip、Modal。

### 第二步：接入 Remix Icon

- 在 `editor/index.html` 引入 Remix Icon 或本地字体；
- 将顶栏、左栏、视口工具栏、Dock、右栏中的 Emoji/Unicode 图标替换为 Remix Icon；
- 建立 `ui/icon.js` 和图标命名表；
- 禁止新模块继续直接写 Emoji 图标。

### 第三步：建立基础组件工厂

建议新增：

```text
editor/src/ui/components/
├─ icon.js
├─ button.js
├─ field.js
├─ chip.js
├─ card.js
├─ modal.js
├─ toast.js
├─ empty-state.js
└─ index.js
```

### 第四步：按区域逐步收敛

顺序建议：

1. 顶栏；
2. 左侧大纲；
3. 右侧 Inspector；
4. 底部 Dock；
5. Viewport Chrome；
6. AI、协作、发布检查等浮层。

不要一次重写所有模块；每个区域完成后都要做截图验收和交互回归。

---

## 10. 验收清单

### 视觉一致性

- [ ] 新增颜色全部来自 Token；
- [ ] 新增间距全部来自 4px 网格；
- [ ] 新增圆角和阴影来自 Token；
- [ ] 图标全部来自 Remix Icon；
- [ ] 同级控件高度一致；
- [ ] 面板、卡片、浮层层级清晰；
- [ ] Viewport 仍然是视觉主区域。

### 交互一致性

- [ ] 所有按钮有明确动词；
- [ ] 所有图标按钮有 Tooltip/aria-label；
- [ ] 所有组件有 hover/active/disabled 状态；
- [ ] 所有异步流程有 loading/error；
- [ ] 删除和发布操作可确认、可定位、可回滚；
- [ ] 键盘快捷键与输入框不冲突；
- [ ] 选中对象后，Outliner、Viewport、Inspector、Timeline 状态一致。

### 产品一致性

- [ ] 新增资源有类型、版本、来源和依赖；
- [ ] 新增互动元素能被发布检查覆盖；
- [ ] 新增组件能复用到其他项目；
- [ ] 新增字段对运营人员可理解；
- [ ] 底座、锚点和对象关系可追踪；
- [ ] 新增功能没有把一次性 Demo 逻辑写死在 UI 内。


---

## 10. UI 升级说明（v2.0）

本次升级不改变编辑器的信息架构，重点修正“面板堆叠、层级平、操作不聚焦”的问题。

### 10.1 视觉方向
从“瓷白橙光”升级为 **深色应用栏 × 中性工作区 × 暖橙行动色**：顶部应用栏承担全局导航与发布动作；左右面板保持低对比中性灰；Viewport 保持最大视觉面积；橙色只用于选中、焦点、发布和可执行动作。

### 10.2 布局规格
| 区域 | v2 规格 | 设计意图 |
|---|---:|---|
| 顶部应用栏 | 52px | 提升品牌与全局操作的稳定感 |
| 左侧大纲 | 276px | 保证章节、节点和对象名称可读 |
| 右侧 Inspector | 336px | 减少字段拥挤，提升属性编辑效率 |
| 底部 Dock | 240px | 让素材浏览与时间线成为完整工作区 |

### 10.3 视觉层级规则
1. 全局层：顶栏使用 `surface.chrome`，只容纳项目、模式、预览、发布和协作。
2. 工作层：左右面板使用 `surface.panel`，分组标题使用 `surface.panelSoft`。
3. 内容层：输入框、资源卡片和 Inspector 卡片使用白色 raised surface，但不再叠加大面积阴影。
4. 行为层：`brand.primary` 只表达“现在可执行/正在选中”，不用于普通分割和装饰。
5. Viewport 层：工具条为浮层，面板不覆盖场景核心区域；小地图和工具按钮保持低存在感。

### 10.4 从旧版迁移
- `#f8f9fa` / `#f0f3f5` 替代原先偏黄的面板层，减少“卡片拼贴感”。
- `surface.chrome = #20262e` 作为新的应用栏底色。
- `control.topbar = 52px`、`outliner = 276px`、`details = 336px`、`dock = 240px`。
- 阴影仅用于浮层、弹窗和悬浮工具条；普通卡片使用边框，不使用边框与大阴影叠加。
- 选中态统一为 `brand.primary-soft + brand.primary`，禁止组件自行发明选中色。

### 10.5 验收清单
- [ ] 首屏能区分全局层、面板层、Viewport 层和 Dock 层。
- [ ] 同一屏最多一个高饱和主按钮，发布动作始终可见。
- [ ] 左右面板滚动不影响 Viewport，Dock 可拖动且不遮挡核心内容。
- [ ] 所有可点击行均有 hover、focus-visible、active/selected 状态。
- [ ] 关闭 reduced motion 时，布局和内容仍然完整可见。

---

## 11. 参考图二对齐升级（v3.0）

### 11.1 设计定位

v3.0 采用 **浅色专业空间编辑器** 作为统一方向：白色应用栏、白色属性面板、浅灰工具层、冷蓝灰 Viewport 底色，以及低面积暖橙行动色。参考对象是空间编辑器/3D 内容工具，而不是普通后台表单。

核心判断：界面设计感来自**网格、密度、层级和组件状态的一致性**，不是来自额外装饰。

### 11.2 参考图二提取出的布局规则

| 区域 | 规格 | 规则 |
|---|---:|---|
| 应用顶栏 | 52px | 白底；品牌、场景、模式、预览、发布和协作状态同一水平线 |
| 左侧大纲 | 304px | Tab、搜索、章节树、场景对象分层；选中行使用浅橙底和 3px 行标记 |
| Viewport | 自适应 | 保持最大面积；工具条靠左上；工具列靠左；小地图靠右下 |
| Inspector | 368px | 标题、对象状态、属性 Tab、分组卡片纵向连续排列 |
| Dock Tab | 42px | 资源库、互动组件、时间线、输出日志共享同一 Tab 组件 |
| 资源卡片 | 100 × 112px | 缩略图 56px；文件名 25px；大小 15px；导入卡完全同高 |

### 11.3 颜色 Token v3

| Token | 值 | 用途 |
|---|---|---|
| `surface.canvas` | `#F3F5F7` | 页面外层背景 |
| `surface.panel` | `#FFFFFF` | 左右面板、Dock、顶栏 |
| `surface.panelMuted` | `#F4F6F8` | Tab、工具条、搜索区 |
| `surface.panelSoft` | `#F7F9FA` | 列表组标题、资源浏览区 |
| `surface.panelSunken` | `#EEF2F5` | 输入区和时间线轨道 |
| `surface.viewport` | `#DCE6EE` | 无底座 Viewport 背景 |
| `brand.primary` | `#F56C16` | 发布、选中、播放头、焦点 |
| `selection.background` | `#FFF1E7` | 选中行、选中工具、选中对象 |
| `text.primary` | `#25313C` | 主文本 |
| `text.secondary` | `#667482` | 标签、辅助文本 |
| `border.default` | `#D9E1E8` | 主要边界 |
| `border.subtle` | `#E7ECF0` | 轻分割线 |

颜色使用比例：中性表面约 85%，边界和辅助层约 12%，橙色行动色不超过 3%。

### 11.4 Tab 组件

Tab 统一使用：

- 高度 `40px`（Dock 为 `42px`）；
- 默认 `text.secondary`，字重 500；
- Hover 使用 `surface.panelMuted`；
- Active 使用白底、`brand.primary` 文本、底部 `3px` 橙色指示条；
- Focus-visible 使用 `2px` 橙色描边；
- 禁止通过厚重阴影、渐变或整块高饱和色区分 Active。

### 11.5 资源卡片与导入卡

资源卡和导入卡必须共用以下几何尺寸：

```text
width: 100px
height: 112px
thumbnail: 56px
border-radius: 8px
```

导入卡使用虚线边框、上传图标和“导入素材”标签。它不是一个更高的按钮，也不能因为内容较少而撑开卡片高度。

资源删除按钮固定在缩略图右上角，默认隐藏，在 Hover 或 Focus 时出现；危险操作使用 `danger` 语义。

### 11.6 Inspector 坐标组件

XYZ 输入必须使用固定四列结构：

```text
字段名 | X 输入 | Y 输入 | Z 输入 | 可选操作
```

轴标签位于输入框上方，使用小号 mono 字体；X/Y/Z 使用低饱和轴向颜色，仅用于识别，不作为状态色。数字输入使用 tabular numerals，焦点统一使用橙色外环。

### 11.7 Switch 组件

- 尺寸：`38 × 22px`；
- 关闭：`#DFE5EA` 轨道；
- 开启：`brand.primary` 轨道；
- 白色滑块 `14px`，带单级轻阴影；
- 必须提供 `aria-pressed`；
- Hover、Focus、Disabled 都要保持可识别。

### 11.8 按钮与关闭按钮

- 普通按钮：白底、`border.default`、`6px` 圆角；
- Primary：`brand.primary`，一个操作组最多一个；
- 关闭按钮：优先使用 30px icon button；Hover 使用浅橙底，危险删除使用红色；
- 禁止使用孤立的浏览器默认 `X`、Emoji 或未对齐的文字关闭操作。

### 11.9 v3 验收清单

- [ ] 顶栏、左栏、右栏、Dock 使用同一套白色工作区语言。
- [ ] 左侧 Tab 和 Dock Tab 的 Active 状态一致。
- [ ] 所有资源卡片和导入卡片严格等高。
- [ ] Inspector 所有 XYZ 字段轴标签位于输入框上方且列对齐。
- [ ] Toggle 的开关状态、焦点状态、禁用状态可被识别。
- [ ] 删除 / 关闭按钮不再出现孤立的黑色 X。
- [ ] Viewport 工具条和 Rail 均有 default / hover / active / disabled 状态。
- [ ] 资源浏览器、时间线、输出日志的底部状态栏保持一致。


## 12. v3.1 交互与底座补充

### 12.1 Viewport 工具 Rail

Rail 中的每个图标按钮都使用固定的 flex 居中盒，不依赖字体基线定位。点击区域 `38 × 38px`，图标视觉盒 `18 × 18px`，Active 使用浅橙背景和橙色边框。

### 12.2 互动组件卡片

互动组件卡片不再使用无语义的空色块。左侧图标区域是 `38 × 38px` 的功能锚点，中部承载名称、描述和触发方式，右侧为“添加”操作。没有选中对象时，顶部提供明确的选择提示，不将不可用按钮伪装成可用操作。

### 12.3 时间线

时间线由四层构成：

1. Tab 层：资源库 / 互动组件 / 时间线 / 输出日志；
2. 工具层：时间线选择、时长、播放、停止、缩放、适配、改名、删除、新建；
3. 编辑层：吸顶标尺、轨道、关键帧和播放头；
4. 添加层：轨道类型、目标对象和“轨道”按钮。

每条轨道支持选择目标对象、双击添加关键帧、拖动调整时间、点击关键帧打开属性编辑器，并支持位移 / 旋转 / 缩放分轴编辑。关键帧编辑浮层包含时间、缓动、分轴数值、关闭和删除操作。

### 12.4 PLY 高斯泼溅上传

底座 Inspector 已恢复本地上传工作流：

- 支持 `.ply`、`.sog`、`.spz`、`.splat`、`.ksplat`；
- 文件会创建为素材并记录 `local://` 地址；
- 浏览器使用 Blob URL 进行本地预览；
- 上传后自动绑定为当前空间底座并触发加载；
- 根据扩展名显式传递 `SceneFormat.Ply / Splat / KSplat`；
- 加载过程显示底座进度，失败的分块单独记录，不阻塞其他分块；
- 不承诺任意 PLY 都能正常显示：必须是包含 Gaussian Splat 属性的 PLY，而不是普通点云 PLY；大规模模型仍受浏览器显存、Worker、排序和设备性能限制。

碰撞体上传单独支持 `.glb` / `.gltf`，用于地面落点、区域约束和碰撞可视化，不将 Collider 与高斯 PLY 混为一个文件。
