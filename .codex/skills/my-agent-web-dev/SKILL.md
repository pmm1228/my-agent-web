---
name: my-agent-web-dev
description: Develop, debug, and wire the my-agent-web Vue frontend against the sibling my-agent FastAPI backend. Use when working on my-agent-web API clients, auth/login, chat UI integration, chat history, admin user management, VITE_API_BASE_URL configuration, local backend smoke tests, or requests to check the my-agent HTTP interface contract.
---

# My Agent Web Dev

## Overview

Use this skill as the project-local onboarding and debugging guide for the two sibling apps:

- Backend: `my-agent` (FastAPI, LangGraph, PostgreSQL-backed auth/history)
- Frontend: `my-agent-web` (Vue 3, Vite, Pinia, Vue Router)

Keep backend source as the authority when docs drift. Prefer `my-agent/app/api/main.py`,
`my-agent/app/api/schemas.py`, and `my-agent/app/api/auth.py` over older README text.

## Safety

Interface documentation is safe to keep in this skill when it contains only public contract
information: routes, methods, request/response fields, status codes, local defaults, and
placeholder examples.

Do not add real API keys, `ADMIN_API_KEY`, user API keys, `.env` contents, database connection
strings, JWT secrets, production hostnames, private IPs, cookies, tokens, or logs that include
secrets. Use placeholders such as `<USER_API_KEY>` and environment variables such as
`MY_AGENT_API_KEY`.

## Workflow

1. Identify whether the task touches backend contract, frontend client code, or local debugging.
2. For API contract work, read `references/api-map.md`.
3. For Vue integration work, read `references/frontend-flow.md`.
4. When verifying a running backend, use `scripts/probe-api.mjs` with environment variables.
5. After backend route or schema changes, update `references/api-map.md`.

## Common Tasks

### Add a frontend API client

Read `references/api-map.md` for the endpoint shape, then add typed service functions under
`my-agent-web/src/services/`. Reuse `requestJson` from `my-agent-web/src/services/api.ts` so
`VITE_API_BASE_URL`, `X-API-Key`, JSON serialization, and error normalization stay consistent.

### Wire the chat UI

Read `references/frontend-flow.md`. Replace static chat state in `HomeView.vue` with reactive
state, call `POST /chat`, persist returned `thread_id`, and refresh history from
`GET /chat/sessions` and `GET /chat/sessions/{thread_id}/messages` when needed.

### Debug auth

Check `GET /health` first because it is unauthenticated. Then check `GET /me` with
`MY_AGENT_API_KEY`. A missing/invalid key returns 401, a disabled user returns 403, and missing
database configuration returns 503.

### Run a smoke test

From the workspace root:

```bash
MY_AGENT_API_BASE_URL=http://localhost:8000 \
MY_AGENT_API_KEY=<USER_API_KEY> \
node my-agent-web/.codex/skills/my-agent-web-dev/scripts/probe-api.mjs --chat "你好"
```
