import { Archive, PackageCheck, PackageX, Pencil, RotateCcw, UserCheck, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import {
  AssetStatusBadge,
  CategoryIcon,
  ConditionLabel,
  EmployeeStatusBadge,
  WarrantyLabel,
} from '@/components/data-display/StatusBadges'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback'
import { Avatar, DescriptionList } from '@/components/ui/layout'
import { Modal } from '@/components/ui/Modal'
import { getAssetActions } from '@/domain/lifecycle'
import {
  getActiveAssignment,
  getActivitiesFor,
  getAssetById,
  getAssignmentHistory,
  getEmployeeById,
} from '@/domain/selectors'
import { ActivityTimeline } from '@/features/activity/ActivityTimeline'
import { useAssetDrawer } from '@/hooks/useAssetDrawer'
import { useToday } from '@/hooks/useToday'
import { useWorkspaceData } from '@/store/useWorkspace'
import type { Asset } from '@/types/domain'
import { formatDate, formatTimestampDate } from '@/utils/date'
import { formatCurrency } from '@/utils/format'
import { AssetDialogs, type AssetDialogState } from './AssetDialogs'

/**
 * Right-hand asset detail panel. It opens over any page from `?asset=<id>`,
 * so it can be linked and Back closes it. Mounted once, in the app shell.
 */
export function AssetDrawer() {
  const { assetId, close } = useAssetDrawer()
  const data = useWorkspaceData()
  const [dialog, setDialog] = useState<AssetDialogState>(null)
  if (!assetId) return null
  const asset = getAssetById(data, assetId)

  return (
    <>
      <Modal
        open
        onClose={close}
        variant="drawer-right"
        size="lg"
        title={asset ? asset.name : 'Asset not found'}
        description={asset ? `${asset.assetTag} · ${asset.manufacturer} ${asset.model}` : undefined}
      >
        {asset ? (
          <AssetDetails asset={asset} onAction={setDialog} />
        ) : (
          <EmptyState
            icon={PackageX}
            title="This asset doesn’t exist"
            description="It may have been removed, or the link is wrong. Close this panel to get back to where you were."
          />
        )}
      </Modal>
      <AssetDialogs state={dialog} onClose={() => setDialog(null)} />
    </>
  )
}

function AssetDetails({ asset, onAction }: { asset: Asset; onAction: (state: AssetDialogState) => void }) {
  const data = useWorkspaceData()
  const today = useToday()
  const actions = getAssetActions(asset)
  const active = getActiveAssignment(data, asset.id)
  const holder = active ? getEmployeeById(data, active.employeeId) : undefined
  const history = getAssignmentHistory(data, { assetId: asset.id })
  const activities = getActivitiesFor(data, 'asset', asset.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-100">
          <CategoryIcon category={asset.category} className="size-5 text-zinc-600" />
        </span>
        <AssetStatusBadge status={asset.status} />
        <span className="text-[13px] text-zinc-600">
          <ConditionLabel condition={asset.condition} />
        </span>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Asset actions">
        {actions.assign && (
          <Button variant="primary" icon={UserCheck} onClick={() => onAction({ kind: 'assign', assetId: asset.id })}>
            Assign
          </Button>
        )}
        {actions.return && (
          <Button variant="primary" icon={RotateCcw} onClick={() => onAction({ kind: 'return', assetId: asset.id })}>
            Return
          </Button>
        )}
        {actions.markAvailable && (
          <Button variant="primary" icon={PackageCheck} onClick={() => onAction({ kind: 'available', assetId: asset.id })}>
            Mark available
          </Button>
        )}
        {actions.markUnderRepair && (
          <Button icon={Wrench} onClick={() => onAction({ kind: 'repair', assetId: asset.id })}>
            Mark under repair
          </Button>
        )}
        {actions.edit && (
          <Button icon={Pencil} onClick={() => onAction({ kind: 'edit', assetId: asset.id })}>
            Edit
          </Button>
        )}
        {actions.retire && (
          <Button variant="ghost" icon={Archive} className="text-red-700 hover:bg-red-50" onClick={() => onAction({ kind: 'retire', assetId: asset.id })}>
            Retire
          </Button>
        )}
      </div>

      {asset.status === 'Retired' && (
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-[13px] text-zinc-600">
          This asset is retired. Its record and history are kept for reference and can’t be changed.
        </p>
      )}

      {holder && active && (
        <section aria-labelledby="holder-heading" className="rounded-lg border border-zinc-200 p-3">
          <h3 id="holder-heading" className="mb-2 text-xs font-medium text-zinc-500">
            Assigned to
          </h3>
          <div className="flex items-center gap-3">
            <Avatar name={holder.name} />
            <div className="min-w-0 flex-1">
              <Link to={paths.employee(holder.id)} className="font-medium text-zinc-900 hover:text-accent-700 hover:underline">
                {holder.name}
              </Link>
              <p className="truncate text-xs text-zinc-500">
                {holder.designation} · since {formatTimestampDate(active.assignedAt)}
              </p>
            </div>
            <EmployeeStatusBadge status={holder.status} />
          </div>
        </section>
      )}

      <section aria-labelledby="details-heading">
        <h3 id="details-heading" className="mb-3 text-sm font-semibold text-zinc-900">
          Details
        </h3>
        <DescriptionList
          items={[
            { label: 'Asset tag', value: <span className="font-mono text-[13px]">{asset.assetTag}</span> },
            { label: 'Serial number', value: <span className="font-mono text-[13px]">{asset.serialNumber}</span> },
            { label: 'Category', value: asset.category },
            { label: 'Location', value: asset.location },
            { label: 'Manufacturer', value: asset.manufacturer },
            { label: 'Model', value: asset.model },
          ]}
        />
      </section>

      <section aria-labelledby="purchase-heading">
        <h3 id="purchase-heading" className="mb-3 text-sm font-semibold text-zinc-900">
          Purchase & warranty
        </h3>
        <DescriptionList
          items={[
            { label: 'Purchase date', value: formatDate(asset.purchaseDate) },
            { label: 'Purchase cost', value: formatCurrency(asset.purchaseCost) },
            { label: 'Warranty expiry', value: <WarrantyLabel date={asset.warrantyExpiry} today={today} /> },
          ]}
        />
        {asset.notes && (
          <div className="mt-3">
            <p className="text-xs text-zinc-500">Notes</p>
            <p className="mt-0.5 text-sm whitespace-pre-line text-zinc-900">{asset.notes}</p>
          </div>
        )}
      </section>

      <section aria-labelledby="history-heading">
        <h3 id="history-heading" className="mb-3 text-sm font-semibold text-zinc-900">
          Assignment history
        </h3>
        {history.length === 0 ? (
          <p className="text-[13px] text-zinc-500">Never assigned.</p>
        ) : (
          <ol className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {history.map((assignment) => {
              const person = getEmployeeById(data, assignment.employeeId)
              return (
                <li key={assignment.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={person?.name ?? '?'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-zinc-900">
                      {person ? (
                        <Link to={paths.employee(person.id)} className="font-medium hover:text-accent-700 hover:underline">
                          {person.name}
                        </Link>
                      ) : (
                        'Unknown employee'
                      )}
                      {assignment.assignedDuring === 'onboarding' && <span className="ml-1.5 text-xs text-violet-700">Onboarding</span>}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatTimestampDate(assignment.assignedAt)} → {assignment.returnedAt ? formatTimestampDate(assignment.returnedAt) : 'present'}
                    </p>
                  </div>
                  {assignment.returnedAt ? (
                    <span className="text-xs text-zinc-500">
                      {assignment.returnCondition ? `Returned ${assignment.returnCondition.toLowerCase()}` : 'Ended at retirement'}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-sky-700">Current</span>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="activity-heading">
        <h3 id="activity-heading" className="mb-3 text-sm font-semibold text-zinc-900">
          Activity
        </h3>
        <ActivityTimeline activities={activities} emptyText="No activity recorded for this asset." />
      </section>
    </div>
  )
}
