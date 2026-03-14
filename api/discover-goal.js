import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.API_RELAY_BASE_URL || 'http://1.95.142.151:3000/v1',
})

const MODEL = 'claude-3-5-sonnet-20241022'

const SYSTEM_PROMPT = `你是一个帮助用户明确目标的 AI 教练。通过自然对话了解用户想做什么、为什么想做、每天有多少时间，然后生成可执行计划。

规则：
- 每次只回应用户说的内容，然后问一个具体问题
- 语言简短自然，像朋友聊天，不超过 60 字
- 第一轮：理解用户目标，问为什么想做这件事
- 第二轮：问每天有多少时间
- 第三轮及之后：汇总确认，设置 collected: true

必须只输出 JSON，格式如下：
{"reply":"你的回复","collected":false,"goal":null}

当收集够「目标、动力、时间」三点后输出：
{"reply":"好！我已经了解了，帮你制定每天的行动计划。","collected":true,"goal":{"goal":"目标描述（15字以内）","category":"learn或work或health或other","motivation":"核心动力（15字以内）","daily_minutes":30}}

category：learn=学习/技能，health=减肥/运动，work=工作/副业，other=其他`

function getFallback(messages) {
  const userMsgs = messages.filter(m => m.role === 'user')
  if (userMsgs.length === 0) return '你好！最近有什么想改变或者想达成的目标吗？'
  if (userMsgs.length === 1) return `听起来不错！是什么让你想开始「${userMsgs[0].content.slice(0, 15)}」这件事呢？`
  if (userMsgs.length === 2) return '每天大概有多少时间可以投入在这上面？哪怕 15 分钟也可以。'
  return '好的，我来帮你制定每天的行动计划。'
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
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
    })

    const raw = response.choices[0].message.content
    const data = JSON.parse(raw)
    if (!data.reply) throw new Error('Empty reply')

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
