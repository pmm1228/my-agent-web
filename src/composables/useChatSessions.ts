import { ref } from 'vue'

import { ApiError } from '@/services/api'
import {
  deleteChatSession,
  listChatMessages,
  listChatSessions,
  type ChatHistoryMessage,
  type ChatSession,
} from '@/services/chat'

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status === 401) {
    return '登录已失效，请重新登录'
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export function useChatSessions() {
  const conversations = ref<ChatSession[]>([])
  const currentThreadId = ref<string>()
  const isLoadingConversations = ref(false)
  const isLoadingConversation = ref(false)
  const deletingThreadId = ref<string>()
  const errorMessage = ref('')
  let openRequestId = 0

  async function loadConversations() {
    isLoadingConversations.value = true

    try {
      conversations.value = (await listChatSessions()).items
    } catch (error) {
      errorMessage.value = toErrorMessage(error, '历史对话加载失败，请稍后重试')
    } finally {
      isLoadingConversations.value = false
    }
  }

  async function openConversation(conversation: ChatSession): Promise<ChatHistoryMessage[] | null> {
    if (
      deletingThreadId.value ||
      isLoadingConversation.value ||
      conversation.thread_id === currentThreadId.value
    ) {
      return null
    }

    const requestId = ++openRequestId
    errorMessage.value = ''
    isLoadingConversation.value = true

    try {
      const response = await listChatMessages(conversation.thread_id)

      if (requestId !== openRequestId) {
        return null
      }

      currentThreadId.value = conversation.thread_id
      return response.items
    } catch (error) {
      if (requestId === openRequestId) {
        errorMessage.value = toErrorMessage(error, '对话加载失败，请稍后重试')
      }
      return null
    } finally {
      if (requestId === openRequestId) {
        isLoadingConversation.value = false
      }
    }
  }

  async function removeConversation(conversation: ChatSession) {
    if (deletingThreadId.value) {
      return false
    }

    errorMessage.value = ''
    deletingThreadId.value = conversation.thread_id

    try {
      await deleteChatSession(conversation.thread_id)
      conversations.value = conversations.value.filter(
        (item) => item.thread_id !== conversation.thread_id,
      )

      if (currentThreadId.value === conversation.thread_id) {
        startNewSession()
      }

      return true
    } catch (error) {
      errorMessage.value = toErrorMessage(error, '删除对话失败，请稍后重试')
      return false
    } finally {
      deletingThreadId.value = undefined
    }
  }

  function startNewSession() {
    openRequestId += 1
    currentThreadId.value = undefined
    isLoadingConversation.value = false
    errorMessage.value = ''
  }

  function clearError() {
    errorMessage.value = ''
  }

  return {
    conversations,
    currentThreadId,
    isLoadingConversations,
    isLoadingConversation,
    deletingThreadId,
    errorMessage,
    loadConversations,
    openConversation,
    removeConversation,
    startNewSession,
    clearError,
  }
}
