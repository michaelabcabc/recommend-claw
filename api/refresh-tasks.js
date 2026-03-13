import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CATEGORY_LABELS = {
  learn: '学习成长',
  work: '工作项目',
  health: '健康习惯',
  other: '个人目标',
}

const CATEGORY_EMOJIS = {
  learn: '📚',
  work: '💼',
  health: '🏃',
  other: '✦',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { goal, category, motivation, daily_minutes, day_number = 1, completed_task_titles = [] } = req.body
  if (!goal || !category || !motivation) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const categoryLabel = CATEGORY_LABELS[category] || '个人目标'
  const mainEmoji = CATEGORY_EMOJIS[category] || '✦'
  const recentDone = completed_task_titles.length > 0
    ? `\n最近已完成的任务（请生成不同的内容，避免重复）：\n${completed_task_titles.slice(0, 15).map(t => `- ${t}`).join('\n')}`
    : ''

  const prompt = `你是一个专业的目标教练，请为以下用户生成今天的任务计划。

用户目标：${goal}
目标方向：${categoryLabel}
核心动力：${motivation}
每天可用时间：${daily_minutes} 分钟
今天是第 ${day_number} 天${recentDone}

请生成 3 个今天的任务，严格按以下 JSON 格式返回，不要有任何多余的文字：

{
  "tasks": [
    {
      "priority": 1,
      "type": "action",
      "emoji": "表情符号",
      "title": "任务标题（10字以内）",
      "badge": null,
      "concept": null,
      "description": "一句话说明为什么今天要做这件事（20字以内）",
      "duration": "预估时间，如 10 分钟",
      "goal_label": "${categoryLabel}",
      "content": null,
      "completion_message": "完成后的激励话语（2-4行，有温度，第一行最有力量）"
    },
    {
      "priority": 2,
      "type": "content",
      "emoji": "📖",
      "title": "今日学习主题（10字以内）",
      "badge": "第 ${day_number} 天",
      "concept": "核心概念（8字以内）",
      "description": "今天要学什么，一句话（20字以内）",
      "duration": "5 分钟",
      "goal_label": "${categoryLabel}",
      "content": [
        {"type": "news", "heading": "今日背景", "text": "结合真实情景的引入（50-80字）"},
        {"type": "concept", "heading": "核心概念", "text": "清晰解释这个概念（80-120字）"},
        {"type": "rule", "heading": "记住这一点", "text": "一条可以立刻记住的规律（30-50字）"},
        {"type": "connect", "heading": "和你的目标有什么关系", "text": "连接用户目标（40-60字）"}
      ],
      "completion_message": "完成阅读后的激励话语（2-3行）"
    },
    {
      "priority": 3,
      "type": "action",
      "emoji": "${mainEmoji}",
      "title": "第三个任务标题（10字以内）",
      "badge": null,
      "concept": null,
      "description": "一句话说明（20字以内）",
      "duration": "预估时间",
      "goal_label": "${categoryLabel}",
      "content": null,
      "completion_message": "完成后的激励话语（2-4行）"
    }
  ]
}

要求：
- 任务要具体、可执行，不能太模糊
- 时间总和不超过 ${daily_minutes} 分钟
- completion_message 要有真实的情感温度，不要模板化
- content 任务的内容要结合真实的、有用的知识，不要编造
- 所有内容必须用中文`

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].text.trim()
    // Extract JSON from the response (in case there's extra text)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) throw new Error('Invalid tasks format')

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Task generation error:', err)
    // Fallback: return 2 safe generic tasks
    return res.status(200).json({
      tasks: [
        {
          priority: 1, type: 'action', emoji: mainEmoji,
          title: `推进「${goal.slice(0, 8)}」`, badge: null, concept: null,
          description: '今天迈出一步，小也算。',
          duration: `${Math.round(daily_minutes * 0.6)} 分钟`,
          goal_label: categoryLabel, content: null,
          completion_message: '你做到了。\n\n每一步都算数。',
        },
        {
          priority: 2, type: 'action', emoji: '📝',
          title: '记录今天的思考', badge: null, concept: null,
          description: '写下今天最重要的一个想法。',
          duration: '5 分钟',
          goal_label: categoryLabel, content: null,
          completion_message: '写下来的想法，才真正属于你。',
        },
      ],
    })
  }
}
