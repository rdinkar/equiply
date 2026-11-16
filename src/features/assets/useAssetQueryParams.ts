import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { ASSET_PARAM } from '@/app/paths'
import { parseAssetQuery, serializeAssetQuery, type AssetQuery } from './assetQuery'

/**
 * Inventory view state backed by the URL. Any change other than paging
 * resets to page 1. Updates replace the history entry, so typing in search
 * doesn't flood Back. The open drawer (?asset=) is preserved.
 */
export function useAssetQueryParams(): [AssetQuery, (patch: Partial<AssetQuery>) => void] {
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => parseAssetQuery(params), [params])

  const update = useCallback(
    (patch: Partial<AssetQuery>) =>
      setParams(
        (prev) => {
          const current = parseAssetQuery(prev)
          const next = serializeAssetQuery({ ...current, ...patch, page: patch.page ?? 1 })
          const openAsset = prev.get(ASSET_PARAM)
          if (openAsset) next.set(ASSET_PARAM, openAsset)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  return [query, update]
}
