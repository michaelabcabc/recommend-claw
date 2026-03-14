import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.API_RELAY_BASE_URL || 'http://1.95.142.151:3000/v1',
})

const MODEL = 'claude-sonnet-4-5-20250929'

const SYSTEM_PROMPT = `你是一个帮助用户明确目标的 AI 教练。通过 4-5 轮对话，把模糊的想法变成具体可执行的目标。

对话规则：
- 每次只问一个问题，语言简短自然，不超过 50 字
- 根据用户说的目标类型调整问题顺序：

【健康类】（减肥/运动/健康/体重）：
  第1轮：问当前状况和目标数字 → "现在大概多重？想减到多少公斤？"
  第2轮：问时间周期 → "给自己多长时间？比如3个月"
  第3轮：问每天有多少时间

【学习类】（学XXX/了解XXX/掌握XXX）：
  第1轮：问具体方向 → "想重点学哪方面？" 或给出2-3个选项
  第2轮：问当前基础 → "现在是完全零基础还是有一点了解？"
  第3轮：问学习目的 → "学完最希望能做到什么？"
  第4轮：问每天有多少时间

【工作类】（项目/副业/提升/创业）：
  第1轮：问具体是什么 → "是什么工作目标？"
  第2轮：问时间节点 → "有没有截止日期或时间目标？"
  第3轮：问每天有多少时间

收集够信息后，把用户说的内容整理成一句具体目标字符串（例：
- "3个月内从80kg减到70kg（每天运动+控制饮食）"
- "系统学习股票投资，从零基础到能看懂财报"
- "3个月内完成副业第一单，月入3000"
），然后设置 collected: true

必须只输出 JSON，格式如下：
{"reply":"你的回复","collected":false,"goal":null}

当收集够「目标+具体指标+时间」三点后输出：
{"reply":"好！我已经了解了，马上帮你制定计划。","collected":true,"goal":{"goal":"具体目标描述（包含数字和时间范围）","category":"learn或work或health或other","motivation":"核心动力（15字以内）","daily_minutes":30,"subtopic":"具体子方向（学习类填写，如：股票投资基础、宏观经济；其他类填null）"}}

category：learn=学习/技能，health=减肥/运动，work=工作/副业，other=其他`

function extractJSON(text) {
  try { return JSON.parse(text) } catch {}
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) { try { return JSON.parse(mdMatch[1].trim()) } catch {} }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1) { try { return JSON.parse(text.slice(start, end + 1)) } catch {} }
  return null
}

function getFallback(messages) {
  const userMsgs = messages.filter(m => m.role === 'user')
  if (userMsgs.length === 0) return '你好！最近有什么想改变或者想达成的目标吗？'
  const firstGoal = userMsgs[0]?.content || ''
  const isHealth = /减肥|运动|体重|健身|瘦/.test(firstGoal)
  const isLearn = /学|了解|掌握|懂|课/.test(firstGoal)
  if (userMsgs.length === 1) {
    if (isHealth) return `好的！你现在大概多重？想减到多少公斤？`
    if (isLearn) return `想了解一下，你想重点学哪方面？给我说说你的方向。`
    return `听起来不错！具体是什么样的目标呢？能说得再具体一点吗？`
  }
  if (userMsgs.length === 2) {
    if (isHealth) return `给自己多长时间？比如3个月还是半年？`
    if (isLearn) return `你现在是完全零基础，还是有一些了解了？`
    return `有没有具体的截止时间或者里程碑目标？`
  }
  if (userMsgs.length === 3) {
    if (isLearn) return `学完之后，你最希望能做到什么？`
    return `每天大概有多少时间可以投入？哪怕 15 分钟也算。`
  }
  return `每天大概有多少时间可以投入？哪怕 15 分钟也算。`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages } = req.body
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' })

  if (messages.length === 0) {
    return res.status(200).json({ message: '你好！最近有什么想改变或者想达成的目标吗？', collected: false, goal: null })
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
    })

    const raw = response.choices[0].message.content
    const data = extractJSON(raw)
    if (!data || !data.reply) throw new Error('Empty reply')

    return res.status(200).json({
      message: data.reply,
      collected: data.collected === true,
      goal: data.goal || null,
    })
  } catch (err) {
    console.error('discover-goal error:', err.message)
    return res.status(200).json({
      message: getFallback(messages),
      collected: false,
      goal: null,
    })
  }
}
