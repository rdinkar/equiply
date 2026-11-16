import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { ToastContext, type Toast, type ToastApi, type ToastTone } from './toastContext'

const DISMISS_AFTER_MS = 5000

/**
 * Success and error feedback for mutations. Success toasts go to a polite
 * live region. Errors use role="alert" so screen readers announce them at once.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++
      setToasts((all) => [...all.slice(-2), { id, tone, message }])
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push],
  )

  return (
    <ToastContext value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96">
        <div role="status" aria-live="polite" className="contents">
          {toasts
            .filter((t) => t.tone === 'success')
            .map((t) => (
              <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
            ))}
        </div>
        {toasts
          .filter((t) => t.tone === 'error')
          .map((t) => (
            <div key={t.id} role="alert" className="contents">
              <ToastCard toast={t} onDismiss={dismiss} />
            </div>
          ))}
      </div>
    </ToastContext>
  )
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const Icon = toast.tone === 'success' ? CircleCheck : CircleAlert
  return (
    <div className="pointer-events-auto flex w-full items-start gap-2.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-sm shadow-lg">
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', toast.tone === 'success' ? 'text-emerald-600' : 'text-red-600')}
        aria-hidden
      />
      <p className="flex-1 text-zinc-800">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-m-1 rounded p-1 text-zinc-400 hover:text-zinc-700"
        aria-label="Dismiss notification"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}
