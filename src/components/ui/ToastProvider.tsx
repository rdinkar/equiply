import { CircleCheck, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTopLayerHost } from '@/hooks/useTopLayerHost'
import { ToastContext, type Toast, type ToastApi } from './toastContext'

const DISMISS_AFTER_MS = 5000

/**
 * Success and error feedback for mutations. The stack renders inside the topmost
 * open dialog (see useTopLayerHost) so an open drawer never hides it, in a polite live region.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const host = useTopLayerHost()

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), [])

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => {
        const id = nextId.current++
        setToasts((all) => [...all.slice(-2), { id, message }])
        window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS)
      },
    }),
    [dismiss],
  )

  return (
    <ToastContext value={api}>
      {children}
      {host &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96">
            <div role="status" aria-live="polite" className="contents">
              {toasts.map((t) => (
                <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
              ))}
            </div>
          </div>,
          host,
        )}
    </ToastContext>
  )
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-auto flex w-full items-start gap-2.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-3 text-sm shadow-lg">
      <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
      <p className="flex-1 text-zinc-800">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-m-1 rounded p-1 text-zinc-500 hover:text-zinc-700"
        aria-label="Dismiss notification"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}
