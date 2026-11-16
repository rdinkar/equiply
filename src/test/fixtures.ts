import type { DomainContext } from '@/domain/context'
import type { Asset, AssetAssignment, AssetInput, Employee, WorkspaceData } from '@/types/domain'

export const TEST_NOW = '2026-11-16T10:00:00.000Z'
export const TEST_TODAY = '2026-11-16'

/** Deterministic context: fixed clock, counter-based ids. */
export function testContext(now = TEST_NOW): DomainContext {
  let n = 0
  return {
    now,
    actor: 'Test Admin',
    newId: (prefix) => `${prefix}_t${++n}`,
  }
}

export function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'ast_x',
    assetTag: 'EQ-LAP-0099',
    name: 'MacBook Pro 14"',
    category: 'Laptop',
    manufacturer: 'Apple',
    model: 'MacBook Pro 14 (M3)',
    serialNumber: 'SN-X',
    purchaseDate: '2025-01-10',
    purchaseCost: 1999,
    warrantyExpiry: '2028-01-10',
    status: 'Available',
    condition: 'Good',
    assignedEmployeeId: null,
    location: 'San Francisco HQ',
    notes: '',
    ...overrides,
  }
}

export function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp_x',
    employeeId: 'EQ-1999',
    name: 'Test Person',
    email: 'test.person@equiply.dev',
    department: 'Engineering',
    designation: 'Software Engineer',
    joiningDate: '2024-01-15',
    status: 'Active',
    location: 'San Francisco',
    ...overrides,
  }
}

export function validAssetInput(overrides: Partial<AssetInput> = {}): AssetInput {
  return {
    name: 'ThinkPad X1 Carbon',
    category: 'Laptop',
    manufacturer: 'Lenovo',
    model: 'X1 Carbon Gen 12',
    serialNumber: 'PF-NEW-001',
    purchaseDate: '2026-11-01',
    purchaseCost: 1849,
    warrantyExpiry: '2029-11-01',
    location: 'New York Office',
    condition: 'Excellent',
    notes: '',
    ...overrides,
  }
}

/**
 * Small, consistent world:
 * - priya (Active) holds ast_assigned
 * - kevin (Inactive), lena (Offboarding), mei (Onboarding)
 * - ast_free Available, ast_repair Under Repair, ast_retired Retired
 */
export function baseData(): WorkspaceData {
  const employees: Employee[] = [
    makeEmployee({ id: 'emp_priya', employeeId: 'EQ-1001', name: 'Priya Sharma', email: 'priya@equiply.dev' }),
    makeEmployee({ id: 'emp_kevin', employeeId: 'EQ-1002', name: 'Kevin Murphy', email: 'kevin@equiply.dev', status: 'Inactive' }),
    makeEmployee({ id: 'emp_lena', employeeId: 'EQ-1003', name: 'Lena Novak', email: 'lena@equiply.dev', status: 'Offboarding' }),
    makeEmployee({ id: 'emp_mei', employeeId: 'EQ-1004', name: 'Mei Tanaka', email: 'mei@equiply.dev', status: 'Onboarding', joiningDate: '2026-11-20' }),
  ]
  const assets: Asset[] = [
    makeAsset({ id: 'ast_free', assetTag: 'EQ-LAP-0001', serialNumber: 'SN-FREE' }),
    makeAsset({
      id: 'ast_assigned',
      assetTag: 'EQ-LAP-0002',
      serialNumber: 'SN-ASSIGNED',
      status: 'Assigned',
      assignedEmployeeId: 'emp_priya',
    }),
    makeAsset({
      id: 'ast_repair',
      assetTag: 'EQ-MON-0003',
      category: 'Monitor',
      name: 'Dell U2723QE',
      serialNumber: 'SN-REPAIR',
      status: 'Under Repair',
      condition: 'Damaged',
    }),
    makeAsset({
      id: 'ast_retired',
      assetTag: 'EQ-PHN-0004',
      category: 'Mobile Phone',
      name: 'iPhone 13',
      serialNumber: 'SN-RETIRED',
      status: 'Retired',
      condition: 'Fair',
    }),
  ]
  const assignments: AssetAssignment[] = [
    {
      id: 'asg_1',
      assetId: 'ast_assigned',
      employeeId: 'emp_priya',
      assignedAt: '2026-01-05T09:00:00.000Z',
      returnedAt: null,
      assignedDuring: 'manual',
      returnCondition: null,
    },
  ]
  return { assets, employees, assignments, activities: [], onboarding: [], offboarding: [] }
}
