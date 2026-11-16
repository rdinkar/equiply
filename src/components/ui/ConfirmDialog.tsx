import type { ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  tone?: 'primary' | 'danger'
  isPending?: boolean
  error?: string | null
  onConfirm: () => void
  onClose: () => void
  /** Optional extra fields, such as a reason input. */
  children?: ReactNode
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  isPending = false,
  error,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      dismissible={!isPending}
      footer={
        <>
          <Button onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={isPending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-zinc-600">
        <div>{description}</div>
        {children}
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
