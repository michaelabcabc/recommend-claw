import { useState, useEffect, useRef } from 'react'

export default function ActionSheet({ task, onComplete, onClose }) {
  const [visible, setVisible] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    return () => clearInterval(intervalRef.current)
  }, [])

  function startTimer() {
    if (running) return
    setRunning(true)
    intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  function fmt(s) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  function getTargetSec() {
    const m = (task.duration || '').match(/(\d+)[\s]*分/)
    return m ? parseInt(m[1]) * 60 : null
  }

  const target = getTargetSec()
  const pct = target ? Math.min(seconds / target, 1) : null
  const remaining = target ? Math.max(0, target - seconds) : null
  const overtime = target && seconds > target

  function handleClose() {
    clearInterval(intervalRef.current)
    setVisible(false)
    setTimeout(onClose, 300)
  }

  function handleDone() {
    clearInterval(intervalRef.current)
    setVisible(false)
    setTimeout(onComplete, 300)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s' }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-white rounded-t-3xl"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 bg-[#DDDDDD] rounded-full" />
        </div>

        {/* Task info */}
        <div className="px-6 pb-4">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl">{task.emoji || '✦'}</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-[18px] font-semibold text-[#1A1A1A] leading-snug">{task.title}</h2>
              {task.description && (
                <p className="text-[13px] text-[#888] mt-1 leading-relaxed">{task.description}</p>
              )}
              {task.duration && (
                <p className="text-[12px] text-[#BBBBBB] mt-1.5">预计 {task.duration}</p>
              )}
            </div>
          </div>

          {/* Timer display */}
          {(running || seconds > 0) ? (
            <div className={`rounded-2xl px-5 py-4 mb-5 text-center ${overtime ? 'bg-[#F0FDF4]' : 'bg-[#F5F4F1]'}`}>
              <p className="text-[36px] font-bold tabular-nums text-[#1A1A1A] leading-none">{fmt(seconds)}</p>
              {remaining !== null && !overtime && (
                <p className="text-[12px] text-[#888] mt-1.5">还剩 {fmt(remaining)}</p>
              )}
              {overtime && (
                <p className="text-[12px] text-[#22C55E] mt-1.5">已超时 {fmt(seconds - target)} · 你很专注 💪</p>
              )}
              {/* Progress bar */}
              {pct !== null && (
                <div className="mt-3 w-full h-1.5 bg-[#E8E6E0] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(pct * 100, 100)}%`,
                      backgroundColor: overtime ? '#22C55E' : '#1A1A1A',
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#F5F4F1] rounded-2xl px-5 py-4 mb-5 text-center">
              <p className="text-[14px] text-[#888]">开始计时，追踪你的专注时间</p>
              <button
                onClick={startTimer}
                className="mt-2 text-[13px] text-[#1A1A1A] font-medium underline underline-offset-2 active:opacity-60"
              >
                开始计时
              </button>
            </div>
          )}

          {/* Action buttons */}
          <button
            onClick={handleDone}
            className="w-full bg-[#1A1A1A] text-white rounded-2xl py-4 text-[16px] font-semibold active:opacity-80 mb-3"
          >
            ✓ 完成了
          </button>
          <button
            onClick={handleClose}
            className="w-full bg-[#F5F4F1] text-[#888] rounded-2xl py-3.5 text-[14px] active:opacity-70 mb-6"
          >
            稍后再做
          </button>
        </div>
      </div>
    </>
  )
}
