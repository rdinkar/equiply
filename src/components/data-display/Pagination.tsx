import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  /** e.g. "assets", for the range label. */
  noun: string
}

export function Pagination({ page, pageSize, total, onPageChange, noun }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-2.5 text-[13px] text-zinc-500"
    >
      <p>
        Showing <span className="font-medium text-zinc-800">{from}–{to}</span> of{' '}
        <span className="font-medium text-zinc-800">{total}</span> {noun}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1.5">
          <Button size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <span className="sr-only sm:not-sr-only">Previous</span>
          </Button>
          <span className="px-1 tabular-nums" aria-current="page">
            {page} / {pageCount}
          </span>
          <Button size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
            <span className="sr-only sm:not-sr-only">Next</span>
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </nav>
  )
}
