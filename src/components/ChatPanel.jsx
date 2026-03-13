import { useState, useRef, useEffect } from 'react'
import { streamChat, buildSystemPrompt } from '../api/claude.js'
import { USER } from '../data.js'

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

export default function ChatPanel({ task, goal, motivation, onClose }) {
  const [messages, setMessages] = useState([]) // { role, content, streaming? }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasApiKey] = useState(() => !!import.meta.env.VITE_ANTHROPIC_API_KEY)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const suggested = SUGGESTED[task.type] || SUGGESTED.action

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // 面板打开时聚焦输入框
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  async function send(text) {
    const userText = text ?? input.trim()
    if (!userText || loading) return
    setInput('')

    const userMsg = { role: 'user', content: userText }
    const history = [...messages, userMsg]
    setMessages(history)
    setLoading(true)

    if (!hasApiKey) {
      // 没有 API key 时，返回 mock 回复
      setTimeout(() => {
        const mock = getMockReply(userText, task)
        setMessages(prev => [...prev, { role: 'assistant', content: mock }])
        setLoading(false)
      }, 800)
      return
    }

    // 追加流式 assistant 消息占位
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    const apiMessages = history.map(m => ({ role: m.role, content: m.content }))
    const systemPrompt = buildSystemPrompt({ goal, motivation, task })

    await streamChat({
      messages: apiMessages,
      systemPrompt,
      onDelta: (delta) => {
        setMessages(prev => {
          const last = prev[prev.length - 1]
          return [...prev.slice(0, -1), { ...last, content: last.content + delta }]
        })
      },
      onDone: () => {
        setMessages(prev => {
          const last = prev[prev.length - 1]
          return [...prev.slice(0, -1), { ...last, streaming: false }]
        })
        setLoading(false)
      },
      onError: (err) => {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: '遇到了一点问题，请稍后再试。' },
        ])
        setLoading(false)
        console.error(err)
      },
    })
  }

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/40 z-40 anim-fade-in"
        onClick={onClose}
      />

      {/* 面板 */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#F7F6F3] rounded-t-3xl overflow-hidden"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.32,0.72,0,1) both', maxHeight: '85vh' }}
      >
        {/* 拖拽把手 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#DDDDDD] rounded-full" />
        </div>

        {/* 任务标题栏 */}
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

        {/* 消息区 */}
        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(85vh - 200px)' }}>
          {/* 初始状态：建议对话 chips */}
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

          {/* 消息列表 */}
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} />
          ))}

          {/* 有消息后展示建议问题 */}
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

        {/* 输入框 */}
        <div className="px-4 pb-8 pt-3 border-t border-[#E8E6E0] bg-[#F7F6F3]">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
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
          {!hasApiKey && (
            <p className="text-[11px] text-[#BBBBBB] mt-2 text-center">
              演示模式 · 配置 VITE_ANTHROPIC_API_KEY 后启用真实 AI
            </p>
          )}
        </div>
      </div>
    </>
  )
}

// 无 API Key 时的 mock 回复
function getMockReply(text, task) {
  if (text.includes('拆') || text.includes('细')) {
    return task.type === 'action'
      ? `好，把它拆成 3 步：\n① 打开一个空文档\n② 写下今天最重要的 3 件事\n③ 每件事标注预计时间\n\n就这样，5 分钟搞定。`
      : `把今天的学习拆成 2 步：先只看标题和规律那一段，看完之后用一句话说出来。不用看完全部。`
  }
  if (text.includes('开始') || text.includes('从哪')) {
    return `最简单的开始：打开它，哪怕只做 5 分钟。\n开始了，就成功了一半。`
  }
  if (text.includes('抵触') || text.includes('不想')) {
    return `这很正常。你不是不想做这件事，你只是还没感受到做完它的感觉。\n\n试试这样：只做最小的那一步，做完一步之后看看感觉怎么样。`
  }
  if (text.includes('例子') || text.includes('理解')) {
    return `用最简单的方式说：\n\n利率就像你去银行存钱的"回报率"。利率高了，大家都去存银行；债券的固定收益相比之下就没那么香了，价格自然跌。`
  }
  if (text.includes('关系') || text.includes('实际')) {
    return `直接关系你的钱包：\n\n如果你买了货币基金或者债券类产品，利率上升时，它的净值可能会短期下跌。不是亏了，是价格暂时低了。`
  }
  return `你问得很好。\n\n记住你当初说的：「${USER.motivation}」\n\n这件事正是为那个目标服务的。做一小步就够了。`
}
