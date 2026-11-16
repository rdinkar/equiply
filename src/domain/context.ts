/** The signed-in IT admin. There is no auth in this exercise, so it is fixed. */
export const CURRENT_ADMIN = { name: 'Jordan Lee', title: 'IT Administrator', email: 'jordan.lee@equiply.dev' }

/**
 * Everything a domain operation needs from the outside world. Passing it in
 * keeps the operations pure and lets tests pin the clock and the ids.
 */
export interface DomainContext {
  /** ISO timestamp used for every write in the operation. */
  now: string
  /** Display name recorded as `performedBy`. */
  actor: string
  newId: (prefix: string) => string
}

export function createDomainContext(actor: string = CURRENT_ADMIN.name): DomainContext {
  return {
    now: new Date().toISOString(),
    actor,
    newId: (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`,
  }
}
