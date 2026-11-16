import { PackageSearch, X } from 'lucide-react'
import { useDeferredValue, useMemo, type ReactNode } from 'react'
import { Pagination } from '@/components/data-display/Pagination'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/layout'
import { indexById } from '@/domain/selectors'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useWorkspaceData } from '@/store/useWorkspace'
import { ASSET_STATUSES, type Asset, type AssetStatus } from '@/types/domain'
import { AssetFilters } from './AssetFilters'
import { ASSET_PAGE_SIZE, filterAndSortAssets, hasActiveFilters, type AssetSortKey } from './assetQuery'
import { AssetTable } from './AssetTable'
import { useAssetQueryParams } from './useAssetQueryParams'

const DEFAULT_DIRECTION: Record<AssetSortKey, 'asc' | 'desc'> = {
  assetTag: 'asc',
  purchaseDate: 'desc',
  warrantyExpiry: 'asc',
}

interface AssetsPageProps {
  /** Header actions (Add asset) and per-row actions, supplied by the asset actions layer. */
  headerActions?: ReactNode
  renderRowActions?: (asset: Asset) => ReactNode
}

export function AssetsPage({ headerActions, renderRowActions }: AssetsPageProps = {}) {
  useDocumentTitle('Assets')
  const data = useWorkspaceData()
  const [query, setQuery] = useAssetQueryParams()
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

  return (
    <>
      <PageHeader
        title="Assets"
        description={`${statusCounts.all} assets · ${statusCounts.Available} available to assign`}
        actions={headerActions}
      />
      <AssetFilters query={query} onChange={setQuery} statusCounts={statusCounts} />
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
                <Button icon={X} onClick={() => setQuery({ q: '', category: 'all', status: 'all', condition: 'all' })}>
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
    </>
  )
}
