import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type BadgeTone = 'neutral' | 'green' | 'blue' | 'amber' | 'red' | 'violet'

const tones: Record<BadgeTone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-zinc-100 text-zinc-700 ring-zinc-200', dot: 'bg-zinc-400' },
  green: { badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  blue: { badge: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  amber: { badge: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  red: { badge: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  violet: { badge: 'bg-violet-50 text-violet-800 ring-violet-200', dot: 'bg-violet-500' },
}

/** Status pill. The text always carries the meaning; the color only reinforces it. */
export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        tones[tone].badge,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', tones[tone].dot)} aria-hidden />
      {children}
    </span>
  )
}
