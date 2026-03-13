import { useState, useRef, useEffect } from 'react'
import { streamChatFromServer } from '../lib/api.js'
import * as db from '../lib/db.js'

// 按任务类型预置的建议对话
const SUGGESTED = {
  action: [
    '帮我把这个任务拆得更细',
    '我不知道从哪里开始',
    '为什么今天要先做这件事',
    '我有点抵触，怎么办',
  ],
  content: [
    '我还没完全理解这个概念',
    '给我一个更简单的例子',
    '这和我的实际情况有什么关系',
    '这个概念和之前学的有什么联系',
  ],
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
          isUser
            ? 'bg-[#1A1A1A] text-white rounded-br-sm'
            : 'bg-white text-[#1A1A1A] rounded-bl-sm border border-[#E8E6E0]'
        }`}
      >
        {msg.content}
        {msg.streaming && (
          <span className="inline-block w-1 h-3.5 bg-current ml-0.5 animate-pulse rounded-full" />
        )}
      </div>
    </div>
  )
}

export default function ChatPanel({ task, goal, motivation, userId, sessionId, onSessionCreated, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const sessionIdRef = useRef(sessionId)

  const suggested = SUGGESTED[task.type] || SUGGESTED.action

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  // Load existing chat history if session already exists
  useEffect(() => {
    if (sessionId) {
      sessionIdRef.current = sessionId
      db.getChatHistory(sessionId).then(history => {
        if (history.length > 0) setMessages(history)
      })
    }
  }, [sessionId])

  async function getOrCreateSession() {
    if (sessionIdRef.current) return sessionIdRef.current
    const session = await db.createChatSession(userId, task)
    sessionIdRef.current = session.id
    onSessionCreated?.(session.id)
    return session.id
  }

  async function send(text) {
    const userText = text ?? input.trim()
    if (!userText || loading) return
    setInput('')

    const userMsg = { role: 'user', content: userText }
    const history = [...messages, userMsg]
    setMessages(history)
    setLoading(true)

    // Persist user message (non-blocking, don't crash if DB fails)
    let sid = null
    try {
      sid = await getOrCreateSession()
      await db.saveMessage(sid, userId, 'user', userText)
    } catch (err) {
      console.error('Failed to save message to DB:', err)
    }

    // Append streaming assistant placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    const apiMessages = history.map(m => ({ role: m.role, content: m.content }))

    let finalContent = ''
    await streamChatFromServer({
      messages: apiMessages,
      goal,
      motivation,
      task,
      onDelta: (delta) => {
        finalContent += delta
        setMessages(prev => {
          const last = prev[prev.length - 1]
          return [...prev.slice(0, -1), { ...last, content: last.content + delta }]
        })
      },
      onDone: async () => {
        setMessages(prev => {
          const last = prev[prev.length - 1]
          return [...prev.slice(0, -1), { ...last, streaming: false }]
        })
        setLoading(false)
        if (sid && finalContent) {
          try { await db.saveMessage(sid, userId, 'assistant', finalContent) } catch (_) {}
        }
      },
      onError: (err) => {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: '网络出现了问题，请稍后重试。' },
        ])
        setLoading(false)
        console.error(err)
      },
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 anim-fade-in" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#F7F6F3] rounded-t-3xl overflow-hidden"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.32,0.72,0,1) both', maxHeight: '85vh' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#DDDDDD] rounded-full" />
        </div>

        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#E8E6E0]">
          <span className="text-xl">{task.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-[#1A1A1A] truncate">{task.title}</p>
            <p className="text-[11px] text-[#BBBBBB]">和 AI 教练对话</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#EBEBEB] text-[#888] text-[12px] active:opacity-60"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(85vh - 200px)' }}>
          {messages.length === 0 && (
            <div className="anim-fade-up">
              <p className="text-[13px] text-[#BBBBBB] text-center mb-4">
                可以问我任何关于这件事的问题
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-2">
                {suggested.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="bg-white border border-[#E8E6E0] rounded-full px-3.5 py-2 text-[13px] text-[#444] active:bg-[#F0F0EE] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <Message key={i} msg={msg} />
          ))}

          {messages.length > 0 && messages.length % 2 === 0 && !loading && (
            <div className="flex flex-wrap gap-1.5 mt-3 mb-1">
              {suggested.slice(0, 2).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="bg-white border border-[#E8E6E0] rounded-full px-3 py-1.5 text-[12px] text-[#888] active:opacity-60"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="px-4 pb-8 pt-3 border-t border-[#E8E6E0] bg-[#F7F6F3]">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
              placeholder="问点什么……"
              rows={1}
              className="flex-1 bg-white border border-[#E8E6E0] rounded-2xl px-4 py-3 text-[14px] text-[#1A1A1A] placeholder-[#CCCCCC] resize-none outline-none focus:border-[#AAAAAA] transition-colors"
              style={{ minHeight: '44px', maxHeight: '100px' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-11 h-11 flex-shrink-0 bg-[#1A1A1A] text-white rounded-xl flex items-center justify-center disabled:opacity-30 active:opacity-70 transition-opacity"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8L14 8M14 8L8 2M14 8L8 14" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
