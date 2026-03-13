// Client-side wrappers for Vercel serverless functions
// The Anthropic API key lives server-side only — never exposed to the browser

export async function streamChatFromServer({ messages, goal, motivation, task, onDelta, onDone, onError }) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, goal, motivation, task }),
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6)
        if (payload === '[DONE]') {
          onDone()
          return
        }
        try {
          const parsed = JSON.parse(payload)
          if (parsed.error) {
            onError(new Error(parsed.error))
            return
          }
          if (parsed.delta) onDelta(parsed.delta)
        } catch {
          // ignore parse errors on individual events
        }
      }
    }
    onDone()
  } catch (err) {
    onError(err)
  }
}

export async function generateTasks({ goal, category, motivation, daily_minutes, day_number = 1 }) {
  const res = await fetch('/api/generate-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, category, motivation, daily_minutes, day_number }),
  })
  if (!res.ok) throw new Error(`Task generation failed: HTTP ${res.status}`)
  const data = await res.json()
  return data.tasks
}

export async function refreshTasks({ goal, category, motivation, daily_minutes, day_number, completed_task_titles = [] }) {
  const res = await fetch('/api/refresh-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, category, motivation, daily_minutes, day_number, completed_task_titles }),
  })
  if (!res.ok) throw new Error(`Task refresh failed: HTTP ${res.status}`)
  const data = await res.json()
  return data.tasks
}
