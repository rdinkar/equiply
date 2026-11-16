import { ChevronRight, Menu } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useMatches, type Params } from 'react-router'
import { IconButton } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/layout'
import { CURRENT_ADMIN } from '@/domain/context'
import { useWorkspace } from '@/store/useWorkspace'
import type { WorkspaceData } from '@/types/domain'
import { GlobalSearch } from './GlobalSearch'

export interface RouteHandle {
  crumb: (ctx: { params: Params; data: WorkspaceData | null }) => string
}

function hasCrumb(handle: unknown): handle is RouteHandle {
  return typeof handle === 'object' && handle !== null && typeof (handle as RouteHandle).crumb === 'function'
}

function Breadcrumbs() {
  const matches = useMatches()
  const { data } = useWorkspace()
  const crumbs = matches
    .filter((match) => hasCrumb(match.handle))
    .map((match) => ({
      id: match.id,
      to: match.pathname,
      label: (match.handle as RouteHandle).crumb({ params: match.params, data }),
    }))

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
      <ol className="flex items-center gap-1.5 text-[13px]">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1
          return (
            <li key={crumb.id} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-zinc-300" aria-hidden />}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-zinc-900">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.to} className="truncate text-zinc-500 hover:text-zinc-900">
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function Topbar({ onOpenNav, notifications }: { onOpenNav: () => void; notifications?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <IconButton icon={Menu} label="Open navigation" onClick={onOpenNav} className="-ml-1.5 lg:hidden" />
      <Breadcrumbs />
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
        <GlobalSearch />
        {notifications}
        <div className="flex items-center gap-2 pl-1" title={`${CURRENT_ADMIN.name}, ${CURRENT_ADMIN.title}`}>
          <Avatar name={CURRENT_ADMIN.name} />
          <span className="sr-only">
            Signed in as {CURRENT_ADMIN.name}, {CURRENT_ADMIN.title}
          </span>
        </div>
      </div>
    </header>
  )
}
