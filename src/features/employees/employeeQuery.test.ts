import { describe, expect, it } from 'vitest'
import { createSeedData } from '@/mocks/seed'
import {
  DEFAULT_EMPLOYEE_QUERY,
  filterAndSortEmployees,
  parseEmployeeQuery,
  serializeEmployeeQuery,
  type EmployeeQuery,
} from './employeeQuery'

const { employees } = createSeedData(new Date(2026, 10, 16, 9))
const run = (patch: Partial<EmployeeQuery>) => filterAndSortEmployees(employees, { ...DEFAULT_EMPLOYEE_QUERY, ...patch })

describe('filterAndSortEmployees', () => {
  it('matches the employee ID', () => {
    expect(run({ q: 'eq-1001' }).map((e) => e.name)).toEqual(['Priya Sharma'])
  })

  it('matches name and email case-insensitively', () => {
    expect(run({ q: 'NOVAK' }).map((e) => e.name)).toEqual(['Lena Novak'])
    expect(run({ q: 'omar.haddad@' }).map((e) => e.name)).toEqual(['Omar Haddad'])
  })

  it('filters by department and status together', () => {
    const results = run({ department: 'Engineering', status: 'Onboarding' })
    expect(results.map((e) => e.name).sort()).toEqual(['Mei Tanaka', 'Omar Haddad'])
  })

  it('sorts by joining date, newest first', () => {
    const dates = run({ sort: 'joiningDate', dir: 'desc' }).map((e) => e.joiningDate)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('sorts by name by default', () => {
    const names = run({}).map((e) => e.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })
})

describe('employee query URL state', () => {
  it('round-trips and drops unknown values', () => {
    const query: EmployeeQuery = { ...DEFAULT_EMPLOYEE_QUERY, department: 'Sales', sort: 'joiningDate', dir: 'desc' }
    expect(parseEmployeeQuery(serializeEmployeeQuery(query))).toEqual(query)
    expect(parseEmployeeQuery(new URLSearchParams('department=Finance&status=Gone'))).toEqual(DEFAULT_EMPLOYEE_QUERY)
  })
})
