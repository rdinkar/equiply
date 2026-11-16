import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TextareaField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toastContext'
import { getAssetById, getEmployeeById } from '@/domain/selectors'
import { useMutation } from '@/store/useMutation'
import { useWorkspaceActions, useWorkspaceData } from '@/store/useWorkspace'
import type { Asset, AssetCondition } from '@/types/domain'
import { AssetFormDialog } from './AssetFormDialog'
import { AssignAssetDialog } from './AssignAssetDialog'
import { ConditionPicker } from './ConditionPicker'
import { ReturnAssetDialog } from './ReturnAssetDialog'

/** Which asset dialog is open. One state value, so two dialogs can never be open at once. */
export type AssetDialogState =
  | { kind: 'create' }
  | { kind: 'edit'; assetId: string }
  | { kind: 'assign'; assetId?: string; employeeId?: string }
  | { kind: 'return'; assetId: string }
  | { kind: 'repair'; assetId: string }
  | { kind: 'available'; assetId: string }
  | { kind: 'retire'; assetId: string }
  | null

interface AssetDialogsProps {
  state: AssetDialogState
  onClose: () => void
  onCreated?: (asset: Asset) => void
}

export function AssetDialogs({ state, onClose, onCreated }: AssetDialogsProps) {
  const data = useWorkspaceData()
  if (!state) return null
  switch (state.kind) {
    case 'create':
      return <AssetFormDialog onClose={onClose} onCreated={onCreated} />
    case 'edit': {
      const asset = getAssetById(data, state.assetId)
      return asset ? <AssetFormDialog asset={asset} onClose={onClose} /> : null
    }
    case 'assign':
      return <AssignAssetDialog assetId={state.assetId} employeeId={state.employeeId} onClose={onClose} />
    case 'return':
      return <ReturnAssetDialog assetId={state.assetId} onClose={onClose} />
    case 'repair':
      return <RepairDialog assetId={state.assetId} onClose={onClose} />
    case 'available':
      return <MarkAvailableDialog assetId={state.assetId} onClose={onClose} />
    case 'retire':
      return <RetireDialog assetId={state.assetId} onClose={onClose} />
  }
}

function RepairDialog({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  const data = useWorkspaceData()
  const { markUnderRepair } = useWorkspaceActions()
  const toast = useToast()
  const { mutate, isPending, error } = useMutation(markUnderRepair)
  const [note, setNote] = useState('')
  const asset = getAssetById(data, assetId)

  const confirm = async () => {
    const result = await mutate(assetId, note)
    if (result.ok) {
      toast.success(`${asset?.name} moved to repair`)
      onClose()
    }
  }

  return (
    <ConfirmDialog
      open
      title="Send to repair?"
      description={`${asset?.name} (${asset?.assetTag}) can’t be assigned until it’s marked available again.`}
      confirmLabel="Mark under repair"
      isPending={isPending}
      error={error?.message}
      onConfirm={confirm}
      onClose={onClose}
    >
      <TextareaField label="What’s wrong?" hint="Optional. Recorded in the activity log." rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
    </ConfirmDialog>
  )
}

const REPAIRED_CONDITIONS: readonly AssetCondition[] = ['Excellent', 'Good', 'Fair']

function MarkAvailableDialog({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  const data = useWorkspaceData()
  const { markAvailable } = useWorkspaceActions()
  const toast = useToast()
  const formId = useId()
  const { mutate, isPending, error } = useMutation(markAvailable)
  const [condition, setCondition] = useState<AssetCondition>('Good')
  const asset = getAssetById(data, assetId)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await mutate(assetId, condition)
    if (result.ok) {
      toast.success(`${asset?.name} is back in stock`)
      onClose()
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Mark available"
      dismissible={!isPending}
      description={asset && `${asset.name} (${asset.assetTag}) is repaired and ready to assign.`}
      footer={
        <>
          <Button onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Mark available
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4">
        <ConditionPicker legend="Condition after repair" value={condition} onChange={setCondition} options={REPAIRED_CONDITIONS} />
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error.message}
          </p>
        )}
      </form>
    </Modal>
  )
}

function RetireDialog({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  const data = useWorkspaceData()
  const { retireAsset } = useWorkspaceActions()
  const toast = useToast()
  const { mutate, isPending, error } = useMutation(retireAsset)
  const [reason, setReason] = useState('')
  const asset = getAssetById(data, assetId)
  const holder = asset?.assignedEmployeeId ? getEmployeeById(data, asset.assignedEmployeeId) : undefined

  const confirm = async () => {
    const result = await mutate(assetId, reason)
    if (result.ok) {
      toast.success(`${asset?.name} retired`)
      onClose()
    }
  }

  return (
    <ConfirmDialog
      open
      tone="danger"
      title="Retire this asset?"
      description={
        <>
          <p>
            <strong className="font-medium text-zinc-900">{asset?.name}</strong> ({asset?.assetTag}) will be permanently
            taken out of service. This can’t be undone.
          </p>
          {holder && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
              It’s currently assigned to {holder.name}. Retiring ends that assignment; it stays in the asset’s history.
            </p>
          )}
        </>
      }
      confirmLabel="Retire asset"
      isPending={isPending}
      error={error?.message}
      onConfirm={confirm}
      onClose={onClose}
    >
      <TextField label="Reason" hint="Optional, e.g. end of life or lost." value={reason} onChange={(e) => setReason(e.target.value)} />
    </ConfirmDialog>
  )
}
