import { afterEach, describe, expect, it } from 'vitest'
import { createDomainContext } from './context'

describe('createDomainContext', () => {
  afterEach(() => {
    delete (crypto as { randomUUID?: unknown }).randomUUID
  })

  it('still generates unique ids where crypto.randomUUID is missing (plain-http LAN testing)', () => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    const ctx = createDomainContext()
    const ids = new Set(Array.from({ length: 50 }, () => ctx.newId('ast')))
    expect(ids.size).toBe(50)
    expect([...ids].every((id) => /^ast_[a-z0-9]+$/.test(id))).toBe(true)
  })
})
