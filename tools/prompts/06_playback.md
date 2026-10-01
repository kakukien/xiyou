生成文件 `src/core/playback.js`。实现契约中 player + triggers。

要点：
- import { store } from './store.js'; { viewport } from './viewport.js'; { log } from '../ui/log.js'
- player：内部维护 active=[{seq, node:Map<trackIdx,Object3D>, t0}]；play(seqId) 从 store.scene.sequences 找 seq，为每条 track 解析 target node（viewport.node(target)），记录初始值；tick(dt) 推进 t，对每 track 按 keys 插值：
  - kind 'transform'：key.v={p?,r?,s?}，缺分量用对象当前值补；ease：linear/in(t*t)/out(1-(1-t)^2)/inout(smoothstep)；写 node.position/rotation(deg→rad)/scale
  - kind 'opacity'：遍历 node 材质设 transparent+opacity
  - kind 'video'：key.v={play:true|false} → node 里 VideoTexture 的 video.play()/pause()
  - 'clip'（glb 动画）：node.userData.animations 有则用 AnimationMixer 播放 v.clip 索引/名
  - 'event'：到达时 store.emit('seq-event',{seqId,key})
  - 结束 fire('seq_event') 到 triggers + stop
- stop() 恢复初始值可选（重置=false 保持末态）
- triggers.fire(when, targetId, extra={})：遍历 store.scene.triggers 匹配 when+target（target 为空字符串的 trigger 不匹配）；按 do[] 顺序执行：play_seq(args.seqId)；show/hide→store.updateObject(target,{visible:bool})；highlight→node 闪烁（set emissive/色 0.6s 恢复）；card→store.emit('card',{text:args.text})；reward→store.emit('card',{text:'获得奖励: '+args.text})；goto_node→store.emit('node-goto',{nodeId:args.nodeId})，并 markNodeDone
- enter 自动检测：仅 play 模式；游客点 = 相机位置（桌面模拟）；每 tick 检查 when='enter' 的 trigger：target node 距离 < params.radius(默认2) 且未触发过 → fire；离开后重置可再触发；记录每个 trigger 的 inside 状态
- 导出 `export function tickPlay(dt)`：player.tick + enter 检测（由 main.js 每帧调用）
- gaze/hold 由 UI 按钮模拟 → 直接调 triggers.fire('gaze'|'hold', id)
- node 完成流程：store.emit('node-done',{nodeId}) → 匹配 when='node_done' 且 target=该 node 的 trigger 也 fire

输出：仅输出完整文件内容，不要 markdown 代码围栏，不要任何解释。