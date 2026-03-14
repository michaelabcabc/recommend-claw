import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `你是一个帮助用户明确目标的 AI 教练。你的任务是通过自然对话，了解用户真正想做什么、为什么想做、以及他们的时间情况，最终提炼出一个可执行的目标计划。

对话原则：
- 一次只问一个问题，不要问多个
- 语气温和、有好奇心，像朋友一样
- 根据用户的回答追问，挖掘真实动机
- 当你收集到足够信息（目标、动力、时间、类别）时，输出结构化的目标总结
- 用中文对话，简洁自然

当信息足够时，你必须在回复末尾以此格式输出 JSON（用 <<<JSON_START>>> 和 <<<JSON_END>>> 包裹）：
<<<JSON_START>>>
{
  "ready": true,
  "goal": "用户的目标（一句话，具体）",
  "category": "learn 或 work 或 health 或 other",
  "motivation": "核心动力（一句话）",
  "daily_minutes": 30
}
<<<JSON_END>>>

在没有收集到足够信息之前，不要输出 JSON，继续对话。

需要收集的信息：
1. 想做什么（目标方向）
2. 为什么想做（动力来源）
3. 每天大概能花多少时间

开场白：直接问用户最近有什么想改变或想达成的事，简短有趣。`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages } = req.body
  if (!messages) return res.status(400).json({ error: 'Missing messages' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 600,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
    })

    let fullText = ''
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || ''
      if (delta) {
        fullText += delta
        // Stream only the non-JSON part to the client
        const jsonStart = fullText.indexOf('<<<JSON_START>>>')
        if (jsonStart === -1) {
          // No JSON yet, stream everything
          res.write(`data: ${JSON.stringify({ delta })}\n\n`)
        }
        // Once JSON marker appears, stop streaming text (we'll send goal at end)
      }
    }

    // Check if a goal was extracted
    const jsonMatch = fullText.match(/<<<JSON_START>>>([\s\S]*?)<<<JSON_END>>>/)
    if (jsonMatch) {
      try {
        const goalData = JSON.parse(jsonMatch[1].trim())
        // Get the text before the JSON block
        const textPart = fullText.split('<<<JSON_START>>>')[0].trim()
        if (textPart) {
          res.write(`data: ${JSON.stringify({ delta: textPart, replace: true })}\n\n`)
        }
        res.write(`data: ${JSON.stringify({ goal: goalData })}\n\n`)
      } catch (_) {
        // JSON parse failed, just send the text
        const textPart = fullText.split('<<<JSON_START>>>')[0].trim()
        if (textPart) {
          res.write(`data: ${JSON.stringify({ delta: textPart, replace: true })}\n\n`)
        }
      }
    }

    res.write('data: [DONE]\n\n')
  } catch (err) {
    console.error('Discover goal error:', err.message)
    res.write(`data: ${JSON.stringify({ delta: '你最近有什么想改变的事，或者想达成的目标？告诉我，我来帮你拆解成每天的行动。' })}\n\n`)
    res.write('data: [DONE]\n\n')
  } finally {
    res.end()
  }
}
