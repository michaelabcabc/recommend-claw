import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

// 当 AI 不可用时，根据目标类型生成有意义的任务模板
function buildFallbackTasks({ goal, category, motivation, daily_minutes, day_number }) {
  const categoryLabel = CATEGORY_LABELS[category] || '个人目标'
  const mainEmoji = CATEGORY_EMOJIS[category] || '✦'
  const shortGoal = goal.slice(0, 12)
  const actionTime = Math.max(10, Math.round(daily_minutes * 0.5))
  const readTime = Math.min(10, Math.max(5, Math.round(daily_minutes * 0.3)))

  const templates = {
    learn: {
      action1: { emoji: '📖', title: `学习${shortGoal}`, description: '专注阅读，不中断。', duration: `${actionTime} 分钟`, completion_message: `你今天又推进了一步。\n\n知识的积累就是这样一天一天来的。` },
      content: { concept: '今日概念', title: '理解核心概念', description: '读懂一个新概念。' },
      action2: { emoji: '✏️', title: '写下今天的收获', description: '用自己的话写一遍，才真正理解。', duration: '5 分钟', completion_message: '写下来的东西，才真正属于你。' },
    },
    work: {
      action1: { emoji: '🎯', title: `推进${shortGoal}`, description: '专注核心任务，排除干扰。', duration: `${actionTime} 分钟`, completion_message: `专注完成了！\n\n每次深度工作都在积累动能。` },
      content: { concept: '方法论', title: '学一个工作方法', description: '学一个能直接用的方法。' },
      action2: { emoji: '📋', title: '复盘今天进展', description: '记录进展，为明天做准备。', duration: '5 分钟', completion_message: '好的复盘是下一次成功的起点。' },
    },
    health: {
      action1: { emoji: '🏃', title: `执行健康计划`, description: '今天的运动，是对未来的投资。', duration: `${actionTime} 分钟`, completion_message: `完成了！\n\n你的身体记得每一次努力。` },
      content: { concept: '健康知识', title: '了解一个健康原理', description: '知其然也知其所以然。' },
      action2: { emoji: '💧', title: '记录今天状态', description: '追踪让习惯更容易坚持。', duration: '3 分钟', completion_message: '坚持记录的人，最终都会坚持下去。' },
    },
    other: {
      action1: { emoji: mainEmoji, title: `推进${shortGoal}`, description: '迈出今天最重要的一步。', duration: `${actionTime} 分钟`, completion_message: `你做到了。\n\n每一步都算数。` },
      content: { concept: '相关知识', title: '学习相关知识', description: '了解背景，行动更有方向。' },
      action2: { emoji: '📝', title: '记录今天的思考', description: '写下今天最重要的一个想法。', duration: '5 分钟', completion_message: '写下来的想法，才真正属于你。' },
    },
  }

  const t = templates[category] || templates.other

  return [
    {
      priority: 1,
      type: 'action',
      emoji: t.action1.emoji,
      title: t.action1.title,
      badge: null,
      concept: null,
      description: t.action1.description,
      duration: t.action1.duration,
      goal_label: categoryLabel,
      content: null,
      completion_message: t.action1.completion_message,
    },
    {
      priority: 2,
      type: 'content',
      emoji: '📖',
      title: t.content.title,
      badge: `第 ${day_number} 天`,
      concept: t.content.concept,
      description: t.content.description,
      duration: `${readTime} 分钟`,
      goal_label: categoryLabel,
      content: [
        { type: 'news', heading: '今日背景', text: `关于「${goal}」：${motivation}。今天继续在这个方向上深入，积累是最重要的事。` },
        { type: 'concept', heading: '核心思路', text: `实现「${goal}」的关键在于持续行动和反思。每天做一点，比偶尔大爆发更有效。知识和能力都是通过不断练习和反思积累的，而不是靠一次性的努力得来的。` },
        { type: 'rule', heading: '记住这一点', text: `今天的行动 × 每天坚持 = 一个月后的质变。\n不需要完美，只需要出现。` },
        { type: 'connect', heading: '和你的目标连起来', text: `你的目标是「${goal}」。每次你坐下来学习或行动，都是在向这个目标靠近。动力来自于「${motivation}」，这是你前进的根本原因。` },
      ],
      completion_message: `学习完成！\n\n把今天学到的用一句话写下来，是最好的巩固方式。`,
    },
    {
      priority: 3,
      type: 'action',
      emoji: t.action2.emoji,
      title: t.action2.title,
      badge: null,
      concept: null,
      description: t.action2.description,
      duration: t.action2.duration,
      goal_label: categoryLabel,
      content: null,
      completion_message: t.action2.completion_message,
    },
  ]
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: '你是专业目标教练，严格按照用户要求的 JSON 格式输出，不加任何多余文字。' },
        { role: 'user', content: prompt },
      ],
    })

    const raw = response.choices[0].message.content.trim()
    const parsed = JSON.parse(raw)
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) throw new Error('Invalid tasks format')

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Task generation error:', err.message)
    return res.status(200).json({
      tasks: buildFallbackTasks({ goal, category, motivation, daily_minutes, day_number }),
    })
  }
}
