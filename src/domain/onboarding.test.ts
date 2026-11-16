import { describe, expect, it } from 'vitest'
import { baseData, makeAsset, testContext } from '@/test/fixtures'
import type { WorkspaceData } from '@/types/domain'
import { assignAsset } from './assets'
import { DomainError } from './errors'
import { findInvariantViolations } from './invariants'
import {
  DEFAULT_CHECKLIST,
  completeOnboarding,
  getOnboardingProgress,
  getOpenOnboarding,
  initiateOnboarding,
} from './onboarding'

function meiOnboarding(ctx = testContext()): WorkspaceData {
  const data = baseData()
  data.assets.push(
    makeAsset({ id: 'ast_mon', assetTag: 'EQ-MON-0005', category: 'Monitor', name: 'LG 27UP850', serialNumber: 'SN-MON' }),
  )
  return initiateOnboarding(data, { employeeId: 'emp_mei' }, ctx)
}

describe('initiateOnboarding', () => {
  it('opens a record with the default checklist and logs it', () => {
    const data = meiOnboarding()
    const record = getOpenOnboarding(data, 'emp_mei')!

    expect(record.checklist).toEqual(DEFAULT_CHECKLIST)
    expect(record.startDate).toBe('2026-11-20')
    expect(data.activities[0]).toMatchObject({ action: 'onboarding_started', entityId: 'emp_mei' })
  })

  it('rejects a second open onboarding for the same employee', () => {
    expect(() => initiateOnboarding(meiOnboarding(), { employeeId: 'emp_mei' }, testContext())).toThrowError(DomainError)
  })
})

describe('completeOnboarding', () => {
  it('requires the laptop; an optional asset alone is not enough', () => {
    const ctx = testContext()
    const withMonitor = assignAsset(meiOnboarding(ctx), { assetId: 'ast_mon', employeeId: 'emp_mei' }, ctx)

    const progress = getOnboardingProgress(withMonitor, getOpenOnboarding(withMonitor, 'emp_mei')!)
    expect(progress).toMatchObject({ requiredDone: 0, requiredTotal: 1, assignedCount: 1, ready: false })

    try {
      completeOnboarding(withMonitor, { employeeId: 'emp_mei' }, ctx)
      throw new Error('expected ONBOARDING_INCOMPLETE')
    } catch (error) {
      expect((error as DomainError).code).toBe('ONBOARDING_INCOMPLETE')
      expect((error as DomainError).message).toContain('Laptop')
    }
  })

  it('activates the employee once required equipment is allocated', () => {
    const ctx = testContext()
    let data = assignAsset(meiOnboarding(ctx), { assetId: 'ast_free', employeeId: 'emp_mei' }, ctx)
    expect(getOnboardingProgress(data, getOpenOnboarding(data, 'emp_mei')!).ready).toBe(true)

    data = completeOnboarding(data, { employeeId: 'emp_mei' }, ctx)

    expect(data.employees.find((e) => e.id === 'emp_mei')?.status).toBe('Active')
    expect(getOpenOnboarding(data, 'emp_mei')).toBeUndefined()
    expect(data.activities[0]).toMatchObject({ action: 'employee_onboarded', entityId: 'emp_mei' })
    expect(findInvariantViolations(data)).toEqual([])
  })
})
