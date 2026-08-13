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
  MY_AGENT_ACCESS_TOKEN=<ACCESS_TOKEN> \\
  node my-agent-web/.codex/skills/my-agent-web-dev/scripts/probe-api.mjs --chat "你好"

Environment:
  MY_AGENT_API_BASE_URL   Defaults to ${DEFAULT_BASE_URL}
  MY_AGENT_ACCESS_TOKEN        Preferred Bearer token for /me and /chat
  MY_AGENT_API_KEY             Optional compatibility key for /me and /chat
  MY_AGENT_ADMIN_ACCESS_TOKEN  Preferred admin Bearer token for /users
  MY_AGENT_ADMIN_API_KEY       Optional compatibility admin key for /users

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
const accessToken = process.env.MY_AGENT_ACCESS_TOKEN || ''
const userApiKey = process.env.MY_AGENT_API_KEY || ''
const adminAccessToken = process.env.MY_AGENT_ADMIN_ACCESS_TOKEN || ''
const adminApiKey = process.env.MY_AGENT_ADMIN_API_KEY || ''
const chatMessage = readFlag('--chat', '你好')
const threadId = readFlag('--thread-id', null)

function buildUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return new URL(normalizedPath, `${baseUrl}/`).toString()
}

async function requestJson(path, { token, apiKey, method = 'GET', body } = {}) {
  const headers = {
    Accept: 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  } else if (apiKey) {
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

  if (!accessToken && !userApiKey) {
    console.log(
      'SKIP GET /me and POST /chat: set MY_AGENT_ACCESS_TOKEN to enable authenticated checks',
    )
  } else {
    const auth = { token: accessToken, apiKey: userApiKey }
    const me = await requestJson('/me', auth)
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
      ...auth,
      body: chatBody,
    })
    ok('POST /chat', {
      thread_id: chat.thread_id,
      history_saved: chat.history_saved,
      tool_calls: chat.tool_calls,
      reply_preview: typeof chat.reply === 'string' ? chat.reply.slice(0, 160) : chat.reply,
    })

    const sessions = await requestJson('/chat/sessions?limit=5&offset=0', {
      ...auth,
    })
    ok('GET /chat/sessions', {
      total: sessions.total,
      returned: Array.isArray(sessions.items) ? sessions.items.length : 0,
    })
  }

  if (!adminAccessToken && !adminApiKey) {
    console.log('SKIP GET /users: set MY_AGENT_ADMIN_ACCESS_TOKEN to enable admin check')
  } else {
    const users = await requestJson('/users?limit=5&offset=0', {
      token: adminAccessToken,
      apiKey: adminApiKey,
    })
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
