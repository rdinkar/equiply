import type { Asset, Employee, WorkspaceData } from '@/types/domain'

const LIMIT = 5

/** Quick-jump search across assets (name, tag, serial) and people (name, email, ID). */
export function searchWorkspace(data: WorkspaceData, query: string): { assets: Asset[]; employees: Employee[] } {
  const q = query.trim().toLowerCase()
  if (!q) return { assets: [], employees: [] }
  const assets = data.assets
    .filter((a) => [a.name, a.assetTag, a.serialNumber, a.manufacturer].some((v) => v.toLowerCase().includes(q)))
    .slice(0, LIMIT)
  const employees = data.employees
    .filter((e) => [e.name, e.email, e.employeeId].some((v) => v.toLowerCase().includes(q)))
    .slice(0, LIMIT)
  return { assets, employees }
}
