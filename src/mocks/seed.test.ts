import { describe, expect, it } from 'vitest'
import { findInvariantViolations } from '@/domain/invariants'
import { getOnboardingProgress } from '@/domain/onboarding'
import { getOutstandingReturns } from '@/domain/offboarding'
import { daysBetween, toISODate } from '@/utils/date'
import type { WorkspaceData } from '@/types/domain'
import { createSeedData } from './seed'

const TODAY = new Date(2026, 10, 16, 9, 30)

function edgeCases(data: WorkspaceData, today: Date) {
  const todayISO = toISODate(today)
  const holdings = new Map<string, number>()
  for (const a of data.assets) {
    if (a.assignedEmployeeId) holdings.set(a.assignedEmployeeId, (holdings.get(a.assignedEmployeeId) ?? 0) + 1)
  }
  return {
    multiAssetEmployee: [...holdings.values()].some((n) => n >= 3),
    available: data.assets.some((a) => a.status === 'Available'),
    underRepair: data.assets.some((a) => a.status === 'Under Repair'),
    expiringWarranty: data.assets.some((a) => {
      const days = daysBetween(todayISO, a.warrantyExpiry)
      return a.status !== 'Retired' && days >= 0 && days <= 30
    }),
    futureJoiner: data.employees.some((e) => e.joiningDate > todayISO),
    incompleteOnboarding: data.onboarding.some((r) => !r.completedAt && !getOnboardingProgress(data, r).ready),
    pendingReturns: data.offboarding.some((r) => !r.completedAt && getOutstandingReturns(r).length > 0),
  }
}

describe('createSeedData', () => {
  const data = createSeedData(TODAY)

  it('meets the minimum data volumes', () => {
    expect(data.assets.length).toBeGreaterThanOrEqual(30)
    expect(data.employees.length).toBeGreaterThanOrEqual(15)
    expect(data.onboarding.filter((r) => !r.completedAt)).toHaveLength(5)
    expect(data.offboarding.filter((r) => !r.completedAt)).toHaveLength(3)
    expect(data.activities.length).toBeGreaterThanOrEqual(25)
  })

  it('has no inconsistent relationships', () => {
    expect(findInvariantViolations(data)).toEqual([])
  })

  it('is deterministic for a given date', () => {
    expect(createSeedData(new Date(TODAY))).toEqual(data)
  })

  it('stores activities newest first, all in the past', () => {
    const stamps = data.activities.map((a) => a.timestamp)
    expect(stamps).toEqual([...stamps].sort().reverse())
    expect(stamps.every((t) => new Date(t) < TODAY)).toBe(true)
  })

  it('covers every edge case the demo relies on', () => {
    expect(edgeCases(data, TODAY)).toEqual({
      multiAssetEmployee: true,
      available: true,
      underRepair: true,
      expiringWarranty: true,
      futureJoiner: true,
      incompleteOnboarding: true,
      pendingReturns: true,
    })
  })

  it('stays fresh: the same edge cases exist whenever the demo runs', () => {
    const later = new Date(2027, 5, 1, 14, 0)
    const laterData = createSeedData(later)
    expect(Object.values(edgeCases(laterData, later)).every(Boolean)).toBe(true)
    expect(findInvariantViolations(laterData)).toEqual([])
  })
})
