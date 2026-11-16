import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysBetween,
  formatDate,
  formatRelative,
  parseISODate,
  toISODate,
} from './date'

describe('date utils', () => {
  it('formats a date-only string on the same calendar day west of UTC', () => {
    // vitest runs with TZ=America/Los_Angeles (see vite.config.ts), where
    // new Date('2026-11-16') would be Nov 15 at 4pm local time.
    expect(new Date('2026-11-16').getDate()).toBe(15) // guard: TZ really is west of UTC
    expect(formatDate('2026-11-16')).toBe('Nov 16, 2026')
  })

  it('parses date-only strings as local midnight', () => {
    const d = parseISODate('2026-03-05')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 5, 0])
  })

  it('round-trips through toISODate and addDays across a month boundary', () => {
    expect(toISODate(addDays(parseISODate('2026-11-16'), 30))).toBe('2026-12-16')
    expect(toISODate(addDays(parseISODate('2026-03-01'), -1))).toBe('2026-02-28')
  })

  it('counts whole days between two dates, negative when in the past', () => {
    expect(daysBetween('2026-11-16', '2026-12-16')).toBe(30)
    expect(daysBetween('2026-11-16', '2026-11-10')).toBe(-6)
  })

  it('describes timestamps relative to now', () => {
    const now = new Date('2026-11-16T12:00:00Z')
    expect(formatRelative('2026-11-16T11:58:00Z', now)).toBe('2 minutes ago')
    expect(formatRelative('2026-11-13T12:00:00Z', now)).toBe('3 days ago')
    expect(formatRelative('2026-11-21T12:00:00Z', now)).toBe('in 5 days')
  })
})
