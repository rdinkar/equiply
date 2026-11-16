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

let fallbackCounter = 0

/**
 * crypto.randomUUID only exists in secure contexts (https, localhost). Testing
 * on a phone over plain-http LAN would otherwise make every write fail.
 */
function randomSuffix(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return crypto.randomUUID().slice(0, 8)
  fallbackCounter += 1
  return `${Date.now().toString(36)}${fallbackCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function createDomainContext(actor: string = CURRENT_ADMIN.name): DomainContext {
  return {
    now: new Date().toISOString(),
    actor,
    newId: (prefix) => `${prefix}_${randomSuffix()}`,
  }
}
