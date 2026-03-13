import { useEffect, useState } from 'react'

export default function CompletionRitual({ task, doneCount, totalCount, streak, onContinue }) {
  const [phase, setPhase] = useState(0)
  // phase 0: 黑屏淡入
  // phase 1: 显示文案
  // phase 2: 显示底部按钮

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const lines = task.completionMessage.split('\n')
  const isAllDone = doneCount === totalCount

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-8 pt-16 pb-6">
        {phase >= 1 && (
          <div className="anim-fade-up">
            {/* 星点装饰 */}
            <div className="flex gap-3 mb-8 opacity-40">
              <span className="text-white text-lg">✦</span>
              <span className="text-white text-sm mt-1">✦</span>
              <span className="text-white text-xs mt-2.5">✦</span>
            </div>

            {/* 核心文案 */}
            <div className="space-y-3">
              {lines.map((line, i) => (
                <p
                  key={i}
                  className="text-white leading-relaxed"
                  style={{
                    fontSize: i === 0 ? '22px' : '16px',
                    fontWeight: i === 0 ? '600' : '400',
                    opacity: i === 0 ? 1 : 0.75,
                    animationDelay: `${i * 120}ms`,
                    animation: 'fadeUp 0.5s ease both',
                  }}
                >
                  {line || '\u00A0'}
                </p>
              ))}
            </div>

            {/* streak */}
            <div className="mt-8 flex items-center gap-2">
              <div className="h-px flex-1 bg-white opacity-10" />
              <span className="text-white text-[13px] opacity-40">
                连续第 {streak} 天
              </span>
              <div className="h-px flex-1 bg-white opacity-10" />
            </div>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      {phase >= 2 && (
        <div className="px-6 pb-14 pt-4 anim-fade-up">
          {isAllDone ? (
            <>
              <p className="text-center text-white opacity-40 text-[14px] mb-5">
                今天全做完了。
              </p>
              <button
                onClick={onContinue}
                className="w-full border border-white border-opacity-20 text-white rounded-xl py-3.5 text-[15px] active:opacity-60 transition-opacity"
              >
                回到今天
              </button>
            </>
          ) : (
            <>
              <p className="text-center text-white opacity-30 text-[13px] mb-5">
                还有 {totalCount - doneCount} 件事
              </p>
              <button
                onClick={onContinue}
                className="w-full border border-white border-opacity-20 text-white rounded-xl py-3.5 text-[15px] active:opacity-60 transition-opacity"
              >
                继续
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
