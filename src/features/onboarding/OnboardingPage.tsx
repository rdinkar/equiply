import { UserPlus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/feedback'
import { Avatar, Card, PageHeader } from '@/components/ui/layout'
import { getOnboardingProgress } from '@/domain/onboarding'
import { getEmployeeById } from '@/domain/selectors'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToday } from '@/hooks/useToday'
import { useWorkspaceData } from '@/store/useWorkspace'
import { daysBetween, formatDate, formatTimestampDate } from '@/utils/date'
import { pluralize } from '@/utils/format'

/**
 * Queue of incoming hires and their equipment progress. Rows open the
 * employee page, where equipment is assigned (the guided checklist is P1).
 */
export function OnboardingPage() {
  useDocumentTitle('Onboarding')
  const data = useWorkspaceData()
  const today = useToday()

  const open = useMemo(
    () =>
      data.onboarding
        .filter((r) => !r.completedAt)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .map((record) => ({ record, employee: getEmployeeById(data, record.employeeId), progress: getOnboardingProgress(data, record) })),
    [data],
  )
  const completed = data.onboarding.filter((r) => r.completedAt)

  return (
    <>
      <PageHeader title="Onboarding" description="Incoming hires and the equipment they still need, soonest start first." />
      <Card flush title={`In progress · ${open.length}`}>
        {open.length === 0 ? (
          <EmptyState icon={UserPlus} title="No one is onboarding" description="New hires appear here once HR adds them." />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {open.map(({ record, employee, progress }) => {
              const days = daysBetween(today, record.startDate)
              const missing = progress.items.filter((i) => i.required && !i.asset).map((i) => i.category)
              const pct = Math.round((progress.assignedCount / progress.totalItems) * 100)
              return (
                <li key={record.id}>
                  <Link to={paths.employee(record.employeeId)} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-zinc-50">
                    <span className="flex min-w-48 flex-1 items-center gap-3">
                      <Avatar name={employee?.name ?? '?'} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-zinc-900">{employee?.name}</span>
                        <span className="block truncate text-xs text-zinc-500">
                          {employee?.designation} · {employee?.department}
                        </span>
                      </span>
                    </span>
                    <span className="w-36 text-[13px] text-zinc-700">
                      {formatDate(record.startDate)}
                      <span className="block text-xs text-violet-700">{days > 0 ? `in ${pluralize(days, 'day')}` : days === 0 ? 'today' : `started ${pluralize(-days, 'day')} ago`}</span>
                    </span>
                    <span className="w-44">
                      <span className="flex justify-between text-xs text-zinc-500">
                        <span>
                          {progress.assignedCount}/{progress.totalItems} items
                        </span>
                        <span>{pct}%</span>
                      </span>
                      <span
                        className="mt-1 block h-1.5 overflow-hidden rounded-full bg-zinc-100"
                        role="progressbar"
                        aria-label={`${employee?.name} equipment allocated`}
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span className="block h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                      </span>
                    </span>
                    <span className="sm:w-56 sm:text-right">
                      {progress.ready ? <Badge tone="green">Ready to complete</Badge> : <Badge tone="amber">Needs {missing.join(' + ')}</Badge>}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      {completed.length > 0 && (
        <Card className="mt-6" title="Recently completed">
          <ul className="space-y-2 text-[13px]">
            {completed.map((record) => {
              const employee = getEmployeeById(data, record.employeeId)
              return (
                <li key={record.id} className="flex items-center gap-2">
                  <Link to={paths.employee(record.employeeId)} className="font-medium text-zinc-900 hover:text-accent-700 hover:underline">
                    {employee?.name}
                  </Link>
                  <span className="text-zinc-500">onboarded {formatTimestampDate(record.completedAt!)}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </>
  )
}
