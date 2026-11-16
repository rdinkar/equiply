import type {
  Activity,
  Asset,
  AssetCondition,
  AssignmentSource,
  Employee,
  WorkspaceData,
} from '@/types/domain'
import type { DomainContext } from './context'
import { formatDate } from '@/utils/date'

export type ActivityEntry = Omit<Activity, 'id' | 'timestamp' | 'performedBy'>

/** Append an activity stamped with the operation's clock and actor. */
export function appendActivity(data: WorkspaceData, entry: ActivityEntry, ctx: DomainContext): WorkspaceData {
  const activity: Activity = {
    id: ctx.newId('act'),
    timestamp: ctx.now,
    performedBy: ctx.actor,
    ...entry,
  }
  return { ...data, activities: [activity, ...data.activities] }
}

export function assetLabel(asset: Pick<Asset, 'name' | 'assetTag'>): string {
  return `${asset.name} (${asset.assetTag})`
}

/**
 * Activity copy in one place. The domain operations and the seed data both use
 * it, so the history the app starts with reads the same as the history it writes.
 */
export const describe = {
  assetAdded: (asset: Asset) => `${assetLabel(asset)} added to inventory`,
  assetUpdated: (asset: Asset, fields: string[]) => `${assetLabel(asset)} details updated: ${fields.join(', ')}`,
  conditionUpdated: (asset: Asset, from: AssetCondition, to: AssetCondition) =>
    `${assetLabel(asset)} condition changed from ${from} to ${to}`,
  assetAssigned: (asset: Asset, employee: Employee, source: AssignmentSource) =>
    `${assetLabel(asset)} assigned to ${employee.name}${source === 'onboarding' ? ' for onboarding' : ''}`,
  assetReturned: (asset: Asset, employee: Employee, condition: AssetCondition) =>
    condition === 'Damaged'
      ? `${assetLabel(asset)} returned damaged by ${employee.name}; moved to repair`
      : `${assetLabel(asset)} returned by ${employee.name} in ${condition} condition`,
  assignmentEndedByRetirement: (asset: Asset, employee: Employee) =>
    `${assetLabel(asset)} assignment to ${employee.name} ended because the asset was retired`,
  assetRepair: (asset: Asset, note?: string) =>
    `${assetLabel(asset)} moved to repair${note ? `: ${note}` : ''}`,
  assetAvailable: (asset: Asset, condition: AssetCondition) =>
    `${assetLabel(asset)} back in stock in ${condition} condition`,
  assetRetired: (asset: Asset, reason?: string) => `${assetLabel(asset)} retired${reason ? `: ${reason}` : ''}`,
  onboardingStarted: (employee: Employee, startDate: string) =>
    `Onboarding started for ${employee.name} (starts ${formatDate(startDate)})`,
  employeeOnboarded: (employee: Employee, assetCount: number) =>
    `${employee.name} onboarded with ${assetCount} ${assetCount === 1 ? 'asset' : 'assets'}`,
  offboardingInitiated: (employee: Employee, assetCount: number) =>
    `Offboarding initiated for ${employee.name}; ${assetCount} ${assetCount === 1 ? 'asset' : 'assets'} to recover`,
  employeeOffboarded: (employee: Employee) => `${employee.name} fully offboarded; all assets recovered`,
}
