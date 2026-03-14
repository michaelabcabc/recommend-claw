import { useState, useEffect, useRef } from 'react'
import { chatFromServer } from '../lib/api.js'

/**
 * LearningSession — 互动式 AI 学习会话
 *
 * AI 先讲解概念 → 用户随意提问 → 充分理解后点「学完了」
 */
export default function LearningSession({ task, goal, motivation, onComplete, onBack }) {
  const [messages, setMessages] = useState([])       // { role: 'user'|'assistant', text }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userTurnCount, setUserTurnCount] = useState(0)
  const [phase, setPhase] = useState('learning')     // 'learning' | 'done'
  const [reflection, setReflection] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState(null)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const hasStarted = useRef(false)

  // ─── 入场动画 + 自动开始 ──────────────────────────────────────
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    if (!hasStarted.current) {
      hasStarted.current = true
      callAI([{ role: 'user', content: '请开始讲解今天的内容' }])
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ─── 调用 AI ─────────────────────────────────────────────────
  async function callAI(apiMessages) {
    setLoading(true)
    setError(null)
    try {
      const text = await chatFromServer({
        messages: apiMessages,
        goal: goal || '',
        motivation: motivation || '',
        task: { ...task, learningMode: true },
      })
      setMessages(prev => [...prev, { role: 'assistant', text }])
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch (err) {
      setError(err.message || '请求失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // ─── 发送消息 ─────────────────────────────────────────────────
  function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const updatedMessages = [...messages, { role: 'user', text }]
    setMessages(updatedMessages)
    setInput('')
    setUserTurnCount(prev => prev + 1)

    const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.text }))
    callAI(apiMessages)
  }

  // ─── 重试 ─────────────────────────────────────────────────────
  function handleRetry() {
    const apiMessages = messages.map(m => ({ role: m.role, content: m.text }))
    if (apiMessages.length === 0) {
      callAI([{ role: 'user', content: '请开始讲解今天的内容' }])
    } else {
      callAI(apiMessages)
    }
  }

  // ─── 完成学习 → 反思页 ────────────────────────────────────────
  function handleDone() {
    setPhase('done')
  }

  function handleFinalComplete() {
    onComplete(task, reflection.trim() || null)
  }

  const canComplete = userTurnCount >= 1 && !loading

  // ─── 完成/反思页 ──────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div
        className="fixed inset-0 bg-[#F7F6F3] z-50 flex flex-col max-w-md mx-auto"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="text-5xl mb-5">🎯</div>
          <h2 className="text-[24px] font-semibold text-[#1A1A1A] mb-2">今天学完了！</h2>
          <p className="text-[14px] text-[#888] mb-8">{task.title}</p>

          <div className="w-full mb-6 text-left">
            <p className="text-[13px] text-[#888] mb-2">用一句话说说你学到了什么（可以不填）</p>
            <textarea
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder="今天我明白了…"
              rows={3}
              className="w-full bg-white rounded-2xl border border-[#E8E6E0] px-4 py-3 text-[14px] text-[#1A1A1A] placeholder:text-[#BBBBBB] resize-none outline-none leading-relaxed focus:border-[#AAAAAA] transition-colors"
            />
          </div>

          <button
            onClick={handleFinalComplete}
            className="w-full bg-[#1A1A1A] text-white rounded-2xl py-4 text-[15px] font-semibold active:opacity-80"
          >
            完成今天的学习 →
          </button>
        </div>
      </div>
    )
  }

  // ─── 学习聊天页 ───────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-[#F7F6F3] z-50 flex flex-col max-w-md mx-auto"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
      }}
    >
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3 flex-shrink-0 border-b border-[#EEECEB] bg-[#F7F6F3]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] text-[#888] active:opacity-60 py-1"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回
        </button>

        <div className="text-center flex-1 mx-3">
          <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{task.title}</p>
          {task.badge && <p className="text-[11px] text-[#AAAAAA] mt-0.5">{task.badge}</p>}
        </div>

        <button
          onClick={handleDone}
          disabled={!canComplete}
          className={`text-[13px] font-medium px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
            canComplete
              ? 'bg-[#1A1A1A] text-white active:opacity-80'
              : 'text-[#CCCCCC] cursor-default'
          }`}
        >
          学完了
        </button>
      </div>

      {/* ─── 概念标签 ─── */}
      {task.concept && (
        <div className="px-5 py-2 flex-shrink-0 bg-[#F7F6F3]">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1.5 border border-[#E8E6E0]">
            <span className="text-[11px] text-[#AAAAAA]">今日概念</span>
            <span className="text-[11px] font-semibold text-[#1A1A1A]">{task.concept}</span>
          </div>
        </div>
      )}

      {/* ─── 消息区域 ─── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 mb-0.5">
                <span className="text-white text-[10px] font-bold">AI</span>
              </div>
            )}
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-[#1A1A1A] text-white rounded-br-sm'
                : 'bg-white border border-[#E8E6E0] text-[#1A1A1A] rounded-bl-sm shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
            }`}>
              {m.text}
            </div>
          </div>
        ))}

        {/* 加载指示器 */}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">AI</span>
            </div>
            <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-[#E8E6E0] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="flex gap-1 items-center h-5">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#CCCCCC] animate-bounce"
                    style={{ animationDelay: `${i * 140}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="flex flex-col items-center py-3 gap-2">
            <p className="text-[12px] text-red-400">{error}</p>
            <button
              onClick={handleRetry}
              className="text-[12px] text-[#1A1A1A] border border-[#E8E6E0] rounded-full px-4 py-1.5 bg-white active:opacity-60"
            >
              重试
            </button>
          </div>
        )}

        {/* AI 讲解完毕后的提示 */}
        {messages.length >= 1 && !loading && !error && userTurnCount === 0 && (
          <div className="text-center py-3">
            <p className="text-[12px] text-[#BBBBBB]">💬 有疑问就问，没问题就点右上角「学完了」</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ─── 输入区 ─── */}
      <div className="flex-shrink-0 px-5 pb-8 pt-3 border-t border-[#EEECEB] bg-[#F7F6F3]">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-white rounded-2xl border border-[#E8E6E0] px-4 py-3 focus-within:border-[#AAAAAA] transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="有什么不明白的？问我…"
              rows={1}
              className="w-full bg-transparent text-[14px] text-[#1A1A1A] placeholder:text-[#BBBBBB] resize-none outline-none leading-relaxed"
              style={{ maxHeight: '80px', overflowY: 'auto' }}
              disabled={loading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0 disabled:opacity-30 active:opacity-70 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V2M7 2L3 6M7 2L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
