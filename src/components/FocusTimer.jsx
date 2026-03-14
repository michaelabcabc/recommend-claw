import { useState, useEffect, useRef } from 'react'

export default function FocusTimer({ task, onComplete, onBack }) {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  function startTimer() {
    setStarted(true)
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
  }

  function pauseTimer() {
    setRunning(false)
    clearInterval(intervalRef.current)
  }

  function resumeTimer() {
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
  }

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  // Parse expected duration (e.g. "20 分钟" → 20*60)
  function getTargetSeconds() {
    const match = (task.duration || '').match(/(\d+)/)
    return match ? parseInt(match[1]) * 60 : null
  }

  const target = getTargetSeconds()
  const progress = target ? Math.min(seconds / target, 1) : null
  const circumference = 2 * Math.PI * 54  // r=54
  const strokeDash = circumference
  const strokeOffset = progress !== null ? circumference * (1 - progress) : circumference

  const isOvertime = target && seconds > target
  const remaining = target ? Math.max(0, target - seconds) : null

  return (
    <div className="fixed inset-0 bg-[#F7F6F3] z-30 flex flex-col">

      {/* Header */}
      <div className="flex items-center px-5 pt-12 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[#888] active:text-[#444]"
        >
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
            <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[14px]">返回</span>
        </button>
      </div>

      {/* Task info */}
      <div className="px-8 pt-2 pb-6 text-center">
        <div className="text-4xl mb-3">{task.emoji}</div>
        <h1 className="text-[20px] font-semibold text-[#1A1A1A] leading-snug">{task.title}</h1>
        {task.description && (
          <p className="text-[14px] text-[#888] mt-2 leading-relaxed">{task.description}</p>
        )}
      </div>

      {/* Timer circle */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <svg width="140" height="140" viewBox="0 0 140 140">
            {/* Background track */}
            <circle cx="70" cy="70" r="54" fill="none" stroke="#E8E6E0" strokeWidth="6" />
            {/* Progress arc */}
            {progress !== null && (
              <circle
                cx="70" cy="70" r="54"
                fill="none"
                stroke={isOvertime ? '#22C55E' : '#1A1A1A'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={strokeDash}
                strokeDashoffset={strokeOffset}
                transform="rotate(-90 70 70)"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
              />
            )}
          </svg>

          {/* Time display */}
          <div className="absolute text-center">
            <p className="text-[32px] font-bold text-[#1A1A1A] leading-none tabular-nums">
              {formatTime(seconds)}
            </p>
            {!started && (
              <p className="text-[12px] text-[#BBBBBB] mt-1">准备好了吗</p>
            )}
            {started && remaining !== null && !isOvertime && (
              <p className="text-[12px] text-[#BBBBBB] mt-1">还剩 {formatTime(remaining)}</p>
            )}
            {isOvertime && (
              <p className="text-[12px] text-[#22C55E] mt-1">超时了，继续！</p>
            )}
          </div>
        </div>
      </div>

      {/* Duration hint */}
      {task.duration && (
        <p className="text-center text-[13px] text-[#BBBBBB] mb-4">
          目标：{task.duration}
        </p>
      )}

      {/* Controls */}
      <div className="px-8 pb-12 space-y-3">
        {!started ? (
          <button
            onClick={startTimer}
            className="w-full bg-[#1A1A1A] text-white rounded-2xl py-4 text-[16px] font-semibold active:opacity-80"
          >
            开始专注
          </button>
        ) : (
          <>
            <button
              onClick={onComplete}
              className="w-full bg-[#1A1A1A] text-white rounded-2xl py-4 text-[16px] font-semibold active:opacity-80"
            >
              ✓ 完成任务
            </button>
            <div className="flex gap-3">
              <button
                onClick={running ? pauseTimer : resumeTimer}
                className="flex-1 bg-white border border-[#E8E6E0] rounded-2xl py-3 text-[14px] text-[#888] active:bg-[#F0EEE9]"
              >
                {running ? '暂停' : '继续'}
              </button>
              <button
                onClick={onBack}
                className="flex-1 bg-white border border-[#E8E6E0] rounded-2xl py-3 text-[14px] text-[#888] active:bg-[#F0EEE9]"
              >
                稍后再做
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
