import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.API_RELAY_BASE_URL || 'http://1.95.142.151:3000/v1',
})

const MODEL = 'claude-sonnet-4-5-20250929'

const CATEGORY_LABELS = { learn: '学习成长', work: '工作项目', health: '健康习惯', other: '个人目标' }
const CATEGORY_EMOJIS = { learn: '📚', work: '💼', health: '🏃', other: '✦' }

function buildFallbackTasks({ goal, category, motivation, daily_minutes, day_number }) {
  const categoryLabel = CATEGORY_LABELS[category] || '个人目标'
  const readTime = Math.min(10, Math.max(5, Math.round(daily_minutes * 0.3)))
  const actionTime = Math.max(10, Math.round(daily_minutes * 0.5))
  const isFinance = /金融|股票|投资|理财|经济|基金|债券|货币/.test(goal)

  return [
    {
      priority: 1, type: 'content', emoji: CATEGORY_EMOJIS[category] || '📚',
      title: isFinance ? '今日金融概念' : '今日学习',
      badge: `第 ${day_number} 天`, concept: isFinance ? '利率与定价' : '核心概念',
      description: isFinance ? '读懂利率如何影响所有资产价格' : `学习「${goal.slice(0, 12)}」核心知识`,
      duration: `${readTime} 分钟`, goal_label: categoryLabel,
      content: [
        { type: 'news', heading: '今日背景', text: isFinance ? '美联储利率政策持续影响全球资本市场。利率上升时，债券价格下跌，成长股估值承压；利率下降时，资金往往流向权益资产寻求更高回报。理解利率与资产价格的关系，是金融学习的核心。' : `每天专注学习一个知识点，比偶尔大量学习更有效——这是认知科学「间隔学习」的核心原理。` },
        { type: 'concept', heading: isFinance ? '核心概念：利率与资产定价' : '核心思路', text: isFinance ? '利率是资金的「价格」。在DCF模型中，资产内在价值 = 未来现金流 ÷ 折现率。利率上升时，同样的未来现金流今天值得更少钱，资产价格下跌。这就是加息周期股市承压的根本原因。' : `学习「${goal}」的路径：先建立宏观框架，再逐步填充细节。每天学透一个概念，一个月后你会惊讶自己掌握了多少。` },
        { type: 'rule', heading: '记住这一点', text: isFinance ? '利率↑ → 折现率↑ → 资产现值↓\n利率↓ → 折现率↓ → 资产现值↑\n这个公式能解释70%的市场大方向。' : `每天${readTime}分钟的专注学习，一年 = 超过60小时深度积累。量变引起质变。` },
        { type: 'connect', heading: '和你的目标有什么关系', text: `你的目标是「${goal}」，动力是「${motivation}」。每次坐下来学习，都是在向这个目标靠近一步。` },
      ],
      completion_message: `学完了！\n\n用一句话把刚才学到的写下来，是最快的记忆巩固方法。`,
    },
    {
      priority: 2, type: 'action', emoji: '✏️',
      title: '用自己的话复述', badge: null, concept: null,
      description: '把刚学到的概念用自己的话写下来，测试是否真懂了',
      duration: '5 分钟', goal_label: categoryLabel, content: null,
      completion_message: `写下来的东西才真正属于你。\n\n这个习惯会让你的学习效果翻倍。`,
    },
    {
      priority: 3, type: 'action', emoji: '🔍',
      title: isFinance ? '找一个现实案例' : '联系实际',
      badge: null, concept: null,
      description: isFinance ? '在新闻里找一个今天学到的概念的真实案例' : '找一个现实中的例子验证今天学到的',
      duration: `${actionTime} 分钟`, goal_label: categoryLabel, content: null,
      completion_message: `真正的理解来自实际应用。\n\n你正在建立的不只是知识，而是思维方式。`,
    },
  ]
}

function buildPrompt({ goal, category, categoryLabel, mainEmoji, motivation, daily_minutes, day_number, recentDone, today_date }) {
  const isLearn = category === 'learn'
  const readTime = Math.min(15, Math.max(5, Math.round(daily_minutes * 0.4)))
  const actionTime = Math.max(10, Math.round(daily_minutes * 0.4))

  if (isLearn) {
    return `你是专业学习教练。为以下用户生成今天3个学习任务，只输出JSON对象：

用户目标：${goal}（${categoryLabel}）
动力：${motivation}，每天${daily_minutes}分钟，第${day_number}天，日期：${today_date}${recentDone}

{"tasks":[{"priority":1,"type":"content","emoji":"📖","title":"今日学习主题（10字内，具体概念）","badge":"第${day_number}天","concept":"核心概念（8字内）","description":"今天学什么（20字内）","duration":"${readTime}分钟","goal_label":"${categoryLabel}","content":[{"type":"news","heading":"今日背景","text":"结合真实事件/市场现象引入（60-100字，必须有具体事实或数字）"},{"type":"concept","heading":"核心概念：[概念名]","text":"深入解释（100-150字，含定义、原理、实际例子）"},{"type":"rule","heading":"记住这一点","text":"可立刻记住的规律（30-50字，用公式/口诀格式）"},{"type":"connect","heading":"和你的目标有什么关系","text":"如何帮助实现「${goal}」（40-60字）"}],"completion_message":"完成后激励（2-3行）"},{"priority":2,"type":"action","emoji":"✏️","title":"复述今天的概念","badge":null,"concept":null,"description":"用自己的话写下刚才学到的，测试是否真正理解","duration":"5分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"写下来的东西才真正属于你。\n\n这个习惯让学习效果翻倍。"},{"priority":3,"type":"action","emoji":"${mainEmoji}","title":"找到一个现实例子","badge":null,"concept":null,"description":"在新闻或生活中找今天概念的真实案例","duration":"${actionTime}分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"真正的理解来自实际应用。\n\n你在建立的不只是知识，而是思维框架。"}]}

要求：如果是金融目标，必须包含真实金融概念和市场事件；第${day_number}天的概念要有逻辑递进。`
  }

  return `你是专业目标教练。为以下用户生成今天3个任务，只输出JSON对象：

用户目标：${goal}（${categoryLabel}）
动力：${motivation}，每天${daily_minutes}分钟，第${day_number}天${recentDone}

{"tasks":[{"priority":1,"type":"action","emoji":"表情","title":"任务标题（10字内）","badge":null,"concept":null,"description":"为什么今天做（20字内）","duration":"预估时间","goal_label":"${categoryLabel}","content":null,"completion_message":"完成激励（2-4行，第一行最有力量）"},{"priority":2,"type":"content","emoji":"📖","title":"今日学习（10字内）","badge":"第${day_number}天","concept":"核心概念（8字内）","description":"今天学什么（20字内）","duration":"5分钟","goal_label":"${categoryLabel}","content":[{"type":"news","heading":"今日背景","text":"真实情景引入（60-80字）"},{"type":"concept","heading":"核心概念","text":"清晰解释（80-120字）"},{"type":"rule","heading":"记住这一点","text":"可记住的规律（30-50字）"},{"type":"connect","heading":"和你的目标有什么关系","text":"连接用户目标（40-60字）"}],"completion_message":"完成激励（2-3行）"},{"priority":3,"type":"action","emoji":"${mainEmoji}","title":"任务标题（10字内）","badge":null,"concept":null,"description":"一句话说明（20字内）","duration":"预估时间","goal_label":"${categoryLabel}","content":null,"completion_message":"完成激励（2-4行）"}]}

要求：任务具体可执行，时间总和不超过${daily_minutes}分钟，所有内容用中文。`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    goal, category, motivation,
    daily_minutes = 30, day_number = 1,
    completed_task_titles = [],
    today_date = new Date().toISOString().split('T')[0],
  } = req.body

  if (!goal || !category || !motivation) return res.status(400).json({ error: 'Missing required fields' })

  const categoryLabel = CATEGORY_LABELS[category] || '个人目标'
  const mainEmoji = CATEGORY_EMOJIS[category] || '✦'
  const recentDone = completed_task_titles.length > 0
    ? `\n最近已完成（请避免重复）：\n${completed_task_titles.slice(0, 10).map(t => `- ${t}`).join('\n')}`
    : ''

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: buildPrompt({ goal, category, categoryLabel, mainEmoji, motivation, daily_minutes, day_number, recentDone, today_date }),
      }],
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
