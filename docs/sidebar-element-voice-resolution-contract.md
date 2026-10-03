# 固定元素语音与标签解析契约

> 版本：v1.0.0｜供 ASR、LLM、编辑器和 Runtime 共同使用。

## 1. 目标

把“椅子”“一个能坐的椅子”“添加家具椅子”等自然语言稳定映射到目录元素 `furniture.chair`，再把“那把椅子”映射到已创建的场景实例 `object.id`。目录元素和实例必须分开。

## 2. 稳定字段

| 字段 | 示例 | 作用 |
|---|---|---|
| `element_id` | `furniture.chair` | 目录元素的 canonical ID，负责创建新实例 |
| `voice_token` | `xj.element.furniture.chair` | 跨 ASR、LLM、编辑器的不可变 token |
| `object_id` | `compound_k3x91a` | 场景中某一个实例的唯一编辑目标 |
| `name` | `椅子` | 展示名称，不能作为实例唯一 ID |
| `aliases` | `椅子\|家具\|可推动` | 语音/文本召回词 |

完整目录和 token 在 [`sidebar-element-asset-table.json`](sidebar-element-asset-table.json)。

## 3. 解析顺序

```text
1. exact voice_token
2. exact element_id
3. 中文名称 exact alias
4. alias / tag / preset 归一化匹配
5. 模糊召回，最多 8 个候选
6. 多候选必须询问，不允许静默猜测
```

归一化：去空格、标点、大小写；不要删除具有区分意义的数字或颜色词。

## 4. 添加新元素

用户：`我要在这边加一个椅子`

```json
{
  "intent": "add_element",
  "element_id": "furniture.chair",
  "voice_token": "xj.element.furniture.chair",
  "placement": { "source": "latest_viewport_point" },
  "overrides": {}
}
```

编辑器执行后：

```json
{
  "object_id": "compound_xxx",
  "element_id": "furniture.chair",
  "voice_token": "xj.element.furniture.chair",
  "name": "椅子"
}
```

目录 token 不写入 `scene.meta.assets`；实例写入 `scene.objects`。

## 5. 修改已有实例

用户：`把那把椅子移到桌子旁边`

1. 先收集当前场景中 `element_id=furniture.chair` 的实例。
2. 如果当前选中对象是椅子，优先使用当前选择。
3. 如果只有一个椅子，使用它的 `object_id`。
4. 如果有多个，返回候选：

```json
{
  "intent": "clarify_instance",
  "query": "椅子",
  "candidates": [
    { "object_id": "obj_a", "name": "椅子", "index": 1, "position": [0, 0, -3] },
    { "object_id": "obj_b", "name": "椅子", "index": 2, "position": [2, 0, -3] }
  ],
  "question": "你要移动哪一把椅子？"
}
```

确认可以使用 `object_id`、候选序号、当前选中状态或“左边/右边/最近”等空间限定词。确认前不得生成 `update_object`。

## 6. 与现有 AI ops 的映射

| 语音意图 | AI op | 必要 ID |
|---|---|---|
| 添加目录元素 | `add_element` | `element_id` 或 `voice_token` |
| 修改已有实例 | `update_object` | `object_id` |
| 删除已有实例 | `remove_object` | `object_id` |
| 添加默认反馈 | 创建实例时由工厂生成；或单独 `add_trigger` | `object_id` |
| 用户取消 | 不产生 op | 无 |

## 7. 错误处理

- 无匹配：回复“没有找到这个固定元素”，展示 3 个相近类目或建议词。
- 多个目录命中：列出目录名称和 token，不创建对象。
- 多个场景实例命中：列出 object_id、展示名、序号和位置，不修改对象。
- token 过期/目录版本不兼容：保留 `element_id`，使用实例快照/占位，并记录日志。
- ASR 不确定：保留原始转写和置信度，由 LLM 进入澄清，不要把低置信度直接变成执行 op。

## 8. 最小联调样例

```text
ASR: 我要在这边加一个椅子
resolver: xj.element.furniture.chair
LLM: add_element(element_id=furniture.chair)
editor: object_id=obj_xxx
ASR: 把那把椅子移到右边
resolver: [obj_xxx]
LLM: update_object(id=obj_xxx, patch={transform:{...}})
```
