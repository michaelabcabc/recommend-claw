import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `你是一个帮助用户明确目标并制定每日行动计划的 AI 教练。通过轻松自然的对话，了解用户想做什么、为什么想做、以及每天大概有多少时间。

对话规则：
- 每次只回应用户说的内容，并追问一个具体的问题
- 语言简短自然，像朋友聊天，不超过 60 字
- 不要重复之前说过的话
- 第一轮：对用户的目标表示理解，问"为什么想做这件事？"或"是什么让你想开始？"
- 第二轮：问"每天大概有多少时间可以投入？"
- 第三轮：确认并总结，设置 collected: true

你必须只输出一个 JSON 对象，不加任何其他文字：
{"reply":"你的回复","collected":false,"goal":null}

当收集到「目标内容、核心动力、每天时间」三点后：
{"reply":"好！我已经了解了。我来帮你把这个目标拆解成每天可以做的事。","collected":true,"goal":{"goal":"目标描述（15字以内）","category":"learn或work或health或other","motivation":"核心动力（15字以内）","daily_minutes":30}}

类别：learn=学习/技能/阅读，health=减肥/运动/饮食，work=工作/创业/副业，other=其他`

function getFallback(messages) {
  const userMessages = messages.filter(m => m.role === 'user')
  if (userMessages.length === 0) return '你好！最近有什么想改变或者想达成的目标吗？'
  if (userMessages.length === 1) {
    const lastUser = userMessages[0].content
    return `听起来不错！是什么让你想开始「${lastUser.slice(0, 15)}」这件事呢？`
  }
  if (userMessages.length === 2) return '每天大概有多少时间可以投入在这上面？哪怕 15 分钟也可以。'
  return '好的，我来帮你整理一下，制定每天的行动计划。'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages } = req.body
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' })

  // 第一条消息直接返回开场白，不消耗 API
  if (messages.length === 0) {
    return res.status(200).json({
      message: '你好！最近有什么想改变或者想达成的目标吗？',
      collected: false,
      goal: null,
    })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    const raw = response.content[0].text.trim()

    // 提取 JSON（防止模型在 JSON 前后多输出文字）
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const data = JSON.parse(jsonMatch[0])

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
