import type { Asset, ChecklistItem, OnboardingRecord, WorkspaceData } from '@/types/domain'
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
