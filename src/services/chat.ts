import { requestJson, requestStream } from './api'

export type ChatResponse = {
  reply: string
  thread_id: string
  tool_calls: Array<Record<string, unknown>>
  history_saved: boolean
}

export type ChatSession = {
  id: string
  user_id: string
  thread_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export type ChatHistoryMessage = {
  id: number
  session_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_calls: Array<Record<string, unknown>>
  created_at: string
}

export type ChatStreamEvent =
  | { type: 'token'; content: string }
  | {
      type: 'done'
      reply: string
      thread_id: string
      tool_calls: Array<Record<string, unknown>>
      history_saved: boolean
    }
  | { type: 'error'; message: string }

export function sendChatMessage(message: string, threadId?: string) {
  return requestJson<ChatResponse>('/chat', {
    method: 'POST',
    body: {
      message,
      ...(threadId ? { thread_id: threadId } : {}),
    },
  })
}

export async function* streamChatMessage(message: string, threadId?: string) {
  const stream = await requestStream('/chat/stream', {
    method: 'POST',
    body: {
      message,
      ...(threadId ? { thread_id: threadId } : {}),
    },
  })
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.trim()) {
          yield JSON.parse(line) as ChatStreamEvent
        }
      }

      if (done) {
        break
      }
    }

    if (buffer.trim()) {
      yield JSON.parse(buffer) as ChatStreamEvent
    }
  } finally {
    reader.releaseLock()
  }
}

export function listChatSessions() {
  return requestJson<{ items: ChatSession[]; total: number }>('/chat/sessions')
}

export function listChatMessages(threadId: string) {
  return requestJson<{ session: ChatSession; items: ChatHistoryMessage[]; total: number }>(
    `/chat/sessions/${encodeURIComponent(threadId)}/messages`,
  )
}
