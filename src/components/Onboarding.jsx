import { useState } from 'react'

const CATEGORIES = [
  { id: 'learn',  label: '学习成长', emoji: '📚' },
  { id: 'work',   label: '工作项目', emoji: '💼' },
  { id: 'health', label: '健康习惯', emoji: '🏃' },
  { id: 'other',  label: '其他',     emoji: '✦'  },
]

const DURATIONS = [
  { id: '15', label: '15 分钟', sub: '零碎时间' },
  { id: '30', label: '30 分钟', sub: '刚刚好' },
  { id: '60', label: '1 小时',  sub: '认真投入' },
]

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(1)   // 1 | 2 | 3 | 'generating'
  const [form, setForm] = useState({
    goal: '',
    category: '',
    duration: '',
    motivation: '',
  })

  function next() {
    if (step === 3) {
      setStep('generating')
      setTimeout(() => onDone(form), 2200)
    } else {
      setStep(s => s + 1)
    }
  }

  const canNext = {
    1: form.goal.trim().length > 3 && form.category,
    2: form.motivation.trim().length > 5,
    3: !!form.duration,
  }

  if (step === 'generating') return <GeneratingScreen />

  return (
    <div className="min-h-screen bg-[#F7F6F3] flex flex-col">
      {/* 进度条 */}
      <div className="px-5 pt-12 pb-2">
        <div className="flex items-center gap-2 mb-1">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="text-[#BBBBBB] text-[13px] mr-1">
              ←
            </button>
          )}
          <div className="flex-1 flex gap-1.5">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: i <= step ? '#1A1A1A' : '#E8E6E0' }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 pb-8 anim-fade-up" key={step}>

        {/* Step 1 */}
        {step === 1 && (
          <>
            <h2 className="text-[24px] font-semibold text-[#1A1A1A] mb-2 leading-snug">
              你想实现什么？
            </h2>
            <p className="text-[14px] text-[#888] mb-7">
              说清楚就好，不需要完美。
            </p>

            <textarea
              autoFocus
              value={form.goal}
              onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
              placeholder="例：在 6 个月内理解金融市场的基本逻辑"
              className="w-full bg-white border border-[#E8E6E0] rounded-2xl px-4 py-4 text-[15px] text-[#1A1A1A] placeholder-[#CCCCCC] resize-none outline-none focus:border-[#AAAAAA] transition-colors min-h-[100px] mb-6"
            />

            <p className="text-[13px] text-[#888] mb-3">这是关于</p>
            <div className="grid grid-cols-2 gap-2.5 mb-8">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setForm(f => ({ ...f, category: c.id }))}
                  className={`flex items-center gap-2.5 px-4 py-3.5 rounded-2xl border transition-all text-left ${
                    form.category === c.id
                      ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                      : 'bg-white border-[#E8E6E0] text-[#1A1A1A]'
                  }`}
                >
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-[14px] font-medium">{c.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <h2 className="text-[24px] font-semibold text-[#1A1A1A] mb-2 leading-snug">
              为什么这件事<br />对你重要？
            </h2>
            <p className="text-[14px] text-[#888] mb-2">
              花 30 秒认真想一想。
            </p>
            <p className="text-[13px] text-[#BBBBBB] mb-7">
              这会帮助我在你想放弃时，提醒你当初的原因。
            </p>

            <textarea
              autoFocus
              value={form.motivation}
              onChange={e => setForm(f => ({ ...f, motivation: e.target.value }))}
              placeholder="我想在投资上不再依赖别人，能自己判断……"
              className="w-full bg-white border border-[#E8E6E0] rounded-2xl px-4 py-4 text-[15px] text-[#1A1A1A] placeholder-[#CCCCCC] resize-none outline-none focus:border-[#AAAAAA] transition-colors min-h-[140px] mb-4"
            />

            <p className="text-[12px] text-[#BBBBBB]">
              💡 写得越真实，效果越好
            </p>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <h2 className="text-[24px] font-semibold text-[#1A1A1A] mb-2 leading-snug">
              每天能投入多少时间？
            </h2>
            <p className="text-[14px] text-[#888] mb-8">
              选择真实可持续的时间，不必好高骛远。
            </p>

            <div className="space-y-3">
              {DURATIONS.map(d => (
                <button
                  key={d.id}
                  onClick={() => setForm(f => ({ ...f, duration: d.id }))}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${
                    form.duration === d.id
                      ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                      : 'bg-white border-[#E8E6E0] text-[#1A1A1A]'
                  }`}
                >
                  <span className="text-[16px] font-medium">{d.label}</span>
                  <span className={`text-[13px] ${form.duration === d.id ? 'text-white/60' : 'text-[#888]'}`}>
                    {d.sub}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

      </div>

      {/* 底部按钮 */}
      <div className="px-5 pb-10">
        <button
          onClick={next}
          disabled={!canNext[step]}
          className="w-full bg-[#1A1A1A] text-white rounded-xl py-4 text-[15px] font-medium disabled:opacity-30 active:opacity-80 transition-opacity"
        >
          {step === 3 ? '生成我的计划' : '下一步'}
        </button>
      </div>
    </div>
  )
}

function GeneratingScreen() {
  const steps = ['分析你的目标', '拆解关键里程碑', '生成每日行动', '匹配今日内容课程']
  return (
    <div className="min-h-screen bg-[#F7F6F3] flex flex-col items-center justify-center px-8">
      <div className="text-3xl mb-8 animate-pulse">✦</div>
      <p className="text-[17px] font-medium text-[#1A1A1A] mb-8">正在为你规划第一周……</p>
      <div className="w-full space-y-3">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3 anim-fade-up" style={{ animationDelay: `${i * 350}ms` }}>
            <div className="w-4 h-4 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-[#1A1A1A] animate-ping" style={{ animationDelay: `${i * 350}ms` }} />
            </div>
            <span className="text-[14px] text-[#444]">{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
