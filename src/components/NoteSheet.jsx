import { useState, useEffect, useRef } from 'react'
import * as db from '../lib/db.js'

const CATEGORIES = [
  { id: 'thought',  emoji: '💡', label: '想法'   },
  { id: 'learned',  emoji: '📚', label: '学到的' },
  { id: 'done',     emoji: '✅', label: '做了什么' },
  { id: 'feeling',  emoji: '😊', label: '今日心情' },
  { id: 'todo',     emoji: '📌', label: '待办'   },
]

function catById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]
}

function relativeDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export default function NoteSheet({ userId, onClose }) {
  const [visible, setVisible]   = useState(false)
  const [text, setText]         = useState('')
  const [category, setCategory] = useState('thought')
  const [saving, setSaving]     = useState(false)
  const [notes, setNotes]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState(null) // null = all
  const textareaRef = useRef(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    loadNotes()
    setTimeout(() => textareaRef.current?.focus(), 400)
  }, [])

  async function loadNotes() {
    try {
      const data = await db.getNotes(userId)
      setNotes(data)
    } catch (err) {
      console.error('Failed to load notes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!text.trim() || saving) return
    setSaving(true)
    try {
      const note = await db.createNote(userId, text.trim(), category)
      setNotes(prev => [note, ...prev])
      setText('')
    } catch (err) {
      console.error('Failed to save note:', err)
    } finally {
      setSaving(false)
      textareaRef.current?.focus()
    }
  }

  async function deleteNote(id) {
    try {
      await db.deleteNote(id)
      setNotes(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  const filtered = filter ? notes.filter(n => n.category === filter) : notes

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
        className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-[#F7F6F3] rounded-t-3xl flex flex-col"
        style={{
          height: '90vh',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle + Header */}
        <div className="flex-shrink-0 pt-3 pb-2">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-1 bg-[#DDDDDD] rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 pb-1">
            <h2 className="text-[17px] font-semibold text-[#1A1A1A]">记事本</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-[#EBEBEB] text-[#888] text-[12px] active:opacity-60"
            >✕</button>
          </div>
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 px-5 pb-4">
          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap flex-shrink-0 transition-colors ${
                  category === cat.id
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white border border-[#E8E6E0] text-[#888]'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Textarea + send */}
          <div className="bg-white rounded-2xl border border-[#E8E6E0] overflow-hidden">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  save()
                }
              }}
              placeholder={`记录一个${catById(category).label}…`}
              rows={3}
              className="w-full px-4 pt-3 pb-2 text-[14px] text-[#1A1A1A] placeholder:text-[#BBBBBB] resize-none outline-none leading-relaxed bg-transparent"
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-[11px] text-[#BBBBBB]">
                {catById(category).emoji} {catById(category).label}
              </span>
              <button
                onClick={save}
                disabled={!text.trim() || saving}
                className="bg-[#1A1A1A] text-white text-[12px] font-medium px-4 py-1.5 rounded-full disabled:opacity-30 active:opacity-70 transition-opacity"
              >
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex-shrink-0 px-5 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setFilter(null)}
              className={`text-[12px] px-3 py-1 rounded-full flex-shrink-0 transition-colors ${
                filter === null ? 'bg-[#1A1A1A] text-white' : 'text-[#888]'
              }`}
            >
              全部
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(filter === cat.id ? null : cat.id)}
                className={`text-[12px] px-3 py-1 rounded-full flex-shrink-0 transition-colors ${
                  filter === cat.id ? 'bg-[#1A1A1A] text-white' : 'text-[#888]'
                }`}
              >
                {cat.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {loading ? (
            <div className="space-y-2 mt-2">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-2xl h-16 animate-pulse border border-[#E8E6E0]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center pt-8">
              <p className="text-[13px] text-[#BBBBBB]">还没有记录，写下第一条吧 ✍️</p>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {filtered.map(note => {
                const cat = catById(note.category)
                return (
                  <div key={note.id} className="bg-white rounded-2xl border border-[#E8E6E0] px-4 py-3 group">
                    <div className="flex items-start gap-2">
                      <span className="text-base mt-0.5 flex-shrink-0">{cat.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>
                        <p className="text-[11px] text-[#BBBBBB] mt-1.5">{relativeDate(note.created_at)}</p>
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 active:opacity-100 w-6 h-6 flex items-center justify-center text-[#CCCCCC] active:text-[#888] transition-opacity flex-shrink-0 mt-0.5"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
