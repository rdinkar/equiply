import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { cn } from '@/utils/cn'
import type { DashboardMetrics } from './dashboardSelectors'

interface Metric {
  label: string
  value: number
  hint: string
  to: string
  highlight?: boolean
}

function MetricGroup({ title, metrics, className }: { title: string; metrics: Metric[]; className?: string }) {
  return (
    <section aria-label={title} className={cn('overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs', className)}>
      <h2 className="border-b border-zinc-100 px-4 py-2 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">{title}</h2>
      <ul className={cn('grid gap-px bg-zinc-100', metrics.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
        {metrics.map((metric) => (
          <li key={metric.label} className="bg-white">
            <Link to={metric.to} className="block h-full px-4 py-3 transition-colors hover:bg-zinc-50">
              <span className="block text-xs text-zinc-500">{metric.label}</span>
              <span className={cn('mt-1 block text-2xl font-semibold tracking-tight tabular-nums', metric.highlight ? 'text-amber-700' : 'text-zinc-900')}>
                {metric.value}
              </span>
              <span className="mt-0.5 block truncate text-xs text-zinc-400">{metric.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function MetricsStrip({ metrics }: { metrics: DashboardMetrics }) {
  const utilisation = metrics.totalAssets ? Math.round((metrics.assignedAssets / metrics.totalAssets) * 100) : 0
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-7">
      <MetricGroup
        title="Inventory"
        className="xl:col-span-4"
        metrics={[
          { label: 'Total assets', value: metrics.totalAssets, hint: `${metrics.retired} retired, not counted`, to: paths.assets },
          { label: 'Assigned', value: metrics.assignedAssets, hint: `${utilisation}% of the fleet in use`, to: `${paths.assets}?status=Assigned` },
          { label: 'Available', value: metrics.availableAssets, hint: 'Ready to hand out', to: `${paths.assets}?status=Available` },
          {
            label: 'Under repair',
            value: metrics.underRepair,
            hint: metrics.underRepair ? 'Can’t be assigned yet' : 'Nothing in repair',
            to: `${paths.assets}?status=Under+Repair`,
            highlight: metrics.underRepair > 0,
          },
        ]}
      />
      <MetricGroup
        title="People"
        className="xl:col-span-3"
        metrics={[
          { label: 'Employees', value: metrics.employees, hint: 'Active and incoming', to: paths.employees },
          { label: 'Pending onboarding', value: metrics.pendingOnboarding, hint: 'Hires being set up', to: paths.onboarding },
          {
            label: 'Pending returns',
            value: metrics.pendingReturns,
            hint: metrics.pendingReturnEmployees ? `From ${metrics.pendingReturnEmployees} leaving` : 'All recovered',
            to: paths.offboarding,
            highlight: metrics.pendingReturns > 0,
          },
        ]}
      />
    </div>
  )
}
