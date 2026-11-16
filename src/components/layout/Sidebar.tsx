import { History, LayoutDashboard, Laptop, PanelLeftClose, PanelLeftOpen, UserMinus, UserPlus, Users, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { paths } from '@/app/paths'
import { Modal } from '@/components/ui/Modal'
import { getOutstandingReturns } from '@/domain/offboarding'
import { useWorkspace } from '@/store/useWorkspace'
import { cn } from '@/utils/cn'
import { Logo } from './Logo'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  count?: 'onboarding' | 'offboarding'
}

const NAV_ITEMS: NavItem[] = [
  { to: paths.overview, label: 'Overview', icon: LayoutDashboard, end: true },
  { to: paths.assets, label: 'Assets', icon: Laptop },
  { to: paths.employees, label: 'Employees', icon: Users },
  { to: paths.onboarding, label: 'Onboarding', icon: UserPlus, count: 'onboarding' },
  { to: paths.offboarding, label: 'Offboarding', icon: UserMinus, count: 'offboarding' },
  { to: paths.activity, label: 'Activity Log', icon: History },
]

/** Open lifecycle work, shown as counts beside the nav items. */
function useNavCounts(): Record<'onboarding' | 'offboarding', number> {
  const { status, data } = useWorkspace()
  if (status !== 'ready') return { onboarding: 0, offboarding: 0 }
  return {
    onboarding: data.onboarding.filter((r) => !r.completedAt).length,
    offboarding: data.offboarding.filter((r) => !r.completedAt && getOutstandingReturns(r).length > 0).length,
  }
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const counts = useNavCounts()
  return (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-3">
      <ul className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const count = item.count ? counts[item.count] : 0
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors',
                    isActive ? 'bg-accent-50 text-accent-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                    collapsed && 'justify-center px-0',
                  )
                }
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                <span className={cn('flex-1 truncate', collapsed && 'sr-only')}>{item.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'rounded-full bg-zinc-100 px-1.5 text-[11px] font-semibold text-zinc-600 tabular-nums group-aria-[current=page]:bg-accent-100 group-aria-[current=page]:text-accent-700',
                      collapsed && 'sr-only',
                    )}
                  >
                    {count}
                    <span className="sr-only"> open</span>
                  </span>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-zinc-200 bg-white transition-[width] duration-150 lg:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className={cn('flex h-14 items-center border-b border-zinc-100', collapsed ? 'justify-center' : 'px-4')}>
          <Logo withName={!collapsed} />
        </div>
        <SidebarNav collapsed={collapsed} />
        <div className="border-t border-zinc-100 p-2">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" aria-hidden /> : <PanelLeftClose className="size-4" aria-hidden />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <Modal open={mobileOpen} onClose={onMobileClose} title={<Logo />} variant="drawer-left" size="sm">
        <div className="-mx-3 -my-2">
          <SidebarNav collapsed={false} onNavigate={onMobileClose} />
        </div>
      </Modal>
    </>
  )
}
