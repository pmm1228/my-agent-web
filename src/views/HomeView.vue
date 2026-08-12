<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { confirmAction } from '@/components/common/confirm/confirm'
import { ApiError } from '@/services/api'
import {
  deleteChatSession,
  listChatMessages,
  listChatSessions,
  streamChatMessage,
  type ChatSession,
} from '@/services/chat'
import { useAuthStore } from '@/stores/auth'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  time: string
  status?: 'typing'
}

const router = useRouter()
const authStore = useAuthStore()
const draft = ref('')
const messages = ref<ChatMessage[]>([])
const threadId = ref<string>()
const isSending = ref(false)
const errorMessage = ref('')
const messagesContainer = ref<HTMLElement>()
const conversations = ref<ChatSession[]>([])
const isLoadingConversations = ref(false)
const deletingThreadId = ref<string>()
let nextMessageId = 1

const quickPrompts = ['介绍一下 myAgent', '数据库怎么用']

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

function appendMessage(message: Omit<ChatMessage, 'id' | 'time'>) {
  const nextMessage: ChatMessage = {
    id: nextMessageId++,
    time: formatTime(),
    ...message,
  }
  messages.value.push(nextMessage)
  return nextMessage
}

async function scrollToLatestMessage() {
  await nextTick()
  messagesContainer.value?.scrollTo({
    top: messagesContainer.value.scrollHeight,
    behavior: 'smooth',
  })
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

async function loadConversations() {
  isLoadingConversations.value = true

  try {
    conversations.value = (await listChatSessions()).items
  } catch (error) {
    errorMessage.value = toErrorMessage(error)
  } finally {
    isLoadingConversations.value = false
  }
}

async function openConversation(conversation: ChatSession) {
  if (isSending.value || deletingThreadId.value || conversation.thread_id === threadId.value) {
    return
  }

  errorMessage.value = ''

  try {
    const response = await listChatMessages(conversation.thread_id)
    threadId.value = conversation.thread_id
    messages.value = response.items
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        id: message.id,
        role: message.role as ChatMessage['role'],
        content: message.content,
        time: formatTime(message.created_at),
      }))
    nextMessageId = Math.max(nextMessageId, ...messages.value.map((message) => message.id + 1))
    await scrollToLatestMessage()
  } catch (error) {
    errorMessage.value = toErrorMessage(error)
  }
}

async function handleDeleteConversation(conversation: ChatSession) {
  if (isSending.value || deletingThreadId.value) {
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

  errorMessage.value = ''
  deletingThreadId.value = conversation.thread_id
  try {
    await deleteChatSession(conversation.thread_id)
    conversations.value = conversations.value.filter(
      (item) => item.thread_id !== conversation.thread_id,
    )
    if (threadId.value === conversation.thread_id) {
      startNewChat()
    }
  } catch (error) {
    errorMessage.value = toErrorMessage(error)
  } finally {
    deletingThreadId.value = undefined
  }
}

async function handleSend(message = draft.value) {
  const content = message.trim()

  if (!content || isSending.value) {
    return
  }

  draft.value = ''
  errorMessage.value = ''
  isSending.value = true
  appendMessage({ role: 'user', content })
  const typingMessage = appendMessage({ role: 'assistant', content: '', status: 'typing' })
  await scrollToLatestMessage()

  try {
    let completed = false

    for await (const event of streamChatMessage(content, threadId.value)) {
      if (event.type === 'token') {
        typingMessage.status = undefined
        typingMessage.content += event.content
        await scrollToLatestMessage()
      } else if (event.type === 'done') {
        threadId.value = event.thread_id
        if (!typingMessage.content) {
          typingMessage.content = event.reply
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
    await loadConversations()
  } catch (error) {
    if (!typingMessage.content) {
      messages.value = messages.value.filter((message) => message.id !== typingMessage.id)
    } else {
      typingMessage.status = undefined
    }
    errorMessage.value = toErrorMessage(error)
  } finally {
    isSending.value = false
    await scrollToLatestMessage()
  }
}

function startNewChat() {
  if (isSending.value) {
    return
  }

  messages.value = []
  threadId.value = undefined
  errorMessage.value = ''
  draft.value = ''
}

onMounted(() => {
  void loadConversations()
})

async function handleLogout() {
  authStore.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <main class="workspace" aria-label="myAgent chat">
    <div class="app-shell">
      <aside class="sidebar" aria-label="侧边栏">
        <div class="sidebar__header">
          <img class="sidebar__logo" src="/logo.svg" alt="myAgent" width="26" height="26" />
          <h1>myAgent</h1>
          <span class="sidebar__badge">Beta</span>
        </div>

        <button class="new-chat-btn" type="button" :disabled="isSending" @click="startNewChat">
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

        <section class="chat-sidebar" aria-label="历史对话">
          <div class="history-heading">
            <span>历史对话</span>
            <span v-if="conversations.length" class="history-heading__count">{{
              conversations.length
            }}</span>
          </div>

          <div v-if="isLoadingConversations" class="chat-sidebar__loading">正在加载…</div>
          <div v-else class="conversation-list workspace-scroll">
            <div
              v-for="conversation in conversations"
              :key="conversation.thread_id"
              class="conversation-row"
              :class="{
                'conversation-row--active': conversation.thread_id === threadId,
                'conversation-row--deleting': conversation.thread_id === deletingThreadId,
              }"
            >
              <button
                class="conversation"
                type="button"
                :disabled="isSending || Boolean(deletingThreadId)"
                @click="openConversation(conversation)"
              >
                <span class="conversation__avatar" aria-hidden="true">
                  <img src="/logo.svg" alt="" width="20" height="20" />
                </span>
                <span class="conversation__meta">
                  <span class="conversation__name">{{ conversation.title || '新对话' }}</span>
                  <span class="conversation__preview"
                    >更新于 {{ formatConversationTime(conversation.updated_at) }}</span
                  >
                </span>
                <span
                  v-if="conversation.thread_id === threadId"
                  class="status-dot"
                  title="当前对话"
                />
              </button>
              <button
                class="conversation__delete"
                type="button"
                :aria-label="`删除对话：${conversation.title || '新对话'}`"
                title="删除历史对话"
                :disabled="isSending || Boolean(deletingThreadId)"
                @click="handleDeleteConversation(conversation)"
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
          <div class="user-card">
            <div class="user-card__avatar">
              {{ authStore.displayName.slice(0, 1).toUpperCase() || 'U' }}
            </div>
            <div class="user-card__meta">
              <span class="user-card__name">{{ authStore.displayName || '用户' }}</span>
              <span class="user-card__status">{{ authStore.roleLabel || '在线' }}</span>
            </div>
            <button class="logout-btn" type="button" aria-label="退出登录" @click="handleLogout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M15 17l5-5-5-5M20 12H9M11 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <section class="main">
        <header class="toolbar">
          <div class="toolbar__title">
            <span class="toolbar__name">myAgent</span>
            <span class="toolbar__status toolbar__status--online">在线</span>
          </div>
          <div class="toolbar__spacer" />
          <button class="toolbar__new" type="button" :disabled="isSending" @click="startNewChat">
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

        <div ref="messagesContainer" class="messages workspace-scroll">
          <div class="messages__inner">
            <div class="day-divider">
              <span>今天</span>
            </div>

            <article
              v-for="message in messages"
              :key="message.id"
              class="msg"
              :class="`msg--${message.role}`"
            >
              <div v-if="message.role === 'assistant'" class="msg__avatar">
                <img src="/logo.svg" alt="" width="16" height="16" aria-hidden="true" />
              </div>

              <div class="msg__body">
                <span v-if="message.role === 'assistant'" class="msg__sender">myAgent</span>
                <div
                  v-if="message.status === 'typing'"
                  class="msg__bubble msg__bubble--typing"
                  aria-label="正在输入"
                >
                  <span />
                  <span />
                  <span />
                </div>
                <div v-else class="msg__bubble msg__bubble--plain">{{ message.content }}</div>
                <time class="msg__time">{{ message.time }}</time>
              </div>
            </article>
          </div>
        </div>

        <footer class="composer">
          <div class="chips" aria-label="快捷提示">
            <button
              v-for="prompt in quickPrompts"
              :key="prompt"
              class="chip"
              type="button"
              :disabled="isSending"
              @click="handleSend(prompt)"
            >
              {{ prompt }}
            </button>
          </div>

          <p v-if="errorMessage" class="chat-error" role="alert">{{ errorMessage }}</p>

          <div class="composer__box">
            <textarea
              v-model="draft"
              class="composer__input"
              placeholder="给 myAgent 发消息…"
              rows="1"
              :disabled="isSending"
              @keydown.enter.exact.prevent="handleSend()"
            />
            <button
              class="composer__send"
              type="button"
              aria-label="发送消息"
              :disabled="!draft.trim() || isSending"
              @click="handleSend()"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 19V5M5 12l7-7 7 7"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </footer>
      </section>
    </div>
  </main>
</template>

<style scoped>
.workspace {
  --chat-bg: var(--color-page-background);
  --chat-sidebar: var(--color-surface-glass);
  --chat-panel: var(--color-surface-panel);
  --chat-text: var(--color-text);
  --chat-sub: var(--color-text-secondary);
  --chat-muted: var(--color-text-muted);
  --chat-line: var(--color-border);
  --chat-blue: var(--color-primary);
  --chat-blue-soft: var(--color-primary-soft);
  --chat-agent-bubble: var(--color-agent-bubble);
  --chat-green: var(--color-success);
  --chat-shadow: var(--shadow-panel);
  --chat-shell-width: min(100%, 980px);
  --chat-shell-height: min(100%, 700px);
  --chat-sidebar-width: 260px;
  --chat-toolbar-height: 54px;

  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: var(--page-padding);
  background:
    linear-gradient(135deg, rgba(116, 159, 255, 0.2), transparent 36%),
    linear-gradient(315deg, rgba(255, 159, 120, 0.2), transparent 40%), var(--chat-bg);
  color: var(--chat-text);
  font-family: var(--font-family-system);
  -webkit-font-smoothing: antialiased;
}

.workspace button,
.workspace textarea {
  font-family: inherit;
}

.workspace button {
  min-height: 0;
  -webkit-tap-highlight-color: transparent;
}

.app-shell {
  position: relative;
  z-index: 1;
  width: var(--chat-shell-width);
  height: var(--chat-shell-height);
  min-height: 0;
  display: grid;
  grid-template-columns: var(--chat-sidebar-width) 1fr;
  overflow: hidden;
  border: 0.5px solid rgba(255, 255, 255, 0.72);
  border-radius: var(--radius-panel);
  background: rgba(255, 255, 255, 0.32);
  box-shadow: var(--chat-shadow);
  backdrop-filter: blur(48px) saturate(190%);
  -webkit-backdrop-filter: blur(48px) saturate(190%);
}

.sidebar {
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 0.5px solid var(--chat-line);
  background: var(--chat-sidebar);
}

.sidebar__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  padding: 22px 18px var(--space-2);
}

.sidebar__logo {
  display: block;
  flex-shrink: 0;
  object-fit: contain;
}

.sidebar__header h1 {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--chat-text);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__badge {
  min-height: 0;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 3px var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--chat-blue-soft);
  color: var(--chat-blue);
  font-size: var(--font-size-xs);
  font-weight: 600;
  line-height: 1.35;
}

.new-chat-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 0;
  margin: 0 14px var(--space-3);
  padding: 10px 14px;
  border: 0.5px solid rgba(0, 122, 255, 0.18);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.72);
  color: var(--chat-blue);
  font-size: var(--font-size-body);
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
  box-shadow: 0 2px 10px rgba(0, 122, 255, 0.08);
}

.new-chat-btn:hover {
  background: var(--chat-blue-soft);
  box-shadow: 0 4px 14px rgba(0, 122, 255, 0.12);
}

.new-chat-btn:active {
  transform: scale(0.98);
}

.chat-sidebar {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-1) 18px var(--space-2);
  color: var(--chat-muted);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.history-heading__count {
  min-width: 18px;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: rgba(0, 122, 255, 0.1);
  color: var(--chat-blue);
  text-align: center;
}

.chat-sidebar__loading {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--chat-muted);
  font-size: var(--font-size-caption);
}

.conversation-list {
  flex: 1;
  min-height: 0;
  padding: 0 0 var(--space-2);
}

.conversation-row {
  display: flex;
  align-items: center;
  width: calc(100% - 20px);
  min-width: 0;
  margin: 0 10px var(--space-1);
  border-radius: var(--radius-md);
  transition: background 0.15s ease;
}

.conversation-row:hover,
.conversation-row--active {
  background: rgba(0, 122, 255, 0.1);
}

.conversation-row--deleting {
  opacity: 0.55;
}

.conversation {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 10px 6px 10px 12px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--chat-sub);
  text-align: left;
  cursor: pointer;
}

.conversation__delete {
  width: 28px;
  height: 28px;
  display: grid;
  flex-shrink: 0;
  place-items: center;
  margin-right: 6px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--chat-muted);
  cursor: pointer;
  opacity: 0;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    opacity 0.15s ease;
}

.conversation-row:hover .conversation__delete,
.conversation-row--active .conversation__delete,
.conversation__delete:focus-visible {
  opacity: 1;
}

.conversation__delete:hover:not(:disabled) {
  background: rgba(255, 59, 48, 0.12);
  color: #ff3b30;
}

.conversation__delete:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.conversation:disabled {
  cursor: wait;
}

.conversation__avatar {
  width: 40px;
  height: 40px;
  display: grid;
  flex-shrink: 0;
  place-items: center;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.conversation__meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.conversation__name,
.conversation__preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation__name {
  color: var(--chat-text);
  font-size: var(--font-size-body);
  font-weight: 600;
}

.conversation__preview {
  color: var(--chat-muted);
  font-size: var(--font-size-sm);
}

.status-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--chat-green);
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.18);
}

.conversation-empty {
  margin: var(--space-2) 10px;
  color: var(--chat-muted);
  font-size: var(--font-size-sm);
  text-align: center;
}

.sidebar__footer {
  flex-shrink: 0;
  margin-top: auto;
  padding: 14px;
  border-top: 0.5px solid var(--chat-line);
}

.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.user-card__avatar {
  width: 32px;
  height: 32px;
  display: grid;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(180deg, #0a84ff, #007aff);
  color: #fff;
  font-size: var(--font-size-caption);
  font-weight: 700;
  box-shadow: 0 3px 10px rgba(0, 122, 255, 0.24);
}

.user-card__meta {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.user-card__name {
  overflow: hidden;
  color: var(--chat-text);
  font-size: var(--font-size-caption);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-card__status {
  color: var(--chat-green);
  font-size: var(--font-size-xs);
}

.logout-btn {
  width: 32px;
  height: 32px;
  display: grid;
  flex-shrink: 0;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.64);
  color: var(--chat-sub);
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  color: var(--chat-blue);
}

.main {
  position: relative;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--chat-panel);
}

.toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  height: var(--chat-toolbar-height);
  min-height: var(--chat-toolbar-height);
  padding: 0 18px;
  border-bottom: 0.5px solid var(--chat-line);
  background: rgba(255, 255, 255, 0.5);
}

.toolbar__title {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.toolbar__name {
  overflow: hidden;
  color: var(--chat-text);
  font-size: var(--font-size-caption);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar__status {
  color: var(--chat-sub);
  font-size: var(--font-size-xs);
}

.toolbar__status--online {
  color: var(--chat-green);
}

.toolbar__spacer {
  flex: 1;
}

.toolbar__new {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 6px var(--space-3);
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--chat-blue-soft);
  color: var(--chat-blue);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
}

.toolbar__new:hover {
  background: rgba(0, 122, 255, 0.18);
}

.toolbar__new:active {
  transform: scale(0.96);
}

.toolbar__new-text {
  font-size: var(--font-size-body);
}

.messages {
  flex: 1;
  min-height: 0;
}

.messages__inner {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: var(--space-6) var(--space-7) var(--space-3);
}

.day-divider {
  display: flex;
  justify-content: center;
}

.day-divider span {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  background: rgba(0, 0, 0, 0.04);
  color: var(--chat-muted);
  font-size: var(--font-size-xs);
  font-weight: 500;
  line-height: 1.35;
}

.msg {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.msg--user {
  flex-direction: row-reverse;
}

.msg__avatar {
  width: 30px;
  height: 30px;
  display: grid;
  flex-shrink: 0;
  place-items: center;
  margin-top: 18px;
  border-radius: var(--radius-control);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.msg__body {
  max-width: min(72%, 520px);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.msg--user .msg__body {
  align-items: flex-end;
}

.msg__sender {
  padding-left: var(--space-1);
  color: var(--chat-muted);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.msg__bubble {
  padding: var(--space-3) var(--space-4);
  border-radius: 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  font-size: 15px;
  line-height: 1.55;
  word-break: break-word;
}

.msg__bubble--plain {
  white-space: pre-wrap;
}

.msg--assistant .msg__bubble {
  border-bottom-left-radius: 6px;
  background: var(--chat-agent-bubble);
  color: var(--chat-text);
}

.msg--user .msg__bubble {
  border-bottom-right-radius: 6px;
  background: linear-gradient(180deg, #0a84ff, #007aff);
  color: #fff;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.28);
}

.msg__time {
  padding: 0 var(--space-1);
  color: var(--chat-muted);
  font-size: var(--font-size-xs);
}

.msg__bubble--typing {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 14px 18px;
}

.msg__bubble--typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #b0b0b5;
  animation: pulse 1.2s ease-in-out infinite;
}

.msg__bubble--typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.msg__bubble--typing span:nth-child(3) {
  animation-delay: 0.3s;
}

.composer {
  flex-shrink: 0;
  padding: 14px var(--space-5) 18px;
  border-top: 0.5px solid var(--chat-line);
  background: rgba(255, 255, 255, 0.55);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.chat-error {
  margin: 0 0 10px;
  color: #d70015;
  font-size: var(--font-size-sm);
}

.chip {
  padding: 6px var(--space-3);
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.8);
  color: var(--chat-sub);
  font-weight: 500;
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}

.chip:hover {
  border-color: rgba(0, 122, 255, 0.25);
  background: var(--chat-blue-soft);
  color: var(--chat-blue);
}

.composer__box {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 10px 10px var(--space-4);
  border: 0.5px solid rgba(0, 0, 0, 0.1);
  border-radius: 22px;
  background: #fff;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 4px 20px rgba(0, 0, 0, 0.03);
}

.composer__input {
  flex: 1;
  min-width: 0;
  max-height: 120px;
  padding: 0;
  border: 0;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--chat-text);
  font-size: 15px;
  line-height: 1.45;
}

.composer__input::placeholder {
  color: var(--chat-muted);
}

.composer__send {
  width: 36px;
  height: 36px;
  min-height: 36px;
  display: grid;
  flex-shrink: 0;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--chat-blue);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 122, 255, 0.35);
  transition:
    transform 0.15s ease,
    opacity 0.15s ease,
    background 0.15s ease;
}

.composer__send:hover:not(:disabled) {
  background: #0077ed;
}

.composer__send:active:not(:disabled) {
  transform: scale(0.94);
}

.composer__send:disabled {
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.35;
}

.workspace-scroll {
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.workspace-scroll::-webkit-scrollbar {
  width: 5px;
}

.workspace-scroll::-webkit-scrollbar-thumb {
  border-radius: var(--radius-pill);
  background: rgba(0, 0, 0, 0.12);
}

@keyframes pulse {
  0%,
  60%,
  100% {
    opacity: 0.45;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-5px);
  }
}

@media (max-width: 768px) {
  .workspace {
    padding: 0;
  }

  .app-shell {
    width: 100%;
    height: 100%;
    grid-template-columns: 1fr;
    border-radius: 0;
  }

  .sidebar {
    display: none;
  }

  .messages__inner {
    padding: 18px var(--space-4) 10px;
  }

  .msg__body {
    max-width: 85%;
  }

  .toolbar {
    padding: 0 var(--space-4);
  }

  .toolbar__new {
    width: 34px;
    height: 34px;
    min-height: 34px;
    justify-content: center;
    padding: 0;
    border-radius: 50%;
  }

  .toolbar__new span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .composer {
    padding: var(--space-3) 14px var(--space-4);
  }
}
</style>
