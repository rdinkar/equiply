import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toastContext'
import { getOpenOffboarding } from '@/domain/offboarding'
import { getAssetById, getEmployeeById } from '@/domain/selectors'
import { useMutation } from '@/store/useMutation'
import { useWorkspaceActions, useWorkspaceData } from '@/store/useWorkspace'
import { ASSET_CONDITIONS, type AssetCondition } from '@/types/domain'
import { ConditionPicker } from './ConditionPicker'

export function ReturnAssetDialog({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  const data = useWorkspaceData()
  const { returnAsset } = useWorkspaceActions()
  const toast = useToast()
  const formId = useId()
  const { mutate, isPending, error } = useMutation(returnAsset)

  const asset = getAssetById(data, assetId)
  const holder = asset?.assignedEmployeeId ? getEmployeeById(data, asset.assignedEmployeeId) : undefined
  const [condition, setCondition] = useState<AssetCondition>(asset?.condition ?? 'Good')
  const offboarding = holder ? getOpenOffboarding(data, holder.id) : undefined

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await mutate(assetId, condition)
    if (result.ok) {
      toast.success(
        condition === 'Damaged'
          ? `${asset?.name} returned damaged and moved to repair`
          : `${asset?.name} returned and back in stock`,
      )
      onClose()
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Record return"
      dismissible={!isPending}
      description={asset && holder ? `${asset.name} (${asset.assetTag}) from ${holder.name}` : undefined}
      footer={
        <>
          <Button onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Record return
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4">
        <ConditionPicker
          legend="Condition on return"
          value={condition}
          onChange={setCondition}
          options={ASSET_CONDITIONS}
          hint={
            condition === 'Damaged'
              ? 'Damaged returns go to Under Repair instead of back to stock.'
              : 'The asset becomes available to assign again.'
          }
        />
        {offboarding && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            This also updates {holder?.name}’s offboarding checklist.
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
