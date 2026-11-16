import { Bell } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { useToday } from '@/hooks/useToday'
import { useWorkspace } from '@/store/useWorkspace'
import { AttentionList } from './AttentionList'
import { getAttentionItems } from './dashboardSelectors'

const MENU_LIMIT = 6

/** Bell in the top bar: the same attention items as the dashboard, reachable from any page. */
export function NotificationsMenu() {
  const { data } = useWorkspace()
  const today = useToday()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  const items = useMemo(() => (data ? getAttentionItems(data, today) : []), [data, today])
  const urgent = items.filter((i) => i.severity === 'warning').length

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Notifications: ${items.length} items need attention${urgent ? `, ${urgent} due soon` : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        disabled={!data}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
      >
        <Bell className="size-4" aria-hidden />
        {urgent > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" aria-hidden />}
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Notifications"
          className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
        >
          <p className="border-b border-zinc-100 px-4 py-2.5 text-[13px] font-semibold text-zinc-900">
            Needs attention <span className="font-normal text-zinc-500">· {items.length}</span>
          </p>
          <div className="max-h-96 overflow-y-auto">
            <AttentionList items={items.slice(0, MENU_LIMIT)} compact onNavigate={() => setOpen(false)} />
          </div>
          {items.length > MENU_LIMIT && (
            <Link
              to={paths.overview}
              onClick={() => setOpen(false)}
              className="block border-t border-zinc-100 px-4 py-2.5 text-center text-[13px] font-medium text-accent-700 hover:bg-zinc-50"
            >
              View all {items.length} on Overview
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
