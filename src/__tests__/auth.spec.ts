import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { setAuthToken } from '../services/api'
import { useAuthStore } from '../stores/auth'

const user = {
  id: 'a9a64fc1-4bc9-4564-a421-d3efbcd401c7',
  username: 'alice',
  display_name: 'Alice',
  role: 'user' as const,
  is_active: true,
  created_at: '2026-08-10T00:00:00Z',
  updated_at: '2026-08-10T00:00:00Z',
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    setAuthToken(null)
    vi.unstubAllGlobals()
  })

  it('logs in with username and password, then persists the bearer token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers)

        expect(headers.get('Authorization')).toBeNull()

        return new Response(JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          user,
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      }),
    )

    const authStore = useAuthStore()

    await authStore.login('alice', 'password123')

    expect(authStore.isAuthenticated).toBe(true)
    expect(authStore.accessToken).toBe('test-access-token')
    expect(authStore.user?.username).toBe('alice')
    expect(window.localStorage.getItem('my-agent-web.auth')).toContain('test-access-token')
  })

  it('clears the persisted session on logout', () => {
    window.localStorage.setItem(
      'my-agent-web.auth',
      JSON.stringify({
        accessToken: 'test-access-token',
        expiresAt: Date.now() + 3600_000,
        user,
      }),
    )

    const authStore = useAuthStore()

    authStore.logout()

    expect(authStore.isAuthenticated).toBe(false)
    expect(window.localStorage.getItem('my-agent-web.auth')).toBeNull()
  })
})
