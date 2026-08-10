#!/usr/bin/env node

const DEFAULT_BASE_URL = 'http://localhost:8000'

const args = process.argv.slice(2)

function readFlag(name, fallback = undefined) {
  const index = args.indexOf(name)
  if (index === -1) {
    return fallback
  }

  return args[index + 1] ?? fallback
}

function usage() {
  console.log(`Usage:
  MY_AGENT_API_BASE_URL=http://localhost:8000 \\
  MY_AGENT_API_KEY=<USER_API_KEY> \\
  node my-agent-web/.codex/skills/my-agent-web-dev/scripts/probe-api.mjs --chat "你好"

Environment:
  MY_AGENT_API_BASE_URL   Defaults to ${DEFAULT_BASE_URL}
  MY_AGENT_API_KEY        Optional user key for /me and /chat
  MY_AGENT_ADMIN_API_KEY  Optional admin key for /users smoke check

Flags:
  --chat <message>        Message for POST /chat, defaults to "你好"
  --thread-id <id>        Optional thread id for POST /chat
  --help                  Show this help
`)
}

if (args.includes('--help')) {
  usage()
  process.exit(0)
}

const baseUrl = (process.env.MY_AGENT_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '')
const userApiKey = process.env.MY_AGENT_API_KEY || ''
const adminApiKey = process.env.MY_AGENT_ADMIN_API_KEY || ''
const chatMessage = readFlag('--chat', '你好')
const threadId = readFlag('--thread-id', null)

function buildUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return new URL(normalizedPath, `${baseUrl}/`).toString()
}

async function requestJson(path, { apiKey, method = 'GET', body } = {}) {
  const headers = {
    Accept: 'application/json',
  }

  if (apiKey) {
    headers['X-API-Key'] = apiKey
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok) {
    const detail = payload && typeof payload === 'object' && 'detail' in payload
      ? payload.detail
      : payload
    throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(detail)}`)
  }

  return payload
}

function ok(label, value) {
  console.log(`OK ${label}`)
  if (value !== undefined) {
    console.log(JSON.stringify(value, null, 2))
  }
}

async function main() {
  console.log(`Probing ${baseUrl}`)

  const health = await requestJson('/health')
  ok('GET /health', health)

  if (!userApiKey) {
    console.log('SKIP GET /me and POST /chat: set MY_AGENT_API_KEY to enable authenticated checks')
  } else {
    const me = await requestJson('/me', { apiKey: userApiKey })
    ok('GET /me', {
      id: me.id,
      username: me.username,
      role: me.role,
      is_active: me.is_active,
    })

    const chatBody = {
      message: chatMessage,
    }
    if (threadId) {
      chatBody.thread_id = threadId
    }

    const chat = await requestJson('/chat', {
      method: 'POST',
      apiKey: userApiKey,
      body: chatBody,
    })
    ok('POST /chat', {
      thread_id: chat.thread_id,
      history_saved: chat.history_saved,
      tool_calls: chat.tool_calls,
      reply_preview: typeof chat.reply === 'string' ? chat.reply.slice(0, 160) : chat.reply,
    })

    const sessions = await requestJson('/chat/sessions?limit=5&offset=0', {
      apiKey: userApiKey,
    })
    ok('GET /chat/sessions', {
      total: sessions.total,
      returned: Array.isArray(sessions.items) ? sessions.items.length : 0,
    })
  }

  if (!adminApiKey) {
    console.log('SKIP GET /users: set MY_AGENT_ADMIN_API_KEY to enable admin check')
  } else {
    const users = await requestJson('/users?limit=5&offset=0', { apiKey: adminApiKey })
    ok('GET /users', {
      total: users.total,
      returned: Array.isArray(users.items) ? users.items.length : 0,
    })
  }
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`)
  process.exit(1)
})
