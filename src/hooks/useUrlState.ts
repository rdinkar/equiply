import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { ASSET_PARAM } from '@/app/paths'

interface UrlStateOptions<T> {
  /** Values applied on every change unless the patch sets them, e.g. `{ page: 1 }`. */
  resetOnChange?: Partial<T>
}

/**
 * View state (filters, sort, page) stored in the URL, so views can be shared,
 * bookmarked and restored with Back. Updates replace the history entry, so
 * typing doesn't flood the back stack. The open asset drawer survives changes.
 */
export function useUrlState<T extends object>(
  parse: (params: URLSearchParams) => T,
  serialize: (state: T) => URLSearchParams,
  { resetOnChange }: UrlStateOptions<T> = {},
): [T, (patch: Partial<T>) => void] {
  const [params, setParams] = useSearchParams()
  const state = useMemo(() => parse(params), [parse, params])

  const update = useCallback(
    (patch: Partial<T>) =>
      setParams(
        (prev) => {
          const next = serialize({ ...parse(prev), ...resetOnChange, ...patch })
          const openAsset = prev.get(ASSET_PARAM)
          if (openAsset) next.set(ASSET_PARAM, openAsset)
          return next
        },
        { replace: true },
      ),
    [parse, serialize, resetOnChange, setParams],
  )

  return [state, update]
}
