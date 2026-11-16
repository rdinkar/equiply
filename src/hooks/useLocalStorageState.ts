import { useEffect, useState } from 'react'

/**
 * useState that survives reloads, for per-viewer UI conveniences only (such as
 * sidebar collapse). Storage can be unavailable (private mode, blocked
 * cookies), so every access is guarded and the in-memory value still works.
 */
export function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage unavailable; keep the in-memory value.
    }
  }, [key, value])

  return [value, setValue] as const
}
