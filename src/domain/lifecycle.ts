import type { Asset, Employee, WorkspaceData } from '@/types/domain'

/**
 * Asset lifecycle:
 *
 *   Available ──assign──▶ Assigned ──return(ok)──▶ Available
 *       │                    │  └──return(damaged)──▶ Under Repair
 *       ├──repair──▶ Under Repair ──mark available──▶ Available
 *       └──────────── any non-retired ──retire──▶ Retired (terminal)
 *
 * The UI asks this module which actions to offer, and the domain operations
 * enforce the same table. The rules never get re-derived inside components.
 */
export interface AssetActionAvailability {
  assign: boolean
  return: boolean
  markUnderRepair: boolean
  markAvailable: boolean
  retire: boolean
  edit: boolean
}

export function getAssetActions(asset: Pick<Asset, 'status'>): AssetActionAvailability {
  const { status } = asset
  return {
    assign: status === 'Available',
    return: status === 'Assigned',
    markUnderRepair: status === 'Available',
    markAvailable: status === 'Under Repair',
    retire: status !== 'Retired',
    edit: status !== 'Retired',
  }
}

/** Employees who may be handed hardware: active staff and incoming hires. */
export function canReceiveAssets(employee: Pick<Employee, 'status'>): boolean {
  return employee.status === 'Active' || employee.status === 'Onboarding'
}

/** Why an employee can't receive assets, or null when they can. */
export function receiveBlockReason(employee: Pick<Employee, 'status' | 'name'>): string | null {
  switch (employee.status) {
    case 'Offboarding':
      return `${employee.name} is being offboarded; recover their equipment instead.`
    case 'Inactive':
      return `${employee.name} is no longer with the company.`
    default:
      return null
  }
}

/**
 * Why an asset can't be retired right now, or null. An asset still pending
 * return on an open offboarding must come back first, so the checklist never
 * points at a retired asset.
 */
export function retireBlockReason(data: WorkspaceData, assetId: string): string | null {
  const record = data.offboarding.find(
    (r) => r.completedAt === null && r.items.some((i) => i.assetId === assetId && i.state === 'Pending Return'),
  )
  if (!record) return null
  const name = data.employees.find((e) => e.id === record.employeeId)?.name ?? 'a leaving employee'
  return `This asset is pending return from ${name}. Record the return before retiring it.`
}
