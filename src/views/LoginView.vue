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
  <main class="page auth-page">
    <section class="auth-layout">
      <div class="panel intro-panel">
        <p class="eyebrow">my-agent-web</p>
        <h1 class="title">登录</h1>
        <p class="subtitle">使用用户名和密码进入 myAgent 工作台。</p>
      </div>

      <form class="panel login-panel stack" @submit.prevent="handleSubmit">
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
