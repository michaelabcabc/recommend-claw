import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

/**
 * 流式对话，每次 token 回调 onDelta，结束回调 onDone
 * @param {object} params
 * @param {Array}  params.messages   - Anthropic.MessageParam[]
 * @param {string} params.systemPrompt
 * @param {function} params.onDelta  - (text: string) => void
 * @param {function} params.onDone   - () => void
 * @param {function} params.onError  - (err: Error) => void
 */
export async function streamChat({ messages, systemPrompt, onDelta, onDone, onError }) {
  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        onDelta(event.delta.text)
      }
    }

    onDone()
  } catch (err) {
    onError?.(err)
  }
}

/**
 * 根据目标和任务，构建给 Claude 的 system prompt
 */
export function buildSystemPrompt({ goal, motivation, task }) {
  const taskTypeDesc = task.type === 'content'
    ? `这是一个【学习内容任务】，内容是：${task.concept || task.title}`
    : `这是一个【执行行动任务】`

  return `你是一个目标执行教练，正在帮助用户完成一个具体任务。

用户的目标：${goal}
用户设定这个目标的原因：${motivation}
当前任务：${task.title}
${taskTypeDesc}

你的回复风格：
- 简短有力，每次不超过 120 字
- 绝不批评用户，只给建议和鼓励
- 帮助用户感受到完成这件事的意义和价值
- 用中文回复
- 如果用户说"太难了"或"不想做"，帮他找到更小的切入点
- 如果用户问概念，用最简单的比喻解释`
}
