import { describe, expect, it } from 'vitest'
import { formatCurrency, pluralize } from './format'

describe('formatCurrency', () => {
  it('drops cents for whole amounts and shows both digits otherwise', () => {
    expect(formatCurrency(1999)).toBe('$1,999')
    expect(formatCurrency(49.5)).toBe('$49.50')
    expect(formatCurrency(1599.99)).toBe('$1,599.99')
  })
})

describe('pluralize', () => {
  it('picks the right form', () => {
    expect(pluralize(1, 'asset')).toBe('1 asset')
    expect(pluralize(3, 'person', 'people')).toBe('3 people')
  })
})
