import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false) // email confirmation sent

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { name: form.name },
          },
        })
        if (error) throw error
        setSent(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        // onAuthStateChange in App.jsx will handle the session
      }
    } catch (err) {
      setError(err.message || '出了点问题，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center px-5">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-[#E8E6E0] px-8 py-10 text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-[20px] font-semibold text-[#1A1A1A] mb-2">确认你的邮箱</h2>
          <p className="text-[14px] text-[#888] leading-relaxed">
            我们发送了一封确认邮件到<br />
            <span className="text-[#1A1A1A] font-medium">{form.email}</span><br />
            点击邮件中的链接后即可登录。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center px-5">
      <div className="max-w-sm w-full">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="text-[32px] mb-2">✦</div>
          <h1 className="text-[24px] font-semibold text-[#1A1A1A]">Claw</h1>
          <p className="text-[14px] text-[#888] mt-1">
            {mode === 'login' ? '登录继续你的目标' : '创建账号，开始行动'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-[#E8E6E0] px-6 py-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-[12px] font-medium text-[#888] mb-1.5">你的名字</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="怎么称呼你？"
                  required
                  className="w-full border border-[#E8E6E0] rounded-xl px-4 py-3 text-[14px] text-[#1A1A1A] outline-none focus:border-[#1A1A1A] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium text-[#888] mb-1.5">邮箱</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
                required
                className="w-full border border-[#E8E6E0] rounded-xl px-4 py-3 text-[14px] text-[#1A1A1A] outline-none focus:border-[#1A1A1A] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#888] mb-1.5">密码</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={mode === 'signup' ? '至少 6 位' : '••••••••'}
                required
                minLength={6}
                className="w-full border border-[#E8E6E0] rounded-xl px-4 py-3 text-[14px] text-[#1A1A1A] outline-none focus:border-[#1A1A1A] transition-colors"
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-500 leading-relaxed">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1A1A1A] text-white rounded-xl py-3.5 text-[15px] font-medium mt-2 active:opacity-80 disabled:opacity-40 transition-opacity"
            >
              {loading ? '...' : mode === 'login' ? '登录' : '创建账号'}
            </button>
          </form>
        </div>

        {/* Toggle mode */}
        <p className="text-center text-[13px] text-[#888] mt-5">
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          {' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            className="text-[#1A1A1A] font-medium underline active:opacity-60"
          >
            {mode === 'login' ? '注册' : '登录'}
          </button>
        </p>
      </div>
    </div>
  )
}
