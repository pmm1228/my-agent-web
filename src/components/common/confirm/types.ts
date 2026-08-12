export type ConfirmType = 'default' | 'warning' | 'danger'

export interface ConfirmOptions {
  title: string
  message: string
  type?: ConfirmType
  confirmText?: string
  cancelText?: string
  closeOnClickModal?: boolean
}
