import { AppShell } from '@/components/layout/AppShell'
import { AssetDrawer } from '@/features/assets/AssetDrawer'
import { NotificationsMenu } from '@/features/dashboard/NotificationsMenu'

/** Composes the generic shell with feature-owned pieces (kept out of components/layout). */
export function RootLayout() {
  return <AppShell notifications={<NotificationsMenu />} overlays={<AssetDrawer />} />
}
