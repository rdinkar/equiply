import type { ReactNode } from 'react'
import { TableSkeleton } from '@/components/data-display/DataTable'
import { ErrorState, Skeleton } from '@/components/ui/feedback'
import { useWorkspace } from '@/store/useWorkspace'

/** Renders pages only once workspace data is loaded; owns the app-wide loading and error states. */
export function WorkspaceGate({ children }: { children: ReactNode }) {
  const { status, error, reload } = useWorkspace()

  if (status === 'loading') {
    return (
      <div role="status" aria-live="polite">
        <span className="sr-only">Loading workspace…</span>
        <Skeleton className="mb-2 h-6 w-48" />
        <Skeleton className="mb-6 h-4 w-72" />
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <TableSkeleton />
      </div>
    )
  }

  if (status === 'error') {
    return <ErrorState title="We couldn’t load your workspace" message={error.message} onRetry={reload} />
  }

  return children
}
