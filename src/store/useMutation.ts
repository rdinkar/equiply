import { useCallback, useState } from 'react'

export type MutationResult<T> = { ok: true; value: T } | { ok: false; error: Error }

/**
 * Tracks one async action's pending and error state for a button or form.
 * `mutate` never rejects. It resolves to a result, so a caller can't forget
 * a catch and leak an unhandled rejection.
 */
export function useMutation<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>) {
  const [isPending, setPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(
    async (...args: TArgs): Promise<MutationResult<TResult>> => {
      setPending(true)
      setError(null)
      try {
        const value = await fn(...args)
        return { ok: true, value }
      } catch (caught) {
        const err = caught instanceof Error ? caught : new Error(String(caught))
        setError(err)
        return { ok: false, error: err }
      } finally {
        setPending(false)
      }
    },
    [fn],
  )

  const reset = useCallback(() => setError(null), [])

  return { mutate, isPending, error, reset }
}
