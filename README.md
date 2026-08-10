# my-agent-web

A Vue 3 chat frontend for mAgent.

## Stack

- Vue 3 + Vite + TypeScript
- Pinia (state) + Vue Router
- Element Plus
- Vitest + Playwright

## Project Structure

```
src/
├── views/          # Pages (HomeView, LoginView)
├── stores/         # Pinia stores (auth)
├── services/       # API clients (api, auth, chat)
├── router/         # Route config + guards
└── __tests__/      # Unit tests
```

## Authentication

API Key based. Users paste their key on the login page; it is sent as `X-API-Key` header and validated via `GET /me`.

## Setup

```sh
npm install
npm run dev
```

## Configuration

| Env Var             | Default                 | Description          |
| ------------------- | ----------------------- | -------------------- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API base URL |

Create a `.env.local` to override defaults — it is gitignored.

## Scripts

| Command              | Purpose                           |
| -------------------- | --------------------------------- |
| `npm run dev`        | Start dev server                  |
| `npm run build`      | Type-check + build for production |
| `npm run type-check` | Run `vue-tsc` only                |
| `npm run lint`       | Lint + auto-fix                   |
| `npm run test:unit`  | Run Vitest                        |
| `npm run test:e2e`   | Run Playwright                    |
