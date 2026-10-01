生成文件 `src/core/schema.js`。严格实现契约中的全部导出。

要点：
- id 生成：`type_` + Math.random().toString(36).slice(2,8)
- `newObject(type, props={})`：按 OBJECT_TYPES 元数据补默认 transform/材质/hitbox；splat_segment 默认 2m 椭球，quad 1x1m，video_quad 按 P 档比例 0.75x1m，glb 包围 1m，light 点光源
- `publishCheck`：遍历 cross-ref（trigger.target/trigger.do.args.seqId|nodeId、sequence.tracks[].target、node.anchor/on_enter/next）查存在性；node.next===null 视为终点节点（约定：最后一个 node 的 next 设为 null 或 ''）；至少一个 chapter 且首个 chapter 至少一个 node 否则 no_start_node
- `budget`：meta.assets 里有登记的用登记 size；video_quad 计路数；返回 fixes 建议数组（如视频路数>3 → 建议「延后出现/降档」，bytes 超 → 建议「转序列帧/降 LOD」）
- `validate`：缺 id、transform 缺字段、trigger.do 空数组等报 error/warn
- OBJECT_TYPES 每项：{ id, label, icon(单个emoji或字符), defaultSize, canInteract:true, hitbox:'auto'|'box'|'none' }
- CONDITIONS：[tap 点击, gaze 看向1s, hold 按住1s, enter 进入区域, seq_event 时间线事件, node_done 节点完成]；ACTIONS：[play_seq 播放时间线(argKinds:['sequence']), show 显示, hide 隐藏, highlight 高亮, card 弹卡片(argKinds:['text']), reward 给奖励(argKinds:['text']), goto_node 跳转节点(argKinds:['node'])]
- 只依赖自身，不 import three

输出：仅输出完整文件内容，不要 markdown 代码围栏，不要任何解释。