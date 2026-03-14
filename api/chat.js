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
- 用中文回复，每次回复控制在 150 字以内`

  if (task.type === 'content') {
    return `${base}

当前任务是学习内容：「${task.title}」
${task.concept ? `核心概念：${task.concept}` : ''}

帮助用户理解这个内容，解答困惑，把抽象概念和用户的实际生活连接起来。`
  }

  return `${base}

当前任务是行动项：「${task.title}」
帮助用户克服抵触，找到开始的方式，或者在完成后反思收获。`
}

function getFallbackCoachResponse(task, messages) {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  const isResistance = /抵触|不想|太难|做不到|放弃|没意思|没动力/.test(lastUserMsg)
  const isQuestion = /什么|怎么|为什么|如何|哪里|谁|能不能|可以吗/.test(lastUserMsg)

  if (isResistance) return `感受到你的抵触了。\n\n这很正常——大脑天生抗拒陌生的事情。\n\n试试这样：只做 5 分钟，5 分钟后你可以停下来。往往开始之后就不想停了。`
  if (isQuestion && task?.type === 'content') return `这是个好问题。\n\n学习新知识时，最有效的方式是把它和你已经知道的事联系起来。试着问自己：「这和我生活中的什么事情类似？」`
  if (task?.type === 'content') return `学习这个内容，关键是抓住核心概念，而不是每个字都记住。\n\n先问自己：这节最重要的一句话是什么？写下来，理解就发生了。`
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
      max_tokens: 512,
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
    const fallback = getFallbackCoachResponse(task, messages)
    res.write(`data: ${JSON.stringify({ delta: fallback })}\n\n`)
    res.write('data: [DONE]\n\n')
  } finally {
    res.end()
  }
}
