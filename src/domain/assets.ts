import type {
  Asset,
  AssetAssignment,
  AssetCategory,
  AssetCondition,
  AssetInput,
  WorkspaceData,
} from '@/types/domain'
import { appendActivity, assetLabel, describe } from './activity'
import type { DomainContext } from './context'
import { DomainError } from './errors'
import { canReceiveAssets, getAssetActions, receiveBlockReason } from './lifecycle'
import { getActiveAssignment, getEmployeeById } from './selectors'
import { hasErrors, validateAssetInput } from './validation'

/*
 * Asset operations. Each is a pure function (data, input, ctx) => data. It
 * validates every rule it depends on, keeps all related entities in step
 * (asset, assignment, offboarding item) and appends the activity entries.
 * Rule violations throw DomainError with a message meant for the admin.
 */

const CATEGORY_CODES: Record<AssetCategory, string> = {
  Laptop: 'LAP',
  Monitor: 'MON',
  'Mobile Phone': 'PHN',
  Keyboard: 'KBD',
  Mouse: 'MSE',
  Headphones: 'HDP',
  Accessories: 'ACC',
  Other: 'OTH',
}

/** `EQ-<CODE>-<NNNN>`. The number is a global sequence, so tags stay unique across categories. */
export function generateAssetTag(category: AssetCategory, assets: Asset[]): string {
  const highest = assets.reduce((max, asset) => {
    const n = Number(asset.assetTag.split('-').at(-1))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return `EQ-${CATEGORY_CODES[category]}-${String(highest + 1).padStart(4, '0')}`
}

function requireAsset(data: WorkspaceData, assetId: string): Asset {
  const asset = data.assets.find((a) => a.id === assetId)
  if (!asset) throw new DomainError('NOT_FOUND', 'That asset no longer exists.')
  return asset
}

function replaceAsset(data: WorkspaceData, asset: Asset): WorkspaceData {
  return { ...data, assets: data.assets.map((a) => (a.id === asset.id ? asset : a)) }
}

/** Copy only the editable fields, so stray keys like `status` can't ride along into an edit. */
function trimInput(input: AssetInput): AssetInput {
  return {
    name: input.name.trim(),
    category: input.category,
    manufacturer: input.manufacturer.trim(),
    model: input.model.trim(),
    serialNumber: input.serialNumber.trim(),
    purchaseDate: input.purchaseDate,
    purchaseCost: input.purchaseCost,
    warrantyExpiry: input.warrantyExpiry,
    location: input.location.trim(),
    condition: input.condition,
    notes: input.notes.trim(),
  }
}

export function createAsset(
  data: WorkspaceData,
  input: AssetInput,
  ctx: DomainContext,
): { data: WorkspaceData; asset: Asset } {
  const errors = validateAssetInput(input, data.assets)
  if (hasErrors(errors)) throw new DomainError('VALIDATION', 'Please fix the highlighted fields.', errors)

  const clean = trimInput(input)
  const asset: Asset = {
    id: ctx.newId('ast'),
    assetTag: generateAssetTag(clean.category, data.assets),
    ...clean,
    // A damaged asset can't be handed out, so it enters inventory already in repair.
    status: clean.condition === 'Damaged' ? 'Under Repair' : 'Available',
    assignedEmployeeId: null,
  }
  const next = appendActivity(
    { ...data, assets: [...data.assets, asset] },
    { entityType: 'asset', entityId: asset.id, action: 'asset_added', description: describe.assetAdded(asset) },
    ctx,
  )
  return { data: next, asset }
}

const FIELD_LABELS: Record<keyof AssetInput, string> = {
  name: 'name',
  category: 'category',
  manufacturer: 'manufacturer',
  model: 'model',
  serialNumber: 'serial number',
  purchaseDate: 'purchase date',
  purchaseCost: 'purchase cost',
  warrantyExpiry: 'warranty expiry',
  location: 'location',
  condition: 'condition',
  notes: 'notes',
}

export function updateAsset(
  data: WorkspaceData,
  { assetId, changes }: { assetId: string; changes: AssetInput },
  ctx: DomainContext,
): WorkspaceData {
  const current = requireAsset(data, assetId)
  if (!getAssetActions(current).edit) {
    throw new DomainError('INVALID_TRANSITION', `${assetLabel(current)} is retired and can no longer be edited.`)
  }
  const errors = validateAssetInput(changes, data.assets, { excludeId: assetId, status: current.status })
  if (hasErrors(errors)) throw new DomainError('VALIDATION', 'Please fix the highlighted fields.', errors)

  const clean = trimInput(changes)
  const changed = (Object.keys(FIELD_LABELS) as (keyof AssetInput)[]).filter((key) => clean[key] !== current[key])
  if (changed.length === 0) return data

  const updated: Asset = { ...current, ...clean }
  let next = replaceAsset(data, updated)

  if (changed.includes('condition')) {
    next = appendActivity(
      next,
      {
        entityType: 'asset',
        entityId: assetId,
        action: 'asset_condition_updated',
        description: describe.conditionUpdated(updated, current.condition, updated.condition),
      },
      ctx,
    )
  }
  const otherFields = changed.filter((key) => key !== 'condition').map((key) => FIELD_LABELS[key])
  if (otherFields.length > 0) {
    next = appendActivity(
      next,
      { entityType: 'asset', entityId: assetId, action: 'asset_updated', description: describe.assetUpdated(updated, otherFields) },
      ctx,
    )
  }
  return next
}

export function assignAsset(
  data: WorkspaceData,
  { assetId, employeeId }: { assetId: string; employeeId: string },
  ctx: DomainContext,
): WorkspaceData {
  const asset = requireAsset(data, assetId)
  const employee = getEmployeeById(data, employeeId)
  if (!employee) throw new DomainError('NOT_FOUND', 'That employee no longer exists.')

  const active = getActiveAssignment(data, assetId)
  if (asset.status === 'Assigned' || active) {
    const holder = getEmployeeById(data, active?.employeeId ?? asset.assignedEmployeeId ?? '')
    throw new DomainError(
      'ASSET_NOT_ASSIGNABLE',
      `${assetLabel(asset)} is already assigned to ${holder?.name ?? 'another employee'}.`,
    )
  }
  if (!getAssetActions(asset).assign) {
    throw new DomainError('ASSET_NOT_ASSIGNABLE', `${assetLabel(asset)} is ${asset.status} and can’t be assigned.`)
  }
  if (!canReceiveAssets(employee)) {
    throw new DomainError('EMPLOYEE_NOT_ELIGIBLE', receiveBlockReason(employee) ?? `${employee.name} can’t receive assets.`)
  }

  const assignedDuring = employee.status === 'Onboarding' ? 'onboarding' : 'manual'
  const assignment: AssetAssignment = {
    id: ctx.newId('asg'),
    assetId,
    employeeId,
    assignedAt: ctx.now,
    returnedAt: null,
    assignedDuring,
    returnCondition: null,
  }
  const updated: Asset = { ...asset, status: 'Assigned', assignedEmployeeId: employeeId }
  return appendActivity(
    { ...replaceAsset(data, updated), assignments: [...data.assignments, assignment] },
    {
      entityType: 'asset',
      entityId: assetId,
      action: 'asset_assigned',
      description: describe.assetAssigned(updated, employee, assignedDuring),
      related: { entityType: 'employee', entityId: employeeId },
    },
    ctx,
  )
}

function closeAssignment(
  data: WorkspaceData,
  assignmentId: string,
  returnCondition: AssetCondition | null,
  ctx: DomainContext,
): WorkspaceData {
  return {
    ...data,
    assignments: data.assignments.map((a) =>
      a.id === assignmentId ? { ...a, returnedAt: ctx.now, returnCondition } : a,
    ),
  }
}

/**
 * Record a return from the current holder. A Damaged return goes to repair;
 * any other condition makes the asset available again. If the holder is being
 * offboarded, their checklist item updates too, whichever screen the return
 * was recorded from.
 */
export function returnAsset(
  data: WorkspaceData,
  { assetId, condition }: { assetId: string; condition: AssetCondition },
  ctx: DomainContext,
): WorkspaceData {
  const asset = requireAsset(data, assetId)
  const active = getActiveAssignment(data, assetId)
  if (!getAssetActions(asset).return || !active) {
    throw new DomainError('INVALID_TRANSITION', `${assetLabel(asset)} isn’t assigned to anyone.`)
  }
  const employee = getEmployeeById(data, active.employeeId)
  if (!employee) throw new DomainError('NOT_FOUND', 'The employee holding this asset no longer exists.')

  const updated: Asset = {
    ...asset,
    status: condition === 'Damaged' ? 'Under Repair' : 'Available',
    condition,
    assignedEmployeeId: null,
  }
  let next = closeAssignment(replaceAsset(data, updated), active.id, condition, ctx)
  next = syncOffboardingItem(next, employee.id, assetId, condition === 'Damaged' ? 'Damaged on Return' : 'Returned', ctx)

  return appendActivity(
    next,
    {
      entityType: 'asset',
      entityId: assetId,
      action: 'asset_returned',
      description: describe.assetReturned(updated, employee, condition),
      related: { entityType: 'employee', entityId: employee.id },
    },
    ctx,
  )
}

function syncOffboardingItem(
  data: WorkspaceData,
  employeeId: string,
  assetId: string,
  state: 'Returned' | 'Damaged on Return',
  ctx: DomainContext,
): WorkspaceData {
  return {
    ...data,
    offboarding: data.offboarding.map((record) =>
      record.employeeId === employeeId && record.completedAt === null
        ? {
            ...record,
            items: record.items.map((item) =>
              item.assetId === assetId ? { ...item, state, processedAt: ctx.now } : item,
            ),
          }
        : record,
    ),
  }
}

export function markUnderRepair(
  data: WorkspaceData,
  { assetId, note }: { assetId: string; note?: string },
  ctx: DomainContext,
): WorkspaceData {
  const asset = requireAsset(data, assetId)
  if (!getAssetActions(asset).markUnderRepair) {
    const hint = asset.status === 'Assigned' ? ' Record a damaged return instead.' : ''
    throw new DomainError('INVALID_TRANSITION', `${assetLabel(asset)} is ${asset.status} and can’t be sent to repair.${hint}`)
  }
  const updated: Asset = { ...asset, status: 'Under Repair' }
  return appendActivity(
    replaceAsset(data, updated),
    { entityType: 'asset', entityId: assetId, action: 'asset_repair', description: describe.assetRepair(updated, note?.trim()) },
    ctx,
  )
}

export function markAvailable(
  data: WorkspaceData,
  { assetId, condition }: { assetId: string; condition: AssetCondition },
  ctx: DomainContext,
): WorkspaceData {
  const asset = requireAsset(data, assetId)
  if (!getAssetActions(asset).markAvailable) {
    throw new DomainError('INVALID_TRANSITION', `Only assets under repair can be marked available.`)
  }
  if (condition === 'Damaged') {
    throw new DomainError('VALIDATION', 'Choose the condition after repair; damaged assets can’t be available.', {
      condition: 'Choose Excellent, Good, or Fair.',
    })
  }
  const updated: Asset = { ...asset, status: 'Available', condition }
  return appendActivity(
    replaceAsset(data, updated),
    { entityType: 'asset', entityId: assetId, action: 'asset_available', description: describe.assetAvailable(updated, condition) },
    ctx,
  )
}

/**
 * Retire an asset permanently. An assigned asset's assignment is closed, not
 * deleted, so its history survives (spec rule 13). An asset still pending
 * return on an open offboarding must be resolved there first, so the
 * checklist never points at a retired asset.
 */
export function retireAsset(
  data: WorkspaceData,
  { assetId, reason }: { assetId: string; reason?: string },
  ctx: DomainContext,
): WorkspaceData {
  const asset = requireAsset(data, assetId)
  if (!getAssetActions(asset).retire) {
    throw new DomainError('INVALID_TRANSITION', `${assetLabel(asset)} is already retired.`)
  }
  const pendingOffboarding = data.offboarding.some(
    (r) => r.completedAt === null && r.items.some((i) => i.assetId === assetId && i.state === 'Pending Return'),
  )
  if (pendingOffboarding) {
    throw new DomainError(
      'INVALID_TRANSITION',
      `${assetLabel(asset)} is pending return on an offboarding checklist. Record its return there first.`,
    )
  }

  let next = data
  const active = getActiveAssignment(data, assetId)
  if (active) {
    const employee = getEmployeeById(data, active.employeeId)
    next = closeAssignment(next, active.id, null, ctx)
    if (employee) {
      next = appendActivity(
        next,
        {
          entityType: 'asset',
          entityId: assetId,
          action: 'asset_returned',
          description: describe.assignmentEndedByRetirement(asset, employee),
          related: { entityType: 'employee', entityId: employee.id },
        },
        ctx,
      )
    }
  }
  const updated: Asset = { ...asset, status: 'Retired', assignedEmployeeId: null }
  return appendActivity(
    replaceAsset(next, updated),
    { entityType: 'asset', entityId: assetId, action: 'asset_retired', description: describe.assetRetired(updated, reason?.trim()) },
    ctx,
  )
}
