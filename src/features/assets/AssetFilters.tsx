import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { controlClasses } from '@/components/ui/Field'
import { SearchField } from '@/components/ui/SearchField'
import { ASSET_CATEGORIES, ASSET_CONDITIONS, ASSET_STATUSES, type AssetStatus } from '@/types/domain'
import { cn } from '@/utils/cn'
import { hasActiveFilters, type AssetQuery, type AssetSortKey } from './assetQuery'

interface AssetFiltersProps {
  query: AssetQuery
  onChange: (patch: Partial<AssetQuery>) => void
  onClear: () => void
  /** Remount key and starting text for the search box; changes when filters are cleared. */
  search: { key: number; initial: string }
  statusCounts: Record<AssetStatus | 'all', number>
}

const SORT_OPTIONS: { value: `${AssetSortKey}:${'asc' | 'desc'}`; label: string }[] = [
  { value: 'assetTag:asc', label: 'Asset tag (oldest first)' },
  { value: 'assetTag:desc', label: 'Asset tag (newest first)' },
  { value: 'purchaseDate:desc', label: 'Newest purchase' },
  { value: 'purchaseDate:asc', label: 'Oldest purchase' },
  { value: 'warrantyExpiry:asc', label: 'Warranty ending soonest' },
  { value: 'warrantyExpiry:desc', label: 'Warranty ending latest' },
]

export function AssetFilters({ query, onChange, onClear, search, statusCounts }: AssetFiltersProps) {
  const statusOptions: (AssetStatus | 'all')[] = ['all', ...ASSET_STATUSES]
  return (
    <div className="mb-4 space-y-3">
      <ChipGroup
        label="Filter by status"
        value={query.status}
        onChange={(status) => onChange({ status })}
        options={statusOptions.map((status) => ({
          value: status,
          label: status === 'all' ? 'All' : status,
          count: statusCounts[status],
        }))}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          key={search.key}
          className="min-w-56 flex-1 sm:max-w-sm"
          label="Search assets"
          placeholder="Search name, tag, serial, or employee"
          defaultValue={search.initial}
          onSearch={(q) => onChange({ q })}
        />
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
            onClick={onClear}
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
