import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CATEGORY_LABELS = { learn: '学习成长', work: '工作项目', health: '健康习惯', other: '个人目标' }
const CATEGORY_EMOJIS = { learn: '📚', work: '💼', health: '🏃', other: '✦' }

function buildLearnSystemPrompt(goal) {
  const isFinance = /金融|股票|投资|理财|经济|基金|债券|货币|财务|会计/.test(goal)
  const isCoding  = /编程|代码|开发|Python|JavaScript|算法|数据结构|前端|后端/.test(goal)
  const isLanguage = /英语|日语|法语|德语|西班牙|语言|口语|词汇/.test(goal)

  if (isFinance) return `你是专业金融知识教练。每天帮用户学习一个具体的金融概念，结合真实市场事件分析。
要求：选择真实具体的概念（市盈率PE、QE、美联储加息、通胀、汇率、债券收益率等），news块用真实市场事件引入，concept块含具体数字和例子，rule块给可记住的投资原则，connect块说明如何做更好的财务决策。风格：深入但不晦涩，像华尔街日报中文版，有温度有观点。`

  if (isCoding) return `你是资深软件工程师和编程教练。每天帮用户学习一个具体的编程概念，结合实际代码场景。要求：选择具体技术概念，结合实际开发场景举例，给出可立刻练习的小任务。`

  if (isLanguage) return `你是语言学习教练。每天帮用户学习一个实用的语言知识点，结合真实使用场景。要求：选择具体语法点或词汇主题，给出3-5个真实例句，提供记忆技巧。`

  return `你是专业学习教练。每天帮用户学习一个具体知识点，内容要深入、实用、有趣。`
}

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
      description: isFinance ? '读懂利率如何影响所有资产价格' : `学习「${goal.slice(0,12)}」核心知识`,
      duration: `${readTime} 分钟`, goal_label: categoryLabel,
      content: isFinance ? [
        { type: 'news', heading: '今日背景', text: '美联储利率政策持续影响全球资本市场。当利率上升时，债券价格下跌，成长股估值承压；利率下降时，资金往往流向权益资产寻求更高回报。' },
        { type: 'concept', heading: '核心概念：利率与资产定价', text: '利率是资金的「价格」。在DCF模型中，资产内在价值 = 未来现金流 ÷ 折现率。利率（折现率）上升时，同样的未来现金流今天值得更少钱，资产价格下跌。这就是加息周期股市承压的根本原因。' },
        { type: 'rule', heading: '记住这一点', text: '利率↑ → 折现率↑ → 资产现值↓\n利率↓ → 折现率↓ → 资产现值↑\n这个公式能解释70%的市场大方向。' },
        { type: 'connect', heading: '和你的目标有什么关系', text: `掌握利率这个"万能钥匙"，可以帮你理解股市、债市、楼市的联动逻辑，做出更有依据的判断，而不是凭感觉。` },
      ] : [
        { type: 'news', heading: '今日背景', text: `每天专注学习一个知识点，比偶尔大量学习更有效——这是认知科学中「间隔学习」的核心原理。` },
        { type: 'concept', heading: '核心思路', text: `学习「${goal}」的路径：先建立宏观框架，再逐步填充细节。每天学透一个概念，一个月后你会惊讶自己掌握了多少。` },
        { type: 'rule', heading: '记住这一点', text: `每天${readTime}分钟的专注学习，一年 = 超过60小时深度知识积累。量变引起质变。` },
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
      title: '找一个现实例子', badge: null, concept: null,
      description: isFinance ? '在新闻里找一个今天学到的概念的真实案例' : '找一个现实中的例子来验证今天学到的',
      duration: `${actionTime} 分钟`, goal_label: categoryLabel, content: null,
      completion_message: `真正的理解来自实际应用。\n\n你正在建立的不只是知识，而是思维方式。`,
    },
  ]
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
    ? `\n最近已完成的任务（请生成不同内容，避免重复）：\n${completed_task_titles.slice(0, 10).map(t => `- ${t}`).join('\n')}`
    : ''

  const isLearn = category === 'learn'
  const systemPrompt = isLearn
    ? buildLearnSystemPrompt(goal)
    : '你是专业目标教练。严格按照用户要求的JSON格式输出，不加任何多余文字。只输出JSON对象本身。'

  const readTime = Math.min(15, Math.max(5, Math.round(daily_minutes * 0.4)))
  const actionTime = Math.max(10, Math.round(daily_minutes * 0.4))

  const learnPrompt = `用户目标：${goal}
目标方向：${categoryLabel}
核心动力：${motivation}
每天可用时间：${daily_minutes}分钟
今天是第${day_number}天，参考日期：${today_date}${recentDone}

为这位学习者生成今天的3个学习任务。只输出JSON对象，不加任何其他文字：

{"tasks":[{"priority":1,"type":"content","emoji":"📖","title":"今日学习主题（10字以内，具体到某个概念）","badge":"第${day_number}天","concept":"核心概念（8字以内，如：市盈率PE）","description":"今天要学什么（25字以内）","duration":"${readTime}分钟","goal_label":"${categoryLabel}","content":[{"type":"news","heading":"今日背景","text":"结合具体真实事件引入（60-100字，必须有具体事实/数字/案例）"},{"type":"concept","heading":"核心概念：[概念名]","text":"深入解释（100-150字，含定义、公式/原理、实际例子）"},{"type":"rule","heading":"记住这一点","text":"可立刻记住的规律（30-50字，用公式/口诀/对比格式）"},{"type":"connect","heading":"和你的目标有什么关系","text":"如何帮助实现「${goal}」（40-60字）"}],"completion_message":"完成后激励（2-3行）"},{"priority":2,"type":"action","emoji":"✏️","title":"复述今天的概念","badge":null,"concept":null,"description":"用自己的话写下刚才学到的，测试是否真正理解","duration":"5分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"写下来的东西才真正属于你。\n\n这个习惯会让学习效果翻倍。"},{"priority":3,"type":"action","emoji":"${mainEmoji}","title":"找到一个现实例子","badge":null,"concept":null,"description":"在新闻或生活中找一个今天概念的真实案例","duration":"${actionTime}分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"真正的理解来自实际应用。\n\n你正在建立的不只是知识，而是思维框架。"}]}

要求：content任务的text字段必须包含真实、具体、有深度的知识内容。如果目标是金融，必须结合真实金融市场概念和事件。第${day_number}天的概念要与前几天有逻辑递进关系。`

  const generalPrompt = `用户目标：${goal}
目标方向：${categoryLabel}
核心动力：${motivation}
每天可用时间：${daily_minutes}分钟
今天是第${day_number}天${recentDone}

生成3个今天的任务。只输出JSON对象，不加任何其他文字：

{"tasks":[{"priority":1,"type":"action","emoji":"表情","title":"任务标题（10字以内）","badge":null,"concept":null,"description":"为什么今天做这件事（20字以内）","duration":"预估时间","goal_label":"${categoryLabel}","content":null,"completion_message":"完成后激励（2-4行，第一行最有力量）"},{"priority":2,"type":"content","emoji":"📖","title":"今日学习（10字以内）","badge":"第${day_number}天","concept":"核心概念（8字以内）","description":"今天学什么（20字以内）","duration":"5分钟","goal_label":"${categoryLabel}","content":[{"type":"news","heading":"今日背景","text":"结合真实情景（60-80字）"},{"type":"concept","heading":"核心概念","text":"清晰解释（80-120字）"},{"type":"rule","heading":"记住这一点","text":"可记住的规律（30-50字）"},{"type":"connect","heading":"和你的目标有什么关系","text":"连接用户目标（40-60字）"}],"completion_message":"完成阅读后激励（2-3行）"},{"priority":3,"type":"action","emoji":"${mainEmoji}","title":"任务标题（10字以内）","badge":null,"concept":null,"description":"一句话说明（20字以内）","duration":"预估时间","goal_label":"${categoryLabel}","content":null,"completion_message":"完成后激励（2-4行）"}]}

要求：任务具体可执行，时间总和不超过${daily_minutes}分钟，所有内容用中文。`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: isLearn ? learnPrompt : generalPrompt }],
    })

    const raw = response.content[0].text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) throw new Error('Invalid tasks format')

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Task generation error:', err.message)
    return res.status(200).json({
      tasks: buildFallbackTasks({ goal, category, motivation, daily_minutes, day_number }),
    })
  }
}
