import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase.js'
import * as db from './lib/db.js'
import { generateTasks, refreshTasks } from './lib/api.js'
import { PrimaryCard, SecondaryCard, DoneCard } from './components/TaskCard.jsx'
import ContentReader from './components/ContentReader.jsx'
import CompletionRitual from './components/CompletionRitual.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import Onboarding from './components/Onboarding.jsx'
import Auth from './components/Auth.jsx'

const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

function formatDate() {
  const d = new Date()
  return `${DAYS[d.getDay()]}  ${MONTHS[d.getMonth()]}${d.getDate()}日`
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getDayNumber(goalCreatedAt) {
  const start = new Date(goalCreatedAt)
  const now = new Date()
  start.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.max(1, Math.floor((now - start) / 86400000) + 1)
}

export default function App() {
  // ─── Auth ───────────────────────────────────────────────
  const [session, setSession] = useState(undefined) // undefined = loading
  const [dataLoading, setDataLoading] = useState(true) // true until user data fetched
  const [userProfile, setUserProfile] = useState({ name: '', streak: 0 })
  const [activeGoal, setActiveGoal] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // ─── App state ──────────────────────────────────────────
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [screen, setScreen] = useState('today')
  const [activeTask, setActiveTask] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [ritualTask, setRitualTask] = useState(null)
  const [tooHardId, setTooHardId] = useState(null)
  const [chatTask, setChatTask] = useState(null)
  const [chatSessionId, setChatSessionId] = useState(null)
  const currentDateRef = useRef(getTodayStr())

  // ─── Auth listener ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setDataLoading(false) // not logged in, nothing to load
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setDataLoading(false)
      else setDataLoading(true) // new session → load user data
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ─── Load user data when session changes ─────────────────
  useEffect(() => {
    if (!session) return
    loadUserData(session.user)
  }, [session?.user?.id])

  async function loadUserData(user) {
    try {
      const [profile, streak, goal] = await Promise.all([
        db.getProfile(user.id),
        db.getStreak(user.id),
        db.getActiveGoal(user.id),
      ])
      // Use name from profile, fall back to user metadata or email prefix
      const name = profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || '你'
      setUserProfile({ name, streak: streak?.current_streak || 0 })
      setActiveGoal(goal)
      if (goal) {
        loadTasksForToday(user.id, goal)
      } else {
        setShowOnboarding(true)
      }
    } catch (err) {
      console.error('Failed to load user data:', err)
    } finally {
      setDataLoading(false)
    }
  }

  async function loadTasksForToday(userId, goal) {
    const today = getTodayStr()
    setTasksLoading(true)
    try {
      let todayTasks = await db.getTasksForDate(userId, today)
      if (todayTasks.length === 0) {
        // Generate new tasks for today
        const recentTitles = await db.getRecentCompletedTaskTitles(userId, 7)
        const dayNum = getDayNumber(goal.created_at)
        const generated = await refreshTasks({
          goal: goal.goal,
          category: goal.category,
          motivation: goal.motivation,
          daily_minutes: goal.daily_minutes,
          day_number: dayNum,
          completed_task_titles: recentTitles,
        })
        todayTasks = await db.createTasks(userId, goal.id, today, generated)
      }
      setTasks(todayTasks)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setTasksLoading(false)
    }
  }

  // ─── Midnight date change detection ──────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const today = getTodayStr()
      if (today !== currentDateRef.current && session) {
        currentDateRef.current = today
        loadUserData(session.user)
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [session])

  // ─── Task handlers ───────────────────────────────────────
  function handleStart(task) {
    if (task.type === 'content') {
      setActiveTask(task)
      setScreen('reader')
    } else {
      completeTask(task)
    }
  }

  async function completeTask(task, summary) {
    const userId = session.user.id
    const today = getTodayStr()

    // Mark done in DB (use UUID id if available, skip for mock "easier" tasks)
    if (task.id && typeof task.id === 'string' && task.id.includes('-')) {
      await db.markTaskDone(task.id)
      if (summary) await db.saveSummary(userId, task.id, today, summary)
      const newStreak = await db.updateStreak(userId, today)
      setUserProfile(prev => ({ ...prev, streak: newStreak.current_streak }))
    }

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'done' } : t))
    setRitualTask(task)
    setScreen('ritual')
    setExpandedId(null)
    setChatTask(null)
    setChatSessionId(null)
  }

  function handleRitualContinue() {
    setScreen('today')
    setRitualTask(null)
    setActiveTask(null)
  }

  function handleDelay(task) {
    setTasks(prev => {
      const others = prev.filter(t => t.id !== task.id)
      const maxPriority = Math.max(0, ...others.map(t => t.priority))
      return [...others, { ...task, priority: maxPriority + 1 }]
    })
    setExpandedId(null)
  }

  function handleTooHard(task) {
    setTooHardId(task.id)
    setTimeout(() => setTooHardId(null), 4000)
  }

  async function handleOnboardingDone(form) {
    const userId = session.user.id
    const today = getTodayStr()

    // Save name to profile
    try {
      await db.updateProfileName(userId, form.name || userProfile.name)
      setUserProfile(prev => ({ ...prev, name: form.name || prev.name }))
    } catch (_) { /* non-critical */ }

    // Create goal — if this fails we must re-throw so Onboarding shows error
    const goal = await db.createGoal(userId, {
      goal: form.goal,
      category: form.category || 'other',
      motivation: form.motivation,
      daily_minutes: parseInt(form.duration) || 30,
    })
    setActiveGoal(goal)

    // Generate tasks — API has its own fallback so this shouldn't throw
    try {
      const generated = await generateTasks({
        goal: goal.goal,
        category: goal.category,
        motivation: goal.motivation,
        daily_minutes: goal.daily_minutes,
        day_number: 1,
      })
      const savedTasks = await db.createTasks(userId, goal.id, today, generated)
      setTasks(savedTasks)
    } catch (err) {
      console.error('Task creation failed:', err)
      // Goal was saved; tasks will be generated on next load
    }
    setShowOnboarding(false)
  }

  // ─── Loading / Auth gates ────────────────────────────────
  if (session === undefined || dataLoading) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center">
        <div className="text-[#BBBBBB] text-[14px]">加载中…</div>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  const pending = tasks.filter(t => t.status === 'pending')
  const done = tasks.filter(t => t.status === 'done')
  const allDone = pending.length === 0
  const primary = pending[0] ?? null
  const secondaries = pending.slice(1)

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F6F3]">

      {/* ─── Content Reader ─── */}
      {screen === 'reader' && activeTask && (
        <ContentReader
          task={activeTask}
          onComplete={(task, summary) => completeTask(task, summary)}
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
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[#E8E6E0] text-[#888] text-[18px] leading-none active:opacity-60 flex-shrink-0"
                  title="新建目标"
                >
                  +
                </button>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[#E8E6E0] active:opacity-60 flex-shrink-0"
                  title="退出登录"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 12H2.5C2.1 12 1.75 11.85 1.5 11.6C1.25 11.35 1.1 11 1.1 10.6V3.4C1.1 3 1.25 2.65 1.5 2.4C1.75 2.15 2.1 2 2.5 2H5M9.5 10L12.9 7L9.5 4M12.9 7H5" stroke="#AAAAAA" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            {tasksLoading ? (
              <p className="text-[15px] text-[#888] mt-1">AI 正在生成你今天的任务…</p>
            ) : !allDone ? (
              <p className="text-[15px] text-[#888] mt-1">
                今天有 {pending.length} 件事等着你。
              </p>
            ) : (
              <p className="text-[15px] text-[#888] mt-1">今天全做完了。</p>
            )}
          </div>

          {/* 任务列表 */}
          {tasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-[#E8E6E0] h-24 animate-pulse" />
              ))}
            </div>
          ) : (
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

              {allDone && done.length > 0 && (
                <div className="pt-6 anim-fade-up">
                  <AllDoneSection
                    streak={userProfile.streak}
                    onChat={task => setChatTask(task ?? { id: 'free', type: 'action', emoji: '✦', title: '自由提问', description: '' })}
                    onSignOut={() => supabase.auth.signOut()}
                  />
                </div>
              )}
            </div>
          )}

          {/* Streak */}
          {!allDone && !tasksLoading && (
            <div className="mt-8 flex items-center justify-center gap-2 anim-fade-in" style={{ animationDelay: '400ms' }}>
              <span className="text-[13px] text-[#BBBBBB]">连续第 {userProfile.streak} 天</span>
              <span className="text-base">🔥</span>
            </div>
          )}
        </div>
      )}

      {/* Chat Panel（全局浮层） */}
      {chatTask && (
        <ChatPanel
          task={chatTask}
          goal={activeGoal?.goal || ''}
          motivation={activeGoal?.motivation || ''}
          userId={session.user.id}
          sessionId={chatSessionId}
          onSessionCreated={setChatSessionId}
          onClose={() => { setChatTask(null); setChatSessionId(null) }}
        />
      )}

      {/* Onboarding 弹出层 */}
      {showOnboarding && (
        <Onboarding
          onDone={handleOnboardingDone}
          onCancel={activeGoal ? () => setShowOnboarding(false) : null}
        />
      )}
    </div>
  )
}

// ─── 「太难了」简化版卡片 ─────────────────────────────────────
function TooHardCard({ task, onStart, onChat }) {
  function getEasierTitle(task) {
    if (task.type === 'content') {
      return `只看「${task.title}」的标题和要点`
    }
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

// ─── 全部完成区域 ─────────────────────────────────────────────
function AllDoneSection({ streak, onChat, onSignOut }) {
  return (
    <div>
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
      <div className="flex justify-center mt-4">
        <button
          onClick={onSignOut}
          className="text-[12px] text-[#BBBBBB] active:text-[#888]"
        >
          退出登录
        </button>
      </div>
    </div>
  )
}
