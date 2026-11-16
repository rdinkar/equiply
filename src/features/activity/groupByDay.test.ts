import { describe, expect, it } from 'vitest'
import type { Activity } from '@/types/domain'
import { groupActivitiesByDay } from './groupByDay'

const act = (id: string, timestamp: string): Activity => ({
  id,
  timestamp,
  entityType: 'asset',
  entityId: 'ast_1',
  action: 'asset_added',
  description: id,
  performedBy: 'Test',
})

describe('groupActivitiesByDay', () => {
  // Tests run in America/Los_Angeles; local calendar days decide the grouping.
  const now = new Date('2026-11-16T20:00:00Z') // Nov 16, 12:00 local

  it('groups newest first by local calendar day with friendly labels', () => {
    const groups = groupActivitiesByDay(
      [
        act('older', '2026-11-10T18:00:00Z'),
        act('today-late', '2026-11-16T19:00:00Z'),
        act('yesterday', '2026-11-15T18:00:00Z'),
        act('today-early', '2026-11-16T16:00:00Z'),
      ],
      now,
    )
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ['Today', ['today-late', 'today-early']],
      ['Yesterday', ['yesterday']],
      ['Tue, Nov 10, 2026', ['older']],
    ])
  })

  it('uses the local day, not the UTC day', () => {
    // 03:00 UTC on Nov 16 is still Nov 15 in Los Angeles.
    const [group] = groupActivitiesByDay([act('late-night', '2026-11-16T03:00:00Z')], now)
    expect(group?.label).toBe('Yesterday')
  })
})
