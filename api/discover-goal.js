import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `你是一个帮助用户明确目标的 AI 教练。通过自然对话了解用户想做什么、为什么、每天有多少时间，然后生成可执行计划。

规则：
- 每次只问一个问题，像朋友聊天
- 语言简短自然，不超过 60 字
- 收集到「目标内容、核心动力、每天时间」三点信息后，才能设置 collected: true
- 不要过早结束，至少对话 3 轮

你必须始终以 JSON 格式回复，字段如下：
{
  "reply": "你的对话回复（必填）",
  "collected": false,
  "goal": null
}

当三个信息都收集齐后，将 collected 设为 true，并填写 goal：
{
  "reply": "确认语，告诉用户你理解了他的目标",
  "collected": true,
  "goal": {
    "goal": "用户目标的一句话描述（具体，15字以内）",
    "category": "learn 或 work 或 health 或 other",
    "motivation": "核心动力一句话",
    "daily_minutes": 30
  }
}

对话从这里开始，先问一个有趣的开场问题来了解用户想做什么。`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages } = req.body
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' })

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
    })

    const raw = response.choices[0].message.content
    const data = JSON.parse(raw)

    return res.status(200).json({
      message: data.reply || '你好，有什么想法想和我分享吗？',
      collected: data.collected === true,
      goal: data.goal || null,
    })
  } catch (err) {
    console.error('discover-goal error:', err.message)
    return res.status(200).json({
      message: '你最近有什么想改变的事，或者想达成什么目标？',
      collected: false,
      goal: null,
    })
  }
}
