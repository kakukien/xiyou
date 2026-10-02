// Generated from docs/sidebar-element-asset-table.json. Run: npm run elements:generate
export const ELEMENT_CATALOG = [
  {
    "id": "furniture.box",
    "name": "盒子",
    "render": {
      "kind": "compound",
      "preset": "box"
    },
    "interactionProfiles": [
      "static",
      "pushable",
      "pickup_throw"
    ],
    "priority": "P0",
    "tags": [
      "盒子",
      "基础",
      "可推动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.8,
        0.8,
        0.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.furniture.box",
      "aliases": [
        "盒子",
        "基础",
        "可推动",
        "box",
        "furniture box",
        "furniture.box"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "furniture",
    "categoryName": "家居与室内"
  },
  {
    "id": "furniture.crate",
    "name": "木箱",
    "render": {
      "kind": "compound",
      "preset": "crate"
    },
    "interactionProfiles": [
      "static",
      "pushable",
      "pickup_throw",
      "openable"
    ],
    "priority": "P0",
    "tags": [
      "木箱",
      "容器",
      "可打开"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.9,
        0.9,
        0.9
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.furniture.crate",
      "aliases": [
        "木箱",
        "容器",
        "可打开",
        "crate",
        "furniture crate",
        "furniture.crate"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "furniture",
    "categoryName": "家居与室内"
  },
  {
    "id": "furniture.table",
    "name": "桌子",
    "render": {
      "kind": "compound",
      "preset": "table"
    },
    "interactionProfiles": [
      "static",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "桌子",
      "家具",
      "平台"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.2,
        1,
        1.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 6,
      "maxDrawCalls": 6,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.furniture.table",
      "aliases": [
        "桌子",
        "家具",
        "平台",
        "table",
        "furniture table",
        "furniture.table"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "furniture",
    "categoryName": "家居与室内"
  },
  {
    "id": "furniture.chair",
    "name": "椅子",
    "render": {
      "kind": "compound",
      "preset": "chair"
    },
    "interactionProfiles": [
      "static",
      "pushable"
    ],
    "priority": "P0",
    "tags": [
      "椅子",
      "家具",
      "可推动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.75,
        0.75,
        0.75
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 6,
      "maxDrawCalls": 6,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.furniture.chair",
      "aliases": [
        "椅子",
        "家具",
        "可推动",
        "chair",
        "furniture chair",
        "furniture.chair"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "furniture",
    "categoryName": "家居与室内"
  },
  {
    "id": "furniture.stool",
    "name": "凳子",
    "render": {
      "kind": "compound",
      "preset": "stool"
    },
    "interactionProfiles": [
      "static",
      "pushable"
    ],
    "priority": "P0",
    "tags": [
      "凳子",
      "家具",
      "可推动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.6,
        0.6,
        0.6
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.furniture.stool",
      "aliases": [
        "凳子",
        "家具",
        "可推动",
        "stool",
        "furniture stool",
        "furniture.stool"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "furniture",
    "categoryName": "家居与室内"
  },
  {
    "id": "furniture.bench",
    "name": "长凳",
    "render": {
      "kind": "compound",
      "preset": "bench"
    },
    "interactionProfiles": [
      "static",
      "pushable"
    ],
    "priority": "P1",
    "tags": [
      "长凳",
      "家具",
      "平台"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        0.8,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 6,
      "maxDrawCalls": 6,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.furniture.bench",
      "aliases": [
        "长凳",
        "家具",
        "平台",
        "bench",
        "furniture bench",
        "furniture.bench"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "furniture",
    "categoryName": "家居与室内"
  },
  {
    "id": "furniture.cabinet",
    "name": "柜子",
    "render": {
      "kind": "compound",
      "preset": "cabinet"
    },
    "interactionProfiles": [
      "static",
      "openable"
    ],
    "priority": "P1",
    "tags": [
      "柜子",
      "家具",
      "开合"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        1.2,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.furniture.cabinet",
      "aliases": [
        "柜子",
        "家具",
        "开合",
        "cabinet",
        "furniture cabinet",
        "furniture.cabinet"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "furniture",
    "categoryName": "家居与室内"
  },
  {
    "id": "furniture.shelf",
    "name": "货架",
    "render": {
      "kind": "compound",
      "preset": "shelf"
    },
    "interactionProfiles": [
      "static",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "货架",
      "家具",
      "陈列"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        1.3,
        0.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 6,
      "maxDrawCalls": 6,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.furniture.shelf",
      "aliases": [
        "货架",
        "家具",
        "陈列",
        "shelf",
        "furniture shelf",
        "furniture.shelf"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "furniture",
    "categoryName": "家居与室内"
  },
  {
    "id": "furniture.barrel",
    "name": "木桶",
    "render": {
      "kind": "compound",
      "preset": "barrel"
    },
    "interactionProfiles": [
      "static",
      "pushable",
      "pickup_throw"
    ],
    "priority": "P1",
    "tags": [
      "木桶",
      "容器",
      "滚动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "cylinder",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.65,
        0.9,
        0.65
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.furniture.barrel",
      "aliases": [
        "木桶",
        "容器",
        "滚动",
        "barrel",
        "furniture barrel",
        "furniture.barrel"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "furniture",
    "categoryName": "家居与室内"
  },
  {
    "id": "furniture.lamp",
    "name": "台灯",
    "render": {
      "kind": "compound",
      "preset": "lamp"
    },
    "interactionProfiles": [
      "static",
      "tap_feedback",
      "switchable"
    ],
    "priority": "P1",
    "tags": [
      "台灯",
      "开关",
      "灯光"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.45,
        0.7,
        0.45
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.furniture.lamp",
      "aliases": [
        "台灯",
        "开关",
        "灯光",
        "lamp",
        "furniture lamp",
        "furniture.lamp"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "furniture",
    "categoryName": "家居与室内"
  },
  {
    "id": "furniture.rug",
    "name": "地毯",
    "render": {
      "kind": "compound",
      "preset": "rug"
    },
    "interactionProfiles": [
      "static",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "地毯",
      "地面",
      "装饰"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.5,
        0.05,
        1.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.furniture.rug",
      "aliases": [
        "地毯",
        "地面",
        "装饰",
        "rug",
        "furniture rug",
        "furniture.rug"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "furniture",
    "categoryName": "家居与室内"
  },
  {
    "id": "furniture.screen",
    "name": "桌面屏幕",
    "render": {
      "kind": "quad",
      "preset": "screen"
    },
    "interactionProfiles": [
      "static",
      "display",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "屏幕",
      "展示",
      "信息"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        1,
        1
      ]
    },
    "assetPolicy": "optional-external",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": true,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.furniture.screen",
      "aliases": [
        "桌面屏幕",
        "屏幕",
        "展示",
        "信息",
        "screen",
        "furniture screen",
        "furniture.screen"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "furniture",
    "categoryName": "家居与室内"
  },
  {
    "id": "environment.house",
    "name": "房子",
    "render": {
      "kind": "compound",
      "preset": "house"
    },
    "interactionProfiles": [
      "static",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "房子",
      "建筑",
      "场景"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        2.5,
        2.5,
        2.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 6,
      "maxDrawCalls": 6,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.house",
      "aliases": [
        "房子",
        "建筑",
        "场景",
        "house",
        "environment house",
        "environment.house"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.cabin",
    "name": "小屋",
    "render": {
      "kind": "compound",
      "preset": "cabin"
    },
    "interactionProfiles": [
      "static",
      "openable"
    ],
    "priority": "P1",
    "tags": [
      "小屋",
      "建筑",
      "入口"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        2,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 6,
      "maxDrawCalls": 6,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.cabin",
      "aliases": [
        "小屋",
        "建筑",
        "入口",
        "cabin",
        "environment cabin",
        "environment.cabin"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.wall",
    "name": "墙体",
    "render": {
      "kind": "compound",
      "preset": "wall"
    },
    "interactionProfiles": [
      "static",
      "helper"
    ],
    "priority": "P0",
    "tags": [
      "墙",
      "建筑",
      "遮挡"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        1.5,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.wall",
      "aliases": [
        "墙体",
        "墙",
        "建筑",
        "遮挡",
        "wall",
        "environment wall",
        "environment.wall"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.fence",
    "name": "栅栏",
    "render": {
      "kind": "compound",
      "preset": "fence"
    },
    "interactionProfiles": [
      "static",
      "pushable"
    ],
    "priority": "P1",
    "tags": [
      "栅栏",
      "边界",
      "建筑"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.5,
        0.8,
        0.15
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.fence",
      "aliases": [
        "栅栏",
        "边界",
        "建筑",
        "fence",
        "environment fence",
        "environment.fence"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.gate",
    "name": "大门",
    "render": {
      "kind": "compound",
      "preset": "gate"
    },
    "interactionProfiles": [
      "static",
      "openable",
      "switchable"
    ],
    "priority": "P0",
    "tags": [
      "大门",
      "机关",
      "开合"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.8,
        2,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.gate",
      "aliases": [
        "大门",
        "机关",
        "开合",
        "gate",
        "environment gate",
        "environment.gate"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.bridge",
    "name": "桥",
    "render": {
      "kind": "compound",
      "preset": "bridge"
    },
    "interactionProfiles": [
      "static",
      "triggerable"
    ],
    "priority": "P1",
    "tags": [
      "桥",
      "通道",
      "路径"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        0.4,
        3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.bridge",
      "aliases": [
        "桥",
        "通道",
        "路径",
        "bridge",
        "environment bridge",
        "environment.bridge"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.stairs",
    "name": "台阶",
    "render": {
      "kind": "compound",
      "preset": "stairs"
    },
    "interactionProfiles": [
      "static",
      "helper"
    ],
    "priority": "P1",
    "tags": [
      "台阶",
      "地形",
      "通道"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.5,
        0.8,
        1.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.stairs",
      "aliases": [
        "台阶",
        "地形",
        "通道",
        "stairs",
        "environment stairs",
        "environment.stairs"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.tree",
    "name": "树",
    "render": {
      "kind": "compound",
      "preset": "tree"
    },
    "interactionProfiles": [
      "static",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "树",
      "自然",
      "环境"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.5,
        2.5,
        1.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 6,
      "maxDrawCalls": 6,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.tree",
      "aliases": [
        "树",
        "自然",
        "环境",
        "tree",
        "environment tree",
        "environment.tree"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.shrub",
    "name": "灌木",
    "render": {
      "kind": "compound",
      "preset": "shrub"
    },
    "interactionProfiles": [
      "static"
    ],
    "priority": "P1",
    "tags": [
      "灌木",
      "自然",
      "装饰"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.9,
        0.7,
        0.9
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.shrub",
      "aliases": [
        "灌木",
        "自然",
        "装饰",
        "shrub",
        "environment shrub",
        "environment.shrub"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.flower",
    "name": "花丛",
    "render": {
      "kind": "compound",
      "preset": "flower"
    },
    "interactionProfiles": [
      "static",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "花",
      "自然",
      "装饰"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.8,
        0.5,
        0.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.flower",
      "aliases": [
        "花丛",
        "花",
        "自然",
        "装饰",
        "flower",
        "environment flower",
        "environment.flower"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.rock",
    "name": "岩石",
    "render": {
      "kind": "compound",
      "preset": "rock"
    },
    "interactionProfiles": [
      "static",
      "pushable"
    ],
    "priority": "P0",
    "tags": [
      "岩石",
      "自然",
      "障碍"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "sphere",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        0.8,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.rock",
      "aliases": [
        "岩石",
        "自然",
        "障碍",
        "rock",
        "environment rock",
        "environment.rock"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.boulder",
    "name": "巨石",
    "render": {
      "kind": "compound",
      "preset": "boulder"
    },
    "interactionProfiles": [
      "static",
      "pushable"
    ],
    "priority": "P1",
    "tags": [
      "巨石",
      "自然",
      "障碍"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "sphere",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.8,
        1.5,
        1.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.boulder",
      "aliases": [
        "巨石",
        "自然",
        "障碍",
        "boulder",
        "environment boulder",
        "environment.boulder"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.signpost",
    "name": "路牌",
    "render": {
      "kind": "compound",
      "preset": "signpost"
    },
    "interactionProfiles": [
      "static",
      "display",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "路牌",
      "指引",
      "文字"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.6,
        1.2,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.signpost",
      "aliases": [
        "路牌",
        "指引",
        "文字",
        "signpost",
        "environment signpost",
        "environment.signpost"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.lamp_post",
    "name": "路灯",
    "render": {
      "kind": "compound",
      "preset": "lamp_post"
    },
    "interactionProfiles": [
      "static",
      "switchable"
    ],
    "priority": "P1",
    "tags": [
      "路灯",
      "灯光",
      "环境"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.5,
        2,
        0.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.lamp_post",
      "aliases": [
        "路灯",
        "灯光",
        "环境",
        "lamp_post",
        "environment lamp_post",
        "environment.lamp_post"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "environment.well",
    "name": "井",
    "render": {
      "kind": "compound",
      "preset": "well"
    },
    "interactionProfiles": [
      "static",
      "openable",
      "triggerable"
    ],
    "priority": "P2",
    "tags": [
      "水井",
      "建筑",
      "探索"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "cylinder",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.1,
        0.8,
        1.1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.environment.well",
      "aliases": [
        "井",
        "水井",
        "建筑",
        "探索",
        "well",
        "environment well",
        "environment.well"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "environment",
    "categoryName": "建筑与自然环境"
  },
  {
    "id": "volume.water_surface",
    "name": "水面",
    "render": {
      "kind": "effect",
      "preset": "water_surface"
    },
    "interactionProfiles": [
      "static",
      "volume_effect",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "水",
      "水面",
      "反射"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        0.05,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.water_surface",
      "aliases": [
        "水面",
        "水",
        "反射",
        "water_surface",
        "volume water_surface",
        "volume.water_surface"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.stream",
    "name": "溪流",
    "render": {
      "kind": "effect",
      "preset": "stream"
    },
    "interactionProfiles": [
      "static",
      "volume_effect",
      "triggerable"
    ],
    "priority": "P1",
    "tags": [
      "水",
      "溪流",
      "流动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        3,
        0.05,
        0.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.stream",
      "aliases": [
        "溪流",
        "水",
        "流动",
        "stream",
        "volume stream",
        "volume.stream"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.pool",
    "name": "水池",
    "render": {
      "kind": "effect",
      "preset": "pool"
    },
    "interactionProfiles": [
      "static",
      "volume_effect",
      "triggerable"
    ],
    "priority": "P1",
    "tags": [
      "水",
      "水池",
      "区域"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        2.5,
        0.25,
        2.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.pool",
      "aliases": [
        "水池",
        "水",
        "区域",
        "pool",
        "volume pool",
        "volume.pool"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.ice_patch",
    "name": "冰面",
    "render": {
      "kind": "compound",
      "preset": "ice_patch"
    },
    "interactionProfiles": [
      "static",
      "physics",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "冰",
      "冰面",
      "滑动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        0.04,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.ice_patch",
      "aliases": [
        "冰面",
        "冰",
        "滑动",
        "ice_patch",
        "volume ice_patch",
        "volume.ice_patch"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.ice_wall",
    "name": "冰墙",
    "render": {
      "kind": "compound",
      "preset": "ice_wall"
    },
    "interactionProfiles": [
      "static",
      "pushable"
    ],
    "priority": "P1",
    "tags": [
      "冰",
      "墙",
      "障碍"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.5,
        1.5,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.ice_wall",
      "aliases": [
        "冰墙",
        "冰",
        "墙",
        "障碍",
        "ice_wall",
        "volume ice_wall",
        "volume.ice_wall"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.stone_block",
    "name": "石块",
    "render": {
      "kind": "compound",
      "preset": "stone_block"
    },
    "interactionProfiles": [
      "static",
      "pushable",
      "pickup_throw"
    ],
    "priority": "P0",
    "tags": [
      "石块",
      "石头",
      "基础"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.8,
        0.8,
        0.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.stone_block",
      "aliases": [
        "石块",
        "石头",
        "基础",
        "stone_block",
        "volume stone_block",
        "volume.stone_block"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.sand_patch",
    "name": "沙地",
    "render": {
      "kind": "effect",
      "preset": "sand_patch"
    },
    "interactionProfiles": [
      "static",
      "volume_effect"
    ],
    "priority": "P1",
    "tags": [
      "沙地",
      "地面",
      "材质"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        2.5,
        0.03,
        2.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.sand_patch",
      "aliases": [
        "沙地",
        "地面",
        "材质",
        "sand_patch",
        "volume sand_patch",
        "volume.sand_patch"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.mud_patch",
    "name": "泥地",
    "render": {
      "kind": "effect",
      "preset": "mud_patch"
    },
    "interactionProfiles": [
      "static",
      "physics",
      "volume_effect"
    ],
    "priority": "P1",
    "tags": [
      "泥地",
      "地面",
      "减速"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        2.5,
        0.03,
        2.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.mud_patch",
      "aliases": [
        "泥地",
        "地面",
        "减速",
        "mud_patch",
        "volume mud_patch",
        "volume.mud_patch"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.lava_flow",
    "name": "熔岩流",
    "render": {
      "kind": "effect",
      "preset": "lava_flow"
    },
    "interactionProfiles": [
      "static",
      "volume_effect",
      "damage"
    ],
    "priority": "P1",
    "tags": [
      "熔岩",
      "危险",
      "流动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        2.5,
        0.08,
        0.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.lava_flow",
      "aliases": [
        "熔岩流",
        "熔岩",
        "危险",
        "流动",
        "lava_flow",
        "volume lava_flow",
        "volume.lava_flow"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.fog",
    "name": "雾气体积",
    "render": {
      "kind": "effect",
      "preset": "fog_volume"
    },
    "interactionProfiles": [
      "volume_effect",
      "atmosphere"
    ],
    "priority": "P0",
    "tags": [
      "雾",
      "体积",
      "氛围"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        3,
        2,
        3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.fog",
      "aliases": [
        "雾气体积",
        "雾",
        "体积",
        "氛围",
        "fog_volume",
        "volume fog",
        "volume.fog"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.wind",
    "name": "风场",
    "render": {
      "kind": "effect",
      "preset": "wind_volume"
    },
    "interactionProfiles": [
      "volume_effect",
      "physics"
    ],
    "priority": "P1",
    "tags": [
      "风",
      "体积",
      "受力"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        1.5,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.wind",
      "aliases": [
        "风场",
        "风",
        "体积",
        "受力",
        "wind_volume",
        "volume wind",
        "volume.wind"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.force_field",
    "name": "力场",
    "render": {
      "kind": "effect",
      "preset": "force_field"
    },
    "interactionProfiles": [
      "volume_effect",
      "physics",
      "triggerable"
    ],
    "priority": "P0",
    "tags": [
      "力场",
      "范围",
      "机关"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "sphere",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        2,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.force_field",
      "aliases": [
        "力场",
        "范围",
        "机关",
        "force_field",
        "volume force_field",
        "volume.force_field"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.cloud",
    "name": "云团",
    "render": {
      "kind": "effect",
      "preset": "cloud_volume"
    },
    "interactionProfiles": [
      "static",
      "atmosphere",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "云",
      "天空",
      "氛围"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        1,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.cloud",
      "aliases": [
        "云团",
        "云",
        "天空",
        "氛围",
        "cloud_volume",
        "volume cloud",
        "volume.cloud"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.snow_field",
    "name": "积雪",
    "render": {
      "kind": "effect",
      "preset": "snow_field"
    },
    "interactionProfiles": [
      "static",
      "volume_effect"
    ],
    "priority": "P2",
    "tags": [
      "雪",
      "地面",
      "季节"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        2.5,
        0.04,
        2.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.snow_field",
      "aliases": [
        "积雪",
        "雪",
        "地面",
        "季节",
        "snow_field",
        "volume snow_field",
        "volume.snow_field"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.grass_patch",
    "name": "草地",
    "render": {
      "kind": "compound",
      "preset": "grass_patch"
    },
    "interactionProfiles": [
      "static",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "草",
      "地面",
      "自然"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        0.2,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.grass_patch",
      "aliases": [
        "草地",
        "草",
        "地面",
        "自然",
        "grass_patch",
        "volume grass_patch",
        "volume.grass_patch"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "volume.ripple",
    "name": "水波",
    "render": {
      "kind": "effect",
      "preset": "ripple_surface"
    },
    "interactionProfiles": [
      "tap_feedback",
      "volume_effect"
    ],
    "priority": "P0",
    "tags": [
      "水波",
      "反馈",
      "动画"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.5,
        0.02,
        1.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.volume.ripple",
      "aliases": [
        "水波",
        "反馈",
        "动画",
        "ripple_surface",
        "volume ripple",
        "volume.ripple"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "volume",
    "categoryName": "材质与空间效果"
  },
  {
    "id": "game.chest",
    "name": "宝箱",
    "render": {
      "kind": "compound",
      "preset": "chest"
    },
    "interactionProfiles": [
      "static",
      "openable",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "宝箱",
      "开合",
      "奖励"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.9,
        0.8,
        0.9
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.chest",
      "aliases": [
        "宝箱",
        "开合",
        "奖励",
        "chest",
        "game chest",
        "game.chest"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.treasure_chest",
    "name": "大型宝箱",
    "render": {
      "kind": "compound",
      "preset": "treasure_chest"
    },
    "interactionProfiles": [
      "static",
      "openable",
      "collectible"
    ],
    "priority": "P1",
    "tags": [
      "宝箱",
      "奖励",
      "关卡"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.3,
        1,
        1.3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.treasure_chest",
      "aliases": [
        "大型宝箱",
        "宝箱",
        "奖励",
        "关卡",
        "treasure_chest",
        "game treasure_chest",
        "game.treasure_chest"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.key",
    "name": "钥匙",
    "render": {
      "kind": "compound",
      "preset": "key"
    },
    "interactionProfiles": [
      "collectible",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "钥匙",
      "收集",
      "道具"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "sphere",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.3,
        0.3,
        0.3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.key",
      "aliases": [
        "钥匙",
        "收集",
        "道具",
        "key",
        "game key",
        "game.key"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.coin",
    "name": "金币",
    "render": {
      "kind": "compound",
      "preset": "coin"
    },
    "interactionProfiles": [
      "collectible",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "金币",
      "收集",
      "计分"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "sphere",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.25,
        0.25,
        0.25
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.coin",
      "aliases": [
        "金币",
        "收集",
        "计分",
        "coin",
        "game coin",
        "game.coin"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.crystal",
    "name": "能量晶体",
    "render": {
      "kind": "compound",
      "preset": "crystal"
    },
    "interactionProfiles": [
      "collectible",
      "tap_feedback",
      "gaze_feedback"
    ],
    "priority": "P0",
    "tags": [
      "晶体",
      "收集",
      "发光"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "sphere",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.4,
        0.7,
        0.4
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.crystal",
      "aliases": [
        "能量晶体",
        "晶体",
        "收集",
        "发光",
        "crystal",
        "game crystal",
        "game.crystal"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.health_pack",
    "name": "补给包",
    "render": {
      "kind": "compound",
      "preset": "health_pack"
    },
    "interactionProfiles": [
      "collectible",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "补给",
      "生命",
      "道具"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.5,
        0.5,
        0.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.health_pack",
      "aliases": [
        "补给包",
        "补给",
        "生命",
        "道具",
        "health_pack",
        "game health_pack",
        "game.health_pack"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.checkpoint",
    "name": "检查点",
    "render": {
      "kind": "effect",
      "preset": "checkpoint"
    },
    "interactionProfiles": [
      "triggerable",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "检查点",
      "存档",
      "进度"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "cylinder",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.8,
        1.5,
        0.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.checkpoint",
      "aliases": [
        "检查点",
        "存档",
        "进度",
        "checkpoint",
        "game checkpoint",
        "game.checkpoint"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.target",
    "name": "靶标",
    "render": {
      "kind": "compound",
      "preset": "target"
    },
    "interactionProfiles": [
      "tap_feedback",
      "physics"
    ],
    "priority": "P0",
    "tags": [
      "靶标",
      "射击",
      "反馈"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.7,
        0.9,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.target",
      "aliases": [
        "靶标",
        "射击",
        "反馈",
        "target",
        "game target",
        "game.target"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.switch",
    "name": "拨杆开关",
    "render": {
      "kind": "compound",
      "preset": "switch"
    },
    "interactionProfiles": [
      "switchable",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "开关",
      "拨杆",
      "联动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.4,
        0.7,
        0.3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.switch",
      "aliases": [
        "拨杆开关",
        "开关",
        "拨杆",
        "联动",
        "switch",
        "game switch",
        "game.switch"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.pressure_plate",
    "name": "压力板",
    "render": {
      "kind": "compound",
      "preset": "pressure_plate"
    },
    "interactionProfiles": [
      "switchable",
      "physics",
      "triggerable"
    ],
    "priority": "P0",
    "tags": [
      "压力板",
      "机关",
      "进入"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        0.08,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.pressure_plate",
      "aliases": [
        "压力板",
        "机关",
        "进入",
        "pressure_plate",
        "game pressure_plate",
        "game.pressure_plate"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.button",
    "name": "按钮",
    "render": {
      "kind": "compound",
      "preset": "button"
    },
    "interactionProfiles": [
      "switchable",
      "tap_feedback",
      "hold_feedback"
    ],
    "priority": "P0",
    "tags": [
      "按钮",
      "点击",
      "按住"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.35,
        0.2,
        0.35
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.button",
      "aliases": [
        "按钮",
        "点击",
        "按住",
        "button",
        "game button",
        "game.button"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.lever",
    "name": "拉杆",
    "render": {
      "kind": "compound",
      "preset": "lever"
    },
    "interactionProfiles": [
      "switchable",
      "hold_feedback"
    ],
    "priority": "P1",
    "tags": [
      "拉杆",
      "机关",
      "开关"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.45,
        0.8,
        0.3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.lever",
      "aliases": [
        "拉杆",
        "机关",
        "开关",
        "lever",
        "game lever",
        "game.lever"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.gear",
    "name": "齿轮",
    "render": {
      "kind": "compound",
      "preset": "gear"
    },
    "interactionProfiles": [
      "moving",
      "physics",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "齿轮",
      "旋转",
      "机关"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "cylinder",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.8,
        0.2,
        0.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.gear",
      "aliases": [
        "齿轮",
        "旋转",
        "机关",
        "gear",
        "game gear",
        "game.gear"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.door",
    "name": "机关门",
    "render": {
      "kind": "compound",
      "preset": "door"
    },
    "interactionProfiles": [
      "openable",
      "switchable",
      "triggerable"
    ],
    "priority": "P0",
    "tags": [
      "门",
      "开合",
      "机关"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.6,
        2.2,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.door",
      "aliases": [
        "机关门",
        "门",
        "开合",
        "机关",
        "door",
        "game door",
        "game.door"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.moving_platform",
    "name": "移动平台",
    "render": {
      "kind": "compound",
      "preset": "moving_platform"
    },
    "interactionProfiles": [
      "moving",
      "physics",
      "triggerable"
    ],
    "priority": "P0",
    "tags": [
      "平台",
      "移动",
      "承载"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.8,
        0.2,
        1.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.moving_platform",
      "aliases": [
        "移动平台",
        "平台",
        "移动",
        "承载",
        "moving_platform",
        "game moving_platform",
        "game.moving_platform"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.spring_pad",
    "name": "弹跳板",
    "render": {
      "kind": "compound",
      "preset": "spring_pad"
    },
    "interactionProfiles": [
      "physics",
      "tap_feedback",
      "moving"
    ],
    "priority": "P1",
    "tags": [
      "弹跳",
      "平台",
      "受力"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        0.12,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.spring_pad",
      "aliases": [
        "弹跳板",
        "弹跳",
        "平台",
        "受力",
        "spring_pad",
        "game spring_pad",
        "game.spring_pad"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.launcher",
    "name": "发射器",
    "render": {
      "kind": "compound",
      "preset": "launcher"
    },
    "interactionProfiles": [
      "switchable",
      "physics",
      "triggerable"
    ],
    "priority": "P1",
    "tags": [
      "发射",
      "机关",
      "投射"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.8,
        0.5,
        1.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.launcher",
      "aliases": [
        "发射器",
        "发射",
        "机关",
        "投射",
        "launcher",
        "game launcher",
        "game.launcher"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.portal",
    "name": "传送门",
    "render": {
      "kind": "effect",
      "preset": "portal"
    },
    "interactionProfiles": [
      "triggerable",
      "tap_feedback",
      "gaze_feedback"
    ],
    "priority": "P0",
    "tags": [
      "传送门",
      "入口",
      "空间"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.5,
        2.5,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.portal",
      "aliases": [
        "传送门",
        "入口",
        "空间",
        "portal",
        "game portal",
        "game.portal"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.teleporter",
    "name": "传送台",
    "render": {
      "kind": "effect",
      "preset": "teleporter"
    },
    "interactionProfiles": [
      "triggerable",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "传送",
      "平台",
      "移动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "cylinder",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.2,
        0.15,
        1.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.teleporter",
      "aliases": [
        "传送台",
        "传送",
        "平台",
        "移动",
        "teleporter",
        "game teleporter",
        "game.teleporter"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.mine",
    "name": "地雷",
    "render": {
      "kind": "compound",
      "preset": "mine"
    },
    "interactionProfiles": [
      "triggerable",
      "physics",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "地雷",
      "危险",
      "碰撞"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "sphere",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.35,
        0.3,
        0.35
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.mine",
      "aliases": [
        "地雷",
        "危险",
        "碰撞",
        "mine",
        "game mine",
        "game.mine"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.beacon",
    "name": "信标",
    "render": {
      "kind": "effect",
      "preset": "beacon"
    },
    "interactionProfiles": [
      "triggerable",
      "tap_feedback",
      "gaze_feedback"
    ],
    "priority": "P0",
    "tags": [
      "信标",
      "引导",
      "定位"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "cylinder",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.5,
        1.5,
        0.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.beacon",
      "aliases": [
        "信标",
        "引导",
        "定位",
        "beacon",
        "game beacon",
        "game.beacon"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "game.collectible_card",
    "name": "收集卡片",
    "render": {
      "kind": "quad",
      "preset": "collectible_card"
    },
    "interactionProfiles": [
      "collectible",
      "tap_feedback",
      "display"
    ],
    "priority": "P1",
    "tags": [
      "卡片",
      "收集",
      "信息"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.7,
        1,
        1
      ]
    },
    "assetPolicy": "optional-external",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": true,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.game.collectible_card",
      "aliases": [
        "收集卡片",
        "卡片",
        "收集",
        "信息",
        "collectible_card",
        "game collectible_card",
        "game.collectible_card"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "game",
    "categoryName": "游戏道具与机关"
  },
  {
    "id": "toy.toy_tank",
    "name": "玩具坦克",
    "render": {
      "kind": "compound",
      "preset": "toy_tank"
    },
    "interactionProfiles": [
      "vehicle",
      "tap_feedback",
      "physics"
    ],
    "priority": "P0",
    "tags": [
      "玩具",
      "坦克",
      "载具"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.9,
        0.5,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 6,
      "maxDrawCalls": 6,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.toy_tank",
      "aliases": [
        "玩具坦克",
        "玩具",
        "坦克",
        "载具",
        "toy_tank",
        "toy toy_tank",
        "toy.toy_tank"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.tank",
    "name": "坦克",
    "render": {
      "kind": "compound",
      "preset": "tank"
    },
    "interactionProfiles": [
      "vehicle",
      "physics",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "坦克",
      "载具",
      "游戏"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.6,
        0.9,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 6,
      "maxDrawCalls": 6,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.tank",
      "aliases": [
        "坦克",
        "载具",
        "游戏",
        "tank",
        "toy tank",
        "toy.tank"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.car",
    "name": "小车",
    "render": {
      "kind": "compound",
      "preset": "car"
    },
    "interactionProfiles": [
      "vehicle",
      "physics",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "小车",
      "载具",
      "移动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        0.6,
        1.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 6,
      "maxDrawCalls": 6,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.car",
      "aliases": [
        "小车",
        "载具",
        "移动",
        "car",
        "toy car",
        "toy.car"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.drone",
    "name": "无人机",
    "render": {
      "kind": "compound",
      "preset": "drone"
    },
    "interactionProfiles": [
      "vehicle",
      "moving",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "无人机",
      "飞行",
      "载具"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.8,
        0.25,
        0.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 6,
      "maxDrawCalls": 6,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.drone",
      "aliases": [
        "无人机",
        "飞行",
        "载具",
        "drone",
        "toy drone",
        "toy.drone"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.robot",
    "name": "机器人",
    "render": {
      "kind": "compound",
      "preset": "robot"
    },
    "interactionProfiles": [
      "tap_feedback",
      "moving",
      "physics"
    ],
    "priority": "P1",
    "tags": [
      "机器人",
      "角色",
      "移动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.8,
        1.4,
        0.6
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 6,
      "maxDrawCalls": 6,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.robot",
      "aliases": [
        "机器人",
        "角色",
        "移动",
        "robot",
        "toy robot",
        "toy.robot"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.turret",
    "name": "炮台",
    "render": {
      "kind": "compound",
      "preset": "turret"
    },
    "interactionProfiles": [
      "tap_feedback",
      "moving",
      "physics"
    ],
    "priority": "P1",
    "tags": [
      "炮台",
      "瞄准",
      "机关"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.8,
        0.9,
        0.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.turret",
      "aliases": [
        "炮台",
        "瞄准",
        "机关",
        "turret",
        "toy turret",
        "toy.turret"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.cannon",
    "name": "火炮",
    "render": {
      "kind": "compound",
      "preset": "cannon"
    },
    "interactionProfiles": [
      "tap_feedback",
      "physics",
      "triggerable"
    ],
    "priority": "P1",
    "tags": [
      "火炮",
      "发射",
      "游戏"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.8,
        0.8,
        1.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.cannon",
      "aliases": [
        "火炮",
        "发射",
        "游戏",
        "cannon",
        "toy cannon",
        "toy.cannon"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.ball",
    "name": "球体玩具",
    "render": {
      "kind": "compound",
      "preset": "ball"
    },
    "interactionProfiles": [
      "physics",
      "pickup_throw",
      "pushable"
    ],
    "priority": "P0",
    "tags": [
      "球",
      "投掷",
      "物理"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "sphere",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.45,
        0.45,
        0.45
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.ball",
      "aliases": [
        "球体玩具",
        "球",
        "投掷",
        "物理",
        "ball",
        "toy ball",
        "toy.ball"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.cube",
    "name": "彩色方块",
    "render": {
      "kind": "compound",
      "preset": "cube_toy"
    },
    "interactionProfiles": [
      "physics",
      "pickup_throw",
      "pushable"
    ],
    "priority": "P0",
    "tags": [
      "方块",
      "玩具",
      "物理"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.6,
        0.6,
        0.6
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.cube",
      "aliases": [
        "彩色方块",
        "方块",
        "玩具",
        "物理",
        "cube_toy",
        "toy cube",
        "toy.cube"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.windup",
    "name": "发条玩具",
    "render": {
      "kind": "compound",
      "preset": "windup_toy"
    },
    "interactionProfiles": [
      "moving",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "发条",
      "玩具",
      "自动移动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.5,
        0.7,
        0.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.windup",
      "aliases": [
        "发条玩具",
        "发条",
        "玩具",
        "自动移动",
        "windup_toy",
        "toy windup",
        "toy.windup"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.balloon",
    "name": "气球",
    "render": {
      "kind": "compound",
      "preset": "balloon"
    },
    "interactionProfiles": [
      "tap_feedback",
      "moving",
      "flyby"
    ],
    "priority": "P1",
    "tags": [
      "气球",
      "漂浮",
      "飞行"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "sphere",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.5,
        0.7,
        0.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.balloon",
      "aliases": [
        "气球",
        "漂浮",
        "飞行",
        "balloon",
        "toy balloon",
        "toy.balloon"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.saucer",
    "name": "飞碟",
    "render": {
      "kind": "compound",
      "preset": "flying_saucer"
    },
    "interactionProfiles": [
      "vehicle",
      "moving",
      "flyby"
    ],
    "priority": "P1",
    "tags": [
      "飞碟",
      "飞行",
      "载具"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "sphere",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        0.35,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.saucer",
      "aliases": [
        "飞碟",
        "飞行",
        "载具",
        "flying_saucer",
        "toy saucer",
        "toy.saucer"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.boat",
    "name": "小船",
    "render": {
      "kind": "compound",
      "preset": "boat"
    },
    "interactionProfiles": [
      "vehicle",
      "physics",
      "moving"
    ],
    "priority": "P2",
    "tags": [
      "小船",
      "水面",
      "载具"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.5,
        0.5,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.boat",
      "aliases": [
        "小船",
        "水面",
        "载具",
        "boat",
        "toy boat",
        "toy.boat"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "toy.glider",
    "name": "滑翔机",
    "render": {
      "kind": "compound",
      "preset": "glider"
    },
    "interactionProfiles": [
      "vehicle",
      "moving",
      "flyby"
    ],
    "priority": "P2",
    "tags": [
      "滑翔机",
      "飞行",
      "载具"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.5,
        0.3,
        1.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.toy.glider",
      "aliases": [
        "滑翔机",
        "飞行",
        "载具",
        "glider",
        "toy glider",
        "toy.glider"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "toy",
    "categoryName": "载具与玩具"
  },
  {
    "id": "fx.particle_emitter",
    "name": "粒子发射器",
    "render": {
      "kind": "effect",
      "preset": "particle_emitter"
    },
    "interactionProfiles": [
      "particle_emitter",
      "triggerable"
    ],
    "priority": "P0",
    "tags": [
      "粒子",
      "发射器",
      "可配置"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        1,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 300,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.particle_emitter",
      "aliases": [
        "粒子发射器",
        "粒子",
        "发射器",
        "可配置",
        "particle_emitter",
        "fx particle_emitter",
        "fx.particle_emitter"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.spark_burst",
    "name": "火花爆发",
    "render": {
      "kind": "effect",
      "preset": "spark_burst"
    },
    "interactionProfiles": [
      "particle_emitter",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "火花",
      "爆发",
      "反馈"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        0.8,
        0.8,
        0.8
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 300,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.spark_burst",
      "aliases": [
        "火花爆发",
        "火花",
        "爆发",
        "反馈",
        "spark_burst",
        "fx spark_burst",
        "fx.spark_burst"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.firefly_swarm",
    "name": "萤火虫群",
    "render": {
      "kind": "effect",
      "preset": "firefly_swarm"
    },
    "interactionProfiles": [
      "particle_emitter",
      "atmosphere",
      "flyby"
    ],
    "priority": "P0",
    "tags": [
      "萤火虫",
      "粒子",
      "氛围"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        1.5,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 300,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.firefly_swarm",
      "aliases": [
        "萤火虫群",
        "萤火虫",
        "粒子",
        "氛围",
        "firefly_swarm",
        "fx firefly_swarm",
        "fx.firefly_swarm"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.flyby_motes",
    "name": "飘飞光点",
    "render": {
      "kind": "effect",
      "preset": "flyby_motes"
    },
    "interactionProfiles": [
      "particle_emitter",
      "flyby",
      "atmosphere"
    ],
    "priority": "P0",
    "tags": [
      "飘飞",
      "光点",
      "经过"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        3,
        2,
        3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 300,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.flyby_motes",
      "aliases": [
        "飘飞光点",
        "飘飞",
        "光点",
        "经过",
        "flyby_motes",
        "fx flyby_motes",
        "fx.flyby_motes"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.bird_flock",
    "name": "飞鸟群",
    "render": {
      "kind": "effect",
      "preset": "bird_flock"
    },
    "interactionProfiles": [
      "flyby",
      "atmosphere"
    ],
    "priority": "P1",
    "tags": [
      "飞鸟",
      "群体",
      "飞掠"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        4,
        2,
        4
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.bird_flock",
      "aliases": [
        "飞鸟群",
        "飞鸟",
        "群体",
        "飞掠",
        "bird_flock",
        "fx bird_flock",
        "fx.bird_flock"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.falling_leaves",
    "name": "落叶",
    "render": {
      "kind": "effect",
      "preset": "falling_leaves"
    },
    "interactionProfiles": [
      "particle_emitter",
      "flyby",
      "atmosphere"
    ],
    "priority": "P1",
    "tags": [
      "落叶",
      "粒子",
      "季节"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        3,
        2.5,
        3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 180,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.falling_leaves",
      "aliases": [
        "落叶",
        "粒子",
        "季节",
        "falling_leaves",
        "fx falling_leaves",
        "fx.falling_leaves"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.petals",
    "name": "花瓣飘落",
    "render": {
      "kind": "effect",
      "preset": "petals"
    },
    "interactionProfiles": [
      "particle_emitter",
      "flyby",
      "atmosphere"
    ],
    "priority": "P1",
    "tags": [
      "花瓣",
      "飘落",
      "氛围"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        3,
        2,
        3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 180,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.petals",
      "aliases": [
        "花瓣飘落",
        "花瓣",
        "飘落",
        "氛围",
        "petals",
        "fx petals",
        "fx.petals"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.snow_particles",
    "name": "雪花",
    "render": {
      "kind": "effect",
      "preset": "snow_particles"
    },
    "interactionProfiles": [
      "particle_emitter",
      "atmosphere"
    ],
    "priority": "P2",
    "tags": [
      "雪花",
      "粒子",
      "天气"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        4,
        3,
        4
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 180,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.snow_particles",
      "aliases": [
        "雪花",
        "粒子",
        "天气",
        "snow_particles",
        "fx snow_particles",
        "fx.snow_particles"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.rain",
    "name": "雨幕",
    "render": {
      "kind": "effect",
      "preset": "rain"
    },
    "interactionProfiles": [
      "particle_emitter",
      "atmosphere",
      "volume_effect"
    ],
    "priority": "P2",
    "tags": [
      "雨",
      "天气",
      "粒子"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        4,
        3,
        4
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 180,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.rain",
      "aliases": [
        "雨幕",
        "雨",
        "天气",
        "粒子",
        "rain",
        "fx rain",
        "fx.rain"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.dust",
    "name": "尘埃",
    "render": {
      "kind": "effect",
      "preset": "dust"
    },
    "interactionProfiles": [
      "particle_emitter",
      "atmosphere"
    ],
    "priority": "P0",
    "tags": [
      "尘埃",
      "氛围",
      "粒子"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        1.5,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 300,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.dust",
      "aliases": [
        "尘埃",
        "氛围",
        "粒子",
        "dust",
        "fx dust",
        "fx.dust"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.smoke",
    "name": "烟雾",
    "render": {
      "kind": "effect",
      "preset": "smoke"
    },
    "interactionProfiles": [
      "particle_emitter",
      "atmosphere",
      "volume_effect"
    ],
    "priority": "P0",
    "tags": [
      "烟雾",
      "体积",
      "氛围"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.5,
        1.5,
        1.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 300,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.smoke",
      "aliases": [
        "烟雾",
        "体积",
        "氛围",
        "smoke",
        "fx smoke",
        "fx.smoke"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.steam",
    "name": "蒸汽",
    "render": {
      "kind": "effect",
      "preset": "steam"
    },
    "interactionProfiles": [
      "particle_emitter",
      "atmosphere",
      "volume_effect"
    ],
    "priority": "P1",
    "tags": [
      "蒸汽",
      "体积",
      "反馈"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        2,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 180,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.steam",
      "aliases": [
        "蒸汽",
        "体积",
        "反馈",
        "steam",
        "fx steam",
        "fx.steam"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.fire",
    "name": "火焰",
    "render": {
      "kind": "effect",
      "preset": "fire"
    },
    "interactionProfiles": [
      "particle_emitter",
      "atmosphere",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "火焰",
      "危险",
      "粒子"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        1.5,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 300,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.fire",
      "aliases": [
        "火焰",
        "危险",
        "粒子",
        "fire",
        "fx fire",
        "fx.fire"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.magic_trail",
    "name": "能量轨迹",
    "render": {
      "kind": "effect",
      "preset": "magic_trail"
    },
    "interactionProfiles": [
      "particle_emitter",
      "flyby",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "轨迹",
      "能量",
      "移动"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "path",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        1,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 300,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.magic_trail",
      "aliases": [
        "能量轨迹",
        "轨迹",
        "能量",
        "移动",
        "magic_trail",
        "fx magic_trail",
        "fx.magic_trail"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.vortex",
    "name": "旋涡",
    "render": {
      "kind": "effect",
      "preset": "vortex"
    },
    "interactionProfiles": [
      "particle_emitter",
      "volume_effect",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "旋涡",
      "空间",
      "动画"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "sphere",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.5,
        1.5,
        1.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 180,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.vortex",
      "aliases": [
        "旋涡",
        "空间",
        "动画",
        "vortex",
        "fx vortex",
        "fx.vortex"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.floating_orbs",
    "name": "漂浮光球",
    "render": {
      "kind": "effect",
      "preset": "floating_orbs"
    },
    "interactionProfiles": [
      "particle_emitter",
      "flyby",
      "gaze_feedback"
    ],
    "priority": "P0",
    "tags": [
      "光球",
      "漂浮",
      "注视"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "sphere",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        2,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 300,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.floating_orbs",
      "aliases": [
        "漂浮光球",
        "光球",
        "漂浮",
        "注视",
        "floating_orbs",
        "fx floating_orbs",
        "fx.floating_orbs"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.shockwave",
    "name": "冲击波",
    "render": {
      "kind": "effect",
      "preset": "shockwave"
    },
    "interactionProfiles": [
      "particle_emitter",
      "tap_feedback",
      "physics"
    ],
    "priority": "P0",
    "tags": [
      "冲击波",
      "点击",
      "反馈"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        0.1,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 300,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.shockwave",
      "aliases": [
        "冲击波",
        "点击",
        "反馈",
        "shockwave",
        "fx shockwave",
        "fx.shockwave"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "fx.confetti",
    "name": "彩纸喷射",
    "render": {
      "kind": "effect",
      "preset": "confetti"
    },
    "interactionProfiles": [
      "particle_emitter",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "彩纸",
      "庆祝",
      "粒子"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        2,
        2,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 180,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.fx.confetti",
      "aliases": [
        "彩纸喷射",
        "彩纸",
        "庆祝",
        "粒子",
        "confetti",
        "fx confetti",
        "fx.confetti"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "fx",
    "categoryName": "粒子、氛围与飞掠效果"
  },
  {
    "id": "interactive.tap_target",
    "name": "点击目标",
    "render": {
      "kind": "helper",
      "preset": "tap_target"
    },
    "interactionProfiles": [
      "tap_feedback",
      "triggerable"
    ],
    "priority": "P0",
    "tags": [
      "点击",
      "目标",
      "触发"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.8,
        0.8,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.tap_target",
      "aliases": [
        "点击目标",
        "点击",
        "目标",
        "触发",
        "tap_target",
        "interactive tap_target",
        "interactive.tap_target"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.gaze_target",
    "name": "注视目标",
    "render": {
      "kind": "helper",
      "preset": "gaze_target"
    },
    "interactionProfiles": [
      "gaze_feedback",
      "triggerable"
    ],
    "priority": "P0",
    "tags": [
      "注视",
      "目标",
      "触发"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "sphere",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.8,
        0.8,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.gaze_target",
      "aliases": [
        "注视目标",
        "注视",
        "目标",
        "触发",
        "gaze_target",
        "interactive gaze_target",
        "interactive.gaze_target"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.hold_target",
    "name": "长按目标",
    "render": {
      "kind": "helper",
      "preset": "hold_target"
    },
    "interactionProfiles": [
      "hold_feedback",
      "triggerable"
    ],
    "priority": "P0",
    "tags": [
      "长按",
      "目标",
      "触发"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.8,
        0.8,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.hold_target",
      "aliases": [
        "长按目标",
        "长按",
        "目标",
        "触发",
        "hold_target",
        "interactive hold_target",
        "interactive.hold_target"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.drag_handle",
    "name": "拖拽把手",
    "render": {
      "kind": "helper",
      "preset": "drag_handle"
    },
    "interactionProfiles": [
      "pickup_throw",
      "triggerable"
    ],
    "priority": "P1",
    "tags": [
      "拖拽",
      "控制",
      "交互"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "sphere",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.4,
        0.4,
        0.4
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.drag_handle",
      "aliases": [
        "拖拽把手",
        "拖拽",
        "控制",
        "交互",
        "drag_handle",
        "interactive drag_handle",
        "interactive.drag_handle"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.pickup_object",
    "name": "拾取点",
    "render": {
      "kind": "helper",
      "preset": "pickup_object"
    },
    "interactionProfiles": [
      "pickup_throw",
      "triggerable"
    ],
    "priority": "P0",
    "tags": [
      "拾取",
      "抓取",
      "交互"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "sphere",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.4,
        0.4,
        0.4
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.pickup_object",
      "aliases": [
        "拾取点",
        "拾取",
        "抓取",
        "交互",
        "pickup_object",
        "interactive pickup_object",
        "interactive.pickup_object"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.throwable",
    "name": "投掷物",
    "render": {
      "kind": "helper",
      "preset": "throwable"
    },
    "interactionProfiles": [
      "pickup_throw",
      "physics"
    ],
    "priority": "P0",
    "tags": [
      "投掷",
      "物理",
      "交互"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "sphere",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.5,
        0.5,
        0.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.throwable",
      "aliases": [
        "投掷物",
        "投掷",
        "物理",
        "交互",
        "throwable",
        "interactive throwable",
        "interactive.throwable"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.link_beam",
    "name": "联动光束",
    "render": {
      "kind": "effect",
      "preset": "link_beam"
    },
    "interactionProfiles": [
      "triggerable",
      "tap_feedback"
    ],
    "priority": "P1",
    "tags": [
      "光束",
      "联动",
      "连接"
    ],
    "default": {
      "pivot": "center",
      "placement": "between",
      "collider": "none",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        1,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.link_beam",
      "aliases": [
        "联动光束",
        "光束",
        "联动",
        "连接",
        "link_beam",
        "interactive link_beam",
        "interactive.link_beam"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.sound_source",
    "name": "空间音源",
    "render": {
      "kind": "helper",
      "preset": "sound_source"
    },
    "interactionProfiles": [
      "audio",
      "triggerable"
    ],
    "priority": "P0",
    "tags": [
      "声音",
      "音效",
      "空间"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "sphere",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.2,
        0.2,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.sound_source",
      "aliases": [
        "空间音源",
        "声音",
        "音效",
        "空间",
        "sound_source",
        "interactive sound_source",
        "interactive.sound_source"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.display_panel",
    "name": "信息面板",
    "render": {
      "kind": "quad",
      "preset": "display_panel"
    },
    "interactionProfiles": [
      "display",
      "tap_feedback",
      "gaze_feedback"
    ],
    "priority": "P0",
    "tags": [
      "面板",
      "文字",
      "展示"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1.4,
        0.8,
        1
      ]
    },
    "assetPolicy": "optional-external",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": true,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.display_panel",
      "aliases": [
        "信息面板",
        "面板",
        "文字",
        "展示",
        "display_panel",
        "interactive display_panel",
        "interactive.display_panel"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.timer",
    "name": "倒计时器",
    "render": {
      "kind": "quad",
      "preset": "timer"
    },
    "interactionProfiles": [
      "display",
      "triggerable"
    ],
    "priority": "P1",
    "tags": [
      "倒计时",
      "游戏",
      "UI"
    ],
    "default": {
      "pivot": "center",
      "placement": "floating",
      "collider": "box",
      "visibleInRuntime": true,
      "sizeMeters": [
        1,
        0.5,
        1
      ]
    },
    "assetPolicy": "optional-external",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 3,
      "maxDrawCalls": 3,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": true,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.timer",
      "aliases": [
        "倒计时器",
        "倒计时",
        "游戏",
        "UI",
        "timer",
        "interactive timer",
        "interactive.timer"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.trigger_zone",
    "name": "触发区域",
    "render": {
      "kind": "helper",
      "preset": "trigger_zone"
    },
    "interactionProfiles": [
      "triggerable",
      "volume_effect"
    ],
    "priority": "P0",
    "tags": [
      "区域",
      "进入",
      "触发"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        2,
        1.5,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.trigger_zone",
      "aliases": [
        "触发区域",
        "区域",
        "进入",
        "触发",
        "trigger_zone",
        "interactive trigger_zone",
        "interactive.trigger_zone"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.spawn_point",
    "name": "生成点",
    "render": {
      "kind": "helper",
      "preset": "spawn_point"
    },
    "interactionProfiles": [
      "triggerable",
      "helper"
    ],
    "priority": "P0",
    "tags": [
      "生成",
      "出生点",
      "关卡"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.3,
        0.3,
        0.3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.spawn_point",
      "aliases": [
        "生成点",
        "生成",
        "出生点",
        "关卡",
        "spawn_point",
        "interactive spawn_point",
        "interactive.spawn_point"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.camera_rig",
    "name": "镜头轨道",
    "render": {
      "kind": "helper",
      "preset": "camera_rig"
    },
    "interactionProfiles": [
      "camera",
      "path"
    ],
    "priority": "P1",
    "tags": [
      "镜头",
      "轨道",
      "相机"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "path",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        1,
        1,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.camera_rig",
      "aliases": [
        "镜头轨道",
        "镜头",
        "轨道",
        "相机",
        "camera_rig",
        "interactive camera_rig",
        "interactive.camera_rig"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.spline_path",
    "name": "移动路径",
    "render": {
      "kind": "helper",
      "preset": "spline_path"
    },
    "interactionProfiles": [
      "path",
      "helper"
    ],
    "priority": "P1",
    "tags": [
      "路径",
      "巡航",
      "轨迹"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "path",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        1,
        0.1,
        1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.spline_path",
      "aliases": [
        "移动路径",
        "路径",
        "巡航",
        "轨迹",
        "spline_path",
        "interactive spline_path",
        "interactive.spline_path"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "interactive.animation_driver",
    "name": "动画控制器",
    "render": {
      "kind": "helper",
      "preset": "animation_driver"
    },
    "interactionProfiles": [
      "triggerable",
      "moving"
    ],
    "priority": "P1",
    "tags": [
      "动画",
      "控制器",
      "状态"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.3,
        0.3,
        0.3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.interactive.animation_driver",
      "aliases": [
        "动画控制器",
        "动画",
        "控制器",
        "状态",
        "animation_driver",
        "interactive animation_driver",
        "interactive.animation_driver"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "interactive",
    "categoryName": "交互装置与控制器"
  },
  {
    "id": "helper.ground_marker",
    "name": "地面标记",
    "render": {
      "kind": "helper",
      "preset": "ground_marker"
    },
    "interactionProfiles": [
      "helper",
      "tap_feedback"
    ],
    "priority": "P0",
    "tags": [
      "地面",
      "标记",
      "定位"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.5,
        0.02,
        0.5
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.helper.ground_marker",
      "aliases": [
        "地面标记",
        "地面",
        "标记",
        "定位",
        "ground_marker",
        "helper ground_marker",
        "helper.ground_marker"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "helper",
    "categoryName": "空间辅助与调试"
  },
  {
    "id": "helper.wall_anchor",
    "name": "墙面锚点",
    "render": {
      "kind": "helper",
      "preset": "wall_anchor"
    },
    "interactionProfiles": [
      "helper"
    ],
    "priority": "P0",
    "tags": [
      "墙面",
      "锚点",
      "定位"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.2,
        0.2,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.helper.wall_anchor",
      "aliases": [
        "墙面锚点",
        "墙面",
        "锚点",
        "定位",
        "wall_anchor",
        "helper wall_anchor",
        "helper.wall_anchor"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "helper",
    "categoryName": "空间辅助与调试"
  },
  {
    "id": "helper.snap_point",
    "name": "吸附点",
    "render": {
      "kind": "helper",
      "preset": "snap_point"
    },
    "interactionProfiles": [
      "helper"
    ],
    "priority": "P0",
    "tags": [
      "吸附",
      "定位",
      "编辑"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.15,
        0.15,
        0.15
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.helper.snap_point",
      "aliases": [
        "吸附点",
        "吸附",
        "定位",
        "编辑",
        "snap_point",
        "helper snap_point",
        "helper.snap_point"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "helper",
    "categoryName": "空间辅助与调试"
  },
  {
    "id": "helper.waypoint",
    "name": "路径点",
    "render": {
      "kind": "helper",
      "preset": "waypoint"
    },
    "interactionProfiles": [
      "path",
      "helper"
    ],
    "priority": "P0",
    "tags": [
      "路径点",
      "导航",
      "巡航"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.2,
        0.2,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.helper.waypoint",
      "aliases": [
        "路径点",
        "导航",
        "巡航",
        "waypoint",
        "helper waypoint",
        "helper.waypoint"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "helper",
    "categoryName": "空间辅助与调试"
  },
  {
    "id": "helper.checkpoint_marker",
    "name": "检查点标记",
    "render": {
      "kind": "helper",
      "preset": "checkpoint_marker"
    },
    "interactionProfiles": [
      "helper",
      "triggerable"
    ],
    "priority": "P0",
    "tags": [
      "检查点",
      "标记",
      "进度"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.4,
        0.8,
        0.4
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.helper.checkpoint_marker",
      "aliases": [
        "检查点标记",
        "检查点",
        "标记",
        "进度",
        "checkpoint_marker",
        "helper checkpoint_marker",
        "helper.checkpoint_marker"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "helper",
    "categoryName": "空间辅助与调试"
  },
  {
    "id": "helper.boundary_volume",
    "name": "边界体",
    "render": {
      "kind": "helper",
      "preset": "boundary_volume"
    },
    "interactionProfiles": [
      "helper",
      "volume_effect"
    ],
    "priority": "P0",
    "tags": [
      "边界",
      "限制",
      "区域"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        3,
        2,
        3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.helper.boundary_volume",
      "aliases": [
        "边界体",
        "边界",
        "限制",
        "区域",
        "boundary_volume",
        "helper boundary_volume",
        "helper.boundary_volume"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "helper",
    "categoryName": "空间辅助与调试"
  },
  {
    "id": "helper.nav_surface",
    "name": "导航面",
    "render": {
      "kind": "helper",
      "preset": "nav_surface"
    },
    "interactionProfiles": [
      "helper",
      "path"
    ],
    "priority": "P1",
    "tags": [
      "导航",
      "地面",
      "路径"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        3,
        0.03,
        3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.helper.nav_surface",
      "aliases": [
        "导航面",
        "导航",
        "地面",
        "路径",
        "nav_surface",
        "helper nav_surface",
        "helper.nav_surface"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "helper",
    "categoryName": "空间辅助与调试"
  },
  {
    "id": "helper.occluder",
    "name": "遮挡体",
    "render": {
      "kind": "helper",
      "preset": "occluder"
    },
    "interactionProfiles": [
      "helper"
    ],
    "priority": "P1",
    "tags": [
      "遮挡",
      "优化",
      "性能"
    ],
    "default": {
      "pivot": "bottom-center",
      "placement": "surface",
      "collider": "box",
      "visibleInRuntime": false,
      "sizeMeters": [
        2,
        2,
        0.1
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.helper.occluder",
      "aliases": [
        "遮挡体",
        "遮挡",
        "优化",
        "性能",
        "occluder",
        "helper occluder",
        "helper.occluder"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "helper",
    "categoryName": "空间辅助与调试"
  },
  {
    "id": "helper.light_probe",
    "name": "光照探针",
    "render": {
      "kind": "helper",
      "preset": "light_probe"
    },
    "interactionProfiles": [
      "helper"
    ],
    "priority": "P1",
    "tags": [
      "光照",
      "探针",
      "调试"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.2,
        0.2,
        0.2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.helper.light_probe",
      "aliases": [
        "光照探针",
        "光照",
        "探针",
        "调试",
        "light_probe",
        "helper light_probe",
        "helper.light_probe"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "helper",
    "categoryName": "空间辅助与调试"
  },
  {
    "id": "helper.measurement_ruler",
    "name": "测量尺",
    "render": {
      "kind": "helper",
      "preset": "measurement_ruler"
    },
    "interactionProfiles": [
      "helper"
    ],
    "priority": "P1",
    "tags": [
      "测量",
      "尺寸",
      "调试"
    ],
    "default": {
      "pivot": "center",
      "placement": "between",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        1,
        0.05,
        0.05
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.helper.measurement_ruler",
      "aliases": [
        "测量尺",
        "测量",
        "尺寸",
        "调试",
        "measurement_ruler",
        "helper measurement_ruler",
        "helper.measurement_ruler"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "helper",
    "categoryName": "空间辅助与调试"
  },
  {
    "id": "helper.camera_spawn",
    "name": "相机出生点",
    "render": {
      "kind": "helper",
      "preset": "camera_spawn"
    },
    "interactionProfiles": [
      "camera",
      "helper"
    ],
    "priority": "P0",
    "tags": [
      "相机",
      "出生点",
      "预览"
    ],
    "default": {
      "pivot": "center",
      "placement": "point",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        0.3,
        0.3,
        0.3
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.helper.camera_spawn",
      "aliases": [
        "相机出生点",
        "相机",
        "出生点",
        "预览",
        "camera_spawn",
        "helper camera_spawn",
        "helper.camera_spawn"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "helper",
    "categoryName": "空间辅助与调试"
  },
  {
    "id": "helper.reset_zone",
    "name": "重置区域",
    "render": {
      "kind": "helper",
      "preset": "reset_zone"
    },
    "interactionProfiles": [
      "triggerable",
      "helper"
    ],
    "priority": "P1",
    "tags": [
      "重置",
      "区域",
      "失败处理"
    ],
    "default": {
      "pivot": "center",
      "placement": "volume",
      "collider": "none",
      "visibleInRuntime": false,
      "sizeMeters": [
        2,
        1,
        2
      ]
    },
    "assetPolicy": "builtin-procedural",
    "quality": {
      "strategy": "procedural-prefab",
      "visualTier": "high-preview",
      "maxParts": 2,
      "maxDrawCalls": 2,
      "particleMaxCount": 0,
      "binaryBytes": 0,
      "externalAssetOptional": false,
      "lod": "recipe-low-medium-high"
    },
    "voice": {
      "token": "xj.element.helper.reset_zone",
      "aliases": [
        "重置区域",
        "重置",
        "区域",
        "失败处理",
        "reset_zone",
        "helper reset_zone",
        "helper.reset_zone"
      ],
      "locale": "zh-CN"
    },
    "categoryId": "helper",
    "categoryName": "空间辅助与调试"
  }
]

export const ELEMENT_CATEGORIES = [
  {
    "id": "furniture",
    "name": "家居与室内",
    "description": "家具、室内陈设和可推动物件；用于快速搭建可交互的小场景。"
  },
  {
    "id": "environment",
    "name": "建筑与自然环境",
    "description": "房子、建筑构件和自然元素；用于组成可探索的三维场景。"
  },
  {
    "id": "volume",
    "name": "材质与空间效果",
    "description": "水、冰、石块等材质/体积型元素；视觉上可实体化，也可作为范围效果。"
  },
  {
    "id": "game",
    "name": "游戏道具与机关",
    "description": "箱子、收集物、机关和关卡对象；优先保证点击、碰撞、进入和联动可配置。"
  },
  {
    "id": "toy",
    "name": "载具与玩具",
    "description": "坦克、玩具、机器人和简单载具；优先支持点击启动、自动巡航和碰撞反馈。"
  },
  {
    "id": "fx",
    "name": "粒子、氛围与飞掠效果",
    "description": "粒子发射、萤火虫、飘飞和环境效果；用于制造明显的游戏反馈和空间生命感。"
  },
  {
    "id": "interactive",
    "name": "交互装置与控制器",
    "description": "不只是装饰的可选装置；用于直接搭建触发、拾取、展示、声音和路径逻辑。"
  },
  {
    "id": "helper",
    "name": "空间辅助与调试",
    "description": "不一定出现在游客画面中的编辑辅助元素；用于定位、边界、导航、遮挡和重置。"
  }
]

export const ELEMENT_INTERACTION_PROFILES = {
  "static": "静态摆放：可移动、缩放、旋转、显隐和删除。",
  "tap_feedback": "点击反馈：点击后高亮、播放短动画，可接音效/粒子。",
  "gaze_feedback": "注视反馈：注视达到阈值后触发高亮或动作。",
  "hold_feedback": "按住反馈：按住达到阈值后触发动作。",
  "pushable": "可推动：支持平面移动、碰撞和阻尼。",
  "openable": "可开合：支持打开/关闭状态和进度动画。",
  "pickup_throw": "可拾取投掷：支持拾取、拖拽、投掷、落地和回收。",
  "collectible": "可收集：触碰或点击后计数、隐藏并触发反馈。",
  "switchable": "开关机关：支持开/关状态、联动对象和冷却时间。",
  "triggerable": "触发器：进入、离开、靠近或条件满足时执行动作。",
  "moving": "运动机关：沿轨道、往返、旋转或弹跳。",
  "vehicle": "载具/玩具：支持点击启动、驾驶或自动巡航。",
  "particle_emitter": "粒子发射：支持数量、速度、方向、生命周期、颜色和区域。",
  "flyby": "飞掠运动：按路径或随机轨迹从视野中飘飞经过。",
  "atmosphere": "氛围效果：持续或按区域启停的环境视觉效果。",
  "volume_effect": "空间体积效果：有范围、密度、流速和进入/离开事件。",
  "display": "展示交互：显示图文/数值/状态，并支持更新内容。",
  "audio": "声音交互：播放、停止、循环、音量和空间衰减。",
  "path": "路径控制：作为移动、镜头、巡逻或粒子轨迹的路径。",
  "helper": "编辑辅助：仅编辑器或运行时定位/约束使用，可配置显隐。",
  "camera": "镜头控制：设置生成点、轨道、跟随目标或观察范围。",
  "physics": "物理交互：碰撞、受力、弹性、重力和触发事件。",
  "damage": "危险反馈：碰撞或触发后扣除生命/耐久，必须有可关闭状态。"
}
