import { beforeEach, describe, expect, it, vi } from 'vitest'

const { confirmMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessageBox: {
    confirm: confirmMock,
  },
}))

import { confirmAction } from '../components/common/confirm/confirm'

describe('confirmAction', () => {
  beforeEach(() => {
    confirmMock.mockReset()
  })

  it('uses the shared danger appearance and resolves true after confirmation', async () => {
    confirmMock.mockResolvedValue('confirm')

    await expect(
      confirmAction({
        title: '删除历史对话',
        message: '删除后无法恢复。',
        type: 'danger',
        confirmText: '删除',
      }),
    ).resolves.toBe(true)

    expect(confirmMock).toHaveBeenCalledWith('删除后无法恢复。', '删除历史对话', {
      autofocus: false,
      cancelButtonText: '取消',
      closeOnClickModal: false,
      confirmButtonText: '删除',
      customClass: 'app-confirm app-confirm--danger',
      type: 'warning',
    })
  })

  it('treats cancellation as a normal false result', async () => {
    confirmMock.mockRejectedValue('cancel')

    await expect(
      confirmAction({
        title: '确认操作',
        message: '是否继续？',
      }),
    ).resolves.toBe(false)
  })
})
