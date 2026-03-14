import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase.js'
import * as db from './lib/db.js'
import { generateTasks, refreshTasks } from './lib/api.js'
import { PrimaryCard, SecondaryCard, DoneCard } from './components/TaskCard.jsx'
import ContentReader from './components/ContentReader.jsx'
import CompletionRitual from './components/CompletionRitual.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import Onboarding from './components/Onboarding.jsx'
import GoalDiscovery from './components/GoalDiscovery.jsx'
import Auth from './components/Auth.jsx'
import ProfileSheet from './components/ProfileSheet.jsx'

const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

function formatDate() {
  const d = new Date()
  return `${DAYS[d.getDay()]}  ${MONTHS[d.getMonth()]}${d.getDate()}日`
}

function getTimeGreeting(name) {
  const hour = new Date().getHours()
  const who = name || '你'
  if (hour < 5)  return `夜深了，${who}。`
  if (hour < 12) return `早上好，${who}。`
  if (hour < 18) return `下午好，${who}。`
  return `晚上好，${who}。`
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
  const [showProfile, setShowProfile] = useState(false)
  const [showDiscovery, setShowDiscovery] = useState(false)
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
        setShowDiscovery(true)
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
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-[13px] text-[#BBBBBB] mb-1">{formatDate()}</p>
                <h1 className="text-[22px] font-semibold text-[#1A1A1A]">
                  {getTimeGreeting(userProfile.name)}
                </h1>
                {activeGoal && (
                  <p className="text-[13px] text-[#AAAAAA] mt-1 truncate">
                    {activeGoal.goal}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-shrink-0">
                <button
                  onClick={() => setShowDiscovery(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[#E8E6E0] text-[#888] text-[18px] leading-none active:opacity-60"
                  title="新建目标"
                >
                  +
                </button>
                {/* Profile avatar button */}
                <button
                  onClick={() => setShowProfile(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1A1A1A] active:opacity-70"
                  title="个人主页"
                >
                  <span className="text-white text-[12px] font-semibold">
                    {(userProfile.name || '你')[0].toUpperCase()}
                  </span>
                </button>
              </div>
            </div>

            {/* Progress bar + subtitle */}
            <div className="mt-3">
              {tasksLoading ? (
                <p className="text-[14px] text-[#888]">AI 正在生成你今天的任务…</p>
              ) : tasks.length === 0 ? null : !allDone ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[14px] text-[#888]">
                      今天有 {pending.length} 件事等着你
                    </p>
                    <span className="text-[12px] text-[#BBBBBB]">
                      {done.length}/{tasks.length}
                    </span>
                  </div>
                  {tasks.length > 0 && (
                    <div className="w-full h-1 bg-[#E8E6E0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((done.length / tasks.length) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[14px] text-[#888]">今天全做完了 🎉</p>
              )}
            </div>
          </div>

          {/* 任务列表 */}
          {tasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-[#E8E6E0] h-24 animate-pulse" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            /* 空状态 */
            <EmptyState
              goal={activeGoal?.goal}
              onNewGoal={() => setShowDiscovery(true)}
              onChat={() => setChatTask({ id: 'free', type: 'action', emoji: '✦', title: '聊聊我的目标', description: '' })}
            />
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
                  />
                </div>
              )}
            </div>
          )}

          {/* Streak + day count footer */}
          {!allDone && !tasksLoading && tasks.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-3 anim-fade-in" style={{ animationDelay: '400ms' }}>
              {activeGoal && (
                <>
                  <span className="text-[13px] text-[#BBBBBB]">
                    第 {getDayNumber(activeGoal.created_at)} 天
                  </span>
                  <span className="text-[#DDDDDD]">·</span>
                </>
              )}
              <span className="text-[13px] text-[#BBBBBB]">连续 {userProfile.streak} 天</span>
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

      {/* Goal Discovery 对话流程 */}
      {showDiscovery && (
        <GoalDiscovery
          onGoalReady={async (form) => {
            setShowDiscovery(false)
            await handleOnboardingDone(form)
          }}
          onCancel={activeGoal ? () => setShowDiscovery(false) : null}
        />
      )}

      {/* Onboarding 弹出层（保留用于直接填写入口） */}
      {showOnboarding && (
        <Onboarding
          onDone={handleOnboardingDone}
          onCancel={activeGoal ? () => setShowOnboarding(false) : null}
        />
      )}

      {/* Profile Sheet */}
      {showProfile && (
        <ProfileSheet
          userId={session.user.id}
          userProfile={userProfile}
          activeGoal={activeGoal}
          streak={userProfile.streak}
          onClose={() => setShowProfile(false)}
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
function AllDoneSection({ streak, onChat }) {
  return (
    <div>
      <div className="bg-[#1A1A1A] rounded-2xl px-6 py-6 text-center">
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
    </div>
  )
}

// ─── 空状态 ──────────────────────────────────────────────────
function EmptyState({ goal, onNewGoal, onChat }) {
  return (
    <div className="anim-fade-up pt-2">
      <div className="bg-white rounded-2xl border border-[#E8E6E0] px-6 py-8 text-center mb-4">
        <div className="text-3xl mb-4">✦</div>
        {goal ? (
          <>
            <p className="text-[16px] font-medium text-[#1A1A1A] mb-2">任务正在生成中</p>
            <p className="text-[14px] text-[#888] leading-relaxed mb-1">目标：{goal}</p>
            <p className="text-[13px] text-[#BBBBBB]">刷新页面看看</p>
          </>
        ) : (
          <>
            <p className="text-[16px] font-medium text-[#1A1A1A] mb-2">还没有设定目标</p>
            <p className="text-[13px] text-[#888] mb-5">告诉我你想做什么，我来帮你拆解成每天的行动。</p>
            <button
              onClick={onNewGoal}
              className="bg-[#1A1A1A] text-white rounded-xl px-6 py-3 text-[14px] font-medium active:opacity-80"
            >
              设定我的目标
            </button>
          </>
        )}
      </div>
      {goal && (
        <button
          onClick={onChat}
          className="w-full flex items-center justify-center gap-2 py-3 text-[13px] text-[#BBBBBB] active:text-[#888]"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M11 1H2C1.45 1 1 1.45 1 2V9C1 9.55 1.45 10 2 10H4L6.5 12.5L9 10H11C11.55 10 12 9.55 12 9V2C12 1.45 11.55 1 11 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          和 AI 教练聊聊
        </button>
      )}
    </div>
  )
}
