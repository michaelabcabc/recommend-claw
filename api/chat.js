import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Access-Control-Allow-Origin', '*')

  const { messages, goal, motivation, task } = req.body
  if (!messages || !task) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const systemPrompt = buildSystemPrompt({ goal: goal || '', motivation: motivation || '', task })
    const stream = client.messages.stream({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`)
      }
    }
    res.write('data: [DONE]\n\n')
  } catch (err) {
    console.error('Claude API error:', err)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
  } finally {
    res.end()
  }
}
