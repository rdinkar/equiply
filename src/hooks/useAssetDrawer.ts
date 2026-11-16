import { useCallback } from 'react'
import { useLocation, useSearchParams, type To } from 'react-router'
import { ASSET_PARAM, withAssetParam } from '@/app/paths'

/** Read and drive the URL-backed asset drawer from any page. */
export function useAssetDrawer() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const assetId = params.get(ASSET_PARAM)

  const open = useCallback(
    (id: string) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set(ASSET_PARAM, id)
        return next
      }),
    [setParams],
  )

  const close = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete(ASSET_PARAM)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  /** Link target that opens the drawer on top of the current page. */
  const linkTo = useCallback(
    (id: string): To => ({ pathname: location.pathname, search: withAssetParam(location.search, id) }),
    [location.pathname, location.search],
  )

  return { assetId, open, close, linkTo }
}
