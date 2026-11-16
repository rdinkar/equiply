import { Search, UserRoundSearch, X } from 'lucide-react'
import { useDeferredValue, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { paths } from '@/app/paths'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { EmployeeStatusBadge } from '@/components/data-display/StatusBadges'
import { Button } from '@/components/ui/Button'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { controlClasses } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/feedback'
import { Avatar, PageHeader } from '@/components/ui/layout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToday } from '@/hooks/useToday'
import { useUrlState } from '@/hooks/useUrlState'
import { useWorkspaceData } from '@/store/useWorkspace'
import { DEPARTMENTS, EMPLOYEE_STATUSES, type Employee, type EmployeeStatus } from '@/types/domain'
import { cn } from '@/utils/cn'
import { daysBetween, formatDate } from '@/utils/date'
import {
  filterAndSortEmployees,
  hasActiveEmployeeFilters,
  parseEmployeeQuery,
  serializeEmployeeQuery,
  type EmployeeQuery,
  type EmployeeSortKey,
} from './employeeQuery'

const CLEAR: Partial<EmployeeQuery> = { q: '', department: 'all', status: 'all' }

export function EmployeesPage() {
  useDocumentTitle('Employees')
  const data = useWorkspaceData()
  const navigate = useNavigate()
  const today = useToday()
  const [query, setQuery] = useUrlState(parseEmployeeQuery, serializeEmployeeQuery)
  const deferredQ = useDeferredValue(query.q)

  const assetCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of data.assets) {
      if (a.assignedEmployeeId) counts.set(a.assignedEmployeeId, (counts.get(a.assignedEmployeeId) ?? 0) + 1)
    }
    return counts
  }, [data.assets])
  const rows = useMemo(
    () => filterAndSortEmployees(data.employees, { ...query, q: deferredQ }),
    [data.employees, query, deferredQ],
  )
  const statusCounts = useMemo(() => {
    const counts = { all: data.employees.length } as Record<EmployeeStatus | 'all', number>
    for (const s of EMPLOYEE_STATUSES) counts[s] = data.employees.filter((e) => e.status === s).length
    return counts
  }, [data.employees])

  const columns: Column<Employee>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: (e) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={e.name} />
          <div className="min-w-0">
            <Link to={paths.employee(e.id)} className="block truncate font-medium text-zinc-900 hover:text-accent-700 hover:underline">
              {e.name}
            </Link>
            <span className="block truncate text-xs text-zinc-500">{e.email}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'employeeId',
      header: 'Employee ID',
      className: 'hidden sm:table-cell',
      cell: (e) => <span className="font-mono text-xs text-zinc-500">{e.employeeId}</span>,
    },
    { id: 'department', header: 'Department', className: 'hidden md:table-cell', cell: (e) => e.department },
    { id: 'designation', header: 'Designation', className: 'hidden xl:table-cell', cell: (e) => e.designation },
    {
      id: 'joined',
      header: 'Joining date',
      sortKey: 'joiningDate',
      className: 'hidden lg:table-cell whitespace-nowrap',
      cell: (e) => {
        const days = daysBetween(today, e.joiningDate)
        return (
          <>
            {formatDate(e.joiningDate)}
            {days > 0 && <span className="ml-1.5 text-xs font-medium text-violet-700">in {days} {days === 1 ? 'day' : 'days'}</span>}
          </>
        )
      },
    },
    {
      id: 'assets',
      header: 'Assets',
      className: 'text-right tabular-nums',
      cell: (e) => {
        const count = assetCounts.get(e.id) ?? 0
        return <span className={cn(count === 0 && 'text-zinc-400')}>{count}</span>
      },
    },
    { id: 'status', header: 'Status', cell: (e) => <EmployeeStatusBadge status={e.status} /> },
  ]

  const joiningSoon = data.employees.filter((e) => e.status === 'Onboarding').length

  return (
    <>
      <PageHeader title="Employees" description={`${data.employees.length} people · ${joiningSoon} joining soon`} />
      <div className="mb-4 space-y-3">
        <ChipGroup
          label="Filter by status"
          value={query.status}
          onChange={(status) => setQuery({ status })}
          options={(['all', ...EMPLOYEE_STATUSES] as const).map((s) => ({ value: s, label: s === 'all' ? 'All' : s, count: statusCounts[s] }))}
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
            <input
              type="search"
              aria-label="Search employees"
              placeholder="Search name, email, or employee ID"
              value={query.q}
              onChange={(e) => setQuery({ q: e.target.value })}
              className={cn(controlClasses, 'h-9 w-full pl-8')}
            />
          </div>
          <select
            aria-label="Department"
            value={query.department}
            onChange={(e) => setQuery({ department: e.target.value as EmployeeQuery['department'] })}
            className={cn(controlClasses, 'h-9 pr-8')}
          >
            <option value="all">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort by"
            value={`${query.sort}:${query.dir}`}
            onChange={(e) => {
              const [sort, dir] = e.target.value.split(':') as [EmployeeSortKey, 'asc' | 'desc']
              setQuery({ sort, dir })
            }}
            className={cn(controlClasses, 'h-9 pr-8')}
          >
            <option value="name:asc">Sort: Name</option>
            <option value="joiningDate:desc">Sort: Newest joiners</option>
            <option value="joiningDate:asc">Sort: Longest tenure</option>
          </select>
          {hasActiveEmployeeFilters(query) && (
            <Button variant="ghost" size="sm" icon={X} onClick={() => setQuery(CLEAR)}>
              Clear filters
            </Button>
          )}
        </div>
      </div>
      <DataTable
        caption="Employee directory"
        columns={columns}
        rows={rows}
        getRowId={(e) => e.id}
        onRowClick={(e) => navigate(paths.employee(e.id))}
        sort={{ key: query.sort, dir: query.dir }}
        onSortChange={(key) =>
          setQuery(
            key === query.sort
              ? { dir: query.dir === 'asc' ? 'desc' : 'asc' }
              : { sort: key as EmployeeSortKey, dir: key === 'joiningDate' ? 'desc' : 'asc' },
          )
        }
        emptyState={
          <EmptyState
            icon={UserRoundSearch}
            title="No employees match these filters"
            description="Try another name or ID, or clear the filters."
            action={
              <Button icon={X} onClick={() => setQuery(CLEAR)}>
                Clear filters
              </Button>
            }
          />
        }
        footer={
          rows.length > 0 && (
            <p className="border-t border-zinc-200 px-4 py-2.5 text-[13px] text-zinc-500">
              Showing <span className="font-medium text-zinc-800">{rows.length}</span> of {data.employees.length} people
            </p>
          )
        }
      />
    </>
  )
}
