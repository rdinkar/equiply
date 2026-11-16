import { PackageSearch, Plus, RotateCcw, UserCheck, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Pagination } from '@/components/data-display/Pagination'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/layout'
import { getAssetActions } from '@/domain/lifecycle'
import { indexById } from '@/domain/selectors'
import { useAssetDrawer } from '@/hooks/useAssetDrawer'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useWorkspaceData } from '@/store/useWorkspace'
import { getDashboardMetrics } from '@/features/dashboard/dashboardSelectors'
import { ASSET_STATUSES, type Asset, type AssetStatus } from '@/types/domain'
import { AssetDialogs, type AssetDialogState } from './AssetDialogs'
import { AssetFilters } from './AssetFilters'
import { ASSET_PAGE_SIZE, filterAndSortAssets, hasActiveFilters, type AssetQuery, type AssetSortKey } from './assetQuery'
import { AssetTable } from './AssetTable'
import { useAssetQueryParams } from './useAssetQueryParams'

const CLEARED: Partial<AssetQuery> = { q: '', category: 'all', status: 'all', condition: 'all' }

const DEFAULT_DIRECTION: Record<AssetSortKey, 'asc' | 'desc'> = {
  assetTag: 'asc',
  purchaseDate: 'desc',
  warrantyExpiry: 'asc',
}

export function AssetsPage() {
  useDocumentTitle('Assets')
  const data = useWorkspaceData()
  const [dialog, setDialog] = useState<AssetDialogState>(null)
  const drawer = useAssetDrawer()
  const [query, setQuery] = useAssetQueryParams()
  // The search box is uncontrolled; clearing remounts it with an explicit empty value
  // (the URL update lands a beat later, inside a transition).
  const [search, setSearch] = useState(() => ({ key: 0, initial: query.q }))
  const clearFilters = () => {
    setQuery(CLEARED)
    setSearch((s) => ({ key: s.key + 1, initial: '' }))
  }
  // Typing stays responsive; the filter catches up on the deferred value.
  const deferredQ = useDeferredValue(query.q)

  const employeesById = useMemo(() => indexById(data.employees), [data.employees])
  const results = useMemo(
    () => filterAndSortAssets(data.assets, employeesById, { ...query, q: deferredQ }),
    [data.assets, employeesById, query, deferredQ],
  )
  const statusCounts = useMemo(() => {
    const counts = { all: data.assets.length } as Record<AssetStatus | 'all', number>
    for (const status of ASSET_STATUSES) counts[status] = data.assets.filter((a) => a.status === status).length
    return counts
  }, [data.assets])

  // Same numbers the overview shows, so a metric click-through matches its page.
  const metrics = useMemo(() => getDashboardMetrics(data), [data])

  const pageCount = Math.max(1, Math.ceil(results.length / ASSET_PAGE_SIZE))
  const page = Math.min(query.page, pageCount)
  const pageRows = results.slice((page - 1) * ASSET_PAGE_SIZE, page * ASSET_PAGE_SIZE)

  const onSortChange = (key: string) => {
    const sort = key as AssetSortKey
    setQuery(
      sort === query.sort ? { sort, dir: query.dir === 'asc' ? 'desc' : 'asc' } : { sort, dir: DEFAULT_DIRECTION[sort] },
    )
  }

  const filtered = hasActiveFilters(query)

  /** One quick action per row (the next lifecycle step); everything else lives in the drawer. */
  const renderRowActions = (asset: Asset) => {
    const actions = getAssetActions(asset)
    const label = `${asset.name} (${asset.assetTag})`
    if (actions.assign)
      return (
        <Button size="sm" icon={UserCheck} aria-label={`Assign ${label}`} onClick={() => setDialog({ kind: 'assign', assetId: asset.id })}>
          Assign
        </Button>
      )
    if (actions.return)
      return (
        <Button size="sm" icon={RotateCcw} aria-label={`Return ${label}`} onClick={() => setDialog({ kind: 'return', assetId: asset.id })}>
          Return
        </Button>
      )
    return null
  }

  return (
    <>
      <PageHeader
        title="Assets"
        description={`${metrics.totalAssets} in service · ${metrics.retired} retired · ${metrics.availableAssets} available to assign`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setDialog({ kind: 'create' })}>
            Add asset
          </Button>
        }
      />
      <AssetFilters query={query} onChange={setQuery} onClear={clearFilters} search={search} statusCounts={statusCounts} />
      <AssetTable
        assets={pageRows}
        employeesById={employeesById}
        sort={{ key: query.sort, dir: query.dir }}
        onSortChange={onSortChange}
        renderActions={renderRowActions}
        emptyState={
          filtered ? (
            <EmptyState
              icon={PackageSearch}
              title="No assets match these filters"
              description="Try a different search term, or clear the filters to see the whole inventory."
              action={
                <Button icon={X} onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={PackageSearch} title="No assets yet" description="Add your first asset to start tracking inventory." />
          )
        }
        footer={
          <Pagination
            page={page}
            pageSize={ASSET_PAGE_SIZE}
            total={results.length}
            noun={results.length === 1 ? 'asset' : 'assets'}
            onPageChange={(next) => setQuery({ page: next })}
          />
        }
      />
      <AssetDialogs state={dialog} onClose={() => setDialog(null)} onCreated={(asset) => drawer.open(asset.id)} />
    </>
  )
}
