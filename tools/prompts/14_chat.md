生成文件 `src/ui/chat.js`。`export function mount()`——右下角浮动 AI 对话框（无需挂载点，自创建 fixed 容器）。

import { store } from '../core/store.js'; { sceneSummary, SYSTEM_PROMPT, applyOps } from '../core/aiops.js'; { log } from './log.js'

## UI（瓷白橙光主题，用 style.css 变量）
- 右下浮动按钮：56px 圆钮，橙渐变底（linear-gradient #ff8c3b→#f56d00），白「AI」字，阴影，z-index 90；悬停放大
- 点击展开面板：360×480，固定右下（bottom:76px right:16px），瓷白卡（bg1/边框 line2/圆角10/阴影），顶部标题栏「AI 助手 · 场景编辑」+ 状态点 + 收起钮
- 消息流：用户右对齐橙气泡、AI 左对齐白气泡、系统提示灰小字居中；滚动到底
- 输入区：textarea(自适应 1-3 行)+ 发送钮；Enter 发送、Shift+Enter 换行；发送中禁用 + 气泡内打字动画（三点跳动 CSS 动画即可）
- ops 执行反馈：AI 气泡下方追加一行小字「已执行 3/4 项修改」（失败红字列出）；每条 applyOps 结果也写 log
- 首次打开显示欢迎语气泡：「说出你想改的场景，比如：在入口加一个会发光的符咒 / 把悟空移到左边两米」

## 逻辑
- history 内存维护 [{role,content}]（最多留 20 条），每次请求发 [system(sceneSummary 动态拼进 SYSTEM_PROMPT 尾部「当前场景：…」), ...history]
- POST `${location.origin==='https://agentpay.xx.kg' ? '' : 'https://agentpay.xx.kg'}/xiyou-ai/chat`，body {messages}，120s AbortController 超时
- 响应 {content} → 解析 JSON（宽容：找首个 { 到末个 }，失败→整段当 reply，ops=[]）→ 显示 reply → applyOps(ops) → 反馈行
- 网络/超时/解析失败都给出友好错误气泡，不崩
- store.mode='play' 时面板禁用输入并提示「试玩模式下不可编辑」

输出：仅完整文件内容，无围栏无解释。