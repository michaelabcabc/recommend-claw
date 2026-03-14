import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.API_RELAY_BASE_URL || 'http://1.95.142.151:3000/v1',
})

const MODEL = 'claude-sonnet-4-5-20250929'

const CATEGORY_LABELS = { learn: '学习成长', work: '工作项目', health: '健康习惯', other: '个人目标' }
const CATEGORY_EMOJIS = { learn: '📚', work: '💼', health: '🏃', other: '✦' }

// ─── JSON 提取（兼容模型返回 ```json 包裹的情况）───────────────
function extractJSON(text) {
  try { return JSON.parse(text) } catch {}
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) { try { return JSON.parse(mdMatch[1].trim()) } catch {} }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1) { try { return JSON.parse(text.slice(start, end + 1)) } catch {} }
  return null
}

// ─── Fallback 任务（API 失败时使用）─────────────────────────────
function buildFallbackTasks({ goal, category, motivation, daily_minutes, day_number }) {
  const categoryLabel = CATEGORY_LABELS[category] || '个人目标'
  const emoji = CATEGORY_EMOJIS[category] || '✦'
  const readTime = Math.min(15, Math.max(5, Math.round(daily_minutes * 0.4)))
  const actionTime = Math.max(10, Math.round(daily_minutes * 0.4))

  if (category === 'learn') {
    const conceptsByDay = [
      '货币是什么？钱的本质', '通货膨胀的原理', '利率与资产价格的关系',
      '什么是GDP', '中央银行的作用', '什么是股票', '股价如何形成',
      '市盈率（PE）是什么', '什么是指数基金', '价值投资的核心思想',
    ]
    const concept = conceptsByDay[(day_number - 1) % conceptsByDay.length]
    return [
      { priority: 1, type: 'content', emoji: '📖', title: concept, badge: `第 ${day_number} 天`,
        concept: concept, description: `今天深入学习这个概念`, duration: `${readTime} 分钟`,
        goal_label: categoryLabel, content: null,
        completion_message: `学完了！\n\n把今天的概念用自己的话说一遍，是最快的记忆方法。` },
      { priority: 2, type: 'action', emoji: '✏️', title: '用自己的话复述',
        badge: null, concept: null, description: '把学到的写下来，测试是否真的理解',
        duration: '5 分钟', goal_label: categoryLabel, content: null,
        completion_message: `写下来的东西才真正属于你。` },
      { priority: 3, type: 'action', emoji: '🔍', title: '找一个现实例子',
        badge: null, concept: null, description: '在新闻或生活中找今天概念的真实案例',
        duration: `${actionTime} 分钟`, goal_label: categoryLabel, content: null,
        completion_message: `真正的理解来自实际应用。` },
    ]
  }

  return [
    { priority: 1, type: 'action', emoji, title: `今日行动：${goal.slice(0, 12)}`,
      badge: null, concept: null, description: `专注${actionTime}分钟，向目标迈一步`,
      duration: `${actionTime} 分钟`, goal_label: categoryLabel, content: null,
      completion_message: `完成了！\n\n每一次行动都是进步，哪怕很小。` },
    { priority: 2, type: 'content', emoji: '📖', title: `学一个相关概念`, badge: `第 ${day_number} 天`,
      concept: `${categoryLabel}核心知识`, description: '了解今天任务背后的原理',
      duration: `${readTime} 分钟`, goal_label: categoryLabel, content: null,
      completion_message: `理解背后的原理，让行动更有方向。` },
    { priority: 3, type: 'action', emoji: '📝', title: '记录今天的进展',
      badge: null, concept: null, description: '写下今天做了什么，有什么收获',
      duration: '5 分钟', goal_label: categoryLabel, content: null,
      completion_message: `记录是进步的镜子。` },
  ]
}

// ─── 构建 prompt ──────────────────────────────────────────────
function buildPrompt({ goal, category, categoryLabel, emoji, motivation, daily_minutes, day_number, recentDone, today_date }) {
  const readTime = Math.min(15, Math.max(5, Math.round(daily_minutes * 0.4)))
  const actionTime = Math.max(10, Math.round(daily_minutes * 0.4))

  if (category === 'learn') {
    // 根据天数确定学习深度
    let depthHint = ''
    if (day_number <= 7) depthHint = '入门阶段：选择最基础的定义性概念（what is X）'
    else if (day_number <= 21) depthHint = '核心阶段：选择核心工具/关键关系（how/why）'
    else depthHint = '进阶阶段：选择综合应用/实战技巧'

    const isFinance = /金融|股票|投资|理财|经济|基金|债券|货币|宏观/.test(goal)
    const topicHint = isFinance
      ? `金融课程参考序列：第1-5天(货币/利率/通胀/GDP/央行) → 第6-12天(股票/PE/市值/指数/股息) → 第13-20天(价值投资/成长股/债券/基金/分散) → 第21天+(宏观周期/汇率/衍生品/财报/实战)`
      : `学习序列：第1-7天(基础定义) → 第8-21天(核心原理) → 第22天+(实际应用)`

    return `你是学习课程设计师。用户目标：${goal}（${categoryLabel}）
动力：${motivation}，每天${daily_minutes}分钟，今天是第${day_number}天，日期：${today_date}${recentDone}

学习深度：${depthHint}
${topicHint}

生成今天的3个学习任务。只输出JSON，不要加代码块包裹：

{"tasks":[{"priority":1,"type":"content","emoji":"📖","title":"[具体概念名10字内，必须有实质内容如'什么是市盈率PE'，不能只写'今日学习']","badge":"第${day_number}天","concept":"[核心概念8字内]","description":"[今天学什么20字内]","duration":"${readTime}分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"[完成激励两行，换行用\\n]"},{"priority":2,"type":"action","emoji":"✏️","title":"[用自己的话说出来]","badge":null,"concept":null,"description":"把今天学到的概念用自己的话写下来","duration":"5分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"写下来的才真正是你的。\\n\\n这个习惯让学习效果翻倍。"},{"priority":3,"type":"action","emoji":"🔍","title":"[找一个现实例子]","badge":null,"concept":null,"description":"[结合今天概念，在新闻/生活中找真实案例，20字内]","duration":"${actionTime}分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"真正的理解来自实际应用。"}]}

重要规则：
1. 第1个任务title必须是具体概念名，不能泛泛地写"今日学习"
2. content字段必须是null（不能是[]或其他值）
3. 避免重复这些已覆盖内容：${recentDone || '（无）'}
4. 只输出JSON，不要任何说明文字`
  }

  if (category === 'health') {
    const isWeight = /减肥|体重|瘦|公斤|斤/.test(goal)
    const goalContext = isWeight
      ? `减重目标：${goal}。今天是第${day_number}天，需要给出具体的运动类型+时长+饮食建议`
      : `健康目标：${goal}。今天是第${day_number}天`

    return `你是健康教练。用户目标：${goalContext}
动力：${motivation}，每天${daily_minutes}分钟${recentDone}

生成今天3个任务。只输出JSON：

{"tasks":[{"priority":1,"type":"action","emoji":"🏃","title":"[今日运动任务，要具体：运动类型+时长，如'慢跑30分钟']","badge":null,"concept":null,"description":"[具体说明为什么今天做这个，20字内]","duration":"${actionTime}分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"[完成激励两行]"},{"priority":2,"type":"action","emoji":"🥗","title":"[今日饮食任务，要具体]","badge":null,"concept":null,"description":"[具体饮食建议，20字内]","duration":"5分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"[饮食激励]"},{"priority":3,"type":"content","emoji":"📖","title":"[今日健康知识，具体概念名]","badge":"第${day_number}天","concept":"[概念8字内]","description":"[今天学什么，20字内]","duration":"${readTime}分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"[激励]"}]}

规则：content字段必须是null。只输出JSON。`
  }

  // work / other
  return `你是目标教练。用户目标：${goal}（${categoryLabel}）
动力：${motivation}，每天${daily_minutes}分钟，第${day_number}天${recentDone}

生成今天3个具体可执行的任务。只输出JSON：

{"tasks":[{"priority":1,"type":"action","emoji":"${emoji}","title":"[今日最重要行动，10字内]","badge":null,"concept":null,"description":"[为什么今天做这个，20字内]","duration":"${actionTime}分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"[完成激励两行]"},{"priority":2,"type":"content","emoji":"📖","title":"[今日学习主题，具体概念名]","badge":"第${day_number}天","concept":"[概念8字内]","description":"[学什么，20字内]","duration":"${readTime}分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"[激励]"},{"priority":3,"type":"action","emoji":"📝","title":"[今日复盘记录]","badge":null,"concept":null,"description":"[记录今天的进展和收获，20字内]","duration":"5分钟","goal_label":"${categoryLabel}","content":null,"completion_message":"[激励]"}]}

规则：content字段必须是null。所有内容用中文。只输出JSON。`
}

// ─── Handler ──────────────────────────────────────────────────
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
  const emoji = CATEGORY_EMOJIS[category] || '✦'
  const recentDone = completed_task_titles.length > 0
    ? `\n最近已完成（避免重复）：${completed_task_titles.slice(0, 10).join('、')}`
    : ''

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: buildPrompt({ goal, category, categoryLabel, emoji, motivation, daily_minutes, day_number, recentDone, today_date }),
      }],
    })

    const raw = response.choices[0].message.content.trim()
    const parsed = extractJSON(raw)
    if (!parsed || !parsed.tasks || !Array.isArray(parsed.tasks)) throw new Error('Invalid tasks format')

    // 确保所有 content 类型的任务不带预生成内容（强制为 null）
    const tasks = parsed.tasks.map(t => ({
      ...t,
      content: t.type === 'content' ? null : t.content,
    }))

    return res.status(200).json({ tasks })
  } catch (err) {
    console.error('Task generation error:', err.message)
    return res.status(200).json({
      tasks: buildFallbackTasks({ goal, category, motivation, daily_minutes, day_number }),
    })
  }
}
