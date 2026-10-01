生成文件 `src/core/templates.js`。实现契约中的 demoScene / ACTION_CARDS / cardToSequence。

要点：
- import { newObject, newSequence, newTrigger, newNode, newChapter, defaults } from './schema.js'
- demoScene()：以 defaults() 为底，填充：
  - 3 个对象：glb_悟空(type glb, p[0,1,-3], asset 空=占位), seg_岩壁(type splat_segment, p[2,1.2,-4]), quad_结界符(type quad, p[-2,1.5,-3])；node_id 分别绑 n1/n2/n3；visible 依剧情默认 true
  - 3 条 sequence：seq_出场（target glb_悟空, transform 轨道: t0 p[0,3,-3] s0 → t1s p[0,1,-3] s1，ease out），seq_结界显形（quad opacity 0→1），seq_消散（任意 target 留 node3 对象, opacity 1→0）
  - 3 条 trigger：n1 enter{radius:2}→play_seq seq_出场 + card{text:'悟空醒了'}；n2 gaze{secs:1}→play_seq + highlight；n3 hold{secs:1}→play_seq seq_消散 + goto_node + card{结局}
  - story.chapters=[{id:'ch1',title:'花果山觉醒',nodes:[n1(title:'石卵醒来',text≤40字,anchor:'',on_enter:'',next:'n2'),n2('岩壁低语',next:'n3'),n3('虚境之门',next:null)]}]，checklist 全 false
  - meta.assets=[]，meta.name='花果山觉醒 · 验证骨架'
- cardToSequence(cardId, targetId)：按卡片语义生成 1~2s、2~4 个 key 的 transform/opacity 轨道；ease 字段用 'linear'|'in'|'out'|'inout'；orbit 用 4 个 key 绕 y 一圈
- 文案全部中文、≤40字、西游主题占位

输出：仅输出完整文件内容，不要 markdown 代码围栏，不要任何解释。