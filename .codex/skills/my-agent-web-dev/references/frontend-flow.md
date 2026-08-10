# my-agent-web Frontend Flow

Source of truth:

- API helper: `my-agent-web/src/services/api.ts`
- Auth service: `my-agent-web/src/services/auth.ts`
- Auth store: `my-agent-web/src/stores/auth.ts`
- Login page: `my-agent-web/src/views/LoginView.vue`
- Chat shell: `my-agent-web/src/views/HomeView.vue`
- Router guard: `my-agent-web/src/router/index.ts`

## Current Integration State

Implemented:

- `requestJson<T>()` builds URLs from `VITE_API_BASE_URL` or `http://localhost:8000`.
- `requestJson<T>()` sets `Accept: application/json`, serializes object bodies, sets
  `Content-Type: application/json`, attaches `X-API-Key` when provided, and normalizes backend
  errors into `ApiError`.
- `fetchCurrentUser(apiKey)` calls `GET /me`.
- Pinia auth store persists `{ apiKey, user }` in `localStorage` under `my-agent-web.auth`.
- Router redirects unauthenticated users to `/login`.
- Login page validates an API key through `GET /me`.

Not yet implemented:

- Typed chat service functions for `/chat`, `/chat/sessions`, and message history.
- Reactive chat state in `HomeView.vue`; it currently uses static sample conversations/messages.
- Admin user management UI and service functions for `/users`.
- Streaming chat; backend currently exposes regular JSON responses only in this project.

## Recommended Service Layout

Add service modules without changing the shared request helper:

```text
my-agent-web/src/services/
  api.ts          # keep shared requestJson and ApiError
  auth.ts         # current user/login validation types
  chat.ts         # chat request, sessions, messages
  users.ts        # admin user management
```

Use snake_case fields in TypeScript types to match backend JSON directly unless the app already
introduces a mapping layer.

## Suggested Chat Types

```ts
export type ChatRequest = {
  message: string
  thread_id?: string | null
  system?: string | null
}

export type ToolCall = {
  name: string
  args: Record<string, unknown>
}

export type ChatResponse = {
  reply: string
  thread_id: string
  tool_calls: ToolCall[]
  history_saved: boolean
}

export type ChatSession = {
  id: string
  user_id: string
  thread_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool'

export type ChatMessage = {
  id: number
  session_id: string
  role: ChatMessageRole
  content: string
  tool_calls: ToolCall[]
  created_at: string
}
```

## Suggested Chat Service

```ts
import { requestJson } from './api'

export function sendChat(apiKey: string, body: ChatRequest) {
  return requestJson<ChatResponse>('/chat', {
    method: 'POST',
    apiKey,
    body,
  })
}

export function fetchChatSessions(apiKey: string, params = { limit: 100, offset: 0 }) {
  return requestJson<ChatSessionListResponse>(
    `/chat/sessions?limit=${params.limit}&offset=${params.offset}`,
    { apiKey },
  )
}

export function fetchChatMessages(
  apiKey: string,
  threadId: string,
  params = { limit: 200, offset: 0 },
) {
  return requestJson<ChatMessageListResponse>(
    `/chat/sessions/${encodeURIComponent(threadId)}/messages?limit=${params.limit}&offset=${params.offset}`,
    { apiKey },
  )
}
```

## HomeView Wiring Notes

When replacing static state in `HomeView.vue`:

1. Keep `authStore.apiKey` as the only source for API auth.
2. Track `currentThreadId: string | null`.
3. On first send with no thread id, call `POST /chat` without `thread_id`; store the returned
   `thread_id`.
4. For later sends in the same conversation, include `thread_id`.
5. Optimistically append the user message, show a pending assistant state, then replace it with
   `reply`.
6. If `history_saved=false`, show a non-blocking warning; do not discard the assistant reply.
7. Refresh `/chat/sessions` after successful sends so the sidebar title/order matches backend
   persistence.
8. On selecting a sidebar session, call `/chat/sessions/{thread_id}/messages` and map backend roles
   to the visible message list.

## Local Debug Checklist

Backend:

```bash
cd my-agent
python run.py api
```

Frontend:

```bash
cd my-agent-web
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

Smoke test from workspace root:

```bash
MY_AGENT_API_BASE_URL=http://localhost:8000 \
MY_AGENT_API_KEY=<USER_API_KEY> \
node my-agent-web/.codex/skills/my-agent-web-dev/scripts/probe-api.mjs --chat "你好"
```

Common failures:

| Symptom | Likely Cause |
|---|---|
| Browser `TypeError` / cannot connect | Backend is not running or base URL is wrong |
| `401` from `/me` | Missing or invalid API key |
| `403` from `/me` | User exists but is disabled |
| `503` from `/me` or history endpoints | Backend database is not configured |
| `/health` fails during app startup | Missing required backend env, usually `DEEPSEEK_API_KEY` |

## Admin UI Notes

Only expose `/users` screens to `authStore.user?.role === 'admin'`.

Treat returned plaintext `api_key` from `POST /users` and `PATCH /users/{id}` with
`reset_api_key=true` as one-time sensitive data. Show it once, avoid persisting it, and do not log
it.
