import { useState } from 'react'

function ChatButton({ onClick }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className="flex items-center gap-1.5 text-[12px] text-[#BBBBBB] active:text-[#888] transition-colors"
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M11 1H2C1.45 1 1 1.45 1 2V9C1 9.55 1.45 10 2 10H4L6.5 12.5L9 10H11C11.55 10 12 9.55 12 9V2C12 1.45 11.55 1 11 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
      问 AI 教练
    </button>
  )
}

// 次要卡片（非首位）
function SecondaryCard({ task, onExpand, isExpanded, onStart, onTooHard, onChat }) {
  return (
    <div
      className="bg-white rounded-2xl border border-[#E8E6E0] overflow-hidden cursor-pointer transition-all duration-300"
      onClick={() => !isExpanded && onExpand(task.id)}
    >
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{task.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[15px] text-[#1A1A1A]">{task.title}</span>
              {task.badge && (
                <span className="text-[11px] text-[#888] border border-[#E0DED9] rounded-full px-2 py-0.5">
                  {task.badge}
                </span>
              )}
            </div>
            {task.concept && (
              <p className="text-[13px] text-[#888] mt-0.5">{task.concept}</p>
            )}
            {!task.concept && task.description && (
              <p className="text-[13px] text-[#888] mt-0.5">{task.description}</p>
            )}
          </div>
          <span className="text-[12px] text-[#BBBBBB] whitespace-nowrap ml-1">
            {task.duration}
          </span>
        </div>

        {isExpanded && (
          <div className="mt-4 anim-fade-up">
            {task.description && task.concept && (
              <p className="text-[13px] text-[#888] mb-3">{task.description}</p>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onStart(task) }}
              className="w-full bg-[#1A1A1A] text-white rounded-xl py-3 text-[14px] font-medium active:opacity-80 transition-opacity"
            >
              开始
            </button>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-4">
                <button
                  onClick={(e) => { e.stopPropagation(); onExpand(null) }}
                  className="text-[13px] text-[#BBBBBB]"
                >
                  推迟
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onTooHard(task) }}
                  className="text-[13px] text-[#BBBBBB]"
                >
                  太难了
                </button>
              </div>
              <ChatButton onClick={() => onChat(task)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 完成状态卡片（折叠沉底）
function DoneCard({ task }) {
  return (
    <div className="bg-[#F2F1EE] rounded-2xl px-5 py-3.5 flex items-center gap-3 anim-fade-in">
      <div className="w-5 h-5 rounded-full bg-[#CCCCCC] flex items-center justify-center flex-shrink-0">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-[14px] text-[#AAAAAA] line-through">{task.title}</span>
      {task.badge && (
        <span className="text-[11px] text-[#BBBBBB] ml-auto">{task.badge}</span>
      )}
    </div>
  )
}

// 首要任务大卡片
function PrimaryCard({ task, onStart, onDelay, onTooHard, onChat }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E6E0] overflow-hidden anim-scale-in">
      <div className="px-6 pt-5 pb-6">
        {/* 标签 */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[11px] font-medium text-[#888] uppercase tracking-wider">
            最重要
          </span>
        </div>

        {/* 主内容 */}
        <div className="flex items-start gap-3 mb-5">
          <span className="text-2xl mt-0.5">{task.emoji}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[20px] font-semibold text-[#1A1A1A] leading-snug">
                {task.title}
              </h2>
              {task.badge && (
                <span className="text-[11px] text-[#888] border border-[#E0DED9] rounded-full px-2 py-0.5">
                  {task.badge}
                </span>
              )}
            </div>
            {task.concept && (
              <p className="text-[15px] text-[#444] mt-1.5 leading-relaxed">{task.concept}</p>
            )}
            <p className="text-[13px] text-[#888] mt-1">{task.description}</p>
          </div>
        </div>

        {/* 时长 */}
        <div className="flex items-center gap-1.5 mb-5">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="#BBBBBB" strokeWidth="1.2"/>
            <path d="M6.5 3.5V6.5L8.5 8" stroke="#BBBBBB" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="text-[12px] text-[#BBBBBB]">预计 {task.duration}</span>
        </div>

        {/* 操作按钮 */}
        <button
          onClick={() => onStart(task)}
          className="w-full bg-[#1A1A1A] text-white rounded-xl py-3.5 text-[15px] font-medium active:opacity-80 transition-opacity"
        >
          开始
        </button>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-5">
            <button onClick={() => onDelay(task)} className="text-[13px] text-[#BBBBBB]">
              推迟 30 分钟
            </button>
            <button onClick={() => onTooHard(task)} className="text-[13px] text-[#BBBBBB]">
              太难了
            </button>
          </div>
          <ChatButton onClick={() => onChat(task)} />
        </div>
      </div>
    </div>
  )
}

export { PrimaryCard, SecondaryCard, DoneCard }
