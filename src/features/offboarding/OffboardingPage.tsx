import { CircleCheck, RotateCcw, UserMinus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { ReturnStateBadge } from '@/components/data-display/StatusBadges'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback'
import { Avatar, Card, PageHeader } from '@/components/ui/layout'
import { getOutstandingReturns } from '@/domain/offboarding'
import { getAssetById, getEmployeeById } from '@/domain/selectors'
import { AssetDialogs, type AssetDialogState } from '@/features/assets/AssetDialogs'
import { useAssetDrawer } from '@/hooks/useAssetDrawer'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToday } from '@/hooks/useToday'
import { useWorkspaceData } from '@/store/useWorkspace'
import { daysBetween, formatDate, formatTimestampDate } from '@/utils/date'
import { pluralize } from '@/utils/format'
import { CompleteOffboardingDialog, InitiateOffboardingDialog } from './OffboardingDialogs'

type Dialog = { kind: 'start' } | { kind: 'complete'; employeeId: string } | null

/**
 * Hardware to recover from people who are leaving. Returns are recorded per
 * item here (or from the employee page or asset drawer, which update the same
 * checklist), and offboarding can only be completed once nothing is pending.
 */
export function OffboardingPage() {
  useDocumentTitle('Offboarding')
  const data = useWorkspaceData()
  const today = useToday()
  const drawer = useAssetDrawer()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [assetDialog, setAssetDialog] = useState<AssetDialogState>(null)

  const open = useMemo(
    () =>
      data.offboarding
        .filter((r) => !r.completedAt)
        .map((record) => ({ record, employee: getEmployeeById(data, record.employeeId), pending: getOutstandingReturns(record).length }))
        .sort((a, b) => b.pending - a.pending || a.record.lastWorkingDay.localeCompare(b.record.lastWorkingDay)),
    [data],
  )
  const completed = data.offboarding
    .filter((r) => r.completedAt)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const totalPending = open.reduce((sum, o) => sum + o.pending, 0)

  const startButton = (
    <Button variant="primary" icon={UserMinus} onClick={() => setDialog({ kind: 'start' })}>
      Start offboarding
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Offboarding"
        description={
          totalPending
            ? `${pluralize(totalPending, 'asset')} still to recover from ${pluralize(open.filter((o) => o.pending).length, 'person', 'people')}`
            : 'Nothing left to recover from people who are leaving.'
        }
        actions={startButton}
      />
      {open.length === 0 ? (
        <Card>
          <EmptyState icon={UserMinus} title="No one is leaving" description="Start offboarding to build someone’s return checklist." action={startButton} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {open.map(({ record, employee, pending }) => {
            const name = employee?.name ?? 'Unknown'
            const daysLeft = daysBetween(today, record.lastWorkingDay)
            return (
              <Card
                key={record.id}
                flush
                title={
                  <Link to={paths.employee(record.employeeId)} className="flex items-center gap-2.5 hover:text-accent-700">
                    <Avatar name={name} size="sm" />
                    {name}
                  </Link>
                }
                description={`${employee?.designation} · last day ${formatDate(record.lastWorkingDay)}${daysLeft >= 0 ? ` (in ${pluralize(daysLeft, 'day')})` : ''}`}
                actions={
                  pending ? (
                    <Badge tone="amber">{pluralize(pending, 'pending return')}</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={CircleCheck}
                      aria-label={`Complete offboarding for ${name}`}
                      onClick={() => setDialog({ kind: 'complete', employeeId: record.employeeId })}
                    >
                      Complete
                    </Button>
                  )
                }
              >
                <ul className="divide-y divide-zinc-100">
                  {record.items.map((item) => {
                    const asset = getAssetById(data, item.assetId)
                    const label = `${asset?.name} (${asset?.assetTag})`
                    return (
                      <li key={item.assetId} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                        <div className="min-w-0 flex-1">
                          <Link to={drawer.linkTo(item.assetId)} className="block truncate font-medium text-zinc-900 hover:text-accent-700 hover:underline">
                            {asset?.name ?? 'Unknown asset'}
                          </Link>
                          <span className="font-mono text-xs text-zinc-500">{asset?.assetTag}</span>
                        </div>
                        <ReturnStateBadge state={item.state} />
                        {item.state === 'Pending Return' && (
                          <Button
                            size="sm"
                            icon={RotateCcw}
                            aria-label={`Record return of ${label}`}
                            onClick={() => setAssetDialog({ kind: 'return', assetId: item.assetId })}
                          >
                            Return
                          </Button>
                        )}
                      </li>
                    )
                  })}
                  {record.items.length === 0 && <li className="px-4 py-3 text-[13px] text-zinc-500">No company hardware to recover.</li>}
                </ul>
              </Card>
            )
          })}
        </div>
      )}
      {completed.length > 0 && (
        <Card className="mt-6" title="Completed">
          <ul className="space-y-2 text-[13px]">
            {completed.map((record) => (
              <li key={record.id} className="flex items-center gap-2">
                <Link to={paths.employee(record.employeeId)} className="font-medium text-zinc-900 hover:text-accent-700 hover:underline">
                  {getEmployeeById(data, record.employeeId)?.name}
                </Link>
                <span className="text-zinc-500">
                  fully offboarded {formatTimestampDate(record.completedAt!)} · {pluralize(record.items.length, 'asset')} recovered
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {dialog?.kind === 'start' && <InitiateOffboardingDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'complete' && <CompleteOffboardingDialog employeeId={dialog.employeeId} onClose={() => setDialog(null)} />}
      <AssetDialogs state={assetDialog} onClose={() => setAssetDialog(null)} />
    </>
  )
}
