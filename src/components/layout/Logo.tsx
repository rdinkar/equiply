import { cn } from '@/utils/cn'

export function Logo({ withName = true, className }: { withName?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill="var(--color-accent-600)" />
        <path d="M9 10h14M9 16h10M9 22h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {withName ? (
        <span className="text-[15px] font-semibold tracking-tight text-zinc-900">Equiply</span>
      ) : (
        <span className="sr-only">Equiply</span>
      )}
    </span>
  )
}
