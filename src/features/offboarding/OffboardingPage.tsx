import { UserMinus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { ReturnStateBadge } from '@/components/data-display/StatusBadges'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/feedback'
import { Avatar, Card, PageHeader } from '@/components/ui/layout'
import { getOutstandingReturns } from '@/domain/offboarding'
import { getAssetById, getEmployeeById } from '@/domain/selectors'
import { useAssetDrawer } from '@/hooks/useAssetDrawer'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToday } from '@/hooks/useToday'
import { useWorkspaceData } from '@/store/useWorkspace'
import { daysBetween, formatDate, formatTimestampDate } from '@/utils/date'
import { pluralize } from '@/utils/format'

/**
 * Hardware still to recover from people who are leaving. Returns are recorded
 * from the employee page or the asset drawer (the guided checklist is P1).
 */
export function OffboardingPage() {
  useDocumentTitle('Offboarding')
  const data = useWorkspaceData()
  const today = useToday()
  const drawer = useAssetDrawer()

  const open = useMemo(
    () =>
      data.offboarding
        .filter((r) => !r.completedAt)
        .map((record) => ({ record, employee: getEmployeeById(data, record.employeeId), pending: getOutstandingReturns(record).length }))
        .sort((a, b) => b.pending - a.pending || a.record.lastWorkingDay.localeCompare(b.record.lastWorkingDay)),
    [data],
  )
  const completed = data.offboarding.filter((r) => r.completedAt)
  const totalPending = open.reduce((sum, o) => sum + o.pending, 0)

  return (
    <>
      <PageHeader
        title="Offboarding"
        description={totalPending ? `${pluralize(totalPending, 'asset')} still to recover from ${pluralize(open.filter((o) => o.pending).length, 'person', 'people')}` : 'All hardware from leavers has been recovered.'}
      />
      {open.length === 0 ? (
        <Card>
          <EmptyState icon={UserMinus} title="No one is leaving" description="Employees in offboarding appear here with their return checklist." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {open.map(({ record, employee, pending }) => {
            const daysLeft = daysBetween(today, record.lastWorkingDay)
            return (
              <Card
                key={record.id}
                flush
                title={
                  <Link to={paths.employee(record.employeeId)} className="flex items-center gap-2.5 hover:text-accent-700">
                    <Avatar name={employee?.name ?? '?'} size="sm" />
                    {employee?.name}
                  </Link>
                }
                description={`${employee?.designation} · last day ${formatDate(record.lastWorkingDay)}${daysLeft >= 0 ? ` (in ${pluralize(daysLeft, 'day')})` : ''}`}
                actions={pending ? <Badge tone="amber">{pluralize(pending, 'pending return')}</Badge> : <Badge tone="green">Ready to complete</Badge>}
              >
                <ul className="divide-y divide-zinc-100">
                  {record.items.map((item) => {
                    const asset = getAssetById(data, item.assetId)
                    return (
                      <li key={item.assetId} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                        <div className="min-w-0 flex-1">
                          <Link to={drawer.linkTo(item.assetId)} className="block truncate font-medium text-zinc-900 hover:text-accent-700 hover:underline">
                            {asset?.name ?? 'Unknown asset'}
                          </Link>
                          <span className="font-mono text-xs text-zinc-500">{asset?.assetTag}</span>
                        </div>
                        <ReturnStateBadge state={item.state} />
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
    </>
  )
}
