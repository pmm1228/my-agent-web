import { ref, type Ref } from 'vue'

import { confirmAction } from '@/components/common/confirm/confirm'
import { ApiError } from '@/services/api'
import {
  confirmWebAccess,
  streamChatMessage,
  type ChatHistoryMessage,
  type ChatResponse,
  type WebConfirmation,
  type WebToolCall,
} from '@/services/chat'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  status?: 'typing'
}

type UseChatStreamOptions = {
  currentThreadId: Ref<string | undefined>
  onCompleted?: () => Promise<void> | void
}

const webToolLabels: Record<string, string> = {
  search_web: '搜索互联网',
  fetch_webpage: '读取网页内容',
  get_weather: '查询实时天气',
  get_typhoon: '查询台风信息',
}

function toErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return '登录已失效，请重新登录'
  }

  if (error instanceof Error) {
    return error.message
  }

  return '发送失败，请稍后重试'
}

function formatToolCall(toolCall: WebToolCall) {
  const label = webToolLabels[toolCall.name] || toolCall.name
  const details = Object.values(toolCall.args)
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .map(String)
    .filter(Boolean)
    .join('，')

  return details ? `${label}：${details}` : label
}

async function requestWebConfirmation(confirmation: WebConfirmation) {
  const toolSummary = confirmation.tool_calls.map(formatToolCall).join('\n')
  return confirmAction({
    title: '允许访问互联网？',
    message: toolSummary ? `${confirmation.message}\n\n${toolSummary}` : confirmation.message,
    type: 'warning',
    confirmText: '允许',
    cancelText: '不允许',
  })
}

async function resolveConfirmations(result: ChatResponse): Promise<ChatResponse> {
  let current = result

  while (current.status === 'requires_confirmation' && current.confirmation) {
    const approved = await requestWebConfirmation(current.confirmation)
    current = await confirmWebAccess(current.thread_id, approved)
  }

  if (current.status !== 'completed') {
    throw new Error('联网确认状态异常，请重新发送消息')
  }

  return current
}

export function useChatStream({ currentThreadId, onCompleted }: UseChatStreamOptions) {
  const draft = ref('')
  const messages = ref<ChatMessage[]>([])
  const isSending = ref(false)
  const errorMessage = ref('')
  let nextMessageId = 1

  function appendMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>) {
    const nextMessage: ChatMessage = {
      id: nextMessageId++,
      createdAt: new Date().toISOString(),
      ...message,
    }
    messages.value.push(nextMessage)
    return nextMessage
  }

  function replaceWithHistory(history: ChatHistoryMessage[]) {
    messages.value = history
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        id: message.id,
        role: message.role as ChatMessage['role'],
        content: message.content,
        createdAt: message.created_at,
      }))
    nextMessageId = Math.max(1, ...messages.value.map((message) => message.id + 1))
    errorMessage.value = ''
  }

  async function sendMessage(message = draft.value) {
    const content = message.trim()

    if (!content || isSending.value) {
      return
    }

    draft.value = ''
    errorMessage.value = ''
    isSending.value = true
    appendMessage({ role: 'user', content })
    const typingMessage = appendMessage({ role: 'assistant', content: '', status: 'typing' })

    try {
      let completed = false

      for await (const event of streamChatMessage(content, currentThreadId.value)) {
        if (event.type === 'token') {
          typingMessage.status = undefined
          typingMessage.content += event.content
        } else if (event.type === 'done') {
          currentThreadId.value = event.thread_id
          if (!typingMessage.content) {
            typingMessage.content = event.reply
          }
          completed = true
        } else if (event.type === 'confirmation') {
          currentThreadId.value = event.thread_id
          const result = await resolveConfirmations(event)
          currentThreadId.value = result.thread_id
          if (result.reply) {
            typingMessage.content = result.reply
          }
          completed = true
        } else {
          throw new Error(event.message)
        }
      }

      if (!completed) {
        throw new Error('后端未完成本次回复')
      }

      typingMessage.status = undefined
      await onCompleted?.()
    } catch (error) {
      if (!typingMessage.content) {
        messages.value = messages.value.filter((item) => item.id !== typingMessage.id)
      } else {
        typingMessage.status = undefined
      }
      errorMessage.value = toErrorMessage(error)
    } finally {
      isSending.value = false
    }
  }

  function resetChat() {
    messages.value = []
    draft.value = ''
    errorMessage.value = ''
    nextMessageId = 1
  }

  function clearError() {
    errorMessage.value = ''
  }

  return {
    draft,
    messages,
    isSending,
    errorMessage,
    sendMessage,
    replaceWithHistory,
    resetChat,
    clearError,
  }
}
