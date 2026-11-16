import { describe, expect, it } from 'vitest'
import { assignAsset, returnAsset } from '@/domain/assets'
import { createSeedData } from '@/mocks/seed'
import { testContext } from '@/test/fixtures'
import { getAttentionItems, getDashboardMetrics } from './dashboardSelectors'

const TODAY = new Date(2026, 10, 16, 9)
const TODAY_ISO = '2026-11-16'

describe('getDashboardMetrics', () => {
  it('derives every number from the data', () => {
    expect(getDashboardMetrics(createSeedData(TODAY))).toEqual({
      totalAssets: 51, // 53 owned minus 2 retired
      assignedAssets: 35,
      availableAssets: 13,
      underRepair: 3,
      retired: 2,
      employees: 20, // excludes the one inactive leaver
      pendingOnboarding: 5,
      pendingReturns: 4, // James 2 + Lena 2
      pendingReturnEmployees: 2,
    })
  })

  it('reflects an assignment immediately', () => {
    const data = createSeedData(TODAY)
    const asset = data.assets.find((a) => a.status === 'Available')!
    const before = getDashboardMetrics(data)
    const after = getDashboardMetrics(assignAsset(data, { assetId: asset.id, employeeId: 'emp_priya' }, testContext()))

    expect(after.availableAssets).toBe(before.availableAssets - 1)
    expect(after.assignedAssets).toBe(before.assignedAssets + 1)
    expect(after.totalAssets).toBe(before.totalAssets)
  })

  it('counts a return during offboarding against pending returns', () => {
    const data = createSeedData(TODAY)
    const jamesLaptop = data.assets.find((a) => a.serialNumber === 'C02H9VRAQ6LT')!
    const after = getDashboardMetrics(returnAsset(data, { assetId: jamesLaptop.id, condition: 'Damaged' }, testContext()))

    expect(after).toMatchObject({ pendingReturns: 3, underRepair: 4, assignedAssets: 34 })
  })
})

describe('getAttentionItems', () => {
  const items = getAttentionItems(createSeedData(TODAY), TODAY_ISO)

  it('lists every kind of item the IT admin must act on', () => {
    expect(new Set(items.map((i) => i.kind))).toEqual(new Set(['returns', 'joiner', 'warranty', 'repair']))
  })

  it('points each item at the record to open', () => {
    const james = items.find((i) => i.kind === 'returns' && i.title.includes('James Wilson'))
    expect(james?.target).toEqual({ entityType: 'employee', entityId: 'emp_james' })
    expect(items.filter((i) => i.kind === 'warranty').every((i) => i.target.entityType === 'asset')).toBe(true)
  })

  it('includes warranties ending within 30 days but not expired or retired ones', () => {
    const warrantyTitles = items.filter((i) => i.kind === 'warranty').map((i) => i.title)
    expect(warrantyTitles).toContain('MacBook Pro 16" M2 Max warranty ends in 12 days')
    expect(warrantyTitles.some((t) => t.includes('MacBook Pro 13" Intel'))).toBe(false) // retired + expired
  })

  it('flags joiners starting within two weeks who are not ready, but not later joiners', () => {
    const joiners = items.filter((i) => i.kind === 'joiner').map((i) => i.title)
    expect(joiners).toEqual(expect.arrayContaining([expect.stringContaining('Mei Tanaka')]))
    expect(joiners.some((t) => t.includes('Omar Haddad'))).toBe(false) // laptop already allocated
    expect(joiners.some((t) => t.includes('Grace Liu'))).toBe(false) // starts in 21 days
  })

  it('puts outstanding returns first', () => {
    expect(items[0]?.kind).toBe('returns')
  })
})
