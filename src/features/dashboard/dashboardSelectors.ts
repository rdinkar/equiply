import { getOutstandingReturns } from '@/domain/offboarding'
import { getOnboardingProgress } from '@/domain/onboarding'
import { getEmployeeById } from '@/domain/selectors'
import type { EntityRef, WorkspaceData } from '@/types/domain'
import { daysBetween, formatDate } from '@/utils/date'
import { pluralize } from '@/utils/format'

export interface DashboardMetrics {
  /** Assets in service (everything except retired). */
  totalAssets: number
  assignedAssets: number
  availableAssets: number
  underRepair: number
  retired: number
  /** Current headcount, including incoming hires; excludes people who have left. */
  employees: number
  pendingOnboarding: number
  /** Assets still to be recovered from employees being offboarded. */
  pendingReturns: number
  pendingReturnEmployees: number
}

/** Every number is computed from current data on each render; nothing is stored. */
export function getDashboardMetrics(data: WorkspaceData): DashboardMetrics {
  const byStatus = (status: string) => data.assets.filter((a) => a.status === status).length
  const openOffboarding = data.offboarding.filter((r) => !r.completedAt)
  const outstanding = openOffboarding.map((r) => getOutstandingReturns(r).length)
  return {
    totalAssets: data.assets.length - byStatus('Retired'),
    assignedAssets: byStatus('Assigned'),
    availableAssets: byStatus('Available'),
    underRepair: byStatus('Under Repair'),
    retired: byStatus('Retired'),
    employees: data.employees.filter((e) => e.status !== 'Inactive').length,
    pendingOnboarding: data.onboarding.filter((r) => !r.completedAt).length,
    pendingReturns: outstanding.reduce((sum, n) => sum + n, 0),
    pendingReturnEmployees: outstanding.filter((n) => n > 0).length,
  }
}

export type AttentionKind = 'returns' | 'joiner' | 'warranty' | 'repair'

export interface AttentionItem {
  id: string
  kind: AttentionKind
  title: string
  detail: string
  severity: 'warning' | 'info'
  target: EntityRef
}

const WARRANTY_WINDOW_DAYS = 30
const JOINER_WINDOW_DAYS = 14
const KIND_ORDER: AttentionKind[] = ['returns', 'joiner', 'warranty', 'repair']

function inDays(days: number): string {
  if (days === 0) return 'today'
  if (days > 0) return `in ${pluralize(days, 'day')}`
  return `${pluralize(-days, 'day')} ago`
}

/** What needs the IT admin today, most urgent kinds first and soonest first within each kind. */
export function getAttentionItems(data: WorkspaceData, today: string): AttentionItem[] {
  const ranked: { item: AttentionItem; urgency: number }[] = []
  const push = (item: AttentionItem, urgency: number) => ranked.push({ item, urgency })

  for (const record of data.offboarding) {
    if (record.completedAt) continue
    const pending = getOutstandingReturns(record).length
    const employee = getEmployeeById(data, record.employeeId)
    if (!pending || !employee) continue
    const daysLeft = daysBetween(today, record.lastWorkingDay)
    push(
      {
        id: `returns-${record.id}`,
        kind: 'returns',
        title: `${employee.name} has ${pluralize(pending, 'asset')} to return`,
        detail: `Last working day ${formatDate(record.lastWorkingDay)}`,
        severity: daysLeft <= 3 ? 'warning' : 'info',
        target: { entityType: 'employee', entityId: employee.id },
      },
      daysLeft,
    )
  }

  for (const record of data.onboarding) {
    if (record.completedAt) continue
    const employee = getEmployeeById(data, record.employeeId)
    const daysToStart = daysBetween(today, record.startDate)
    if (!employee || daysToStart > JOINER_WINDOW_DAYS) continue
    const progress = getOnboardingProgress(data, record)
    if (progress.ready) continue
    const missing = progress.items.filter((i) => i.required && !i.asset).map((i) => i.category)
    push(
      {
        id: `joiner-${record.id}`,
        kind: 'joiner',
        title: `${employee.name} starts ${inDays(daysToStart)}`,
        detail: `Needs ${missing.join(' and ')}`,
        severity: daysToStart <= 3 ? 'warning' : 'info',
        target: { entityType: 'employee', entityId: employee.id },
      },
      daysToStart,
    )
  }

  for (const asset of data.assets) {
    if (asset.status === 'Retired') continue
    const daysLeft = daysBetween(today, asset.warrantyExpiry)
    if (daysLeft < 0 || daysLeft > WARRANTY_WINDOW_DAYS) continue
    const holder = asset.assignedEmployeeId ? getEmployeeById(data, asset.assignedEmployeeId) : undefined
    push(
      {
        id: `warranty-${asset.id}`,
        kind: 'warranty',
        title: `${asset.name} warranty ends ${inDays(daysLeft)}`,
        detail: `${asset.assetTag} · ${holder ? `with ${holder.name}` : asset.status.toLowerCase()}`,
        severity: daysLeft <= 14 ? 'warning' : 'info',
        target: { entityType: 'asset', entityId: asset.id },
      },
      daysLeft,
    )
  }

  for (const asset of data.assets) {
    if (asset.status !== 'Under Repair') continue
    push(
      {
        id: `repair-${asset.id}`,
        kind: 'repair',
        title: `${asset.name} is under repair`,
        detail: asset.notes ? `${asset.assetTag} · ${asset.notes}` : asset.assetTag,
        severity: 'info',
        target: { entityType: 'asset', entityId: asset.id },
      },
      0,
    )
  }

  return ranked
    .sort((a, b) => KIND_ORDER.indexOf(a.item.kind) - KIND_ORDER.indexOf(b.item.kind) || a.urgency - b.urgency)
    .map((r) => r.item)
}
