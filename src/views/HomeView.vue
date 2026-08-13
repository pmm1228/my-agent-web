<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import ChatComposer from '@/components/chat/ChatComposer.vue'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import MessageList from '@/components/chat/MessageList.vue'
import { confirmAction } from '@/components/common/confirm/confirm'
import { useChatSessions } from '@/composables/useChatSessions'
import { useChatStream } from '@/composables/useChatStream'
import type { ChatSession } from '@/services/chat'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const chatSessions = useChatSessions()
const chatStream = useChatStream({
  currentThreadId: chatSessions.currentThreadId,
  onCompleted: chatSessions.loadConversations,
})

const suggestedPrompts = [
  '帮我解释一下大模型是怎么工作的',
  '查询北京今天的天气',
  '制定一份 3 天 2 晚的杭州旅行计划',
]

const isBusy = computed(
  () =>
    chatStream.isSending.value ||
    chatSessions.isLoadingConversation.value ||
    Boolean(chatSessions.deletingThreadId.value),
)
const errorMessage = computed(
  () => chatStream.errorMessage.value || chatSessions.errorMessage.value,
)
const currentConversationTitle = computed(() => {
  const current = chatSessions.conversations.value.find(
    (conversation) => conversation.thread_id === chatSessions.currentThreadId.value,
  )
  return current?.title || 'myAgent'
})

async function handleOpenConversation(conversation: ChatSession) {
  if (chatStream.isSending.value) {
    return
  }

  chatStream.clearError()
  const history = await chatSessions.openConversation(conversation)

  if (history) {
    chatStream.replaceWithHistory(history)
  }
}

async function handleDeleteConversation(conversation: ChatSession) {
  if (isBusy.value) {
    return
  }

  const confirmed = await confirmAction({
    title: '删除历史对话',
    message: `确定删除“${conversation.title || '新对话'}”吗？删除后无法恢复。`,
    type: 'danger',
    confirmText: '删除',
  })

  if (!confirmed) {
    return
  }

  chatStream.clearError()
  const wasActive = chatSessions.currentThreadId.value === conversation.thread_id
  const deleted = await chatSessions.removeConversation(conversation)

  if (deleted && wasActive) {
    chatStream.resetChat()
  }
}

async function handleSend(message?: string) {
  chatSessions.clearError()
  await chatStream.sendMessage(message)
}

function startNewChat() {
  if (isBusy.value) {
    return
  }

  chatSessions.startNewSession()
  chatStream.resetChat()
}

async function handleLogout() {
  authStore.logout()
  await router.replace({ name: 'login' })
}

onMounted(() => {
  void chatSessions.loadConversations()
})
</script>

<template>
  <main class="workspace" aria-label="myAgent chat">
    <div class="app-shell">
      <ChatSidebar
        :conversations="chatSessions.conversations.value"
        :active-thread-id="chatSessions.currentThreadId.value"
        :deleting-thread-id="chatSessions.deletingThreadId.value"
        :display-name="authStore.displayName"
        :role-label="authStore.roleLabel"
        :is-loading="chatSessions.isLoadingConversations.value"
        :is-busy="isBusy"
        @new-chat="startNewChat"
        @select-conversation="handleOpenConversation"
        @delete-conversation="handleDeleteConversation"
        @logout="handleLogout"
      />

      <section class="main">
        <header class="toolbar">
          <div class="toolbar__title">
            <span class="toolbar__name">{{ currentConversationTitle }}</span>
            <span class="toolbar__status toolbar__status--online">在线</span>
          </div>
          <div class="toolbar__spacer" />
          <button class="toolbar__new" type="button" :disabled="isBusy" @click="startNewChat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            <span class="toolbar__new-text">新对话</span>
          </button>
        </header>

        <MessageList
          :messages="chatStream.messages.value"
          :suggested-prompts="suggestedPrompts"
          :is-loading="chatSessions.isLoadingConversation.value"
          :is-sending="chatStream.isSending.value"
          @select-prompt="handleSend"
        />

        <ChatComposer
          v-model="chatStream.draft.value"
          :error-message="errorMessage"
          :is-sending="chatStream.isSending.value"
          @submit="handleSend()"
        />
      </section>
    </div>
  </main>
</template>

<style src="../styles/chat.css"></style>
