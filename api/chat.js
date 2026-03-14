import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.API_RELAY_BASE_URL || 'http://1.95.142.151:3000/v1',
})

const MODEL = 'claude-sonnet-4-5-20250929'

function buildSystemPrompt({ goal, motivation, task }) {
  const base = `你是用户的私人 AI 教练，帮助他们实现目标：「${goal}」。
用户的核心动力是：${motivation}

你的风格：
- 简洁、有温度，像一个懂你的朋友
- 不说废话，每次回复聚焦在一个关键点
- 用中文回复`

  // 学习模式：AI 主导讲解概念，用户可以提问
  if (task.learningMode) {
    return `${base}

你今天的角色是「学习教练」，专门讲解这个概念：
📚 主题：「${task.title}」
${task.concept ? `一句话描述：${task.concept}` : ''}

教学方式：
- 第一条回复：给出完整清晰的概念解释（约 200 字），结构是：
  ① 这个概念是什么（定义）
  ② 背后的原理是什么（为什么）
  ③ 一个具体的现实例子（比如真实的市场事件或生活类比）
  ④ 和用户目标「${goal}」的关联（学这个有什么用）
- 之后的回复：耐心回答用户问题，每次不超过 150 字，用日常类比解释复杂概念
- 偶尔反问「你觉得为什么会这样？」来加深理解
- 如果用户说「懂了」「学完了」「明白了」，给一句简短的总结要点

回复风格：不要用数字序号列表，用自然流畅的段落。`
  }

  if (task.type === 'content') {
    return `${base}

当前任务是学习内容：「${task.title}」
${task.concept ? `核心概念：${task.concept}` : ''}

帮助用户理解这个内容，解答困惑，把抽象概念和用户的实际生活连接起来。每次回复不超过 150 字。`
  }

  return `${base}

当前任务是行动项：「${task.title}」
帮助用户克服抵触，找到开始的方式，或者在完成后反思收获。每次回复不超过 150 字。`
}

function getFallbackCoachResponse(task) {
  if (task?.learningMode) {
    const concept = task.concept || task.title || '这个概念'
    return `${concept}是今天的学习主题。\n\n这个概念在金融/投资领域很基础，理解它之后很多东西会豁然开朗。\n\n你有什么不清楚的地方吗？直接问我。`
  }
  if (task?.type === 'content') {
    return `学习新知识时，最有效的方式是把它和你已经知道的事联系起来。\n\n试着问自己：这和我生活中的什么事情类似？`
  }
  return `迈出第一步是最难的，之后就顺了。\n\n把任务拆成最小的那一步：不是「完成」，而是「开始」。5 分钟的开始，就够了。`
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const { messages, goal, motivation, task } = req.body
  if (!messages || !task) {
    res.write(`data: ${JSON.stringify({ delta: '出错了，请稍后再试。' })}\n\n`)
    res.write('data: [DONE]\n\n')
    return res.end()
  }

  try {
    const systemPrompt = buildSystemPrompt({ goal: goal || '', motivation: motivation || '', task })

    const stream = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: task.learningMode ? 800 : 512,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || ''
      if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
  } catch (err) {
    console.error('Chat API error:', err.message)
    const fallback = getFallbackCoachResponse(task)
    res.write(`data: ${JSON.stringify({ delta: fallback })}\n\n`)
    res.write('data: [DONE]\n\n')
  } finally {
    res.end()
  }
}
