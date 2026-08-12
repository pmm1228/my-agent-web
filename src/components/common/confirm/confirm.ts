import { ElMessageBox } from 'element-plus'

import type { ConfirmOptions } from './types'

export async function confirmAction({
  title,
  message,
  type = 'default',
  confirmText = '确定',
  cancelText = '取消',
  closeOnClickModal = false,
}: ConfirmOptions): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, title, {
      autofocus: false,
      cancelButtonText: cancelText,
      closeOnClickModal,
      confirmButtonText: confirmText,
      customClass: `app-confirm app-confirm--${type}`,
      type: type === 'default' ? undefined : 'warning',
    })

    return true
  } catch {
    return false
  }
}

export type { ConfirmOptions, ConfirmType } from './types'
