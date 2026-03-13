import { supabase } from './supabase.js'

// ─── Profile ───────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfileName(userId, name) {
  const { error } = await supabase
    .from('profiles')
    .update({ name })
    .eq('id', userId)
  if (error) throw error
}

// ─── Goals ─────────────────────────────────────────────────

export async function getActiveGoal(userId) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createGoal(userId, { goal, category, motivation, daily_minutes }) {
  // Deactivate previous goals
  await supabase
    .from('goals')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)

  const { data, error } = await supabase
    .from('goals')
    .insert({ user_id: userId, goal, category, motivation, daily_minutes })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Tasks ─────────────────────────────────────────────────

export async function getTasksForDate(userId, dateStr) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .order('priority', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createTasks(userId, goalId, dateStr, tasksArray) {
  const rows = tasksArray.map(t => ({
    user_id: userId,
    goal_id: goalId,
    date: dateStr,
    priority: t.priority,
    type: t.type,
    emoji: t.emoji || '✦',
    title: t.title,
    badge: t.badge || null,
    concept: t.concept || null,
    description: t.description || '',
    duration: t.duration || '10 分钟',
    goal_label: t.goal_label || '',
    content: t.content || null,
    completion_message: t.completion_message || '',
    status: 'pending',
  }))

  const { data, error } = await supabase
    .from('tasks')
    .insert(rows)
    .select()
  if (error) throw error
  return data || []
}

export async function markTaskDone(taskId) {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) throw error
}

export async function getRecentCompletedTaskTitles(userId, days = 7) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('tasks')
    .select('title')
    .eq('user_id', userId)
    .eq('status', 'done')
    .gte('completed_at', since.toISOString())
    .order('completed_at', { ascending: false })
    .limit(20)
  if (error) return []
  return (data || []).map(t => t.title)
}

// ─── Streaks ────────────────────────────────────────────────

export async function getStreak(userId) {
  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) return { current_streak: 0, longest_streak: 0, last_active_date: null }
  return data
}

export async function updateStreak(userId, todayStr) {
  const streak = await getStreak(userId)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  if (streak.last_active_date === todayStr) return streak // already counted

  let newCurrent
  if (streak.last_active_date === yesterdayStr) {
    newCurrent = streak.current_streak + 1
  } else {
    newCurrent = 1
  }
  const newLongest = Math.max(newCurrent, streak.longest_streak)

  const { data, error } = await supabase
    .from('streaks')
    .update({
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_active_date: todayStr,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Chat ───────────────────────────────────────────────────

export async function createChatSession(userId, task) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      task_id: task?.id || null,
      task_title: task?.title || '',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function saveMessage(sessionId, userId, role, content) {
  const { error } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, user_id: userId, role, content })
  if (error) console.error('Failed to save message:', error)
}

export async function getChatHistory(sessionId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (error) return []
  return data || []
}

// ─── Summaries ──────────────────────────────────────────────

export async function saveSummary(userId, taskId, dateStr, summary) {
  const { error } = await supabase
    .from('daily_summaries')
    .insert({ user_id: userId, task_id: taskId, date: dateStr, summary })
  if (error) console.error('Failed to save summary:', error)
}
