import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ChatComposer from '../components/chat/ChatComposer.vue'
import MessageList from '../components/chat/MessageList.vue'

describe('chat UI components', () => {
  it('shows capabilities and emits the selected prompt in an empty conversation', async () => {
    const prompts = ['帮我解释一下大模型是怎么工作的', '查询北京今天的天气']
    const wrapper = mount(MessageList, {
      props: {
        messages: [],
        suggestedPrompts: prompts,
        isLoading: false,
        isSending: false,
      },
    })

    expect(wrapper.get('h2').text()).toBe('你好，我是 myAgent')
    expect(wrapper.text()).toContain('大模型对话')
    expect(wrapper.text()).toContain('天气查询')
    expect(wrapper.text()).toContain('旅游计划')

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('selectPrompt')).toEqual([[prompts[0]]])
  })

  it('submits on Enter but keeps Shift+Enter available for a newline', async () => {
    const wrapper = mount(ChatComposer, {
      props: {
        modelValue: '梳理需求',
        errorMessage: '',
        isSending: false,
      },
    })
    const textarea = wrapper.get('textarea')

    await textarea.trigger('keydown', { key: 'Enter' })
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })

    expect(wrapper.emitted('submit')).toHaveLength(1)
    expect(textarea.attributes('maxlength')).toBe('4096')
  })

  it('renders history day dividers from each message timestamp', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    const wrapper = mount(MessageList, {
      props: {
        messages: [
          {
            id: 1,
            role: 'user',
            content: '昨天的消息',
            createdAt: yesterday.toISOString(),
          },
          {
            id: 2,
            role: 'assistant',
            content: '今天的消息',
            createdAt: today.toISOString(),
          },
        ],
        suggestedPrompts: [],
        isLoading: false,
        isSending: false,
      },
    })

    expect(wrapper.findAll('.day-divider').map((item) => item.text())).toEqual(['昨天', '今天'])
    const firstTimestamp = wrapper.findAll('time')[0]
    expect(firstTimestamp).toBeDefined()
    expect(firstTimestamp?.attributes('datetime')).toBe(yesterday.toISOString())
  })
})
