<script setup lang="ts">
import UserMenu from '@/components/chat/UserMenu.vue'
import type { ChatSession } from '@/services/chat'

defineProps<{
  conversations: ChatSession[]
  activeThreadId?: string
  deletingThreadId?: string
  displayName: string
  roleLabel: string
  isLoading: boolean
  isBusy: boolean
}>()

defineEmits<{
  newChat: []
  selectConversation: [conversation: ChatSession]
  deleteConversation: [conversation: ChatSession]
  logout: []
}>()

function formatTime(date: Date | string = new Date()) {
  const value = typeof date === 'string' ? new Date(date) : date
  return value.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatConversationTime(date: string) {
  const value = new Date(date)
  const today = new Date()

  if (value.toDateString() === today.toDateString()) {
    return formatTime(value)
  }

  return value.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}
</script>

<template>
  <aside class="sidebar" aria-label="侧边栏">
    <div class="sidebar__header">
      <img class="sidebar__logo" src="/logo.svg" alt="myAgent" width="26" height="26" />
      <h1>myAgent</h1>
      <span class="sidebar__badge">Beta</span>
    </div>

    <button class="new-chat-btn" type="button" :disabled="isBusy" @click="$emit('newChat')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span class="toolbar__new-text">新对话</span>
    </button>

    <section class="chat-sidebar" aria-label="历史对话">
      <div class="history-heading">
        <span>历史对话</span>
        <span v-if="conversations.length" class="history-heading__count">
          {{ conversations.length }}
        </span>
      </div>

      <div v-if="isLoading" class="chat-sidebar__loading">正在加载…</div>
      <div v-else class="conversation-list workspace-scroll">
        <div
          v-for="conversation in conversations"
          :key="conversation.thread_id"
          class="conversation-row"
          :class="{
            'conversation-row--active': conversation.thread_id === activeThreadId,
            'conversation-row--deleting': conversation.thread_id === deletingThreadId,
          }"
        >
          <button
            class="conversation"
            type="button"
            :disabled="isBusy || Boolean(deletingThreadId)"
            @click="$emit('selectConversation', conversation)"
          >
            <span class="conversation__avatar" aria-hidden="true">
              <img src="/logo.svg" alt="" width="20" height="20" />
            </span>
            <span class="conversation__meta">
              <span class="conversation__name">{{ conversation.title || '新对话' }}</span>
              <span class="conversation__preview">
                更新于 {{ formatConversationTime(conversation.updated_at) }}
              </span>
            </span>
            <span
              v-if="conversation.thread_id === activeThreadId"
              class="status-dot"
              title="当前对话"
            />
          </button>
          <button
            class="conversation__delete"
            type="button"
            :aria-label="`删除对话：${conversation.title || '新对话'}`"
            title="删除历史对话"
            :disabled="isBusy || Boolean(deletingThreadId)"
            @click="$emit('deleteConversation', conversation)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
        <p v-if="!conversations.length" class="conversation-empty">暂无历史对话</p>
      </div>
    </section>

    <div class="sidebar__footer">
      <UserMenu :display-name="displayName" :role-label="roleLabel" @logout="$emit('logout')" />
    </div>
  </aside>
</template>
