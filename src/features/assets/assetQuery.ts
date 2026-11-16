import type { SortDirection } from '@/components/data-display/DataTable'
import {
  ASSET_CATEGORIES,
  ASSET_CONDITIONS,
  ASSET_STATUSES,
  type Asset,
  type AssetCategory,
  type AssetCondition,
  type AssetStatus,
  type Employee,
} from '@/types/domain'

export const ASSET_SORT_KEYS = ['assetTag', 'purchaseDate', 'warrantyExpiry'] as const
export type AssetSortKey = (typeof ASSET_SORT_KEYS)[number]

/** Everything that shapes the inventory view; it lives in the URL so views are shareable. */
export interface AssetQuery {
  q: string
  category: AssetCategory | 'all'
  status: AssetStatus | 'all'
  condition: AssetCondition | 'all'
  sort: AssetSortKey
  dir: SortDirection
  page: number
}

export const DEFAULT_ASSET_QUERY: AssetQuery = {
  q: '',
  category: 'all',
  status: 'all',
  condition: 'all',
  sort: 'assetTag',
  dir: 'asc',
  page: 1,
}

export const ASSET_PAGE_SIZE = 12

export function filterAndSortAssets(
  assets: Asset[],
  employeesById: Map<string, Employee>,
  query: AssetQuery,
): Asset[] {
  const q = query.q.trim().toLowerCase()
  const filtered = assets.filter((asset) => {
    if (query.category !== 'all' && asset.category !== query.category) return false
    if (query.status !== 'all' && asset.status !== query.status) return false
    if (query.condition !== 'all' && asset.condition !== query.condition) return false
    if (!q) return true
    const holder = asset.assignedEmployeeId ? employeesById.get(asset.assignedEmployeeId)?.name : undefined
    return [asset.name, asset.assetTag, asset.serialNumber, holder].some((v) => v?.toLowerCase().includes(q))
  })

  const direction = query.dir === 'asc' ? 1 : -1
  const byTag = (a: Asset, b: Asset) => tagNumber(a) - tagNumber(b)
  return filtered.sort((a, b) =>
    query.sort === 'assetTag'
      ? direction * byTag(a, b)
      : direction * a[query.sort].localeCompare(b[query.sort]) || byTag(a, b),
  )
}

/** Tags end in a global sequence number (EQ-LAP-0007), so tag order is the order assets were added. */
function tagNumber(asset: Asset): number {
  return Number(asset.assetTag.slice(asset.assetTag.lastIndexOf('-') + 1)) || 0
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

export function parseAssetQuery(params: URLSearchParams): AssetQuery {
  const page = Number(params.get('page'))
  return {
    q: params.get('q') ?? '',
    category: oneOf(params.get('category'), ASSET_CATEGORIES, 'all'),
    status: oneOf(params.get('status'), ASSET_STATUSES, 'all'),
    condition: oneOf(params.get('condition'), ASSET_CONDITIONS, 'all'),
    sort: oneOf(params.get('sort'), ASSET_SORT_KEYS, DEFAULT_ASSET_QUERY.sort),
    dir: oneOf(params.get('dir'), ['asc', 'desc'] as const, DEFAULT_ASSET_QUERY.dir),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

export function serializeAssetQuery(query: AssetQuery): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of Object.keys(DEFAULT_ASSET_QUERY) as (keyof AssetQuery)[]) {
    const value = query[key]
    if (value !== DEFAULT_ASSET_QUERY[key] && value !== '') params.set(key, String(value))
  }
  return params
}

export function hasActiveFilters(query: AssetQuery): boolean {
  return query.q.trim() !== '' || query.category !== 'all' || query.status !== 'all' || query.condition !== 'all'
}
