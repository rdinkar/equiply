/**
 * Domain model. Relationships are held by id; assignment history lives in `AssetAssignment`, so returning
 * or retiring an asset never loses who had it.
 */

export const ASSET_CATEGORIES = [
  'Laptop',
  'Monitor',
  'Mobile Phone',
  'Keyboard',
  'Mouse',
  'Headphones',
  'Accessories',
  'Other',
] as const
export type AssetCategory = (typeof ASSET_CATEGORIES)[number]

export const ASSET_STATUSES = ['Available', 'Assigned', 'Under Repair', 'Retired'] as const
export type AssetStatus = (typeof ASSET_STATUSES)[number]

export const ASSET_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Damaged'] as const
export type AssetCondition = (typeof ASSET_CONDITIONS)[number]

export const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Sales',
  'Marketing',
  'Operations',
  'HR',
] as const
export type Department = (typeof DEPARTMENTS)[number]

export const EMPLOYEE_STATUSES = ['Active', 'Onboarding', 'Offboarding', 'Inactive'] as const
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number]

export interface Asset {
  id: string
  assetTag: string
  name: string
  category: AssetCategory
  manufacturer: string
  model: string
  serialNumber: string
  /** Calendar date, YYYY-MM-DD. */
  purchaseDate: string
  purchaseCost: number
  /** Calendar date, YYYY-MM-DD. */
  warrantyExpiry: string
  status: AssetStatus
  condition: AssetCondition
  assignedEmployeeId: string | null
  location: string
  notes: string
}

export interface Employee {
  id: string
  employeeId: string
  name: string
  email: string
  department: Department
  designation: string
  /** Calendar date, YYYY-MM-DD. May be in the future for incoming hires. */
  joiningDate: string
  status: EmployeeStatus
  location: string
  profileImage?: string
}

export type AssignmentSource = 'onboarding' | 'manual'

export interface AssetAssignment {
  id: string
  assetId: string
  employeeId: string
  /** ISO timestamp. */
  assignedAt: string
  /** ISO timestamp; null while the employee still holds the asset. */
  returnedAt: string | null
  assignedDuring: AssignmentSource
  /** Condition recorded at return; null while active or when ended by retirement. */
  returnCondition: AssetCondition | null
}

export type EntityType = 'asset' | 'employee'

export interface EntityRef {
  entityType: EntityType
  entityId: string
}

export const ACTIVITY_ACTIONS = [
  'asset_added',
  'asset_updated',
  'asset_assigned',
  'asset_returned',
  'asset_repair',
  'asset_available',
  'asset_retired',
  'asset_condition_updated',
  'onboarding_started',
  'employee_onboarded',
  'offboarding_initiated',
  'employee_offboarded',
] as const
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number]

export interface Activity {
  id: string
  entityType: EntityType
  entityId: string
  action: ActivityAction
  description: string
  /** ISO timestamp. */
  timestamp: string
  performedBy: string
  /**
   * Second entity the event concerns, e.g. the employee on an assignment.
   * This lets one entry appear on both the asset's and the employee's timeline.
   */
  related?: EntityRef
}

export interface ChecklistItem {
  category: AssetCategory
  required: boolean
}

export interface OnboardingRecord {
  id: string
  employeeId: string
  /** Calendar date the employee starts. */
  startDate: string
  checklist: ChecklistItem[]
  createdAt: string
  completedAt: string | null
}

export const RETURN_STATES = ['Pending Return', 'Returned', 'Damaged on Return'] as const
export type ReturnState = (typeof RETURN_STATES)[number]

export interface OffboardingItem {
  assetId: string
  state: ReturnState
  processedAt: string | null
}

export interface OffboardingRecord {
  id: string
  employeeId: string
  initiatedAt: string
  /** Calendar date. */
  lastWorkingDay: string
  items: OffboardingItem[]
  completedAt: string | null
}

/** Everything the workspace holds — the shape the mock API returns. */
export interface WorkspaceData {
  assets: Asset[]
  employees: Employee[]
  assignments: AssetAssignment[]
  activities: Activity[]
  onboarding: OnboardingRecord[]
  offboarding: OffboardingRecord[]
}

/** Editable asset fields: used by the add and edit forms. */
export interface AssetInput {
  name: string
  category: AssetCategory
  manufacturer: string
  model: string
  serialNumber: string
  purchaseDate: string
  purchaseCost: number
  warrantyExpiry: string
  location: string
  condition: AssetCondition
  notes: string
}

export type AssetFieldErrors = Partial<Record<keyof AssetInput, string>>

/** Fields IT needs to start onboarding someone who isn't in the directory yet. */
export interface NewHireInput {
  name: string
  email: string
  department: Department
  designation: string
  /** Calendar date, YYYY-MM-DD. */
  joiningDate: string
  location: string
}
