<script setup lang="ts">
defineProps<{
  displayName: string
  roleLabel: string
}>()

defineEmits<{
  logout: []
}>()
</script>

<template>
  <div class="user-card">
    <div class="user-card__avatar" aria-hidden="true">
      {{ displayName.slice(0, 1).toUpperCase() || 'U' }}
    </div>
    <div class="user-card__meta">
      <span class="user-card__name">{{ displayName || '用户' }}</span>
      <span class="user-card__status">{{ roleLabel || '在线' }}</span>
    </div>
    <button
      class="logout-btn"
      type="button"
      aria-label="退出登录"
      title="退出登录"
      @click="$emit('logout')"
    >
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
</template>
