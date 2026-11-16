import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { DataTable, type Column, type SortState } from '@/components/data-display/DataTable'
import { AssetStatusBadge, CategoryIcon, WarrantyLabel } from '@/components/data-display/StatusBadges'
import { Avatar } from '@/components/ui/layout'
import { useAssetDrawer } from '@/hooks/useAssetDrawer'
import { useToday } from '@/hooks/useToday'
import type { Asset, Employee } from '@/types/domain'
import { formatDate } from '@/utils/date'

interface AssetTableProps {
  assets: Asset[]
  employeesById: Map<string, Employee>
  sort: SortState
  onSortChange: (key: string) => void
  renderActions?: (asset: Asset) => ReactNode
  emptyState: ReactNode
  footer?: ReactNode
}

export function AssetTable({ assets, employeesById, sort, onSortChange, renderActions, emptyState, footer }: AssetTableProps) {
  const drawer = useAssetDrawer()
  const today = useToday()

  const columns: Column<Asset>[] = [
    {
      id: 'tag',
      header: 'Asset tag',
      sortKey: 'assetTag',
      className: 'hidden sm:table-cell',
      cell: (a) => <span className="font-mono text-xs whitespace-nowrap text-zinc-500">{a.assetTag}</span>,
    },
    {
      id: 'name',
      header: 'Asset name',
      cell: (a) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <CategoryIcon category={a.category} />
          <div className="min-w-0">
            <Link to={drawer.linkTo(a.id)} className="block truncate font-medium text-zinc-900 hover:text-accent-700 hover:underline">
              {a.name}
            </Link>
            <span className="block font-mono text-[11px] text-zinc-400 sm:hidden">{a.assetTag}</span>
          </div>
        </div>
      ),
    },
    { id: 'category', header: 'Category', className: 'hidden xl:table-cell', cell: (a) => a.category },
    {
      id: 'model',
      header: 'Manufacturer / Model',
      className: 'hidden 2xl:table-cell max-w-56',
      cell: (a) => (
        <span className="block truncate" title={`${a.manufacturer} ${a.model}`}>
          <span className="text-zinc-900">{a.manufacturer}</span> <span className="text-zinc-500">{a.model}</span>
        </span>
      ),
    },
    {
      id: 'assignee',
      header: 'Assigned to',
      className: 'hidden md:table-cell',
      cell: (a) => {
        const holder = a.assignedEmployeeId ? employeesById.get(a.assignedEmployeeId) : undefined
        return holder ? (
          <Link to={paths.employee(holder.id)} className="inline-flex items-center gap-2 hover:text-accent-700 hover:underline">
            <Avatar name={holder.name} size="sm" />
            <span className="truncate">{holder.name}</span>
          </Link>
        ) : (
          <span className="text-zinc-400">—</span>
        )
      },
    },
    {
      id: 'purchased',
      header: 'Purchased',
      sortKey: 'purchaseDate',
      className: 'hidden lg:table-cell whitespace-nowrap',
      cell: (a) => formatDate(a.purchaseDate),
    },
    {
      id: 'warranty',
      header: 'Warranty',
      sortKey: 'warrantyExpiry',
      className: 'hidden md:table-cell',
      cell: (a) => (a.status === 'Retired' ? <span className="text-zinc-400">—</span> : <WarrantyLabel date={a.warrantyExpiry} today={today} />),
    },
    { id: 'status', header: 'Status', cell: (a) => <AssetStatusBadge status={a.status} /> },
  ]
  if (renderActions) {
    columns.push({
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      // On phones the row opens the drawer, which carries every action.
      className: 'hidden w-px text-right sm:table-cell',
      cell: renderActions,
    })
  }

  return (
    <DataTable
      caption="Asset inventory"
      columns={columns}
      rows={assets}
      getRowId={(a) => a.id}
      onRowClick={(a) => drawer.open(a.id)}
      sort={sort}
      onSortChange={onSortChange}
      emptyState={emptyState}
      footer={footer}
    />
  )
}
