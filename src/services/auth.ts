import { requestJson } from './api'

export type UserRole = 'admin' | 'user'

export type User = {
  id: string
  username: string
  display_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LoginResponse = {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  user: User
}

export function loginWithPassword(username: string, password: string) {
  return requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: {
      username,
      password,
    },
    skipAuth: true,
  })
}

export function fetchCurrentUser() {
  return requestJson<User>('/me')
}
