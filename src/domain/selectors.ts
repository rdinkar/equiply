import type {
  Activity,
  Asset,
  AssetAssignment,
  Employee,
  EntityType,
  WorkspaceData,
} from '@/types/domain'

export function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}

export function getAssetById(data: WorkspaceData, id: string): Asset | undefined {
  return data.assets.find((a) => a.id === id)
}

export function getEmployeeById(data: WorkspaceData, id: string): Employee | undefined {
  return data.employees.find((e) => e.id === id)
}

export function getActiveAssignment(data: WorkspaceData, assetId: string): AssetAssignment | undefined {
  return data.assignments.find((a) => a.assetId === assetId && a.returnedAt === null)
}

export function getAssignedAssets(data: WorkspaceData, employeeId: string): Asset[] {
  return data.assets.filter((a) => a.assignedEmployeeId === employeeId)
}

/** Assignment history, newest first; includes the active assignment. */
export function getAssignmentHistory(
  data: WorkspaceData,
  filter: { assetId: string } | { employeeId: string },
): AssetAssignment[] {
  const matches =
    'assetId' in filter
      ? data.assignments.filter((a) => a.assetId === filter.assetId)
      : data.assignments.filter((a) => a.employeeId === filter.employeeId)
  return [...matches].sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
}

/** Activities where the entity is the subject or the related party, newest first. */
export function getActivitiesFor(data: WorkspaceData, entityType: EntityType, entityId: string): Activity[] {
  return data.activities
    .filter(
      (a) =>
        (a.entityType === entityType && a.entityId === entityId) ||
        (a.related?.entityType === entityType && a.related.entityId === entityId),
    )
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export function sortActivitiesNewestFirst(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}
