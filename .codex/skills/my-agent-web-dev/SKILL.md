---
name: my-agent-web-dev
description: Develop, debug, and wire the my-agent-web Vue frontend against the sibling my-agent FastAPI backend. Use when working on my-agent-web API clients, auth/login, chat UI integration, chat history, Element Plus UI interactions, dialogs and feedback, admin user management, VITE_API_BASE_URL configuration, local backend smoke tests, or requests to check the my-agent HTTP interface contract.
---

# My Agent Web Dev

## Overview

Use this skill as the project-local onboarding and debugging guide for the two sibling apps:

- Backend: `my-agent` (FastAPI, LangGraph, PostgreSQL-backed auth/history)
- Frontend: `my-agent-web` (Vue 3, Vite, Pinia, Vue Router)

Keep backend source as the authority when docs drift. Prefer `my-agent/app/api/main.py`,
`my-agent/app/api/routers/`, `my-agent/app/api/schemas/`, and
`my-agent/app/api/dependencies/auth.py` over older README text.

## Safety

Interface documentation is safe to keep in this skill when it contains only public contract
information: routes, methods, request/response fields, status codes, local defaults, and
placeholder examples.

Do not add real API keys, `ADMIN_API_KEY`, user API keys, `.env` contents, database connection
strings, JWT secrets, production hostnames, private IPs, cookies, tokens, or logs that include
secrets. Use placeholders such as `<ACCESS_TOKEN>` and environment variables such as
`MY_AGENT_ACCESS_TOKEN`.

## Workflow

1. Identify whether the task touches backend contract, frontend client code, or local debugging.
2. For API contract work, read `references/api-map.md`.
3. For Vue integration work, read `references/frontend-flow.md`.
4. For dialogs, confirmations, notifications, and other standard interactions, use Element Plus.
5. When verifying a running backend, use `scripts/probe-api.mjs` with environment variables.
6. After backend route or schema changes, update `references/api-map.md`.

## UI Component Rules

- For UI layout or styling work, read `references/design-system.md` and use the shared tokens in
  `src/styles/tokens.css` before adding component-local values.
- Reuse `element-plus`, which is already a project dependency.
- Use `ElMessageBox.confirm` for destructive-action confirmation; set explicit Chinese title,
  confirm text, cancel text, and warning/danger styling.
- Use Element Plus feedback components for standard messages and dialogs. Do not introduce
  native `alert`, `confirm`, or `prompt` calls.
- Import required Element Plus theme files once from `src/main.ts`; do not repeat component CSS
  imports or load the full theme when only a small component subset is used.
- Keep business state and API calls in Vue code. Treat dismissal as a normal return path and do
  not display it as an error.
- Preserve accessibility: keep descriptive `aria-label` and `title` text on icon-only buttons.
- Keep Element Plus theme mappings in `src/styles/element-plus.css`; never modify package files.

## Common Tasks

### Add a frontend API client

Read `references/api-map.md` for the endpoint shape, then add typed service functions under
`my-agent-web/src/services/`. Reuse `requestJson` from `my-agent-web/src/services/api.ts` so
`VITE_API_BASE_URL`, Bearer authentication, JSON serialization, and error normalization stay
consistent.

### Wire the chat UI

Read `references/frontend-flow.md`. Keep session/history state in `useChatSessions`, streaming
message state in `useChatStream`, and let `HomeView.vue` compose the chat components. Persist the
returned `thread_id` and refresh history from `GET /chat/sessions` and
`GET /chat/sessions/{thread_id}/messages` when needed.

### Debug auth

Check `GET /health` first because it is unauthenticated. Log in through `POST /auth/login`, then
check `GET /me` with `Authorization: Bearer <ACCESS_TOKEN>`. A missing, invalid, or expired token
returns 401, a disabled user returns 403, and missing database configuration returns 503.

### Run a smoke test

From the workspace root:

```bash
MY_AGENT_API_BASE_URL=http://localhost:8000 \
MY_AGENT_ACCESS_TOKEN=<ACCESS_TOKEN> \
node my-agent-web/.codex/skills/my-agent-web-dev/scripts/probe-api.mjs --chat "你好"
```

`MY_AGENT_API_KEY` remains available only for backend compatibility and direct automation probes;
the browser application uses username/password login and Bearer tokens.
