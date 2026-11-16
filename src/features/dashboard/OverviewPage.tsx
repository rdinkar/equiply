import { useMemo } from 'react'
import { Link, type To } from 'react-router'
import { paths } from '@/app/paths'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { Card, PageHeader } from '@/components/ui/layout'
import { CURRENT_ADMIN } from '@/domain/context'
import { sortActivitiesNewestFirst } from '@/domain/selectors'
import { ActivityTimeline } from '@/features/activity/ActivityTimeline'
import { useAssetDrawer } from '@/hooks/useAssetDrawer'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToday } from '@/hooks/useToday'
import { useWorkspaceData } from '@/store/useWorkspace'
import type { Activity } from '@/types/domain'
import { formatDate } from '@/utils/date'
import { AttentionList } from './AttentionList'
import { getAttentionItems, getDashboardMetrics } from './dashboardSelectors'
import { MetricsStrip } from './MetricsStrip'

function greeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function OverviewPage() {
  useDocumentTitle('Overview')
  const data = useWorkspaceData()
  const today = useToday()
  const drawer = useAssetDrawer()

  const metrics = useMemo(() => getDashboardMetrics(data), [data])
  const attention = useMemo(() => getAttentionItems(data, today), [data, today])
  const recent = useMemo(() => sortActivitiesNewestFirst(data.activities).slice(0, 8), [data.activities])
  const activityLink = (a: Activity): To => (a.entityType === 'asset' ? drawer.linkTo(a.entityId) : paths.employee(a.entityId))
  const firstName = CURRENT_ADMIN.name.split(' ')[0]

  return (
    <>
      <PageHeader
        title="Overview"
        description={`${greeting(new Date().getHours())}, ${firstName}. Here’s where your hardware stands on ${formatDate(today)}.`}
        actions={
          <Link to={paths.assets} className={buttonClasses('secondary')}>
            Open inventory
          </Link>
        }
      />
      <MetricsStrip metrics={metrics} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card
          className="lg:col-span-3"
          flush
          title="Needs attention"
          description={attention.length ? `${attention.length} items across returns, joiners, warranties, and repairs` : undefined}
        >
          <AttentionList items={attention} />
        </Card>
        <Card
          className="lg:col-span-2"
          title="Recent activity"
          actions={
            <Link to={paths.activity} className="text-[13px] font-medium text-accent-700 hover:underline">
              View all
            </Link>
          }
        >
          <ActivityTimeline activities={recent} linkFor={activityLink} />
        </Card>
      </div>
    </>
  )
}
