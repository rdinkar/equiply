import { cn } from '@/utils/cn'

export interface ChipOption<T extends string> {
  value: T
  label: string
  count?: number
}

interface ChipGroupProps<T extends string> {
  /** Accessible name for the group, e.g. "Filter by status". */
  label: string
  options: ChipOption<T>[]
  value: T
  onChange: (value: T) => void
}

/** Single-select filter chips with counts. Toggle buttons with aria-pressed. */
export function ChipGroup<T extends string>({ label, options, value, onChange }: ChipGroupProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
              active
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn('tabular-nums', active ? 'text-zinc-300' : 'text-zinc-400')}>{option.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
