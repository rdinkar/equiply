import { ArrowLeft, Briefcase, CalendarDays, CircleCheck, Mail, MapPin, PackageOpen, RotateCcw, UserCheck, UserMinus, UserX } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { CategoryIcon, ConditionLabel, EmployeeStatusBadge } from '@/components/data-display/StatusBadges'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { EmptyState } from '@/components/ui/feedback'
import { Avatar, Card, PageHeader } from '@/components/ui/layout'
import { canReceiveAssets, receiveBlockReason } from '@/domain/lifecycle'
import { getOpenOffboarding, getOutstandingReturns } from '@/domain/offboarding'
import { getOnboardingProgress, getOpenOnboarding } from '@/domain/onboarding'
import {
  getActiveAssignment,
  getActivitiesFor,
  getAssetById,
  getAssignedAssets,
  getAssignmentHistory,
  getEmployeeById,
} from '@/domain/selectors'
import { ActivityTimeline } from '@/features/activity/ActivityTimeline'
import { AssetDialogs, type AssetDialogState } from '@/features/assets/AssetDialogs'
import { CompleteOffboardingDialog, InitiateOffboardingDialog } from '@/features/offboarding/OffboardingDialogs'
import { CompleteOnboardingDialog } from '@/features/onboarding/OnboardingDialogs'
import { useAssetDrawer } from '@/hooks/useAssetDrawer'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToday } from '@/hooks/useToday'
import { useWorkspaceData } from '@/store/useWorkspace'
import type { Employee } from '@/types/domain'
import { cn } from '@/utils/cn'
import { daysBetween, formatDate, formatTimestampDate } from '@/utils/date'
import { pluralize } from '@/utils/format'

const backLink = (
  <Link to={paths.employees} className="mb-2 inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-900">
    <ArrowLeft className="size-3.5" aria-hidden />
    Employees
  </Link>
)

export function EmployeeDetailPage() {
  const { employeeId = '' } = useParams()
  const data = useWorkspaceData()
  const employee = getEmployeeById(data, employeeId)
  useDocumentTitle(employee?.name ?? 'Employee not found')

  if (!employee) {
    return (
      <>
        <PageHeader eyebrow={backLink} title="Employee not found" />
        <EmptyState
          icon={UserX}
          title="This person isn’t in the directory"
          description="The link may be out of date, or the employee ID is wrong."
          action={
            <Link to={paths.employees} className={buttonClasses('primary')}>
              Back to employees
            </Link>
          }
        />
      </>
    )
  }
  // Keyed by id so open dialogs reset when moving between people (including browser Back).
  return <EmployeeDetail key={employee.id} employee={employee} />
}

type LifecycleDialog =
  | { kind: 'initiateOffboarding' }
  | { kind: 'completeOffboarding' }
  | { kind: 'completeOnboarding' }
  | null

function EmployeeDetail({ employee }: { employee: Employee }) {
  const data = useWorkspaceData()
  const today = useToday()
  const drawer = useAssetDrawer()
  const [dialog, setDialog] = useState<AssetDialogState>(null)
  const [lifecycle, setLifecycle] = useState<LifecycleDialog>(null)
  const ids = { hardware: useId(), history: useId(), activity: useId(), offboarding: useId() }

  const assets = getAssignedAssets(data, employee.id)
  const pastAssignments = getAssignmentHistory(data, { employeeId: employee.id }).filter((a) => a.returnedAt)
  const activities = getActivitiesFor(data, 'employee', employee.id).slice(0, 12)
  const onboarding = getOpenOnboarding(data, employee.id)
  const offboarding = getOpenOffboarding(data, employee.id)
  const blockReason = receiveBlockReason(employee)
  const pendingReturns = offboarding ? getOutstandingReturns(offboarding).length : 0

  return (
    <>
      <PageHeader
        eyebrow={backLink}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar name={employee.name} size="lg" />
            <span>{employee.name}</span>
            <EmployeeStatusBadge status={employee.status} />
          </span>
        }
        description={`${employee.designation} · ${employee.department}`}
        actions={
          <div className="flex flex-col items-end gap-1">
            <div className="flex flex-wrap justify-end gap-2">
              {employee.status === 'Active' && (
                <Button icon={UserMinus} onClick={() => setLifecycle({ kind: 'initiateOffboarding' })}>
                  Initiate offboarding
                </Button>
              )}
              <Button
              variant="primary"
              icon={UserCheck}
              disabled={!canReceiveAssets(employee)}
              aria-describedby={blockReason ? `${ids.hardware}-block` : undefined}
              onClick={() => setDialog({ kind: 'assign', employeeId: employee.id })}
            >
                Assign asset
              </Button>
            </div>
            {blockReason && (
              <p id={`${ids.hardware}-block`} className="max-w-xs text-right text-xs text-zinc-500">
                {blockReason}
              </p>
            )}
          </div>
        }
      />

      {onboarding && <OnboardingCard employee={employee} onComplete={() => setLifecycle({ kind: 'completeOnboarding' })} />}
      {offboarding && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <p className="min-w-0 flex-1">
            <strong className="font-medium">Offboarding in progress.</strong>{' '}
            {pendingReturns > 0 ? `${pluralize(pendingReturns, 'asset')} still to recover` : 'All assets recovered; ready to complete'} · last
            working day {formatDate(offboarding.lastWorkingDay)}
          </p>
          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              variant="primary"
              icon={CircleCheck}
              disabled={pendingReturns > 0}
              aria-describedby={pendingReturns > 0 ? ids.offboarding : undefined}
              onClick={() => setLifecycle({ kind: 'completeOffboarding' })}
            >
              Complete offboarding
            </Button>
            {pendingReturns > 0 && (
              <p id={ids.offboarding} className="text-xs text-amber-800">
                {pluralize(pendingReturns, 'asset')} {pendingReturns === 1 ? 'is' : 'are'} still pending return.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby={ids.hardware}>
            <Card
              flush
              title={<span id={ids.hardware}>Assigned hardware ({assets.length})</span>}
            >
              {assets.length === 0 ? (
                <EmptyState
                  icon={PackageOpen}
                  title="No hardware assigned"
                  description={canReceiveAssets(employee) ? 'Assign a laptop or accessories to get them set up.' : undefined}
                  className="py-8"
                />
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {assets.map((asset) => {
                    const since = getActiveAssignment(data, asset.id)?.assignedAt
                    const pending = offboarding?.items.some((i) => i.assetId === asset.id && i.state === 'Pending Return')
                    return (
                      <li key={asset.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <span className="flex size-8 items-center justify-center rounded-md bg-zinc-100">
                          <CategoryIcon category={asset.category} className="text-zinc-600" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link to={drawer.linkTo(asset.id)} className="block truncate text-[13px] font-medium text-zinc-900 hover:text-accent-700 hover:underline">
                            {asset.name}
                          </Link>
                          <p className="text-xs text-zinc-500">
                            <span className="font-mono">{asset.assetTag}</span>
                            {since && <> · since {formatTimestampDate(since)}</>} · <ConditionLabel condition={asset.condition} />
                          </p>
                        </div>
                        {pending && <span className="text-xs font-medium text-amber-700">Pending return</span>}
                        <Button
                          size="sm"
                          icon={RotateCcw}
                          aria-label={`Return ${asset.name} (${asset.assetTag})`}
                          onClick={() => setDialog({ kind: 'return', assetId: asset.id })}
                        >
                          Return
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby={ids.history}>
            <Card flush title={<span id={ids.history}>Assignment history</span>}>
              {pastAssignments.length === 0 ? (
                <p className="px-4 py-6 text-center text-[13px] text-zinc-500">No returned assets yet.</p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {pastAssignments.map((assignment) => {
                    const asset = getAssetById(data, assignment.assetId)
                    return (
                      <li key={assignment.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                        {asset && <CategoryIcon category={asset.category} />}
                        <div className="min-w-0 flex-1">
                          {asset ? (
                            <Link to={drawer.linkTo(asset.id)} className="font-medium text-zinc-900 hover:text-accent-700 hover:underline">
                              {asset.name}
                            </Link>
                          ) : (
                            'Unknown asset'
                          )}
                          <p className="text-xs text-zinc-500">
                            {formatTimestampDate(assignment.assignedAt)} → {formatTimestampDate(assignment.returnedAt!)}
                          </p>
                        </div>
                        <span className={cn('text-xs', assignment.returnCondition === 'Damaged' ? 'text-red-700' : 'text-zinc-500')}>
                          {assignment.returnCondition ? `Returned ${assignment.returnCondition.toLowerCase()}` : 'Ended at retirement'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <Card title="Profile">
            <dl className="space-y-3 text-[13px]">
              <ProfileRow icon={Briefcase} label="Employee ID" value={<span className="font-mono">{employee.employeeId}</span>} />
              <ProfileRow icon={Mail} label="Email" value={<a href={`mailto:${employee.email}`} className="hover:underline">{employee.email}</a>} />
              <ProfileRow icon={MapPin} label="Location" value={employee.location} />
              <ProfileRow
                icon={CalendarDays}
                label={daysBetween(today, employee.joiningDate) > 0 ? 'Starts' : 'Joined'}
                value={formatDate(employee.joiningDate)}
              />
            </dl>
          </Card>
          <section aria-labelledby={ids.activity}>
            <Card title={<span id={ids.activity}>Recent activity</span>}>
              <ActivityTimeline activities={activities} emptyText="No activity for this person yet." />
            </Card>
          </section>
        </div>
      </div>

      <AssetDialogs state={dialog} onClose={() => setDialog(null)} />
      {lifecycle?.kind === 'initiateOffboarding' && <InitiateOffboardingDialog employeeId={employee.id} onClose={() => setLifecycle(null)} />}
      {lifecycle?.kind === 'completeOffboarding' && <CompleteOffboardingDialog employeeId={employee.id} onClose={() => setLifecycle(null)} />}
      {lifecycle?.kind === 'completeOnboarding' && <CompleteOnboardingDialog employeeId={employee.id} onClose={() => setLifecycle(null)} />}
    </>
  )
}

function ProfileRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-zinc-500">{label}</dt>
        <dd className="break-words text-zinc-900">{value}</dd>
      </div>
    </div>
  )
}

/** Checklist status and completion. Equipment itself is assigned one item at a time above. */
function OnboardingCard({ employee, onComplete }: { employee: Employee; onComplete: () => void }) {
  const data = useWorkspaceData()
  const reasonId = useId()
  const record = getOpenOnboarding(data, employee.id)
  if (!record) return null
  const progress = getOnboardingProgress(data, record)
  const missing = progress.items.filter((i) => i.required && !i.asset).map((i) => i.category)
  return (
    <div className="mb-6 flex flex-wrap items-start gap-3 rounded-lg border border-violet-200 bg-violet-50/60 px-4 py-3">
      <div className="min-w-0 flex-1">
      <p className="text-[13px] text-violet-900">
        <strong className="font-medium">Onboarding</strong> · starts {formatDate(record.startDate)} · {progress.requiredDone}/
        {progress.requiredTotal} required items ready
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Equipment checklist">
        {progress.items.map((item) => (
          <li
            key={item.category}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
              item.asset ? 'bg-white text-zinc-800 ring-1 ring-violet-200' : 'text-violet-800/80 ring-1 ring-violet-200/70 ring-dashed',
            )}
          >
            {item.asset && <CircleCheck className="size-3 text-emerald-600" aria-hidden />}
            {item.category}
            {item.required && <span className="text-violet-700">*</span>}
            <span className="sr-only">{item.asset ? ', assigned' : ', not assigned yet'}{item.required ? ', required' : ''}</span>
          </li>
        ))}
      </ul>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Button
          size="sm"
          variant="primary"
          icon={CircleCheck}
          disabled={!progress.ready}
          aria-describedby={progress.ready ? undefined : reasonId}
          onClick={onComplete}
        >
          Complete onboarding
        </Button>
        {!progress.ready && (
          <p id={reasonId} className="text-xs text-violet-800">
            Assign the required {missing.join(' and ')} first.
          </p>
        )}
      </div>
    </div>
  )
}
