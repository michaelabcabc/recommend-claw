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

// 学习类目标的深度知识系统提示
function buildLearnSystemPrompt(goal) {
  const isFinance = /金融|股票|投资|理财|经济|基金|债券|货币|财务|会计/.test(goal)
  const isCoding = /编程|代码|开发|Python|JavaScript|算法|数据结构|前端|后端/.test(goal)
  const isLanguage = /英语|日语|法语|德语|西班牙|语言|口语|词汇/.test(goal)

  if (isFinance) {
    return `你是一个专业的金融知识教练和内容创作者。你的任务是每天帮用户学习一个具体的金融概念，并结合真实的市场事件进行分析。

内容要求：
- 选择一个真实、具体的金融概念（如：市盈率PE、量化宽松QE、美联储加息、通货膨胀、汇率机制、债券收益率、格雷厄姆安全边际等）
- news 块：描述一个相关的真实市场事件或经济现象作为引入，解释来龙去脉
- concept 块：清晰解释这个金融概念，用具体数字和例子
- rule 块：给出一条可以立刻记住的投资原则或分析框架
- connect 块：告诉用户如何用这个知识做更好的财务决策

风格：深入但不晦涩，像华尔街日报的中文版，有温度、有观点。`
  }

  if (isCoding) {
    return `你是一个资深软件工程师和编程教练。每天帮用户学习一个具体的编程概念，结合实际代码场景。

内容要求：
- 选择一个具体的技术概念（数据结构、算法、设计模式、框架特性等）
- 结合实际开发场景举例
- 给出可以立刻练习的小任务`
  }

  if (isLanguage) {
    return `你是一个语言学习教练。每天帮用户学习一个实用的语言知识点，结合真实使用场景。

内容要求：
- 选择一个具体的语法点、常用表达或词汇主题
- 给出 3-5 个真实例句
- 提供记忆技巧`
  }

  return `你是一个专业的学习教练。每天帮用户学习一个具体的知识点，内容要深入、实用、有趣。`
}

function buildFallbackTasks({ goal, category, motivation, daily_minutes, day_number }) {
  const categoryLabel = CATEGORY_LABELS[category] || '个人目标'
  const mainEmoji = CATEGORY_EMOJIS[category] || '✦'
  const shortGoal = goal.slice(0, 12)
  const actionTime = Math.max(10, Math.round(daily_minutes * 0.5))
  const readTime = Math.min(10, Math.max(5, Math.round(daily_minutes * 0.3)))

  const isFinance = /金融|股票|投资|理财|经济|基金|债券|货币/.test(goal)

  const contentBlocks = isFinance ? [
    { type: 'news', heading: '今日背景', text: `美联储利率政策持续影响全球资本市场。当利率上升时，债券价格下跌，成长股估值承压；当利率下降时，资金往往流向权益资产寻求更高回报。理解利率与资产价格的关系，是金融学习的核心入门课。` },
    { type: 'concept', heading: '核心概念：利率与资产定价', text: `利率是资金的「价格」。在贴现现金流（DCF）模型中，资产的内在价值 = 未来现金流 / 折现率。当利率（折现率）上升，同样的未来现金流在今天值得更少钱，所以资产价格下跌。这就是为什么「加息周期」股市往往承压的根本原因。` },
    { type: 'rule', heading: '记住这一点', text: `利率↑ → 折现率↑ → 资产现值↓\n利率↓ → 折现率↓ → 资产现值↑\n这个公式能解释 70% 的市场大方向。` },
    { type: 'connect', heading: '和你的目标有什么关系', text: `你在学习「${goal}」。掌握利率这个"万能钥匙"，可以帮你理解股市、债市、楼市的联动逻辑，做出更有依据的投资判断，而不是凭感觉。` },
  ] : [
    { type: 'news', heading: '今日背景', text: `关于「${goal}」：${motivation}。每天专注学习一个知识点，比偶尔大量学习更有效——这是认知科学中「间隔学习」的核心原理。` },
    { type: 'concept', heading: '核心思路', text: `「${goal}」的学习路径：先建立宏观框架，再逐步填充细节。不要试图一次学完所有内容，而是每天学透一个概念，一个月后你会惊讶自己掌握了多少。` },
    { type: 'rule', heading: '记住这一点', text: `每天 ${readTime} 分钟的专注学习，一年 = 超过 60 小时的深度知识积累。\n量变引起质变，坚持比突击更重要。` },
    { type: 'connect', heading: '和你的目标有什么关系', text: `你的目标是「${goal}」，动力是「${motivation}」。每次你坐下来学习，都是在向这个目标靠近一步。` },
  ]

  return [
    {
      priority: 1,
      type: 'content',
      emoji: mainEmoji,
      title: isFinance ? '今日金融概念' : `今日学习`,
      badge: `第 ${day_number} 天`,
      concept: isFinance ? '利率与定价' : '核心概念',
      description: isFinance ? '读懂利率如何影响一切资产价格' : `学习「${shortGoal}」的核心知识`,
      duration: `${readTime} 分钟`,
      goal_label: categoryLabel,
      content: contentBlocks,
      completion_message: `学完了！\n\n用一句话把刚才学到的写下来，是最快的记忆巩固方法。`,
    },
    {
      priority: 2,
      type: 'action',
      emoji: '✏️',
      title: isFinance ? '写下你的理解' : '消化今天的内容',
      badge: null,
      concept: null,
      description: isFinance ? '用自己的话解释刚才的概念，测试真懂了没有' : '把今天学到的用自己的话复述一遍',
      duration: '5 分钟',
      goal_label: categoryLabel,
      content: null,
      completion_message: `写下来的东西才真正属于你。\n\n这个习惯会让你的学习效果翻倍。`,
    },
    {
      priority: 3,
      type: 'action',
      emoji: '🔍',
      title: isFinance ? '找一个现实例子' : '联系实际',
      badge: null,
      concept: null,
      description: isFinance ? '在新闻里找一个今天学到的概念的真实案例' : '找一个现实中的例子来验证今天学到的',
      duration: `${actionTime} 分钟`,
      goal_label: categoryLabel,
      content: null,
      completion_message: `真正的理解来自于实际应用。\n\n你正在建立的不只是知识，而是思维方式。`,
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

  if (!goal || !category || !motivation) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const categoryLabel = CATEGORY_LABELS[category] || '个人目标'
  const mainEmoji = CATEGORY_EMOJIS[category] || '✦'
  const recentDone = completed_task_titles.length > 0
    ? `\n最近已完成的任务（请生成不同内容，避免重复）：\n${completed_task_titles.slice(0, 10).map(t => `- ${t}`).join('\n')}`
    : ''

  // 为学习类目标提供专属系统提示
  const systemPrompt = category === 'learn'
    ? buildLearnSystemPrompt(goal)
    : '你是专业目标教练，严格按照用户要求的 JSON 格式输出，不加任何多余文字。'

  const prompt = category === 'learn'
    ? buildLearnPrompt({ goal, category, categoryLabel, mainEmoji, motivation, daily_minutes, day_number, recentDone, today_date })
    : buildGeneralPrompt({ goal, category, categoryLabel, mainEmoji, motivation, daily_minutes, day_number, recentDone })

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
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

function buildLearnPrompt({ goal, category, categoryLabel, mainEmoji, motivation, daily_minutes, day_number, recentDone, today_date }) {
  const readTime = Math.min(15, Math.max(5, Math.round(daily_minutes * 0.4)))
  const actionTime = Math.max(10, Math.round(daily_minutes * 0.4))

  return `用户目标：${goal}
目标方向：${categoryLabel}
核心动力：${motivation}
每天可用时间：${daily_minutes} 分钟
今天是第 ${day_number} 天
参考日期：${today_date}${recentDone}

请为这位学习者生成今天的 3 个学习任务。严格按以下 JSON 格式返回：

{
  "tasks": [
    {
      "priority": 1,
      "type": "content",
      "emoji": "📖",
      "title": "今日学习主题（10字以内，具体到某个概念）",
      "badge": "第 ${day_number} 天",
      "concept": "今天的核心概念（8字以内，如：市盈率PE）",
      "description": "今天要学什么，一句话（25字以内）",
      "duration": "${readTime} 分钟",
      "goal_label": "${categoryLabel}",
      "content": [
        {
          "type": "news",
          "heading": "今日背景",
          "text": "结合一个具体的真实事件或市场现象引入今天的主题（60-100字）。必须有具体的事实、数字或案例，不能模糊。"
        },
        {
          "type": "concept",
          "heading": "核心概念：[概念名称]",
          "text": "深入解释这个概念（100-150字）。要有具体定义、公式或原理、实际例子，让人读完真正理解。"
        },
        {
          "type": "rule",
          "heading": "记住这一点",
          "text": "一条可以立刻记住、直接应用的规律或原则（30-50字）。可以用公式、口诀或对比格式。"
        },
        {
          "type": "connect",
          "heading": "和你的目标有什么关系",
          "text": "具体说明这个知识如何帮助用户实现「${goal}」（40-60字）"
        }
      ],
      "completion_message": "完成阅读后的激励话语（2-3行，第一行最有力量）"
    },
    {
      "priority": 2,
      "type": "action",
      "emoji": "✏️",
      "title": "复述今天的概念（10字以内）",
      "badge": null,
      "concept": null,
      "description": "用自己的话把刚才学到的写下来，测试是否真的理解",
      "duration": "5 分钟",
      "goal_label": "${categoryLabel}",
      "content": null,
      "completion_message": "写下来的东西才真正属于你。\n\n这个习惯会让你的学习效果翻倍。"
    },
    {
      "priority": 3,
      "type": "action",
      "emoji": "${mainEmoji}",
      "title": "找到一个现实例子（10字以内）",
      "badge": null,
      "concept": null,
      "description": "在新闻或生活中找一个今天学到的概念的真实案例",
      "duration": "${actionTime} 分钟",
      "goal_label": "${categoryLabel}",
      "content": null,
      "completion_message": "真正的理解来自实际应用。\n\n你正在建立的不只是知识，而是思维框架。"
    }
  ]
}

特别要求：
- content 任务的 text 字段必须包含真实、具体、有深度的知识内容，不能是泛泛而谈
- 如果目标是金融，必须结合真实的金融市场概念和事件
- 如果目标是编程，必须包含可以立刻练习的代码或算法
- 第 ${day_number} 天选择的概念要与前几天有逻辑递进关系
- 所有内容必须是中文`
}

function buildGeneralPrompt({ goal, category, categoryLabel, mainEmoji, motivation, daily_minutes, day_number, recentDone }) {
  return `你是一个专业的目标教练，请为以下用户生成今天的任务计划。

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
      "duration": "预估时间，如 15 分钟",
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
        {"type": "news", "heading": "今日背景", "text": "结合真实情景的引入（60-80字）"},
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
- content 任务的内容要结合真实的、有用的知识
- 所有内容必须用中文`
}
