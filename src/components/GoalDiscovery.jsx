import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function GoalDiscovery({ onGoalReady, onCancel }) {
  const [messages, setMessages] = useState([])  // { role, content }
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [aiText, setAiText] = useState('')
  const [visible, setVisible] = useState(false)
  const [extractedGoal, setExtractedGoal] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const hasStarted = useRef(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    // Kick off initial AI message
    if (!hasStarted.current) {
      hasStarted.current = true
      callAI([])
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiText])

  async function callAI(msgs) {
    setSending(true)
    setAiText('')

    try {
      const resp = await fetch(`${API_BASE}/api/discover-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs }),
      })

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullAIText = ''
      let pendingGoal = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.goal) {
              pendingGoal = parsed.goal
            } else if (parsed.replace) {
              fullAIText = parsed.delta
              setAiText(fullAIText)
            } else if (parsed.delta) {
              fullAIText += parsed.delta
              setAiText(fullAIText)
            }
          } catch (_) {}
        }
      }

      // Commit streamed AI message to history
      if (fullAIText) {
        setMessages(prev => [...prev, { role: 'assistant', content: fullAIText }])
      }
      setAiText('')

      if (pendingGoal?.ready) {
        setExtractedGoal(pendingGoal)
      }
    } catch (err) {
      console.error('Discovery error:', err)
      const fallback = '你最近有什么想改变的事，或者想达成什么目标？告诉我，我来帮你拆解成每天的行动。'
      setMessages(prev => [...prev, { role: 'assistant', content: fallback }])
      setAiText('')
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    await callAI(newMessages)
  }

  function handleConfirmGoal() {
    if (extractedGoal) {
      onGoalReady({
        goal: extractedGoal.goal,
        category: extractedGoal.category || 'other',
        motivation: extractedGoal.motivation || '',
        duration: String(extractedGoal.daily_minutes || 30),
      })
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s' }}
        onClick={extractedGoal ? undefined : onCancel}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#F7F6F3] rounded-t-3xl flex flex-col"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
          height: '88vh',
        }}
      >
        {/* Handle + Header */}
        <div className="flex-shrink-0 pt-3 pb-2">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-1 bg-[#DDDDDD] rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 pb-1">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1A1A1A]">和 AI 聊聊你的目标</h2>
              <p className="text-[12px] text-[#AAAAAA] mt-0.5">回答几个问题，帮你拆解成每天的行动</p>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-[#EBEBEB] text-[#888] text-[12px] active:opacity-60"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} text={m.content} />
          ))}

          {/* Streaming AI reply */}
          {aiText && <MessageBubble role="assistant" text={aiText} streaming />}

          {/* Typing indicator */}
          {sending && !aiText && (
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px]">AI</span>
              </div>
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 border border-[#E8E6E0]">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#CCCCCC] animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Goal confirmation card */}
          {extractedGoal && !sending && (
            <GoalConfirmCard goal={extractedGoal} onConfirm={handleConfirmGoal} />
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!extractedGoal && (
          <div className="flex-shrink-0 px-5 pb-8 pt-3 border-t border-[#EEECEB]">
            <div className="flex items-end gap-2">
              <div className="flex-1 bg-white rounded-2xl border border-[#E8E6E0] px-4 py-3 min-h-[44px] flex items-center">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="说说你的想法…"
                  rows={1}
                  className="w-full bg-transparent text-[14px] text-[#1A1A1A] placeholder:text-[#BBBBBB] resize-none outline-none leading-relaxed"
                  style={{ maxHeight: '80px', overflowY: 'auto' }}
                  disabled={sending}
                />
              </div>
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 disabled:opacity-30 active:opacity-70 transition-opacity"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 12V2M7 2L3 6M7 2L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function MessageBubble({ role, text, streaming }) {
  const isUser = role === 'user'
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 mb-0.5">
          <span className="text-white text-[10px] font-medium">AI</span>
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-[#1A1A1A] text-white rounded-br-sm'
            : 'bg-white border border-[#E8E6E0] text-[#1A1A1A] rounded-bl-sm'
        }`}
      >
        {text}
        {streaming && <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse" />}
      </div>
    </div>
  )
}

function GoalConfirmCard({ goal, onConfirm }) {
  const categoryLabels = { learn: '学习成长', work: '工作项目', health: '健康习惯', other: '个人目标' }
  return (
    <div className="bg-[#1A1A1A] rounded-2xl px-5 py-5 mt-2">
      <p className="text-white/60 text-[11px] font-medium uppercase tracking-wider mb-3">我理解你的目标是</p>
      <p className="text-white text-[16px] font-semibold leading-snug mb-2">{goal.goal}</p>
      <p className="text-white/50 text-[13px] mb-1">动力：{goal.motivation}</p>
      <p className="text-white/50 text-[13px] mb-4">
        {categoryLabels[goal.category] || '个人目标'} · 每天 {goal.daily_minutes} 分钟
      </p>
      <button
        onClick={onConfirm}
        className="w-full bg-white text-[#1A1A1A] rounded-xl py-3 text-[14px] font-semibold active:opacity-80"
      >
        对，帮我开始 →
      </button>
    </div>
  )
}
