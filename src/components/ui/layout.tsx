import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { initials } from '@/utils/format'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Rendered above the title, e.g. a back link. */
  eyebrow?: ReactNode
}

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {eyebrow}
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

interface CardProps {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** Remove body padding for edge-to-edge tables and lists. */
  flush?: boolean
}

export function Card({ title, description, actions, children, className, flush = false }: CardProps) {
  return (
    <section className={cn('rounded-xl border border-zinc-200 bg-white shadow-xs', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>}
            {description && <p className="text-xs text-zinc-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={flush ? undefined : 'p-4'}>{children}</div>
    </section>
  )
}

const avatarSizes = { sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-12 text-base' }

/** Deterministic tint per name, so a person keeps the same color everywhere. */
const avatarTints = [
  'bg-sky-100 text-sky-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-violet-100 text-violet-800',
  'bg-rose-100 text-rose-800',
  'bg-teal-100 text-teal-800',
]

export function Avatar({ name, size = 'md', className }: { name: string; size?: keyof typeof avatarSizes; className?: string }) {
  const tint = avatarTints[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % avatarTints.length]
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', avatarSizes[size], tint, className)}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

interface DescriptionListProps {
  items: { label: string; value: ReactNode }[]
  className?: string
}

export function DescriptionList({ items, className }: DescriptionListProps) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-zinc-500">{item.label}</dt>
          <dd className="mt-0.5 text-sm break-words text-zinc-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
