import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function GoalDiscovery({ onGoalReady, onCancel }) {
  const [messages, setMessages] = useState([])   // { role, content } — sent to API
  const [bubbles, setBubbles]   = useState([])   // { role, text } — displayed
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const [goal, setGoal]         = useState(null)
  const hasFetched = useRef(false)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  // Slide up + initial AI message
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    if (!hasFetched.current) {
      hasFetched.current = true
      askAI([])
    }
  }, [])

  // Scroll to bottom whenever content changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [bubbles, loading])

  async function askAI(history) {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/discover-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const data = await res.json()

      const aiMsg = { role: 'assistant', content: data.message }
      setMessages(prev => [...prev, aiMsg])
      setBubbles(prev => [...prev, { role: 'assistant', text: data.message }])

      if (data.collected && data.goal) {
        setGoal(data.goal)
      }
    } catch (err) {
      console.error('GoalDiscovery error:', err)
      const fallback = '你好！最近有什么想改变或者想达成的目标？'
      setMessages(prev => [...prev, { role: 'assistant', content: fallback }])
      setBubbles(prev => [...prev, { role: 'assistant', text: fallback }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const newHistory = [...messages, userMsg]

    setInput('')
    setMessages(newHistory)
    setBubbles(prev => [...prev, { role: 'user', text }])

    await askAI(newHistory)
  }

  function handleConfirm() {
    if (!goal) return
    onGoalReady({
      goal:       goal.goal,
      category:   goal.category || 'other',
      motivation: goal.motivation || '',
      duration:   String(goal.daily_minutes || 30),
    })
  }

  const categoryLabels = { learn: '学习成长', work: '工作项目', health: '健康习惯', other: '个人目标' }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}
        onClick={!goal ? onCancel : undefined}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#F7F6F3] rounded-t-3xl flex flex-col"
        style={{
          height: '88vh',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-[#DDDDDD] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 flex-shrink-0">
          <div>
            <h2 className="text-[17px] font-semibold text-[#1A1A1A]">设定你的目标</h2>
            <p className="text-[12px] text-[#AAAAAA] mt-0.5">和 AI 聊几句，帮你拆解成每天行动</p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-[#EBEBEB] text-[#888] text-[12px] active:opacity-60 mt-0.5"
            >✕</button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3">
          {bubbles.map((b, i) => (
            <div key={i} className={`flex items-end gap-2 ${b.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {b.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 mb-0.5">
                  <span className="text-white text-[10px] font-medium">AI</span>
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap ${
                b.role === 'user'
                  ? 'bg-[#1A1A1A] text-white rounded-br-sm'
                  : 'bg-white border border-[#E8E6E0] text-[#1A1A1A] rounded-bl-sm'
              }`}>
                {b.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-medium">AI</span>
              </div>
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 border border-[#E8E6E0]">
                <div className="flex gap-1 items-center h-4">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#CCCCCC] animate-bounce"
                      style={{ animationDelay: `${i * 140}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Goal confirmation card */}
          {goal && !loading && (
            <div className="bg-[#1A1A1A] rounded-2xl px-5 py-5 mt-1">
              <p className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-3">我理解你的目标是</p>
              <p className="text-white text-[16px] font-semibold leading-snug mb-3">{goal.goal}</p>
              <div className="flex flex-col gap-1 mb-4">
                <p className="text-white/60 text-[13px]">动力：{goal.motivation}</p>
                <p className="text-white/60 text-[13px]">
                  {categoryLabels[goal.category] || '个人目标'} · 每天 {goal.daily_minutes} 分钟
                </p>
              </div>
              <button
                onClick={handleConfirm}
                className="w-full bg-white text-[#1A1A1A] rounded-xl py-3 text-[14px] font-semibold active:opacity-80"
              >
                对，帮我开始 →
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!goal && (
          <div className="flex-shrink-0 px-5 pb-8 pt-3 border-t border-[#EEECEB]">
            <div className="flex items-end gap-2">
              <div className="flex-1 bg-white rounded-2xl border border-[#E8E6E0] px-4 py-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }}}
                  placeholder="说说你的想法…"
                  rows={1}
                  className="w-full bg-transparent text-[14px] text-[#1A1A1A] placeholder:text-[#BBBBBB] resize-none outline-none leading-relaxed"
                  style={{ maxHeight: '80px', overflowY: 'auto' }}
                  disabled={loading}
                />
              </div>
              <button
                onClick={send}
                disabled={loading || !input.trim()}
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
