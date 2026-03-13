import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import * as db from '../lib/db.js'

export default function ProfileSheet({ userId, userProfile, activeGoal, streak, onClose }) {
  const [visible, setVisible] = useState(false)
  const [stats, setStats] = useState({ totalDone: 0, daysActive: 0 })
  const [summaries, setSummaries] = useState([])
  const [longestStreak, setLongestStreak] = useState(0)
  const [activityDates, setActivityDates] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    loadData()
  }, [])

  async function loadData() {
    try {
      const [statsData, summariesData, streakData, dates] = await Promise.all([
        db.getStats(userId),
        db.getRecentSummaries(userId, 8),
        db.getStreak(userId),
        db.getActivityDates(userId, 14),
      ])
      setStats(statsData)
      setSummaries(summariesData)
      setLongestStreak(streakData?.longest_streak || 0)
      setActivityDates(dates)
    } catch (err) {
      console.error('Failed to load profile data:', err)
    } finally {
      setLoading(false)
    }
  }

  function getInitial(name) {
    return (name || '你')[0].toUpperCase()
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  function getDayCount() {
    if (!activeGoal?.created_at) return 1
    const start = new Date(activeGoal.created_at)
    const now = new Date()
    start.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)
    return Math.max(1, Math.floor((now - start) / 86400000) + 1)
  }

  const dayCount = getDayCount()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#F7F6F3] rounded-t-3xl overflow-hidden"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-[#DDDDDD] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <h2 className="text-[17px] font-semibold text-[#1A1A1A]">我的主页</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#EBEBEB] text-[#888] text-[12px] active:opacity-60"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">

          {/* Avatar + Name */}
          <div className="flex items-center gap-4 mb-6 mt-2">
            <div className="w-14 h-14 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[22px] font-semibold">{getInitial(userProfile.name)}</span>
            </div>
            <div>
              <p className="text-[18px] font-semibold text-[#1A1A1A]">{userProfile.name || '你'}</p>
              {activeGoal && (
                <p className="text-[13px] text-[#888] mt-0.5">第 {dayCount} 天</p>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <StatCard
              value={streak}
              label="当前连击"
              icon="🔥"
              highlight={streak > 0}
            />
            <StatCard
              value={longestStreak}
              label="最长连击"
              icon="🏆"
            />
            <StatCard
              value={loading ? '—' : stats.totalDone}
              label="完成任务"
              icon="✅"
            />
            <StatCard
              value={loading ? '—' : stats.daysActive}
              label="活跃天数"
              icon="📅"
            />
          </div>

          {/* Activity calendar (last 14 days) */}
          <ActivityCalendar activityDates={activityDates} />

          {/* Current goal */}
          {activeGoal && (
            <div className="bg-white rounded-2xl border border-[#E8E6E0] px-4 py-4 mb-5">
              <p className="text-[11px] font-medium text-[#888] uppercase tracking-wider mb-2">当前目标</p>
              <p className="text-[15px] text-[#1A1A1A] leading-relaxed">{activeGoal.goal}</p>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#F0EEE9]">
                <span className="text-[12px] text-[#BBBBBB]">
                  每天 {activeGoal.daily_minutes} 分钟
                </span>
                <span className="text-[#DDDDDD]">·</span>
                <span className="text-[12px] text-[#BBBBBB]">
                  {getCategoryLabel(activeGoal.category)}
                </span>
              </div>
            </div>
          )}

          {/* Knowledge base */}
          {summaries.length > 0 && (
            <div className="mb-5">
              <p className="text-[11px] font-medium text-[#888] uppercase tracking-wider mb-3">知识库</p>
              <div className="space-y-2.5">
                {summaries.map(s => (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-[#E8E6E0] px-4 py-3"
                  >
                    <p className="text-[14px] text-[#1A1A1A] leading-relaxed">{s.summary}</p>
                    <p className="text-[11px] text-[#BBBBBB] mt-1.5">{formatDate(s.date)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summaries.length === 0 && !loading && (
            <div className="mb-5">
              <p className="text-[11px] font-medium text-[#888] uppercase tracking-wider mb-3">知识库</p>
              <div className="bg-white rounded-2xl border border-[#E8E6E0] px-4 py-5 text-center">
                <p className="text-[13px] text-[#BBBBBB]">完成阅读任务后，你的总结会保存在这里</p>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full py-3.5 rounded-xl border border-[#E8E6E0] bg-white text-[14px] text-[#888] active:bg-[#F0EEE9] transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>
    </>
  )
}

function StatCard({ value, label, icon, highlight }) {
  return (
    <div className={`rounded-2xl px-4 py-4 ${highlight ? 'bg-[#1A1A1A]' : 'bg-white border border-[#E8E6E0]'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
      </div>
      <p className={`text-[26px] font-bold leading-none mb-1 ${highlight ? 'text-white' : 'text-[#1A1A1A]'}`}>
        {value}
      </p>
      <p className={`text-[12px] ${highlight ? 'text-white/50' : 'text-[#888]'}`}>{label}</p>
    </div>
  )
}

function getCategoryLabel(category) {
  const map = { learn: '学习成长', work: '工作项目', health: '健康习惯', other: '其他' }
  return map[category] || '其他'
}

function ActivityCalendar({ activityDates }) {
  const days = []
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const str = d.toISOString().slice(0, 10)
    const isToday = i === 0
    days.push({ str, isToday, active: activityDates.has(str) })
  }

  const dayLabels = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div className="mb-5">
      <p className="text-[11px] font-medium text-[#888] uppercase tracking-wider mb-3">最近 14 天</p>
      <div className="bg-white rounded-2xl border border-[#E8E6E0] px-4 py-4">
        <div className="grid grid-cols-7 gap-1.5">
          {dayLabels.map(l => (
            <div key={l} className="text-center text-[10px] text-[#CCCCCC] pb-1">{l}</div>
          ))}
          {/* Pad first row if week doesn't start on Sunday */}
          {(() => {
            const firstDay = new Date(days[0].str).getDay()
            return Array.from({ length: firstDay }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))
          })()}
          {days.map(day => (
            <div
              key={day.str}
              className={`aspect-square rounded-lg flex items-center justify-center ${
                day.active
                  ? 'bg-[#1A1A1A]'
                  : day.isToday
                  ? 'bg-[#F0EEE9] ring-1 ring-[#CCCCCC]'
                  : 'bg-[#F5F4F1]'
              }`}
            >
              {day.active && (
                <span className="text-white text-[8px]">✓</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
