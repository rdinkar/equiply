import { AppShell } from '@/components/layout/AppShell'
import { AssetDrawer } from '@/features/assets/AssetDrawer'

/** Composes the generic shell with feature-owned pieces (kept out of components/layout). */
export function RootLayout() {
  return <AppShell overlays={<AssetDrawer />} />
}
