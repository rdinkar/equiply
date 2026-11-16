import type { OffboardingItem, OffboardingRecord, WorkspaceData } from '@/types/domain'
import { appendActivity, describe } from './activity'
import { returnAsset } from './assets'
import type { DomainContext } from './context'
import { DomainError } from './errors'
import { getAssignedAssets, getEmployeeById } from './selectors'

export function getOpenOffboarding(data: WorkspaceData, employeeId: string): OffboardingRecord | undefined {
  return data.offboarding.find((r) => r.employeeId === employeeId && r.completedAt === null)
}

export function getOutstandingReturns(record: OffboardingRecord): OffboardingItem[] {
  return record.items.filter((i) => i.state === 'Pending Return')
}

export function initiateOffboarding(
  data: WorkspaceData,
  { employeeId, lastWorkingDay }: { employeeId: string; lastWorkingDay: string },
  ctx: DomainContext,
): WorkspaceData {
  const employee = getEmployeeById(data, employeeId)
  if (!employee) throw new DomainError('NOT_FOUND', 'That employee no longer exists.')
  if (employee.status !== 'Active') {
    throw new DomainError('INVALID_TRANSITION', `Only active employees can be offboarded; ${employee.name} is ${employee.status}.`)
  }
  const assets = getAssignedAssets(data, employeeId)
  const record: OffboardingRecord = {
    id: ctx.newId('off'),
    employeeId,
    initiatedAt: ctx.now,
    lastWorkingDay,
    items: assets.map((a) => ({ assetId: a.id, state: 'Pending Return', processedAt: null })),
    completedAt: null,
  }
  const next: WorkspaceData = {
    ...data,
    employees: data.employees.map((e) => (e.id === employeeId ? { ...e, status: 'Offboarding' } : e)),
    offboarding: [...data.offboarding, record],
  }
  return appendActivity(
    next,
    {
      entityType: 'employee',
      entityId: employeeId,
      action: 'offboarding_initiated',
      description: describe.offboardingInitiated(employee, assets.length),
    },
    ctx,
  )
}

/**
 * Record one checklist item coming back. Delegates to `returnAsset`, which
 * updates the asset, closes the assignment and ticks the checklist item. One
 * code path, whether the return is recorded here or from the asset drawer.
 */
export function processAssetReturn(
  data: WorkspaceData,
  {
    employeeId,
    assetId,
    outcome,
  }: { employeeId: string; assetId: string; outcome: 'Returned' | 'Damaged on Return' },
  ctx: DomainContext,
): WorkspaceData {
  const record = getOpenOffboarding(data, employeeId)
  if (!record) throw new DomainError('NOT_FOUND', 'No offboarding in progress for this employee.')
  const item = record.items.find((i) => i.assetId === assetId)
  if (!item) throw new DomainError('NOT_FOUND', 'That asset isn’t on this offboarding checklist.')
  if (item.state !== 'Pending Return') {
    throw new DomainError('INVALID_TRANSITION', `This asset was already marked ${item.state}.`)
  }
  const asset = data.assets.find((a) => a.id === assetId)
  // "Returned" keeps the recorded condition unless it was Damaged, which would contradict the outcome.
  const keptCondition = asset && asset.condition !== 'Damaged' ? asset.condition : 'Good'
  return returnAsset(data, { assetId, condition: outcome === 'Damaged on Return' ? 'Damaged' : keptCondition }, ctx)
}

export function completeOffboarding(
  data: WorkspaceData,
  { employeeId }: { employeeId: string },
  ctx: DomainContext,
): WorkspaceData {
  const employee = getEmployeeById(data, employeeId)
  const record = getOpenOffboarding(data, employeeId)
  if (!employee || !record) throw new DomainError('NOT_FOUND', 'No offboarding in progress for this employee.')

  const pending = Math.max(getOutstandingReturns(record).length, getAssignedAssets(data, employeeId).length)
  if (pending > 0) {
    throw new DomainError(
      'PENDING_RETURNS',
      `${pending} ${pending === 1 ? 'asset is' : 'assets are'} still pending return from ${employee.name}.`,
    )
  }
  const next: WorkspaceData = {
    ...data,
    employees: data.employees.map((e) => (e.id === employeeId ? { ...e, status: 'Inactive' } : e)),
    offboarding: data.offboarding.map((r) => (r.id === record.id ? { ...r, completedAt: ctx.now } : r)),
  }
  return appendActivity(
    next,
    { entityType: 'employee', entityId: employeeId, action: 'employee_offboarded', description: describe.employeeOffboarded(employee) },
    ctx,
  )
}
