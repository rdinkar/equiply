import type { Asset, Employee } from '@/types/domain'

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
