import { useState, type ReactNode } from 'react'
import { Outlet } from 'react-router'
import { useLocalStorageState } from '@/hooks/useLocalStorageState'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { WorkspaceGate } from './WorkspaceGate'

interface AppShellProps {
  /** Rendered in the top bar (the notifications menu). */
  notifications?: ReactNode
  /** Overlays that live outside the page flow, such as the asset drawer. */
  overlays?: ReactNode
}

export function AppShell({ notifications, overlays }: AppShellProps) {
  const [collapsed, setCollapsed] = useLocalStorageState('equiply.sidebarCollapsed', false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setMobileNavOpen(true)} notifications={notifications} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8">
          <WorkspaceGate>
            <Outlet />
            {overlays}
          </WorkspaceGate>
        </main>
      </div>
    </div>
  )
}
