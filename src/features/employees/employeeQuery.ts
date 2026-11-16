import type { SortDirection } from '@/components/data-display/DataTable'
import { DEPARTMENTS, EMPLOYEE_STATUSES, type Department, type Employee, type EmployeeStatus } from '@/types/domain'
import { oneOf, serializeQuery } from '@/utils/params'

export const EMPLOYEE_SORT_KEYS = ['name', 'joiningDate'] as const
export type EmployeeSortKey = (typeof EMPLOYEE_SORT_KEYS)[number]

export interface EmployeeQuery {
  q: string
  department: Department | 'all'
  status: EmployeeStatus | 'all'
  sort: EmployeeSortKey
  dir: SortDirection
}

export const DEFAULT_EMPLOYEE_QUERY: EmployeeQuery = {
  q: '',
  department: 'all',
  status: 'all',
  sort: 'name',
  dir: 'asc',
}

export function filterAndSortEmployees(employees: Employee[], query: EmployeeQuery): Employee[] {
  const q = query.q.trim().toLowerCase()
  const direction = query.dir === 'asc' ? 1 : -1
  return employees
    .filter((e) => {
      if (query.department !== 'all' && e.department !== query.department) return false
      if (query.status !== 'all' && e.status !== query.status) return false
      return !q || [e.name, e.email, e.employeeId].some((v) => v.toLowerCase().includes(q))
    })
    .sort((a, b) => direction * a[query.sort].localeCompare(b[query.sort]) || a.name.localeCompare(b.name))
}

export function parseEmployeeQuery(params: URLSearchParams): EmployeeQuery {
  return {
    q: params.get('q') ?? '',
    department: oneOf(params.get('department'), DEPARTMENTS, 'all'),
    status: oneOf(params.get('status'), EMPLOYEE_STATUSES, 'all'),
    sort: oneOf(params.get('sort'), EMPLOYEE_SORT_KEYS, DEFAULT_EMPLOYEE_QUERY.sort),
    dir: oneOf(params.get('dir'), ['asc', 'desc'] as const, DEFAULT_EMPLOYEE_QUERY.dir),
  }
}

export function serializeEmployeeQuery(query: EmployeeQuery): URLSearchParams {
  return serializeQuery({ ...query }, { ...DEFAULT_EMPLOYEE_QUERY })
}

export function hasActiveEmployeeFilters(query: EmployeeQuery): boolean {
  return query.q.trim() !== '' || query.department !== 'all' || query.status !== 'all'
}
