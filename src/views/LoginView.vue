<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const username = ref('')
const password = ref('')

function resolveRedirectTarget() {
  const redirect = route.query.redirect

  if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect
  }

  return '/'
}

async function handleSubmit() {
  try {
    await authStore.login(username.value, password.value)
    await router.replace(resolveRedirectTarget())
  } catch {
    // The store owns the user-facing error message.
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-layout">
      <div class="intro-panel">
        <p class="eyebrow">my-agent-web</p>
        <h1 class="title">登录</h1>
        <p class="subtitle">使用用户名和密码进入 myAgent 工作台。</p>
      </div>

      <form class="stack" @submit.prevent="handleSubmit">
        <div class="field">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            autocomplete="username"
            placeholder="请输入用户名"
            spellcheck="false"
            type="text"
            @input="authStore.clearError"
          />
        </div>

        <div class="field">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            autocomplete="current-password"
            placeholder="请输入密码"
            spellcheck="false"
            type="password"
            @input="authStore.clearError"
          />
        </div>

        <p v-if="authStore.errorMessage" class="error" role="alert">
          {{ authStore.errorMessage }}
        </p>

        <button class="primary-action" :disabled="authStore.isSubmitting" type="submit">
          {{ authStore.isSubmitting ? '登录中...' : '登录' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--page-padding);
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(116, 159, 255, 0.2), transparent 36%),
    linear-gradient(315deg, rgba(255, 159, 120, 0.2), transparent 40%), var(--color-page-background);
  color: var(--color-text);
  font-family: var(--font-family-system);
  -webkit-font-smoothing: antialiased;
}

.auth-layout {
  width: min(100%, 420px);
  padding: 40px 36px 32px;
  border: 0.5px solid rgba(255, 255, 255, 0.72);
  border-radius: var(--radius-panel);
  background: rgba(255, 255, 255, 0.5);
  box-shadow: var(--shadow-panel);
  backdrop-filter: blur(48px) saturate(190%);
  -webkit-backdrop-filter: blur(48px) saturate(190%);
}

.intro-panel {
  margin-bottom: 28px;
  text-align: center;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.title {
  margin: 0 0 6px;
  font-size: var(--font-size-xl);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: var(--line-height-normal);
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding-left: 2px;
}

.field input {
  width: 100%;
  padding: 11px 14px;
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-control);
  background: rgba(255, 255, 255, 0.85);
  color: var(--color-text);
  font-size: var(--font-size-body);
  font-family: inherit;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.field input::placeholder {
  color: var(--color-text-muted);
}

.field input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-soft);
}

.error {
  margin: 4px 0 0;
  color: var(--color-danger-text);
  font-size: var(--font-size-sm);
  text-align: center;
}

.primary-action {
  margin-top: 8px;
  width: 100%;
  height: var(--control-height);
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-size-body);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.15s ease,
    opacity 0.15s ease;
  box-shadow: 0 4px 14px rgba(0, 122, 255, 0.35);
}

.primary-action:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.primary-action:active:not(:disabled) {
  transform: scale(0.98);
}

.primary-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: none;
}

@media (max-width: 480px) {
  .auth-page {
    padding: 0;
    align-items: flex-start;
  }

  .auth-layout {
    width: 100%;
    min-height: 100vh;
    border-radius: 0;
    border: 0;
    padding: 48px 24px 32px;
  }
}
</style>
