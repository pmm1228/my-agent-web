# my-agent-web Frontend Flow

Source of truth:

- API helper: `my-agent-web/src/services/api.ts`
- Auth service: `my-agent-web/src/services/auth.ts`
- Auth store: `my-agent-web/src/stores/auth.ts`
- Login page: `my-agent-web/src/views/LoginView.vue`
- Chat shell: `my-agent-web/src/views/HomeView.vue`
- Chat components: `my-agent-web/src/components/chat/`
- Chat state: `my-agent-web/src/composables/useChatSessions.ts` and
  `my-agent-web/src/composables/useChatStream.ts`
- Router guard: `my-agent-web/src/router/index.ts`

## Current authentication flow

The browser application uses username/password login and Bearer tokens:

1. `LoginView.vue` submits `username` and `password` to `POST /auth/login`.
2. The response contains `access_token`, `expires_in`, and the current user.
3. The Pinia auth store persists `{ accessToken, expiresAt, user }` in `localStorage` under
   `my-agent-web.auth`.
4. `setAuthToken()` makes the access token available to the shared request helper.
5. `requestJson()` and `requestStream()` attach `Authorization: Bearer <ACCESS_TOKEN>` to
   authenticated calls.
6. The router redirects unauthenticated users to `/login` and preserves the requested path in the
   `redirect` query parameter.

The backend still accepts `X-API-Key` for compatibility with direct automation and smoke probes,
but it is not the browser login flow and should not be added to page or store code.

## Chat architecture

```text
HomeView.vue                  # orchestration, routing, destructive confirmation
  ChatSidebar.vue            # conversation navigation and deletion entry points
    UserMenu.vue             # current user identity and logout
  MessageList.vue            # empty state, suggestions, history, rendered messages
  ChatComposer.vue           # draft input and send interaction

useChatSessions.ts           # session list, active thread, loading and deletion state
useChatStream.ts             # draft, visible messages, streaming and web confirmation state
```

Keep API calls and business state in the composables. Components should receive typed props and
emit user intent. `HomeView.vue` coordinates the two state modules without duplicating their state.

## Chat request flow

1. `useChatStream.sendMessage()` optimistically appends the user message and a pending assistant
   message.
2. `streamChatMessage()` calls `POST /chat/stream` and parses NDJSON events.
3. On the first send, omit `thread_id`; persist the returned `thread_id` in
   `useChatSessions.currentThreadId`.
4. Later sends include the active `thread_id`.
5. A `confirmation` event uses `POST /chat/confirm` after an Element Plus confirmation dialog.
6. A completed response refreshes `GET /chat/sessions` so sidebar ordering and titles match the
   persisted backend history.
7. Selecting a sidebar item calls `GET /chat/sessions/{thread_id}/messages` and replaces the
   visible message list.
8. Deletion is confirmed in `HomeView.vue`, then `useChatSessions` calls
   `DELETE /chat/sessions/{thread_id}`.

## Service conventions

- Reuse `requestJson()` and `requestStream()` from `src/services/api.ts`.
- Do not pass tokens through every service function; the auth store configures the shared helper.
- Keep backend snake_case fields in TypeScript types unless a dedicated mapping layer is added.
- Encode `thread_id` when it appears in a URL path.
- Treat `history_saved=false` as a persistence warning; do not discard a successful model reply.

## Element Plus interaction rules

Import required Element Plus theme files once in `src/main.ts`. For destructive actions, provide
explicit Chinese labels and warning/danger styling. Treat dismissal as a normal return path. Do not
use browser-native `window.alert`, `window.confirm`, or `window.prompt`.

## Local debug checklist

Backend:

```bash
cd my-agent
python run.py api
```

Frontend:

```bash
cd my-agent-web
VITE_API_BASE_URL=http://localhost:8000 pnpm dev
```

Primary login check:

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<USERNAME>","password":"<PASSWORD>"}'

curl http://localhost:8000/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Smoke probe with an already-issued Bearer token:

```bash
MY_AGENT_API_BASE_URL=http://localhost:8000 \
MY_AGENT_ACCESS_TOKEN=<ACCESS_TOKEN> \
node my-agent-web/.codex/skills/my-agent-web-dev/scripts/probe-api.mjs --chat "你好"
```

Common failures:

| Symptom | Likely cause |
|---|---|
| Browser `TypeError` / cannot connect | Backend is not running or the base URL is wrong |
| `401` from `/auth/login` | Username or password is invalid |
| `401` from `/me` or chat | Bearer token is missing, invalid, or expired |
| `403` | The user is disabled, or the endpoint requires an admin |
| `503` | The database is not configured |

## Admin UI notes

Only expose `/users` screens to `authStore.user?.role === 'admin'`.

The plaintext `api_key` returned by `POST /users` or by `PATCH /users/{id}` with
`reset_api_key=true` is a one-time compatibility credential. Show it once, never persist it in the
browser auth store, and do not log it.
