import type { WorkspaceData } from '@/types/domain'
import { indexById } from './selectors'
import { normalizeSerial } from './validation'

/**
 * Cross-entity consistency rules. Tests assert an empty result after every
 * domain operation and against the seed data. The list doubles as executable
 * documentation of what "consistent state" means in Equiply.
 */
export function findInvariantViolations(data: WorkspaceData): string[] {
  const problems: string[] = []
  const assets = indexById(data.assets)
  const employees = indexById(data.employees)

  const checkUnique = (label: string, values: string[]) => {
    const seen = new Set<string>()
    for (const value of values) {
      if (seen.has(value)) problems.push(`Duplicate ${label}: ${value}`)
      seen.add(value)
    }
  }
  checkUnique('asset id', data.assets.map((a) => a.id))
  checkUnique('asset tag', data.assets.map((a) => a.assetTag))
  checkUnique('serial number', data.assets.map((a) => normalizeSerial(a.serialNumber)))
  checkUnique('employee id', data.employees.map((e) => e.id))
  checkUnique('assignment id', data.assignments.map((a) => a.id))
  checkUnique('activity id', data.activities.map((a) => a.id))

  for (const assignment of data.assignments) {
    if (!assets.has(assignment.assetId)) problems.push(`Assignment ${assignment.id} references missing asset`)
    if (!employees.has(assignment.employeeId)) problems.push(`Assignment ${assignment.id} references missing employee`)
  }

  for (const asset of data.assets) {
    const active = data.assignments.filter((a) => a.assetId === asset.id && a.returnedAt === null)
    if (asset.status === 'Assigned') {
      if (active.length !== 1) problems.push(`${asset.assetTag} is Assigned with ${active.length} active assignments`)
      if (!asset.assignedEmployeeId) problems.push(`${asset.assetTag} is Assigned without a holder`)
      else if (active[0] && active[0].employeeId !== asset.assignedEmployeeId)
        problems.push(`${asset.assetTag} holder disagrees with its active assignment`)
      const holder = asset.assignedEmployeeId ? employees.get(asset.assignedEmployeeId) : undefined
      if (asset.assignedEmployeeId && !holder) problems.push(`${asset.assetTag} is held by a missing employee`)
      if (holder?.status === 'Inactive') problems.push(`${asset.assetTag} is held by inactive ${holder.name}`)
    } else {
      if (active.length > 0) problems.push(`${asset.assetTag} is ${asset.status} but has an active assignment`)
      if (asset.assignedEmployeeId) problems.push(`${asset.assetTag} is ${asset.status} but has a holder`)
    }
    if (asset.status === 'Available' && asset.condition === 'Damaged')
      problems.push(`${asset.assetTag} is Available while Damaged`)
  }

  for (const activity of data.activities) {
    const refs = [{ entityType: activity.entityType, entityId: activity.entityId }, ...(activity.related ? [activity.related] : [])]
    for (const ref of refs) {
      const exists = ref.entityType === 'asset' ? assets.has(ref.entityId) : employees.has(ref.entityId)
      if (!exists) problems.push(`Activity ${activity.id} references missing ${ref.entityType} ${ref.entityId}`)
    }
  }

  for (const record of data.onboarding) {
    const employee = employees.get(record.employeeId)
    if (!employee) problems.push(`Onboarding ${record.id} references missing employee`)
    else if (!record.completedAt && employee.status !== 'Onboarding')
      problems.push(`Open onboarding for ${employee.name}, who is ${employee.status}`)
  }

  for (const record of data.offboarding) {
    const employee = employees.get(record.employeeId)
    if (!employee) {
      problems.push(`Offboarding ${record.id} references missing employee`)
      continue
    }
    if (!record.completedAt && employee.status !== 'Offboarding')
      problems.push(`Open offboarding for ${employee.name}, who is ${employee.status}`)
    for (const item of record.items) {
      const asset = assets.get(item.assetId)
      if (!asset) {
        problems.push(`Offboarding ${record.id} references missing asset`)
        continue
      }
      const heldByEmployee = asset.assignedEmployeeId === employee.id
      if (item.state === 'Pending Return' && !heldByEmployee)
        problems.push(`${asset.assetTag} is pending return from ${employee.name} but not assigned to them`)
      if (item.state !== 'Pending Return' && heldByEmployee)
        problems.push(`${asset.assetTag} is marked ${item.state} but still assigned to ${employee.name}`)
    }
  }

  return problems
}
