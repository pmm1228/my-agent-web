import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setAuthToken } from '../services/api'
import {
  confirmWebAccess,
  deleteChatSession,
  sendChatMessage,
  streamChatMessage,
} from '../services/chat'

describe('chat service', () => {
  beforeEach(() => {
    setAuthToken('test-access-token')
    vi.unstubAllGlobals()
  })

  it('sends the message and active thread with bearer authentication', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('http://localhost:8000/chat')
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-access-token')
      expect(init?.body).toBe(JSON.stringify({ message: '你好', thread_id: 'thread-1' }))

      return new Response(
        JSON.stringify({
          reply: '你好！',
          thread_id: 'thread-1',
          tool_calls: [],
          history_saved: true,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendChatMessage('你好', 'thread-1')).resolves.toMatchObject({
      reply: '你好！',
      thread_id: 'thread-1',
    })
  })

  it('parses NDJSON streaming events even when frames are split between chunks', async () => {
    const encoder = new TextEncoder()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(encoder.encode('{"type":"token","content":"你"}\n{"type":"tok'))
                controller.enqueue(
                  encoder.encode(
                    'en","content":"好"}\n{"type":"done","reply":"你好","thread_id":"thread-1","tool_calls":[],"history_saved":true}\n',
                  ),
                )
                controller.close()
              },
            }),
            {
              headers: { 'Content-Type': 'application/x-ndjson' },
              status: 200,
            },
          ),
      ),
    )

    const events = []
    for await (const event of streamChatMessage('你好')) {
      events.push(event)
    }

    expect(events).toEqual([
      { type: 'token', content: '你' },
      { type: 'token', content: '好' },
      { type: 'done', reply: '你好', thread_id: 'thread-1', tool_calls: [], history_saved: true },
    ])
  })

  it('submits the web access decision for the active thread', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('http://localhost:8000/chat/confirm')
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-access-token')
      expect(init?.body).toBe(JSON.stringify({ thread_id: 'thread-1', approved: false }))

      return new Response(
        JSON.stringify({
          reply: '我无法核实实时信息。',
          thread_id: 'thread-1',
          tool_calls: [],
          history_saved: true,
          status: 'completed',
          confirmation: null,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(confirmWebAccess('thread-1', false)).resolves.toMatchObject({
      status: 'completed',
      reply: '我无法核实实时信息。',
    })
  })

  it('deletes a chat session with bearer authentication', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('http://localhost:8000/chat/sessions/thread-1')
      expect(init?.method).toBe('DELETE')
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-access-token')
      return new Response(JSON.stringify({ deleted: true, thread_id: 'thread-1' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteChatSession('thread-1')).resolves.toEqual({
      deleted: true,
      thread_id: 'thread-1',
    })
  })
})
