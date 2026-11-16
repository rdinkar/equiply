import { describe, expect, it } from 'vitest'
import { baseData, makeAsset, testContext } from '@/test/fixtures'
import type { WorkspaceData } from '@/types/domain'
import { assignAsset, retireAsset, returnAsset } from './assets'
import { DomainError } from './errors'
import { findInvariantViolations } from './invariants'
import {
  completeOffboarding,
  getOpenOffboarding,
  getOutstandingReturns,
  initiateOffboarding,
  processAssetReturn,
} from './offboarding'

/** Priya holds two assets, then offboarding starts. */
function priyaOffboarding(ctx = testContext()): WorkspaceData {
  const data = baseData()
  data.assets.push(makeAsset({ id: 'ast_phone', assetTag: 'EQ-PHN-0005', category: 'Mobile Phone', name: 'iPhone 15', serialNumber: 'SN-PHONE' }))
  const withPhone = assignAsset(data, { assetId: 'ast_phone', employeeId: 'emp_priya' }, ctx)
  return initiateOffboarding(withPhone, { employeeId: 'emp_priya', lastWorkingDay: '2026-11-30' }, ctx)
}

const status = (data: WorkspaceData, id: string) => data.employees.find((e) => e.id === id)?.status

describe('initiateOffboarding', () => {
  it('snapshots every assigned asset as pending return and moves the employee to Offboarding', () => {
    const data = priyaOffboarding()
    const record = getOpenOffboarding(data, 'emp_priya')!

    expect(status(data, 'emp_priya')).toBe('Offboarding')
    expect(record.items.map((i) => [i.assetId, i.state]).sort()).toEqual([
      ['ast_assigned', 'Pending Return'],
      ['ast_phone', 'Pending Return'],
    ])
    expect(data.activities[0]).toMatchObject({ action: 'offboarding_initiated', entityType: 'employee', entityId: 'emp_priya' })
    expect(findInvariantViolations(data)).toEqual([])
  })

  it('requires a valid last working day', () => {
    expect(() => initiateOffboarding(baseData(), { employeeId: 'emp_priya', lastWorkingDay: '' }, testContext())).toThrowError(
      /last working day/i,
    )
  })

  it('only offboards active employees', () => {
    expect(() =>
      initiateOffboarding(baseData(), { employeeId: 'emp_mei', lastWorkingDay: '2026-11-30' }, testContext()),
    ).toThrowError(DomainError)
  })
})

describe('completeOffboarding', () => {
  it('cannot complete while returns are pending', () => {
    const data = priyaOffboarding()
    try {
      completeOffboarding(data, { employeeId: 'emp_priya' }, testContext())
      throw new Error('expected PENDING_RETURNS')
    } catch (error) {
      expect((error as DomainError).code).toBe('PENDING_RETURNS')
      expect((error as DomainError).message).toMatch(/2 assets/)
    }
  })

  it('completes once every asset is back, deactivating the employee', () => {
    const ctx = testContext()
    let data = priyaOffboarding(ctx)
    data = processAssetReturn(data, { employeeId: 'emp_priya', assetId: 'ast_assigned', outcome: 'Returned' }, ctx)
    data = processAssetReturn(data, { employeeId: 'emp_priya', assetId: 'ast_phone', outcome: 'Damaged on Return' }, ctx)
    data = completeOffboarding(data, { employeeId: 'emp_priya' }, ctx)

    expect(status(data, 'emp_priya')).toBe('Inactive')
    expect(getOpenOffboarding(data, 'emp_priya')).toBeUndefined()
    expect(data.activities[0]).toMatchObject({ action: 'employee_offboarded' })
    expect(findInvariantViolations(data)).toEqual([])
  })
})

describe('processAssetReturn', () => {
  it('moves a damaged return to Under Repair and marks the checklist item', () => {
    const data = processAssetReturn(
      priyaOffboarding(),
      { employeeId: 'emp_priya', assetId: 'ast_phone', outcome: 'Damaged on Return' },
      testContext(),
    )
    const record = getOpenOffboarding(data, 'emp_priya')!

    expect(data.assets.find((a) => a.id === 'ast_phone')).toMatchObject({ status: 'Under Repair', condition: 'Damaged' })
    expect(record.items.find((i) => i.assetId === 'ast_phone')).toMatchObject({ state: 'Damaged on Return' })
    expect(getOutstandingReturns(record).map((i) => i.assetId)).toEqual(['ast_assigned'])
    expect(findInvariantViolations(data)).toEqual([])
  })

  it('rejects processing the same item twice', () => {
    const ctx = testContext()
    const once = processAssetReturn(priyaOffboarding(ctx), { employeeId: 'emp_priya', assetId: 'ast_phone', outcome: 'Returned' }, ctx)
    expect(() =>
      processAssetReturn(once, { employeeId: 'emp_priya', assetId: 'ast_phone', outcome: 'Returned' }, ctx),
    ).toThrowError(/already/)
  })
})

describe('returns recorded outside the offboarding screen', () => {
  it('a return from the asset drawer updates the open offboarding checklist', () => {
    const data = returnAsset(priyaOffboarding(), { assetId: 'ast_assigned', condition: 'Fair' }, testContext())
    const record = getOpenOffboarding(data, 'emp_priya')!

    expect(record.items.find((i) => i.assetId === 'ast_assigned')).toMatchObject({
      state: 'Returned',
      processedAt: '2026-11-16T10:00:00.000Z',
    })
    expect(findInvariantViolations(data)).toEqual([])
  })
})

describe('retiring during offboarding', () => {
  it('refuses to retire an asset still pending return, naming who has it', () => {
    expect(() => retireAsset(priyaOffboarding(), { assetId: 'ast_phone' }, testContext())).toThrowError(
      /pending return from Priya Sharma/,
    )
  })
})
