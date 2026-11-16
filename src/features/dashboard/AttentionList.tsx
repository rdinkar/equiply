import { CalendarClock, CircleCheck, UserMinus, UserPlus, Wrench, type LucideIcon } from 'lucide-react'
import { Link, type To } from 'react-router'
import { paths } from '@/app/paths'
import { EmptyState } from '@/components/ui/feedback'
import { useAssetDrawer } from '@/hooks/useAssetDrawer'
import { cn } from '@/utils/cn'
import type { AttentionItem, AttentionKind } from './dashboardSelectors'

const KIND_META: Record<AttentionKind, { heading: string; icon: LucideIcon; tone: string }> = {
  returns: { heading: 'Equipment to recover', icon: UserMinus, tone: 'bg-amber-50 text-amber-700' },
  joiner: { heading: 'Joiners to prepare', icon: UserPlus, tone: 'bg-violet-50 text-violet-700' },
  warranty: { heading: 'Warranties ending', icon: CalendarClock, tone: 'bg-sky-50 text-sky-700' },
  repair: { heading: 'In repair', icon: Wrench, tone: 'bg-zinc-100 text-zinc-600' },
}

interface AttentionListProps {
  items: AttentionItem[]
  /** Flat list without group headings, for the notifications menu. */
  compact?: boolean
  onNavigate?: () => void
}

export function AttentionList({ items, compact = false, onNavigate }: AttentionListProps) {
  const drawer = useAssetDrawer()
  const linkFor = (item: AttentionItem): To =>
    item.target.entityType === 'asset' ? drawer.linkTo(item.target.entityId) : paths.employee(item.target.entityId)

  if (items.length === 0) {
    return <EmptyState icon={CircleCheck} title="Nothing needs attention" description="No pending returns, unprepared joiners, or expiring warranties." className="py-8" />
  }

  const row = (item: AttentionItem) => {
    const meta = KIND_META[item.kind]
    return (
      <li key={item.id}>
        <Link to={linkFor(item)} onClick={onNavigate} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50">
          <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', meta.tone)}>
            <meta.icon className="size-3.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-zinc-900">{item.title}</span>
            <span className="block truncate text-xs text-zinc-500">{item.detail}</span>
          </span>
          {item.severity === 'warning' && (
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200 ring-inset">
              Due soon
            </span>
          )}
        </Link>
      </li>
    )
  }

  if (compact) return <ul className="divide-y divide-zinc-100">{items.map(row)}</ul>

  const groups = (Object.keys(KIND_META) as AttentionKind[])
    .map((kind) => ({ kind, items: items.filter((i) => i.kind === kind) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="divide-y divide-zinc-100">
      {groups.map((group) => (
        <section key={group.kind} aria-label={KIND_META[group.kind].heading}>
          <h3 className="bg-zinc-50/60 px-4 pt-3 pb-1.5 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
            {KIND_META[group.kind].heading} <span className="font-normal text-zinc-500">· {group.items.length}</span>
          </h3>
          <ul className="divide-y divide-zinc-100">{group.items.map(row)}</ul>
        </section>
      ))}
    </div>
  )
}
