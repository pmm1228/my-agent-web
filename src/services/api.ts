type ErrorPayload = {
  detail?: unknown
  message?: unknown
}

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  authToken?: string | null
  baseUrl?: string
  body?: unknown
  skipAuth?: boolean
}

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8000'
let currentAuthToken: string | null = null

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getApiBaseUrl() {
  return defaultApiBaseUrl
}

export function setAuthToken(token: string | null) {
  currentAuthToken = token
}

export function getAuthToken() {
  return currentAuthToken
}

function buildApiUrl(path: string, baseUrl = defaultApiBaseUrl) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const normalizedBase = baseUrl.trim().replace(/\/+$/, '')

  if (/^https?:\/\//i.test(normalizedBase)) {
    return new URL(normalizedPath, `${normalizedBase}/`).toString()
  }

  if (typeof window !== 'undefined') {
    return new URL(`${normalizedBase}${normalizedPath}`, window.location.origin).toString()
  }

  return `${normalizedBase}${normalizedPath}`
}

function normalizeBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined
  }

  if (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams
  ) {
    return body
  }

  return JSON.stringify(body)
}

function formatDetail(detail: unknown) {
  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (item && typeof item === 'object' && 'msg' in item) {
          return String(item.msg)
        }

        return JSON.stringify(item)
      })
      .join('；')
  }

  return ''
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as ErrorPayload
      const detailMessage = formatDetail(payload.detail)

      if (detailMessage) {
        return detailMessage
      }

      if (typeof payload.message === 'string') {
        return payload.message
      }
    } catch {
      return `请求失败（${response.status}）`
    }
  }

  const text = await response.text().catch(() => '')
  return text || `请求失败（${response.status}）`
}

export async function requestJson<T>(path: string, options: ApiRequestOptions = {}) {
  const {
    authToken,
    baseUrl,
    body,
    headers: initHeaders,
    skipAuth = false,
    ...init
  } = options
  const headers = new Headers(initHeaders)
  const normalizedBody = normalizeBody(body)
  const token = authToken ?? currentAuthToken

  headers.set('Accept', 'application/json')

  if (!skipAuth && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (normalizedBody && !headers.has('Content-Type') && typeof normalizedBody === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildApiUrl(path, baseUrl), {
    ...init,
    body: normalizedBody,
    headers,
  })

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function requestStream(path: string, options: ApiRequestOptions = {}) {
  const {
    authToken,
    baseUrl,
    body,
    headers: initHeaders,
    skipAuth = false,
    ...init
  } = options
  const headers = new Headers(initHeaders)
  const normalizedBody = normalizeBody(body)
  const token = authToken ?? currentAuthToken

  headers.set('Accept', 'application/x-ndjson')

  if (!skipAuth && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (normalizedBody && !headers.has('Content-Type') && typeof normalizedBody === 'string') {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildApiUrl(path, baseUrl), {
    ...init,
    body: normalizedBody,
    headers,
  })

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status)
  }

  if (!response.body) {
    throw new Error('后端未返回流式响应')
  }

  return response.body
}
