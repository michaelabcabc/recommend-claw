import { useState } from 'react'

export default function ContentReader({ task, onComplete, onBack, onChat }) {
  const [step, setStep] = useState(0) // 0~n: 内容段落, last: 总结输入
  const [summary, setSummary] = useState('')
  const total = task.content.length

  const current = task.content[step]
  const isLast = step === total - 1
  const isSummary = step === total // 总结填写页

  function handleNext() {
    if (isLast) {
      setStep(total) // 进入总结
    } else {
      setStep(s => s + 1)
    }
  }

  const progress = isSummary ? 100 : Math.round(((step + 1) / (total + 1)) * 100)

  return (
    <div className="min-h-screen bg-[#F7F6F3] flex flex-col">
      {/* 顶栏 */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[#E8E6E0] active:opacity-60"
        >
          <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
            <path d="M7 1L1 6.5L7 12" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] text-[#888]">
              {task.title} · {task.badge}
            </span>
            <span className="text-[12px] text-[#BBBBBB]">{progress}%</span>
          </div>
          <div className="w-full h-1 bg-[#E8E6E0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 px-5 pt-4 pb-8 overflow-y-auto">
        {!isSummary ? (
          <div key={step} className="anim-fade-up">
            {current.type === 'news' && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-medium text-[#888] uppercase tracking-wider">
                    今日新闻
                  </span>
                  <div className="h-px flex-1 bg-[#E8E6E0]" />
                </div>
                <p className="text-[16px] text-[#1A1A1A] leading-relaxed">{current.text}</p>
              </div>
            )}

            {current.type === 'concept' && (
              <div className="mb-6">
                <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-3">
                  {current.heading}
                </h3>
                <p className="text-[16px] text-[#1A1A1A] leading-relaxed whitespace-pre-line">
                  {current.text}
                </p>
              </div>
            )}

            {current.type === 'rule' && (
              <div className="mb-6">
                <h3 className="text-[18px] font-semibold text-[#1A1A1A] mb-4">
                  {current.heading}
                </h3>
                <div className="bg-white rounded-2xl border border-[#E8E6E0] px-5 py-5">
                  <p className="text-[15px] text-[#1A1A1A] leading-loose font-mono whitespace-pre-line">
                    {current.text}
                  </p>
                </div>
              </div>
            )}

            {current.type === 'connect' && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-medium text-[#888] uppercase tracking-wider">
                    和你的目标连起来
                  </span>
                  <div className="h-px flex-1 bg-[#E8E6E0]" />
                </div>
                <p className="text-[16px] text-[#444] leading-relaxed whitespace-pre-line">
                  {current.text}
                </p>
              </div>
            )}

            <button
              onClick={handleNext}
              className="w-full bg-[#1A1A1A] text-white rounded-xl py-3.5 text-[15px] font-medium active:opacity-80 transition-opacity mt-2"
            >
              {isLast ? '继续' : '继续阅读'}
            </button>

            {/* 阅读中对话入口 */}
            <button
              onClick={onChat}
              className="w-full flex items-center justify-center gap-2 mt-3 py-2.5 text-[13px] text-[#BBBBBB] active:text-[#888] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M11 1H2C1.45 1 1 1.45 1 2V9C1 9.55 1.45 10 2 10H4L6.5 12.5L9 10H11C11.55 10 12 9.55 12 9V2C12 1.45 11.55 1 11 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
              有不懂的？问 AI 教练
            </button>
          </div>
        ) : (
          /* 总结输入页 */
          <div className="anim-fade-up">
            <h3 className="text-[20px] font-semibold text-[#1A1A1A] mb-2">
              读完了。
            </h3>
            <p className="text-[15px] text-[#888] mb-6 leading-relaxed">
              用一句话总结今天学到的规律：
            </p>
            <p className="text-[14px] text-[#BBBBBB] mb-3">
              {task.concept ? `关于「${task.concept}」，我学到了……` : '今天最重要的一点是……'}
            </p>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="写下你的理解，哪怕一句话"
              className="w-full bg-white border border-[#E8E6E0] rounded-2xl px-4 py-4 text-[15px] text-[#1A1A1A] placeholder-[#CCCCCC] resize-none outline-none focus:border-[#AAAAAA] transition-colors min-h-[120px]"
              autoFocus
            />
            <button
              onClick={() => onComplete(task, summary)}
              disabled={summary.trim().length < 3}
              className="w-full bg-[#1A1A1A] text-white rounded-xl py-3.5 text-[15px] font-medium mt-4 disabled:opacity-30 active:opacity-80 transition-opacity"
            >
              存入我的知识库
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
