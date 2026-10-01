重写 `src/ui/dock.js`（覆盖现有）。`export function mount(el)`，底栏，按设计稿：

## 结构
- 顶 tab 行：「内容浏览器 | 时间线 | 输出日志」左对齐 + 右侧 `.cardchips` 动作卡行：渲染全部 ACTION_CARDS（chip 文案=卡名，点击=把卡绑到当前选中对象：cardToSequence(cardId,objId)→addSequence + 自动补一条 trigger when:'tap' do:[play_seq seqId]；无选中则 log 提示）
- tab 区下是面板区（flex:1 可滚动）：
  - **内容浏览器**：`.asset-strip` 横排缩略卡（.cb-card：缩略占位块+文件名+字节数）渲染 store.scene.meta.assets + 尾卡「＋导入素材」(文件选择器 multiple，图像/视频/glb 注册 meta.assets：{id,name,url:本地objectURL,bytes,mime}；注意 objectURL 不能持久化——save 时 url 会被 normalize 成 '' 会丢，改为存 name/bytes 占位 url:'local://name'）+ 删除钮
  - **时间线**：sequence 下拉选择当前 seq + 时长输入 + `＋`新建；标尺（fps 30，每 10 帧刻度，duration 换算秒）；轨道区：sequence.tracks 每轨道一行 `.tl-track`（左名 .tl-name：kind 中文+目标对象名+色点 .kdot.k-{kind}；右 `.tl-lane` 定位 keys：菱形小点定位 left=t/duration*100%，点 key 选中显示值编辑气泡：transform key 编辑 v.p/r/s 数组输入，opacity 编辑数值；轨道上双击空白 → 在 playhead 处插 key（值=对象当前对应属性）；▶ 播放钮 → playback.play(seq.id)；`＋轨道` 下拉选 kind+target）
  - **输出日志**：沿用原日志列表样式（订阅 'log'，级别着色）
- 底部 `.dock-statusbar`：运行预算 · 资源体积 X GB · 同屏视频 n/3 · 面数 x 万 · 累计帧率 N FPS（资源体积=meta.assets bytes 合计；面数=estimateBudget tris；帧率=subscribe 'budget' 或 rAF 计数由 main 提供——简化：显示 estimateBudget.estFps 估值，前加「预估」；over_budget 时 .over 红字）
- mode='play'：时间线仍可播放预览，其余编辑控件禁用

输出：仅完整文件内容，无围栏无解释。