<script setup lang="ts">
const draft = defineModel<string>({ required: true })

defineProps<{
  errorMessage: string
  isSending: boolean
}>()

const emit = defineEmits<{
  submit: []
}>()

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return
  }

  event.preventDefault()
  emit('submit')
}
</script>

<template>
  <footer class="composer">
    <p v-if="errorMessage" class="chat-error" role="alert">{{ errorMessage }}</p>

    <div class="composer__box">
      <textarea
        v-model="draft"
        class="composer__input"
        placeholder="给 myAgent 发消息…"
        rows="1"
        maxlength="4096"
        :disabled="isSending"
        @keydown="handleKeydown"
      />
      <button
        class="composer__send"
        type="button"
        aria-label="发送消息"
        :disabled="!draft.trim() || isSending"
        @click="$emit('submit')"
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
    <p class="composer__hint">Enter 发送 · Shift + Enter 换行</p>
  </footer>
</template>
