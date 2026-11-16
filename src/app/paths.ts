import type { EntityRef } from '@/types/domain'

export const paths = {
  overview: '/',
  assets: '/assets',
  employees: '/employees',
  employee: (id: string) => `/employees/${id}`,
  onboarding: '/onboarding',
  offboarding: '/offboarding',
  activity: '/activity',
}

/** The asset drawer opens over any page through this search param, so it is linkable and Back closes it. */
export const ASSET_PARAM = 'asset'

/** A search string with `?asset=` set (or removed), keeping the page's other params. */
export function withAssetParam(search: string, assetId: string | null): string {
  const params = new URLSearchParams(search)
  if (assetId) params.set(ASSET_PARAM, assetId)
  else params.delete(ASSET_PARAM)
  const next = params.toString()
  return next ? `?${next}` : ''
}

/** Standalone link to an entity, for places with no page context to keep (activity log, notifications). */
export function entityHref(ref: EntityRef): string {
  return ref.entityType === 'asset' ? `${paths.assets}${withAssetParam('', ref.entityId)}` : paths.employee(ref.entityId)
}
