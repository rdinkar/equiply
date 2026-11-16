import { useMemo } from 'react'
import type { To } from 'react-router'
import { paths } from '@/app/paths'
import { Card, PageHeader } from '@/components/ui/layout'
import { useAssetDrawer } from '@/hooks/useAssetDrawer'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useWorkspaceData } from '@/store/useWorkspace'
import type { Activity } from '@/types/domain'
import { ActivityTimeline } from './ActivityTimeline'
import { groupActivitiesByDay } from './groupByDay'

/** Central audit trail. Every entry links to the asset (drawer) or person it concerns. */
export function ActivityPage() {
  useDocumentTitle('Activity Log')
  const data = useWorkspaceData()
  const drawer = useAssetDrawer()
  const groups = useMemo(() => groupActivitiesByDay(data.activities), [data.activities])
  const linkFor = (a: Activity): To => (a.entityType === 'asset' ? drawer.linkTo(a.entityId) : paths.employee(a.entityId))

  return (
    <>
      <PageHeader
        title="Activity log"
        description={`Every change to assets and people, newest first · ${data.activities.length} events`}
      />
      {groups.length === 0 ? (
        <Card>
          <ActivityTimeline activities={[]} emptyText="Nothing has happened yet." />
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.day} aria-labelledby={`day-${group.day}`}>
              <h2 id={`day-${group.day}`} className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                {group.label}
              </h2>
              <Card>
                <ActivityTimeline activities={group.items} linkFor={linkFor} />
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
