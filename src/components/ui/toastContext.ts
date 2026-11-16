import { createContext, use } from 'react'

export interface Toast {
  id: number
  message: string
}

/**
 * Success confirmations only. Errors are shown inline in the dialog or form
 * that caused them, next to the thing the user can fix.
 */
export interface ToastApi {
  success: (message: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = use(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
