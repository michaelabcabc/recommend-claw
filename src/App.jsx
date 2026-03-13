import { useState } from 'react'
import { TASKS, USER, EXTRA_TASKS } from './data.js'
import { PrimaryCard, SecondaryCard, DoneCard } from './components/TaskCard.jsx'
import ContentReader from './components/ContentReader.jsx'
import CompletionRitual from './components/CompletionRitual.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import Onboarding from './components/Onboarding.jsx'

const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

function formatDate() {
  const d = new Date()
  return `${DAYS[d.getDay()]}  ${MONTHS[d.getMonth()]}${d.getDate()}日`
}

export default function App() {
  // 用户数据（onboarding 后可更新）
  const [userProfile, setUserProfile] = useState({
    name: USER.name,
    goal: '理解金融市场的基本逻辑',
    motivation: USER.motivation,
    streak: USER.streak,
    hasOnboarded: true, // 改为 false 体验 onboarding 流程
  })

  const [tasks, setTasks] = useState(TASKS)
  const [screen, setScreen] = useState('today') // 'today' | 'reader' | 'ritual'
  const [activeTask, setActiveTask] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [ritualTask, setRitualTask] = useState(null)
  const [tooHardId, setTooHardId] = useState(null)
  const [chatTask, setChatTask] = useState(null) // 当前打开对话的任务

  const pending = tasks.filter(t => t.status === 'pending')
  const done = tasks.filter(t => t.status === 'done')
  const allDone = pending.length === 0

  const primary = pending[0] ?? null
  const secondaries = pending.slice(1)

  function handleStart(task) {
    if (task.type === 'content') {
      setActiveTask(task)
      setScreen('reader')
    } else {
      completeTask(task)
    }
  }

  function completeTask(task) {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'done' } : t))
    setRitualTask(task)
    setScreen('ritual')
    setExpandedId(null)
    setChatTask(null)
  }

  function handleRitualContinue() {
    setScreen('today')
    setRitualTask(null)
    setActiveTask(null)
  }

  function handleDelay(task) {
    setTasks(prev => {
      const others = prev.filter(t => t.id !== task.id)
      const maxPriority = Math.max(...others.map(t => t.priority))
      return [...others, { ...task, priority: maxPriority + 1 }]
    })
    setExpandedId(null)
  }

  function handleTooHard(task) {
    setTooHardId(task.id)
    setTimeout(() => setTooHardId(null), 4000)
  }

  function handleOnboardingDone(form) {
    setUserProfile(prev => ({
      ...prev,
      goal: form.goal,
      motivation: form.motivation,
      hasOnboarded: true,
    }))
  }

  // ─── Onboarding ───
  if (!userProfile.hasOnboarded) {
    return <Onboarding onDone={handleOnboardingDone} />
  }

  // ─── Today View ───
  return (
    <div className="min-h-screen bg-[#F7F6F3]">

      {/* ─── Content Reader ─── */}
      {screen === 'reader' && activeTask && (
        <ContentReader
          task={activeTask}
          onComplete={completeTask}
          onBack={() => setScreen('today')}
          onChat={() => setChatTask(activeTask)}
        />
      )}

      {/* ─── Completion Ritual ─── */}
      {screen === 'ritual' && ritualTask && (
        <CompletionRitual
          task={ritualTask}
          doneCount={done.length}
          totalCount={tasks.length}
          streak={userProfile.streak}
          onContinue={handleRitualContinue}
        />
      )}

      {/* ─── Today View ─── */}
      {screen === 'today' && (
      <div className="max-w-md mx-auto px-5 pt-12 pb-16">

        {/* 顶部 */}
        <div className="mb-7 anim-fade-up">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] text-[#BBBBBB] mb-1">{formatDate()}</p>
              <h1 className="text-[22px] font-semibold text-[#1A1A1A]">
                早上好，{userProfile.name}。
              </h1>
            </div>
            <button
              onClick={() => setUserProfile(prev => ({ ...prev, hasOnboarded: false }))}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[#E8E6E0] text-[#888] text-[18px] leading-none active:opacity-60 mt-1 flex-shrink-0"
              title="新建目标"
            >
              +
            </button>
          </div>
          {!allDone ? (
            <p className="text-[15px] text-[#888] mt-1">
              今天有 {pending.length} 件事等着你。
            </p>
          ) : (
            <p className="text-[15px] text-[#888] mt-1">今天全做完了。</p>
          )}
        </div>

        {/* 任务列表 */}
        <div className="space-y-3">

          {primary && (
            <div className="anim-fade-up" style={{ animationDelay: '60ms' }}>
              {tooHardId === primary.id ? (
                <TooHardCard task={primary} onStart={handleStart} onChat={setChatTask} />
              ) : (
                <PrimaryCard
                  task={primary}
                  onStart={handleStart}
                  onDelay={handleDelay}
                  onTooHard={handleTooHard}
                  onChat={setChatTask}
                />
              )}
            </div>
          )}

          {secondaries.map((task, i) => (
            <div key={task.id} className="anim-fade-up" style={{ animationDelay: `${(i + 1) * 80 + 60}ms` }}>
              {tooHardId === task.id ? (
                <TooHardCard task={task} onStart={handleStart} onChat={setChatTask} />
              ) : (
                <SecondaryCard
                  task={task}
                  isExpanded={expandedId === task.id}
                  onExpand={setExpandedId}
                  onStart={handleStart}
                  onTooHard={handleTooHard}
                  onChat={setChatTask}
                />
              )}
            </div>
          ))}

          {done.length > 0 && pending.length > 0 && (
            <div className="h-px bg-[#E8E6E0] my-1" />
          )}

          {done.map(task => (
            <div key={task.id} className="anim-fade-in">
              <DoneCard task={task} />
            </div>
          ))}

          {/* 全部完成 */}
          {allDone && done.length > 0 && (
            <div className="pt-6 anim-fade-up">
              <AllDoneSection
                streak={userProfile.streak}
                extraTasks={EXTRA_TASKS}
                onChat={task => setChatTask(task ?? { id: 0, type: 'action', emoji: '✦', title: '自由提问', description: '' })}
              />
            </div>
          )}
        </div>

        {/* Streak */}
        {!allDone && (
          <div className="mt-8 flex items-center justify-center gap-2 anim-fade-in" style={{ animationDelay: '400ms' }}>
            <span className="text-[13px] text-[#BBBBBB]">连续第 {userProfile.streak} 天</span>
            <span className="text-base">🔥</span>
          </div>
        )}

      </div>
      )}

      {/* Chat Panel（全局浮层，任何页面都可打开） */}
      {chatTask && (
        <ChatPanel
          task={chatTask}
          goal={userProfile.goal}
          motivation={userProfile.motivation}
          onClose={() => setChatTask(null)}
        />
      )}
    </div>
  )
}

// 「太难了」简化版卡片
function TooHardCard({ task, onStart, onChat }) {
  function getEasierTitle(task) {
    if (task.type === 'content') {
      return `只看「${task.title}」的标题和要点`
    }
    // For action tasks, derive from the task title
    const title = task.title || ''
    if (title.includes('跑') || title.includes('运动') || title.includes('锻炼') || title.includes('健身')) {
      return '出门走 10 分钟就算完成'
    }
    if (title.includes('读') || title.includes('阅读') || title.includes('学')) {
      return `只读「${title}」的前 5 分钟`
    }
    if (title.includes('写') || title.includes('任务') || title.includes('计划') || title.includes('列')) {
      return `花 5 分钟列出「${title}」最重要的 1 件事`
    }
    return `花 5 分钟，做「${title}」最小的那一步`
  }

  const easier = {
    ...task,
    title: getEasierTitle(task),
    description: '更小的版本，一样算完成。',
    duration: '5 分钟',
    concept: undefined,
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E6E0] overflow-hidden anim-scale-in">
      <div className="px-5 py-4">
        <p className="text-[11px] font-medium text-[#888] mb-4">换个更小的版本</p>
        <div className="flex items-start gap-3 mb-4">
          <span className="text-xl mt-0.5">{task.emoji}</span>
          <div>
            <p className="text-[16px] font-medium text-[#1A1A1A]">{easier.title}</p>
            <p className="text-[13px] text-[#888] mt-1">{easier.description}</p>
          </div>
        </div>
        <button
          onClick={() => onStart(easier)}
          className="w-full bg-[#1A1A1A] text-white rounded-xl py-3 text-[14px] font-medium active:opacity-80 mb-3"
        >
          就做这个
        </button>
        <div className="flex justify-center">
          <button
            onClick={() => onChat(task)}
            className="flex items-center gap-1.5 text-[12px] text-[#BBBBBB] active:text-[#888]"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M11 1H2C1.45 1 1 1.45 1 2V9C1 9.55 1.45 10 2 10H4L6.5 12.5L9 10H11C11.55 10 12 9.55 12 9V2C12 1.45 11.55 1 11 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            和 AI 教练聊聊为什么抵触
          </button>
        </div>
      </div>
    </div>
  )
}

// 全部完成区域
function AllDoneSection({ streak, extraTasks, onChat }) {
  return (
    <div>
      {/* 庆祝卡片 */}
      <div className="bg-[#1A1A1A] rounded-2xl px-6 py-6 mb-4 text-center">
        <p className="text-white text-[20px] font-semibold mb-1">全做完了。</p>
        <p className="text-white/50 text-[14px] mb-4">连续第 {streak} 天 🔥</p>
        <button
          onClick={() => onChat()}
          className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 rounded-full px-4 py-2 text-[13px] active:opacity-60"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M11 1H2C1.45 1 1 1.45 1 2V9C1 9.55 1.45 10 2 10H4L6.5 12.5L9 10H11C11.55 10 12 9.55 12 9V2C12 1.45 11.55 1 11 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          和 AI 教练聊聊今天的收获
        </button>
      </div>

      {/* 加餐 */}
      <p className="text-[12px] text-[#BBBBBB] text-center mb-3 uppercase tracking-wider">
        今天还有余力？
      </p>
      <div className="space-y-2">
        {extraTasks.map(t => (
          <div
            key={t.id}
            className="bg-white rounded-2xl border border-[#E8E6E0] px-5 py-3.5 flex items-center gap-3 cursor-pointer active:opacity-70"
          >
            <span className="text-lg">{t.emoji}</span>
            <span className="text-[14px] text-[#888]">{t.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
