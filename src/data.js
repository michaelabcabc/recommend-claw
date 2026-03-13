export const USER = {
  name: '新杰',
  streak: 7,
  motivation: '我想在投资上不再依赖别人，能自己判断。',
}

export const TASKS = [
  {
    id: 1,
    type: 'action',
    priority: 1,
    emoji: '📋',
    title: '整理本周工作优先级',
    description: '梳理清楚，今天才不会乱。',
    duration: '10 分钟',
    status: 'pending', // pending | active | done
    goal: '工作项目',
    completionMessage: `你刚刚做了一件很多人拖着不做的事。\n\n把模糊变清晰，把混乱变有序。\n这不只是一张清单，\n这是你掌控自己时间的方式。`,
  },
  {
    id: 2,
    type: 'content',
    priority: 2,
    emoji: '📈',
    title: '今日金融课',
    badge: '第 14 天',
    concept: '利率上升，债券价格为何下跌？',
    description: '结合今日美联储加息新闻',
    duration: '5 分钟',
    status: 'pending',
    goal: '理解金融市场',
    content: [
      {
        type: 'news',
        text: '今天美联储宣布加息 25 个基点，债券市场随即出现明显下跌。很多人看到这个新闻会困惑：利率和债券，有什么关系？',
      },
      {
        type: 'concept',
        heading: '用一个例子理解它',
        text: '想象你手里有一张「欠条」，每年固定还你 100 元，你花了 1000 元买的。\n\n这时候市场利率上升了——新发行的欠条每年能还 120 元。\n\n你手里那张旧的还是 100 元，显然不如新的香。\n\n于是没人愿意按原价买你的旧欠条，价格就跌了。',
      },
      {
        type: 'rule',
        heading: '记住这个规律',
        text: '利率 ↑  →  债券价格 ↓\n利率 ↓  →  债券价格 ↑\n\n它们永远反向运动。',
      },
      {
        type: 'connect',
        heading: '和你的目标连起来',
        text: '14 天前你还不认识「债券」这个词。\n今天你已经能看懂美联储决策背后的市场逻辑了。\n\n这就是你说的：不再依赖别人，自己判断。',
      },
    ],
    completionMessage: `你又拼上了一块拼图。\n\n14 天前你还不知道什么是利率，\n今天你已经能看懂美联储的决定\n对市场意味着什么。\n\n这就是你当初说的：\n不再依赖别人，自己判断。\n\n你在实现它。`,
  },
  {
    id: 3,
    type: 'action',
    priority: 3,
    emoji: '🏃',
    title: '跑步 20 分钟',
    description: '已连续 6 天，今天完成就是一周。',
    duration: '25 分钟',
    status: 'pending',
    goal: '保持健康',
    completionMessage: `连续第 7 天。\n\n你没有给自己找借口，\n你选择了出门。\n\n这 20 分钟不只是跑步，\n是你证明给自己看：\n说到做到的人，就是你。`,
  },
]

export const EXTRA_TASKS = [
  { id: 4, emoji: '📖', title: '预习明天的金融概念' },
  { id: 5, emoji: '🔁', title: '回顾本周学过的 3 个概念' },
]
