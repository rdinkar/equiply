/** Narrow a URL param to an allowed value, falling back for anything unknown. */
export function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

/** Serialize a flat query object, leaving out values equal to their defaults so URLs stay short. */
export function serializeQuery<T extends Record<string, string | number>>(query: T, defaults: T): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    const value = query[key]
    if (value !== defaults[key] && value !== '') params.set(key, String(value))
  }
  return params
}
