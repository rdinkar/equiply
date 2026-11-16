import { useId, useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toastContext'
import { canReceiveAssets, getAssetActions } from '@/domain/lifecycle'
import { getOpenOnboarding } from '@/domain/onboarding'
import { getAssetById, getEmployeeById } from '@/domain/selectors'
import { useMutation } from '@/store/useMutation'
import { useWorkspaceActions, useWorkspaceData } from '@/store/useWorkspace'
import { ASSET_CATEGORIES, DEPARTMENTS } from '@/types/domain'

interface AssignAssetDialogProps {
  /** Fixed asset (opened from the asset); pick the employee. */
  assetId?: string
  /** Fixed employee (opened from the person); pick the asset. */
  employeeId?: string
  onClose: () => void
}

/**
 * One dialog for both entry points. Only eligible people and assignable
 * assets are offered, and both lists come from the domain predicates.
 */
export function AssignAssetDialog({ assetId, employeeId, onClose }: AssignAssetDialogProps) {
  const data = useWorkspaceData()
  const { assignAsset } = useWorkspaceActions()
  const toast = useToast()
  const formId = useId()
  const { mutate, isPending, error } = useMutation(assignAsset)
  const [selected, setSelected] = useState('')
  const [pickError, setPickError] = useState<string | null>(null)

  const fixedAsset = assetId ? getAssetById(data, assetId) : undefined
  const fixedEmployee = employeeId ? getEmployeeById(data, employeeId) : undefined
  const pickingEmployee = Boolean(assetId)

  const employeesByDepartment = useMemo(
    () =>
      DEPARTMENTS.map((department) => ({
        department,
        people: data.employees
          .filter((e) => e.department === department && canReceiveAssets(e))
          .sort((a, b) => a.name.localeCompare(b.name)),
      })).filter((group) => group.people.length > 0),
    [data.employees],
  )
  const assetsByCategory = useMemo(
    () =>
      ASSET_CATEGORIES.map((category) => ({
        category,
        assets: data.assets.filter((a) => a.category === category && getAssetActions(a).assign),
      })).filter((group) => group.assets.length > 0),
    [data.assets],
  )

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) {
      setPickError(pickingEmployee ? 'Choose who receives this asset.' : 'Choose an asset to assign.')
      return
    }
    const finalAssetId = assetId ?? selected
    const finalEmployeeId = employeeId ?? selected
    const result = await mutate(finalAssetId, finalEmployeeId)
    if (result.ok) {
      const asset = getAssetById(data, finalAssetId)
      const employee = getEmployeeById(data, finalEmployeeId)
      toast.success(`${asset?.name ?? 'Asset'} assigned to ${employee?.name ?? 'employee'}`)
      onClose()
    }
  }

  const target = pickingEmployee ? undefined : fixedEmployee
  const onboarding = target ? getOpenOnboarding(data, target.id) : undefined
  const nothingToPick = pickingEmployee ? employeesByDepartment.length === 0 : assetsByCategory.length === 0

  return (
    <Modal
      open
      onClose={onClose}
      title="Assign asset"
      dismissible={!isPending}
      description={
        pickingEmployee
          ? fixedAsset && `${fixedAsset.name} · ${fixedAsset.assetTag}`
          : fixedEmployee && `To ${fixedEmployee.name} · ${fixedEmployee.designation}`
      }
      footer={
        <>
          <Button onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending} disabled={nothingToPick}>
            Assign
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="space-y-4">
        {nothingToPick ? (
          <p className="text-sm text-zinc-600">
            {pickingEmployee ? 'No employees can receive assets right now.' : 'There are no available assets to assign. Mark an asset available or add a new one first.'}
          </p>
        ) : pickingEmployee ? (
          <SelectField
            label="Employee"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value)
              setPickError(null)
            }}
            error={pickError ?? undefined}
            hint="Only active employees and incoming hires can receive equipment."
          >
            <option value="">Choose an employee…</option>
            {employeesByDepartment.map((group) => (
              <optgroup key={group.department} label={group.department}>
                {group.people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} · {person.designation}
                    {person.status === 'Onboarding' ? ' (incoming)' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </SelectField>
        ) : (
          <SelectField
            label="Asset"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value)
              setPickError(null)
            }}
            error={pickError ?? undefined}
            hint="Only available assets are listed."
          >
            <option value="">Choose an available asset…</option>
            {assetsByCategory.map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.assetTag} · {asset.name} ({asset.condition})
                  </option>
                ))}
              </optgroup>
            ))}
          </SelectField>
        )}
        {onboarding && (
          <p className="rounded-md bg-violet-50 px-3 py-2 text-[13px] text-violet-800">
            This counts toward {target?.name}’s onboarding checklist.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error.message}
          </p>
        )}
      </form>
    </Modal>
  )
}
