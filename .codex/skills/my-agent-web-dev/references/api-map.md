# my-agent API Map

Source of truth:

- Backend routes: `my-agent/app/api/main.py`
- Request/response schemas: `my-agent/app/api/schemas.py`
- Auth dependencies: `my-agent/app/api/auth.py`
- Extra behavior: `my-agent/app/api/routes.py`

Use this file as the frontend contract guide. If backend code changes, update this reference.

## Runtime

Default local API base URL: `http://localhost:8000`

`my-agent-web` resolves the base URL from `VITE_API_BASE_URL`, falling back to
`http://localhost:8000`.

Backend docs while running:

- `GET /docs` - Swagger UI
- `GET /redoc` - ReDoc
- `GET /openapi.json` - OpenAPI schema

## Auth

Most endpoints require:

```http
X-API-Key: <USER_OR_ADMIN_API_KEY>
```

Auth outcomes:

| Status | Meaning |
|---|---|
| `401` | Missing or invalid `X-API-Key` |
| `403` | User is disabled, or endpoint requires admin and current user is not admin |
| `503` | Database is not configured, so auth/user/history queries cannot run |

Admin endpoints require a user whose `role` is `admin`.

## Endpoints

### Health

```http
GET /health
```

Auth: none.

Response:

```json
{
  "status": "ok",
  "model": "deepseek-chat"
}
```

Frontend use: backend availability indicator and first smoke check.

### Current User

```http
GET /me
```

Auth: user.

Response:

```json
{
  "id": "uuid",
  "username": "alice",
  "display_name": "Alice",
  "role": "user",
  "is_active": true,
  "created_at": "2026-08-11T00:00:00Z",
  "updated_at": "2026-08-11T00:00:00Z"
}
```

Frontend use: login validation and current session bootstrap.

### Agent Chat

```http
POST /chat
```

Auth: user.

Request:

```json
{
  "message": "查下深圳今天天气",
  "thread_id": null,
  "system": null
}
```

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `message` | string | yes | 1-4096 chars |
| `thread_id` | string/null | no | Omit/null to create a new conversation |
| `system` | string/null | no | Overrides default system prompt only when there is no prior graph history |

Response:

```json
{
  "reply": "深圳今天...",
  "thread_id": "thread-id",
  "tool_calls": [
    {
      "name": "get_weather",
      "args": {
        "city": "深圳"
      }
    }
  ],
  "history_saved": true
}
```

Notes:

- The public `thread_id` is scoped per user in backend checkpointing as
  `user:{user_id}:thread:{thread_id}`.
- `history_saved=false` means the LLM response succeeded but permanent chat history persistence
  failed.
- `tool_calls` can be empty.

### Chat Sessions

```http
GET /chat/sessions?limit=100&offset=0
```

Auth: user.

Query:

| Field | Type | Default | Bounds |
|---|---|---:|---|
| `limit` | integer | 100 | 1-500 |
| `offset` | integer | 0 | >= 0 |

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "thread_id": "thread-id",
      "title": "查下深圳今天天气",
      "created_at": "2026-08-11T00:00:00Z",
      "updated_at": "2026-08-11T00:01:00Z"
    }
  ],
  "total": 1
}
```

Frontend use: sidebar conversation list.

### Chat Messages

```http
GET /chat/sessions/{thread_id}/messages?limit=200&offset=0
```

Auth: user.

Query:

| Field | Type | Default | Bounds |
|---|---|---:|---|
| `limit` | integer | 200 | 1-1000 |
| `offset` | integer | 0 | >= 0 |

Response:

```json
{
  "session": {
    "id": "uuid",
    "user_id": "uuid",
    "thread_id": "thread-id",
    "title": "查下深圳今天天气",
    "created_at": "2026-08-11T00:00:00Z",
    "updated_at": "2026-08-11T00:01:00Z"
  },
  "items": [
    {
      "id": 1,
      "session_id": "uuid",
      "role": "user",
      "content": "查下深圳今天天气",
      "tool_calls": [],
      "created_at": "2026-08-11T00:00:00Z"
    },
    {
      "id": 2,
      "session_id": "uuid",
      "role": "assistant",
      "content": "深圳今天...",
      "tool_calls": [
        {
          "name": "get_weather",
          "args": {
            "city": "深圳"
          }
        }
      ],
      "created_at": "2026-08-11T00:01:00Z"
    }
  ],
  "total": 2
}
```

Frontend use: load selected conversation.

### Delete Chat Session

```http
DELETE /chat/sessions/{thread_id}
```

Auth: user. The backend only deletes a session owned by the current user.

Response:

```json
{
  "deleted": true,
  "thread_id": "thread-id"
}
```

Deleting a session also deletes its messages through the database cascade and removes the
user-scoped Agent checkpoint context. A missing session returns `404`.

### Create User

```http
POST /users
```

Auth: admin.

Request:

```json
{
  "username": "alice",
  "display_name": "Alice",
  "role": "user",
  "api_key": null,
  "is_active": true
}
```

Fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `username` | string | yes | 3-64 chars, `A-Z`, `a-z`, `0-9`, `_`, `.`, `-` |
| `display_name` | string/null | no | <= 128 chars |
| `role` | `"admin"`/`"user"` | no | default `user` |
| `api_key` | string/null | no | 16-256 chars; omit to generate |
| `is_active` | boolean | no | default `true` |

Response: user object plus one-time plaintext `api_key`.

Common errors:

| Status | Meaning |
|---|---|
| `409` | Username or API key already exists |
| `422` | Schema validation failed |
| `503` | Database not configured |

### List Users

```http
GET /users?limit=100&offset=0
```

Auth: admin.

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "username": "alice",
      "display_name": "Alice",
      "role": "user",
      "is_active": true,
      "created_at": "2026-08-11T00:00:00Z",
      "updated_at": "2026-08-11T00:00:00Z"
    }
  ],
  "total": 1
}
```

### Get User

```http
GET /users/{user_id}
```

Auth: admin.

Response: user object.

Errors:

| Status | Meaning |
|---|---|
| `404` | User does not exist |

### Update User

```http
PATCH /users/{user_id}
```

Auth: admin.

Request:

```json
{
  "role": "user",
  "is_active": true,
  "display_name": "Alice",
  "reset_api_key": false
}
```

All fields are optional. Send `display_name: null` only when clearing the display name is intended.

Response: user object plus `api_key`, which is non-null only when `reset_api_key=true`.

Errors:

| Status | Meaning |
|---|---|
| `404` | User does not exist |
| `409` | Would disable/demote the last active admin |

### Delete User

```http
DELETE /users/{user_id}
```

Auth: admin.

Response:

```json
{
  "deleted": true,
  "user": {
    "id": "uuid",
    "username": "alice",
    "display_name": "Alice",
    "role": "user",
    "is_active": true,
    "created_at": "2026-08-11T00:00:00Z",
    "updated_at": "2026-08-11T00:00:00Z"
  }
}
```

Notes:

- Deleting a user also removes that user's checkpoint rows when checkpoint tables exist.
- The backend blocks deletion of the last active admin.

## curl Examples

Use placeholders; never store real keys in this file.

```bash
curl http://localhost:8000/health
```

```bash
curl http://localhost:8000/me \
  -H "X-API-Key: <USER_API_KEY>"
```

```bash
curl -X POST http://localhost:8000/chat \
  -H "X-API-Key: <USER_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"message":"你好"}'
```

```bash
curl http://localhost:8000/chat/sessions \
  -H "X-API-Key: <USER_API_KEY>"
```

```bash
curl -X POST http://localhost:8000/users \
  -H "X-API-Key: <ADMIN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","display_name":"Alice"}'
```
