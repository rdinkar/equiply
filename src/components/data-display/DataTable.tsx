import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type SortDirection = 'asc' | 'desc'
export interface SortState {
  key: string
  dir: SortDirection
}

export interface Column<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Set to make the column sortable; the value is passed to onSortChange. */
  sortKey?: string
  /** Applied to both header and cells, e.g. responsive `hidden md:table-cell`. */
  className?: string
}

interface DataTableProps<T> {
  /** Screen-reader caption describing the table. */
  caption: string
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string
  /** Mouse convenience; keyboard users reach the same place via a link in the first cell. */
  onRowClick?: (row: T) => void
  sort?: SortState
  onSortChange?: (key: string) => void
  emptyState?: ReactNode
  footer?: ReactNode
}

const INTERACTIVE = 'a, button, input, select, textarea, label'

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  onRowClick,
  sort,
  onSortChange,
  emptyState,
  footer,
}: DataTableProps<T>) {
  const handleRowClick = (row: T) => (event: MouseEvent<HTMLTableRowElement>) => {
    if (!onRowClick) return
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return
    onRowClick(row)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-medium text-zinc-500">
            <tr>
              {columns.map((column) => {
                const active = sort && column.sortKey === sort.key
                const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined
                return (
                  <th key={column.id} scope="col" aria-sort={ariaSort} className={cn('px-3 py-2.5 font-medium whitespace-nowrap first:pl-4 last:pr-4', column.className)}>
                    {column.sortKey && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.sortKey!)}
                        className="-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-zinc-900"
                      >
                        {column.header}
                        {active ? (
                          sort.dir === 'asc' ? (
                            <ChevronUp className="size-3.5" aria-hidden />
                          ) : (
                            <ChevronDown className="size-3.5" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3.5 text-zinc-400" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => (
              // Row click is a mouse shortcut; the first cell holds a real link for keyboard and screen-reader users.
              <tr
                key={getRowId(row)}
                onClick={handleRowClick(row)}
                className={cn('align-middle', onRowClick && 'cursor-pointer transition-colors hover:bg-zinc-50')}
              >
                {columns.map((column) => (
                  <td key={column.id} className={cn('px-3 py-2.5 text-zinc-700 first:pl-4 last:pr-4', column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && emptyState}
      {footer}
    </div>
  )
}

/** Placeholder rows shown while data loads. */
export function TableSkeleton({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs" aria-hidden>
      <div className="h-10 border-b border-zinc-200 bg-zinc-50/80" />
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-b border-zinc-100 px-4 py-3 last:border-0">
          {Array.from({ length: columns }, (_, c) => (
            <div key={c} className="h-4 flex-1 animate-pulse rounded bg-zinc-200/70" />
          ))}
        </div>
      ))}
    </div>
  )
}
