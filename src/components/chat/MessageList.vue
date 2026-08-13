<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

import type { ChatMessage } from '@/composables/useChatStream'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  messages: ChatMessage[]
  suggestedPrompts: string[]
  isLoading: boolean
  isSending: boolean
}>()

defineEmits<{
  selectPrompt: [prompt: string]
}>()

const messagesContainer = ref<HTMLElement>()

function toDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function getDateKey(value: string) {
  const date = toDate(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatDayLabel(value: string) {
  const date = toDate(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (getDateKey(value) === getDateKey(today.toISOString())) {
    return '今天'
  }

  if (getDateKey(value) === getDateKey(yesterday.toISOString())) {
    return '昨天'
  }

  if (date.getFullYear() === today.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function formatMessageTime(value: string) {
  return toDate(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function shouldShowDayDivider(index: number) {
  if (index === 0) {
    return true
  }

  const currentMessage = props.messages[index]
  const previousMessage = props.messages[index - 1]

  if (!currentMessage || !previousMessage) {
    return false
  }

  return getDateKey(currentMessage.createdAt) !== getDateKey(previousMessage.createdAt)
}

async function scrollToLatestMessage() {
  await nextTick()
  messagesContainer.value?.scrollTo({
    top: messagesContainer.value.scrollHeight,
    behavior: 'smooth',
  })
}

watch(
  () =>
    props.messages.map((message) => `${message.id}:${message.status}:${message.content}`).join('|'),
  () => void scrollToLatestMessage(),
  { flush: 'post' },
)
</script>

<template>
  <div
    ref="messagesContainer"
    class="messages workspace-scroll"
    :aria-busy="isLoading"
    aria-label="对话内容"
  >
    <div v-if="isLoading" class="message-loading" role="status">正在加载对话…</div>

    <section v-else-if="!messages.length" class="welcome" aria-labelledby="welcome-title">
      <div class="welcome__brand" aria-hidden="true">
        <img src="/logo.svg" alt="" width="34" height="34" />
      </div>
      <p class="welcome__eyebrow">MYAGENT 智能助手</p>
      <h2 id="welcome-title" class="welcome__title">你好，我是 myAgent</h2>
      <p class="welcome__description">
        基于大模型的智能助手，可以陪你对话、查询天气，也能根据目的地和偏好制定旅游计划。
      </p>

      <div class="capability-grid" aria-label="能力说明">
        <article class="capability-card">
          <span class="capability-card__index">01</span>
          <h3>大模型对话</h3>
          <p>知识问答、内容创作与思路梳理</p>
        </article>
        <article class="capability-card">
          <span class="capability-card__index">02</span>
          <h3>天气查询</h3>
          <p>查询城市天气，获取出行参考</p>
        </article>
        <article class="capability-card">
          <span class="capability-card__index">03</span>
          <h3>旅游计划</h3>
          <p>按目的地、天数和偏好规划行程</p>
        </article>
      </div>

      <div class="welcome-prompts">
        <p>你可以这样开始</p>
        <div class="welcome-prompts__list">
          <button
            v-for="prompt in suggestedPrompts"
            :key="prompt"
            type="button"
            :disabled="isSending"
            @click="$emit('selectPrompt', prompt)"
          >
            <span>{{ prompt }}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12h14m-5-5 5 5-5 5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>

    <div v-else class="messages__inner">
      <template v-for="(message, index) in messages" :key="message.id">
        <div v-if="shouldShowDayDivider(index)" class="day-divider">
          <span>{{ formatDayLabel(message.createdAt) }}</span>
        </div>

        <article class="msg" :class="`msg--${message.role}`">
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
            <div
              v-else-if="message.role === 'assistant'"
              class="msg__bubble msg__markdown"
              v-html="renderMarkdown(message.content)"
            />
            <div v-else class="msg__bubble msg__bubble--plain">{{ message.content }}</div>
            <time class="msg__time" :datetime="message.createdAt">
              {{ formatMessageTime(message.createdAt) }}
            </time>
          </div>
        </article>
      </template>
    </div>
  </div>
</template>
