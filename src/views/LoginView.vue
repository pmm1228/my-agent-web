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
  --auth-bg: #d7d8dc;
  --auth-text: #1d1d1f;
  --auth-sub: #6e6e73;
  --auth-muted: #aeaeb2;
  --auth-line: rgba(0, 0, 0, 0.08);
  --auth-blue: #007aff;
  --auth-blue-soft: rgba(0, 122, 255, 0.12);
  --auth-shadow: 0 22px 70px rgba(0, 0, 0, 0.14);

  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(116, 159, 255, 0.2), transparent 36%),
    linear-gradient(315deg, rgba(255, 159, 120, 0.2), transparent 40%), var(--auth-bg);
  color: var(--auth-text);
  font-family:
    -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.auth-layout {
  width: min(100%, 420px);
  padding: 40px 36px 32px;
  border: 0.5px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: var(--auth-shadow);
  backdrop-filter: blur(48px) saturate(190%);
  -webkit-backdrop-filter: blur(48px) saturate(190%);
}

.intro-panel {
  margin-bottom: 28px;
  text-align: center;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--auth-blue);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.title {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.subtitle {
  margin: 0;
  color: var(--auth-sub);
  font-size: 13px;
  line-height: 1.5;
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
  color: var(--auth-sub);
  padding-left: 2px;
}

.field input {
  width: 100%;
  padding: 11px 14px;
  border: 0.5px solid var(--auth-line);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.85);
  color: var(--auth-text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.field input::placeholder {
  color: var(--auth-muted);
}

.field input:focus {
  border-color: var(--auth-blue);
  box-shadow: 0 0 0 3px var(--auth-blue-soft);
}

.error {
  margin: 4px 0 0;
  color: #d70015;
  font-size: 12px;
  text-align: center;
}

.primary-action {
  margin-top: 8px;
  width: 100%;
  height: 40px;
  border: 0;
  border-radius: 10px;
  background: var(--auth-blue);
  color: #fff;
  font-size: 14px;
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
  background: #0077ed;
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
