// Client-side wrappers for Vercel serverless functions
// The Anthropic API key lives server-side only — never exposed to the browser

export async function chatFromServer({ messages, goal, motivation, task }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, goal, motivation, task }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.text
}

export async function generateTasks({ goal, category, motivation, daily_minutes, day_number = 1 }) {
  const res = await fetch('/api/generate-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, category, motivation, daily_minutes, day_number }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Task generation failed: HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.tasks
}

export async function refreshTasks({ goal, category, motivation, daily_minutes, day_number, completed_task_titles = [] }) {
  const res = await fetch('/api/refresh-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, category, motivation, daily_minutes, day_number, completed_task_titles }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Task refresh failed: HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.tasks
}
