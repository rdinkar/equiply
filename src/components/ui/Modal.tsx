import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { IconButton } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Centered dialog, or a full-height panel from the right or left edge. */
  variant?: 'dialog' | 'drawer-right' | 'drawer-left'
  size?: 'sm' | 'md' | 'lg'
  /** Hide the title visually (still announced) for drawers with their own header. */
  hideTitle?: boolean
}

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
const drawerWidths = { sm: 'max-w-72', md: 'max-w-md', lg: 'max-w-xl' }

/**
 * Built on the native <dialog> element. showModal() gives a real focus trap,
 * an inert background and Escape-to-close without a library. Content mounts
 * only while open, so forms start fresh each time.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'dialog',
  size = 'md',
  hideTitle = false,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const isDrawer = variant !== 'dialog'

  return (
    // The backdrop click is a mouse convenience; keyboard users close with Escape (onCancel) or the Close button.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // A click on the <dialog> itself (not its content) is a backdrop click.
        if (event.target === ref.current) onClose()
      }}
      className={cn(
        'bg-transparent p-0 text-zinc-900 backdrop:bg-zinc-900/35',
        isDrawer
          ? cn('m-0 h-dvh max-h-dvh w-full', drawerWidths[size], variant === 'drawer-right' ? 'ml-auto' : 'mr-auto')
          : cn('m-auto w-[calc(100%-2rem)]', widths[size]),
      )}
    >
      {open && (
        <div
          className={cn(
            'flex flex-col bg-white',
            isDrawer ? 'h-full border-zinc-200 shadow-xl' : 'max-h-[85dvh] rounded-xl shadow-xl ring-1 ring-zinc-200',
            variant === 'drawer-right' && 'border-l',
            variant === 'drawer-left' && 'border-r',
          )}
        >
          <header className="flex items-start gap-3 border-b border-zinc-200 px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className={cn('text-base font-semibold text-zinc-900', hideTitle && 'sr-only')}>
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-0.5 text-[13px] text-zinc-500">
                  {description}
                </p>
              )}
            </div>
            <IconButton icon={X} label="Close" onClick={onClose} className="-mr-1.5 -mt-1" />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-zinc-50/60 px-5 py-3">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
