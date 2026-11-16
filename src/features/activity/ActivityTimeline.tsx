import { History } from 'lucide-react'
import { Link, type To } from 'react-router'
import { EmptyState } from '@/components/ui/feedback'
import type { Activity } from '@/types/domain'
import { cn } from '@/utils/cn'
import { formatDateTime, formatRelative } from '@/utils/date'
import { ACTIVITY_META } from './activityMeta'

interface ActivityTimelineProps {
  activities: Activity[]
  /** When set, each entry links to its related record. */
  linkFor?: (activity: Activity) => To
  emptyText?: string
  className?: string
}

export function ActivityTimeline({ activities, linkFor, emptyText = 'No activity yet.', className }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return <EmptyState icon={History} title={emptyText} className="py-6" />
  }
  const now = new Date()
  return (
    <ol className={cn('relative space-y-4', className)}>
      {activities.map((activity, i) => {
        const meta = ACTIVITY_META[activity.action]
        const Icon = meta.icon
        const body = (
          <>
            <p className="text-[13px] leading-snug text-zinc-800">{activity.description}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              <time dateTime={activity.timestamp} title={formatDateTime(activity.timestamp)}>
                {formatRelative(activity.timestamp, now)}
              </time>{' '}
              · {activity.performedBy}
            </p>
          </>
        )
        return (
          <li key={activity.id} className="relative flex gap-3">
            {i < activities.length - 1 && <span className="absolute top-7 bottom-[-1rem] left-3.5 w-px bg-zinc-200" aria-hidden />}
            <span className={cn('relative flex size-7 shrink-0 items-center justify-center rounded-full', meta.tone)}>
              <Icon className="size-3.5" aria-hidden />
              <span className="sr-only">{meta.label}</span>
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              {linkFor ? (
                <Link to={linkFor(activity)} className="group block rounded focus-visible:outline-offset-4">
                  <span className="group-hover:[&_p:first-child]:text-accent-700">{body}</span>
                </Link>
              ) : (
                body
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
