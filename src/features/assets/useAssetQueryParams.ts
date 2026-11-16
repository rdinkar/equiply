import { useUrlState } from '@/hooks/useUrlState'
import { parseAssetQuery, serializeAssetQuery, type AssetQuery } from './assetQuery'

const RESET_PAGE: Partial<AssetQuery> = { page: 1 }

/** Inventory view state in the URL; any change other than paging returns to page 1. */
export function useAssetQueryParams() {
  return useUrlState(parseAssetQuery, serializeAssetQuery, { resetOnChange: RESET_PAGE })
}
