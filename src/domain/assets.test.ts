import { describe, expect, it } from 'vitest'
import { baseData, testContext, validAssetInput } from '@/test/fixtures'
import {
  assignAsset,
  createAsset,
  markAvailable,
  markUnderRepair,
  retireAsset,
  returnAsset,
  updateAsset,
} from './assets'
import { DomainError } from './errors'
import { findInvariantViolations } from './invariants'
import { getActiveAssignment, getAssignmentHistory } from './selectors'

function expectDomainError(fn: () => unknown, code: DomainError['code']) {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError)
    expect((error as DomainError).code).toBe(code)
    return error as DomainError
  }
  throw new Error(`Expected DomainError ${code}, but nothing was thrown`)
}

const asset = (data: ReturnType<typeof baseData>, id: string) => data.assets.find((a) => a.id === id)!

describe('assignAsset', () => {
  it('rejects assigning an asset that is Under Repair', () => {
    expectDomainError(
      () => assignAsset(baseData(), { assetId: 'ast_repair', employeeId: 'emp_priya' }, testContext()),
      'ASSET_NOT_ASSIGNABLE',
    )
  })

  it('rejects assigning a retired asset', () => {
    expectDomainError(
      () => assignAsset(baseData(), { assetId: 'ast_retired', employeeId: 'emp_priya' }, testContext()),
      'ASSET_NOT_ASSIGNABLE',
    )
  })

  it('rejects assigning an already assigned asset', () => {
    const error = expectDomainError(
      () => assignAsset(baseData(), { assetId: 'ast_assigned', employeeId: 'emp_mei' }, testContext()),
      'ASSET_NOT_ASSIGNABLE',
    )
    expect(error.message).toContain('Priya Sharma')
  })

  it('sets status and holder, opens an assignment, and logs activity for both entities', () => {
    const next = assignAsset(baseData(), { assetId: 'ast_free', employeeId: 'emp_priya' }, testContext())

    expect(asset(next, 'ast_free')).toMatchObject({ status: 'Assigned', assignedEmployeeId: 'emp_priya' })
    expect(getActiveAssignment(next, 'ast_free')).toMatchObject({
      employeeId: 'emp_priya',
      assignedAt: '2026-11-16T10:00:00.000Z',
      assignedDuring: 'manual',
      returnedAt: null,
    })
    expect(next.activities).toHaveLength(1)
    expect(next.activities[0]).toMatchObject({
      action: 'asset_assigned',
      entityType: 'asset',
      entityId: 'ast_free',
      related: { entityType: 'employee', entityId: 'emp_priya' },
      performedBy: 'Test Admin',
    })
    expect(findInvariantViolations(next)).toEqual([])
  })

  it('marks assignments to an onboarding employee as onboarding allocations', () => {
    const next = assignAsset(baseData(), { assetId: 'ast_free', employeeId: 'emp_mei' }, testContext())
    expect(getActiveAssignment(next, 'ast_free')?.assignedDuring).toBe('onboarding')
  })

  it.each(['emp_kevin', 'emp_lena'])('rejects assigning to an ineligible employee (%s)', (employeeId) => {
    expectDomainError(
      () => assignAsset(baseData(), { assetId: 'ast_free', employeeId }, testContext()),
      'EMPLOYEE_NOT_ELIGIBLE',
    )
  })

  it('does not mutate the input data', () => {
    const data = baseData()
    const snapshot = structuredClone(data)
    assignAsset(data, { assetId: 'ast_free', employeeId: 'emp_priya' }, testContext())
    expect(data).toEqual(snapshot)
  })
})

describe('returnAsset', () => {
  it('closes the assignment and makes the asset Available when condition is acceptable', () => {
    const next = returnAsset(baseData(), { assetId: 'ast_assigned', condition: 'Good' }, testContext())

    expect(asset(next, 'ast_assigned')).toMatchObject({
      status: 'Available',
      assignedEmployeeId: null,
      condition: 'Good',
    })
    expect(getActiveAssignment(next, 'ast_assigned')).toBeUndefined()
    expect(getAssignmentHistory(next, { assetId: 'ast_assigned' })[0]).toMatchObject({
      returnedAt: '2026-11-16T10:00:00.000Z',
      returnCondition: 'Good',
    })
    expect(next.activities[0]).toMatchObject({ action: 'asset_returned' })
    expect(findInvariantViolations(next)).toEqual([])
  })

  it('moves a damaged return to Under Repair and records the return condition', () => {
    const next = returnAsset(baseData(), { assetId: 'ast_assigned', condition: 'Damaged' }, testContext())

    expect(asset(next, 'ast_assigned')).toMatchObject({ status: 'Under Repair', condition: 'Damaged' })
    expect(getAssignmentHistory(next, { assetId: 'ast_assigned' })[0]?.returnCondition).toBe('Damaged')
    expect(findInvariantViolations(next)).toEqual([])
  })

  it('rejects returning an asset that is not assigned', () => {
    expectDomainError(
      () => returnAsset(baseData(), { assetId: 'ast_free', condition: 'Good' }, testContext()),
      'INVALID_TRANSITION',
    )
  })
})

describe('createAsset', () => {
  it('adds an Available asset with the next tag and logs it', () => {
    const { data, asset: created } = createAsset(baseData(), validAssetInput(), testContext())

    expect(created.assetTag).toBe('EQ-LAP-0005')
    expect(created).toMatchObject({ status: 'Available', assignedEmployeeId: null })
    expect(data.assets).toHaveLength(5)
    expect(data.activities[0]).toMatchObject({ action: 'asset_added', entityId: created.id })
    expect(findInvariantViolations(data)).toEqual([])
  })

  it('adds a damaged asset straight into Under Repair', () => {
    const { asset: created } = createAsset(baseData(), validAssetInput({ condition: 'Damaged' }), testContext())
    expect(created.status).toBe('Under Repair')
  })

  it('rejects a duplicate serial number ignoring case and whitespace', () => {
    const error = expectDomainError(
      () => createAsset(baseData(), validAssetInput({ serialNumber: '  sn-free ' }), testContext()),
      'VALIDATION',
    )
    expect(error.fieldErrors?.serialNumber).toMatch(/EQ-LAP-0001/)
  })

  it('reports every missing required field', () => {
    const error = expectDomainError(
      () =>
        createAsset(
          baseData(),
          validAssetInput({ name: ' ', manufacturer: '', serialNumber: '', location: '', purchaseCost: Number.NaN }),
          testContext(),
        ),
      'VALIDATION',
    )
    expect(Object.keys(error.fieldErrors ?? {}).sort()).toEqual(
      ['location', 'manufacturer', 'name', 'purchaseCost', 'serialNumber'].sort(),
    )
  })

  it('rejects a warranty that ends before the purchase date', () => {
    const error = expectDomainError(
      () => createAsset(baseData(), validAssetInput({ warrantyExpiry: '2026-10-01' }), testContext()),
      'VALIDATION',
    )
    expect(error.fieldErrors?.warrantyExpiry).toBeDefined()
  })
})

describe('updateAsset', () => {
  it('rejects a serial already used by another asset but allows keeping its own', () => {
    const data = baseData()
    const current = asset(data, 'ast_free')
    const base = { ...current, notes: 'Spare for loaners' }

    expectDomainError(
      () => updateAsset(data, { assetId: 'ast_free', changes: { ...base, serialNumber: 'SN-ASSIGNED' } }, testContext()),
      'VALIDATION',
    )
    const next = updateAsset(data, { assetId: 'ast_free', changes: base }, testContext())
    expect(asset(next, 'ast_free').notes).toBe('Spare for loaners')
    expect(next.activities[0]).toMatchObject({ action: 'asset_updated' })
  })

  it('ignores lifecycle fields smuggled into an edit', () => {
    const data = baseData()
    const current = asset(data, 'ast_free')
    const smuggled = { ...current, notes: 'x', status: 'Assigned', assignedEmployeeId: 'emp_priya' } as const
    const next = updateAsset(data, { assetId: 'ast_free', changes: smuggled }, testContext())
    expect(asset(next, 'ast_free')).toMatchObject({ status: 'Available', assignedEmployeeId: null, notes: 'x' })
  })

  it('logs a condition change as its own activity', () => {
    const data = baseData()
    const current = asset(data, 'ast_assigned')
    const next = updateAsset(data, { assetId: 'ast_assigned', changes: { ...current, condition: 'Fair' } }, testContext())
    expect(next.activities.map((a) => a.action)).toEqual(['asset_condition_updated'])
  })

  it('refuses to mark an available asset as damaged through edit', () => {
    const data = baseData()
    const current = asset(data, 'ast_free')
    expectDomainError(
      () => updateAsset(data, { assetId: 'ast_free', changes: { ...current, condition: 'Damaged' } }, testContext()),
      'VALIDATION',
    )
  })
})

describe('retireAsset', () => {
  it('retires an assigned asset by closing its assignment, keeping history', () => {
    const next = retireAsset(baseData(), { assetId: 'ast_assigned' }, testContext())

    expect(asset(next, 'ast_assigned')).toMatchObject({ status: 'Retired', assignedEmployeeId: null })
    const history = getAssignmentHistory(next, { assetId: 'ast_assigned' })
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ employeeId: 'emp_priya', returnedAt: '2026-11-16T10:00:00.000Z' })
    expect(next.activities.map((a) => a.action).sort()).toEqual(['asset_retired', 'asset_returned'])
    expect(findInvariantViolations(next)).toEqual([])
  })

  it('rejects retiring an already retired asset', () => {
    expectDomainError(() => retireAsset(baseData(), { assetId: 'ast_retired' }, testContext()), 'INVALID_TRANSITION')
  })
})

describe('repair transitions', () => {
  it('moves an available asset to repair', () => {
    const next = markUnderRepair(baseData(), { assetId: 'ast_free', note: 'Battery swelling' }, testContext())
    expect(asset(next, 'ast_free').status).toBe('Under Repair')
    expect(next.activities[0]?.description).toContain('Battery swelling')
  })

  it('marks a repaired asset available only from Under Repair and never as Damaged', () => {
    expectDomainError(
      () => markAvailable(baseData(), { assetId: 'ast_free', condition: 'Good' }, testContext()),
      'INVALID_TRANSITION',
    )
    expectDomainError(
      () => markAvailable(baseData(), { assetId: 'ast_repair', condition: 'Damaged' }, testContext()),
      'VALIDATION',
    )
    const next = markAvailable(baseData(), { assetId: 'ast_repair', condition: 'Good' }, testContext())
    expect(asset(next, 'ast_repair')).toMatchObject({ status: 'Available', condition: 'Good' })
    expect(findInvariantViolations(next)).toEqual([])
  })

  it('reports NOT_FOUND for unknown ids', () => {
    expectDomainError(() => markUnderRepair(baseData(), { assetId: 'nope' }, testContext()), 'NOT_FOUND')
  })
})
