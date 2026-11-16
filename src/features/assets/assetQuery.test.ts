import { describe, expect, it } from 'vitest'
import { indexById } from '@/domain/selectors'
import { createSeedData } from '@/mocks/seed'
import {
  DEFAULT_ASSET_QUERY,
  filterAndSortAssets,
  parseAssetQuery,
  serializeAssetQuery,
  type AssetQuery,
} from './assetQuery'

const data = createSeedData(new Date(2026, 10, 16, 9))
const employeesById = indexById(data.employees)
const run = (patch: Partial<AssetQuery>) =>
  filterAndSortAssets(data.assets, employeesById, { ...DEFAULT_ASSET_QUERY, ...patch })

describe('filterAndSortAssets', () => {
  it('matches by the assigned employee’s name', () => {
    const results = run({ q: 'priya' })
    expect(results.length).toBeGreaterThanOrEqual(4)
    expect(results.every((a) => a.assignedEmployeeId === 'emp_priya')).toBe(true)
  })

  it('matches serial numbers case-insensitively', () => {
    expect(run({ q: 'c02fk1abq' }).map((a) => a.serialNumber)).toEqual(['C02FK1ABQ6L4'])
  })

  it('matches asset tags', () => {
    expect(run({ q: 'eq-lap-0002' }).map((a) => a.assetTag)).toEqual(['EQ-LAP-0002'])
  })

  it('combines filters with AND', () => {
    const results = run({ category: 'Laptop', status: 'Available' })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((a) => a.category === 'Laptop' && a.status === 'Available')).toBe(true)
    expect(run({ category: 'Laptop', status: 'Available', condition: 'Damaged' })).toEqual([])
  })

  it('sorts by tag in the order assets were added, not alphabetically by category code', () => {
    const tags = run({}).map((a) => a.assetTag)
    expect(tags.slice(0, 3)).toEqual(['EQ-LAP-0001', 'EQ-LAP-0002', 'EQ-LAP-0003'])
    expect(tags.at(-1)).toBe('EQ-OTH-0053')
  })

  it('sorts by warranty expiry ascending, breaking ties by tag number', () => {
    const results = run({ sort: 'warrantyExpiry', dir: 'asc' })
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1]!
      const curr = results[i]!
      const ordered =
        prev.warrantyExpiry < curr.warrantyExpiry ||
        (prev.warrantyExpiry === curr.warrantyExpiry && prev.assetTag.slice(-4) < curr.assetTag.slice(-4))
      expect(ordered, `${prev.assetTag} before ${curr.assetTag}`).toBe(true)
    }
  })

  it('sorts by purchase date descending', () => {
    const dates = run({ sort: 'purchaseDate', dir: 'desc' }).map((a) => a.purchaseDate)
    expect(dates).toEqual([...dates].sort().reverse())
  })
})

describe('asset query URL state', () => {
  it('round-trips through search params, omitting defaults', () => {
    const query: AssetQuery = { ...DEFAULT_ASSET_QUERY, q: 'mac', status: 'Under Repair', page: 2 }
    const params = serializeAssetQuery(query)
    expect(params.toString()).toBe('q=mac&status=Under+Repair&page=2')
    expect(parseAssetQuery(params)).toEqual(query)
  })

  it('falls back to defaults for unknown values', () => {
    expect(parseAssetQuery(new URLSearchParams('status=Lost&category=Boat&sort=price&page=-3'))).toEqual(
      DEFAULT_ASSET_QUERY,
    )
  })
})
