import { CircleCheck, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { EmptyState } from '@/components/ui/feedback'
import { Avatar, Card, PageHeader } from '@/components/ui/layout'
import { getOnboardingProgress } from '@/domain/onboarding'
import { getEmployeeById } from '@/domain/selectors'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToday } from '@/hooks/useToday'
import { useWorkspaceData } from '@/store/useWorkspace'
import { daysBetween, formatDate, formatTimestampDate } from '@/utils/date'
import { pluralize } from '@/utils/format'
import { CompleteOnboardingDialog, NewHireDialog } from './OnboardingDialogs'

type Dialog = { kind: 'hire' } | { kind: 'complete'; employeeId: string } | null

/**
 * Incoming hires and their equipment progress, soonest start first. Equipment
 * is assigned from the employee page; completion unlocks once required items
 * are allocated (a guided per-item checklist is a possible next step).
 */
export function OnboardingPage() {
  useDocumentTitle('Onboarding')
  const data = useWorkspaceData()
  const today = useToday()
  const [dialog, setDialog] = useState<Dialog>(null)

  const open = useMemo(
    () =>
      data.onboarding
        .filter((r) => !r.completedAt)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .map((record) => ({ record, employee: getEmployeeById(data, record.employeeId), progress: getOnboardingProgress(data, record) })),
    [data],
  )
  const completed = data.onboarding
    .filter((r) => r.completedAt)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))

  const addButton = (
    <Button variant="primary" icon={UserPlus} onClick={() => setDialog({ kind: 'hire' })}>
      Add new hire
    </Button>
  )

  return (
    <>
      <PageHeader title="Onboarding" description="Incoming hires and the equipment they still need, soonest start first." actions={addButton} />
      <Card flush title={`In progress · ${open.length}`}>
        {open.length === 0 ? (
          <EmptyState icon={UserPlus} title="No one is onboarding" description="Add a new hire to prepare their equipment." action={addButton} />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {open.map(({ record, employee, progress }) => {
              const name = employee?.name ?? 'Unknown'
              const days = daysBetween(today, record.startDate)
              const missing = progress.items.filter((i) => i.required && !i.asset).map((i) => i.category)
              const pct = Math.round((progress.assignedCount / progress.totalItems) * 100)
              return (
                <li key={record.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <Link to={paths.employee(record.employeeId)} className="group flex min-w-48 flex-1 items-center gap-3">
                    <Avatar name={name} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-zinc-900 group-hover:text-accent-700 group-hover:underline">{name}</span>
                      <span className="block truncate text-xs text-zinc-500">
                        {employee?.designation} · {employee?.department}
                      </span>
                    </span>
                  </Link>
                  <span className="w-32 text-[13px] text-zinc-700">
                    {formatDate(record.startDate)}
                    <span className="block text-xs text-violet-700">
                      {days > 0 ? `in ${pluralize(days, 'day')}` : days === 0 ? 'today' : `started ${pluralize(-days, 'day')} ago`}
                    </span>
                  </span>
                  <span className="w-40">
                    <span className="flex justify-between text-xs text-zinc-500">
                      <span>
                        {progress.assignedCount}/{progress.totalItems} items
                      </span>
                      <span>{pct}%</span>
                    </span>
                    <span
                      className="mt-1 block h-1.5 overflow-hidden rounded-full bg-zinc-100"
                      role="progressbar"
                      aria-label={`${name} equipment allocated`}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span className="block h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  <span className="flex items-center gap-2 sm:w-72 sm:justify-end">
                    {progress.ready ? (
                      <>
                        <Badge tone="green">Equipment ready</Badge>
                        <Button
                          size="sm"
                          variant="primary"
                          icon={CircleCheck}
                          aria-label={`Complete onboarding for ${name}`}
                          onClick={() => setDialog({ kind: 'complete', employeeId: record.employeeId })}
                        >
                          Complete
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge tone="amber">Needs {missing.join(' + ')}</Badge>
                        <Link to={paths.employee(record.employeeId)} className={buttonClasses('secondary', 'sm')} aria-label={`Prepare equipment for ${name}`}>
                          Prepare
                        </Link>
                      </>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      {completed.length > 0 && (
        <Card className="mt-6" title="Recently completed">
          <ul className="space-y-2 text-[13px]">
            {completed.map((record) => (
              <li key={record.id} className="flex items-center gap-2">
                <Link to={paths.employee(record.employeeId)} className="font-medium text-zinc-900 hover:text-accent-700 hover:underline">
                  {getEmployeeById(data, record.employeeId)?.name}
                </Link>
                <span className="text-zinc-500">onboarded {formatTimestampDate(record.completedAt!)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {dialog?.kind === 'hire' && <NewHireDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'complete' && <CompleteOnboardingDialog employeeId={dialog.employeeId} onClose={() => setDialog(null)} />}
    </>
  )
}
