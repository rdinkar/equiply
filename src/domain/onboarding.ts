import { DEPARTMENTS, type Asset, type ChecklistItem, type Department, type Employee, type NewHireInput, type OnboardingRecord, type WorkspaceData } from '@/types/domain'
import { appendActivity, describe } from './activity'
import type { DomainContext } from './context'
import { DomainError } from './errors'
import { getAssignedAssets, getEmployeeById } from './selectors'

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { category: 'Laptop', required: true },
  { category: 'Monitor', required: false },
  { category: 'Keyboard', required: false },
  { category: 'Mouse', required: false },
  { category: 'Headphones', required: false },
  { category: 'Mobile Phone', required: false },
]

/** Sales roles also need a phone on day one; everyone else gets the default kit. */
const SALES_CHECKLIST: ChecklistItem[] = [
  { category: 'Laptop', required: true },
  { category: 'Mobile Phone', required: true },
  { category: 'Headphones', required: false },
  { category: 'Monitor', required: false },
]

export function checklistFor(department: Department): ChecklistItem[] {
  return department === 'Sales' ? SALES_CHECKLIST : DEFAULT_CHECKLIST
}

export function getOpenOnboarding(data: WorkspaceData, employeeId: string): OnboardingRecord | undefined {
  return data.onboarding.find((r) => r.employeeId === employeeId && r.completedAt === null)
}

export interface OnboardingProgress {
  items: (ChecklistItem & { asset: Asset | null })[]
  requiredDone: number
  requiredTotal: number
  assignedCount: number
  totalItems: number
  /** All required items are allocated, so onboarding can be completed. */
  ready: boolean
}

/**
 * Matches the employee's current hardware against the checklist. Progress is
 * derived, never stored, so an asset assigned from any screen counts.
 */
export function getOnboardingProgress(data: WorkspaceData, record: OnboardingRecord): OnboardingProgress {
  const remaining = [...getAssignedAssets(data, record.employeeId)]
  const items = record.checklist.map((item) => {
    const index = remaining.findIndex((a) => a.category === item.category)
    const asset = index >= 0 ? (remaining.splice(index, 1)[0] ?? null) : null
    return { ...item, asset }
  })
  const required = items.filter((i) => i.required)
  const requiredDone = required.filter((i) => i.asset).length
  return {
    items,
    requiredDone,
    requiredTotal: required.length,
    assignedCount: items.filter((i) => i.asset).length,
    totalItems: items.length,
    ready: requiredDone === required.length,
  }
}

export function initiateOnboarding(
  data: WorkspaceData,
  { employeeId, checklist = DEFAULT_CHECKLIST }: { employeeId: string; checklist?: ChecklistItem[] },
  ctx: DomainContext,
): WorkspaceData {
  const employee = getEmployeeById(data, employeeId)
  if (!employee) throw new DomainError('NOT_FOUND', 'That employee no longer exists.')
  if (employee.status !== 'Onboarding') {
    throw new DomainError('INVALID_TRANSITION', `${employee.name} is ${employee.status}, not an incoming hire.`)
  }
  if (getOpenOnboarding(data, employeeId)) {
    throw new DomainError('INVALID_TRANSITION', `${employee.name} already has onboarding in progress.`)
  }
  const record: OnboardingRecord = {
    id: ctx.newId('onb'),
    employeeId,
    startDate: employee.joiningDate,
    checklist,
    createdAt: ctx.now,
    completedAt: null,
  }
  return appendActivity(
    { ...data, onboarding: [...data.onboarding, record] },
    {
      entityType: 'employee',
      entityId: employeeId,
      action: 'onboarding_started',
      description: describe.onboardingStarted(employee, employee.joiningDate),
    },
    ctx,
  )
}

export function completeOnboarding(
  data: WorkspaceData,
  { employeeId }: { employeeId: string },
  ctx: DomainContext,
): WorkspaceData {
  const employee = getEmployeeById(data, employeeId)
  const record = getOpenOnboarding(data, employeeId)
  if (!employee || !record) throw new DomainError('NOT_FOUND', 'No onboarding in progress for this employee.')

  const progress = getOnboardingProgress(data, record)
  if (!progress.ready) {
    const missing = progress.items.filter((i) => i.required && !i.asset).map((i) => i.category)
    throw new DomainError(
      'ONBOARDING_INCOMPLETE',
      `Assign the required ${missing.join(', ')} before completing onboarding.`,
    )
  }
  const next: WorkspaceData = {
    ...data,
    employees: data.employees.map((e) => (e.id === employeeId ? { ...e, status: 'Active' } : e)),
    onboarding: data.onboarding.map((r) => (r.id === record.id ? { ...r, completedAt: ctx.now } : r)),
  }
  return appendActivity(
    next,
    {
      entityType: 'employee',
      entityId: employeeId,
      action: 'employee_onboarded',
      description: describe.employeeOnboarded(employee, progress.assignedCount),
    },
    ctx,
  )
}

export type NewHireFieldErrors = Partial<Record<keyof NewHireInput, string>>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Shared by the new-hire form (instant feedback) and addNewHire (the source of truth). */
export function validateNewHire(input: NewHireInput, employees: Employee[]): NewHireFieldErrors {
  const errors: NewHireFieldErrors = {}
  if (!input.name.trim()) errors.name = 'Enter their full name.'
  const email = input.email.trim().toLowerCase()
  if (!EMAIL.test(email)) errors.email = 'Enter a valid work email.'
  else {
    const clash = employees.find((e) => e.email.toLowerCase() === email)
    if (clash) errors.email = `This email already belongs to ${clash.name}.`
  }
  if (!DEPARTMENTS.includes(input.department)) errors.department = 'Choose a department.'
  if (!input.designation.trim()) errors.designation = 'Enter their role.'
  if (!ISO_DATE.test(input.joiningDate)) errors.joiningDate = 'Enter their start date.'
  if (!input.location.trim()) errors.location = 'Enter where they’ll work.'
  return errors
}

function nextEmployeeId(employees: Employee[]): string {
  const highest = employees.reduce((max, e) => Math.max(max, Number(e.employeeId.split('-').at(-1)) || 0), 1000)
  return `EQ-${highest + 1}`
}

/**
 * Add someone who hasn't started yet and open their onboarding with the
 * department's checklist. In a real system HR would create the person; IT
 * starts here so a laptop is ready on day one.
 */
export function addNewHire(
  data: WorkspaceData,
  input: NewHireInput,
  ctx: DomainContext,
): { data: WorkspaceData; employee: Employee } {
  const errors = validateNewHire(input, data.employees)
  if (Object.keys(errors).length > 0) throw new DomainError('VALIDATION', 'Please fix the highlighted fields.', errors)

  const employee: Employee = {
    id: ctx.newId('emp'),
    employeeId: nextEmployeeId(data.employees),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    department: input.department,
    designation: input.designation.trim(),
    joiningDate: input.joiningDate,
    status: 'Onboarding',
    location: input.location.trim(),
  }
  const withEmployee = { ...data, employees: [...data.employees, employee] }
  return {
    data: initiateOnboarding(withEmployee, { employeeId: employee.id, checklist: checklistFor(employee.department) }, ctx),
    employee,
  }
}
