import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ApiError, setAuthToken } from '@/services/api'
import { fetchCurrentUser, loginWithPassword, type User } from '@/services/auth'

const STORAGE_KEY = 'my-agent-web.auth'

type StoredSession = {
  accessToken: string
  expiresAt: number
  user: User
}

function isExpired(expiresAt: number) {
  return expiresAt <= Date.now()
}

function readStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>

    if (
      typeof parsed.accessToken === 'string' &&
      typeof parsed.expiresAt === 'number' &&
      parsed.user &&
      !isExpired(parsed.expiresAt)
    ) {
      return {
        accessToken: parsed.accessToken,
        expiresAt: parsed.expiresAt,
        user: parsed.user,
      }
    }
  } catch {
    // Fall through and clear the bad session below.
  }

  window.localStorage.removeItem(STORAGE_KEY)
  return null
}

function writeStoredSession(session: StoredSession) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function clearStoredSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}

function toErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof TypeError) {
    return '无法连接后端服务，请确认 my-agent API 已启动'
  }

  if (error instanceof Error) {
    return error.message
  }

  return '登录失败，请稍后重试'
}

export const useAuthStore = defineStore('auth', () => {
  const storedSession = readStoredSession()
  const accessToken = ref(storedSession?.accessToken ?? '')
  const expiresAt = ref(storedSession?.expiresAt ?? 0)
  const user = ref<User | null>(storedSession?.user ?? null)
  const isSubmitting = ref(false)
  const errorMessage = ref('')

  setAuthToken(accessToken.value || null)

  const isAuthenticated = computed(() =>
    Boolean(accessToken.value && user.value && !isExpired(expiresAt.value)),
  )
  const displayName = computed(() => {
    const name = user.value?.display_name?.trim()
    return name || user.value?.username || ''
  })
  const roleLabel = computed(() => {
    if (user.value?.role === 'admin') {
      return '管理员'
    }

    if (user.value?.role === 'user') {
      return '普通用户'
    }

    return ''
  })

  async function login(username: string, password: string) {
    const normalizedUsername = username.trim()

    if (!normalizedUsername) {
      errorMessage.value = '请输入用户名'
      throw new Error(errorMessage.value)
    }

    if (!password) {
      errorMessage.value = '请输入密码'
      throw new Error(errorMessage.value)
    }

    isSubmitting.value = true
    errorMessage.value = ''

    try {
      const loginResponse = await loginWithPassword(normalizedUsername, password)
      const nextExpiresAt = Date.now() + loginResponse.expires_in * 1000
      accessToken.value = loginResponse.access_token
      expiresAt.value = nextExpiresAt
      user.value = loginResponse.user
      setAuthToken(loginResponse.access_token)
      writeStoredSession({
        accessToken: loginResponse.access_token,
        expiresAt: nextExpiresAt,
        user: loginResponse.user,
      })
      return loginResponse.user
    } catch (error) {
      errorMessage.value = toErrorMessage(error)
      throw error
    } finally {
      isSubmitting.value = false
    }
  }

  async function refreshCurrentUser() {
    if (!accessToken.value || isExpired(expiresAt.value)) {
      logout()
      throw new Error('登录已过期，请重新登录')
    }

    try {
      const currentUser = await fetchCurrentUser()
      user.value = currentUser
      writeStoredSession({
        accessToken: accessToken.value,
        expiresAt: expiresAt.value,
        user: currentUser,
      })
      return currentUser
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout()
      }
      throw error
    }
  }

  function logout() {
    accessToken.value = ''
    expiresAt.value = 0
    user.value = null
    isSubmitting.value = false
    errorMessage.value = ''
    setAuthToken(null)
    clearStoredSession()
  }

  function clearError() {
    errorMessage.value = ''
  }

  return {
    accessToken,
    expiresAt,
    user,
    isSubmitting,
    errorMessage,
    isAuthenticated,
    displayName,
    roleLabel,
    login,
    refreshCurrentUser,
    logout,
    clearError,
  }
})
