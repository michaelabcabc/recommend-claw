// refresh-tasks.js — 每日任务刷新（功能同 generate-tasks，额外携带完成历史避免重复）
// 直接代理到 generate-tasks handler
import handler from './generate-tasks.js'
export default handler
