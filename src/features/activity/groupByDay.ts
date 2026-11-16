import type { Activity } from '@/types/domain'
import { addDays, toISODate } from '@/utils/date'

export interface ActivityDayGroup {
  /** Local calendar day, YYYY-MM-DD. */
  day: string
  label: string
  items: Activity[]
}

const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

/** Newest-first groups by the viewer's local calendar day ("Today", "Yesterday", then dates). */
export function groupActivitiesByDay(activities: Activity[], now: Date = new Date()): ActivityDayGroup[] {
  const today = toISODate(now)
  const yesterday = toISODate(addDays(now, -1))
  const groups = new Map<string, ActivityDayGroup>()

  const sorted = [...activities].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  for (const activity of sorted) {
    const date = new Date(activity.timestamp)
    const day = toISODate(date)
    let group = groups.get(day)
    if (!group) {
      const label = day === today ? 'Today' : day === yesterday ? 'Yesterday' : dayLabel.format(date)
      group = { day, label, items: [] }
      groups.set(day, group)
    }
    group.items.push(activity)
  }
  return [...groups.values()]
}
