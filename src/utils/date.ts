/**
 * Date helpers built on Intl, with no date library.
 *
 * Calendar dates (purchase date, joining date, warranty expiry) are stored as
 * `YYYY-MM-DD` strings and always handled as *local* dates. `new Date('2026-11-16')`
 * parses as UTC midnight, which displays as the previous day west of UTC.
 * Instants (activity timestamps, assignedAt) are full ISO strings.
 */

const MS_PER_DAY = 86_400_000

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const relativeFormatter = new Intl.RelativeTimeFormat('en-US', { numeric: 'always' })

export function parseISODate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Whole calendar days from `fromISO` to `toISO` (negative when `toISO` is earlier). */
export function daysBetween(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO)
  const to = parseISODate(toISO)
  // Compare as UTC calendar days so DST changes don't produce fractional days.
  const fromUTC = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const toUTC = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((toUTC - fromUTC) / MS_PER_DAY)
}

export function formatDate(value: string): string {
  return dateFormatter.format(parseISODate(value))
}

export function formatDateTime(isoTimestamp: string): string {
  return dateTimeFormatter.format(new Date(isoTimestamp))
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * MS_PER_DAY],
  ['month', 30 * MS_PER_DAY],
  ['day', MS_PER_DAY],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

export function formatRelative(isoTimestamp: string, now: Date = new Date()): string {
  const diff = new Date(isoTimestamp).getTime() - now.getTime()
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) {
      return relativeFormatter.format(Math.round(diff / ms), unit)
    }
  }
  return 'just now'
}
