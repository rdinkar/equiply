import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { controlClasses } from '@/components/ui/Field'
import { ASSET_CATEGORIES, ASSET_CONDITIONS, ASSET_STATUSES, type AssetStatus } from '@/types/domain'
import { cn } from '@/utils/cn'
import { hasActiveFilters, type AssetQuery, type AssetSortKey } from './assetQuery'

interface AssetFiltersProps {
  query: AssetQuery
  onChange: (patch: Partial<AssetQuery>) => void
  statusCounts: Record<AssetStatus | 'all', number>
}

const SORT_OPTIONS: { value: `${AssetSortKey}:${'asc' | 'desc'}`; label: string }[] = [
  { value: 'assetTag:asc', label: 'Asset tag' },
  { value: 'purchaseDate:desc', label: 'Newest purchase' },
  { value: 'purchaseDate:asc', label: 'Oldest purchase' },
  { value: 'warrantyExpiry:asc', label: 'Warranty ending soonest' },
  { value: 'warrantyExpiry:desc', label: 'Warranty ending latest' },
]

export function AssetFilters({ query, onChange, statusCounts }: AssetFiltersProps) {
  const statusOptions: (AssetStatus | 'all')[] = ['all', ...ASSET_STATUSES]
  return (
    <div className="mb-4 space-y-3">
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
        {statusOptions.map((status) => {
          const active = query.status === status
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ status })}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
                active
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
              )}
            >
              {status === 'all' ? 'All' : status}
              <span className={cn('tabular-nums', active ? 'text-zinc-300' : 'text-zinc-400')}>{statusCounts[status]}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
          <input
            type="search"
            aria-label="Search assets"
            placeholder="Search name, tag, serial, or employee"
            value={query.q}
            onChange={(event) => onChange({ q: event.target.value })}
            className={cn(controlClasses, 'h-9 w-full pl-8')}
          />
        </div>
        <select
          aria-label="Category"
          value={query.category}
          onChange={(event) => onChange({ category: event.target.value as AssetQuery['category'] })}
          className={cn(controlClasses, 'h-9 w-auto pr-8')}
        >
          <option value="all">All categories</option>
          {ASSET_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          aria-label="Condition"
          value={query.condition}
          onChange={(event) => onChange({ condition: event.target.value as AssetQuery['condition'] })}
          className={cn(controlClasses, 'h-9 w-auto pr-8')}
        >
          <option value="all">Any condition</option>
          {ASSET_CONDITIONS.map((condition) => (
            <option key={condition} value={condition}>
              {condition}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort by"
          value={`${query.sort}:${query.dir}`}
          onChange={(event) => {
            const [sort, dir] = event.target.value.split(':') as [AssetSortKey, 'asc' | 'desc']
            onChange({ sort, dir })
          }}
          className={cn(controlClasses, 'h-9 w-auto pr-8')}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </select>
        {hasActiveFilters(query) && (
          <Button
            variant="ghost"
            size="sm"
            icon={X}
            onClick={() => onChange({ q: '', category: 'all', status: 'all', condition: 'all' })}
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
