import { useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { SelectField, TextareaField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toastContext'
import { isDomainError } from '@/domain/errors'
import { hasErrors, validateAssetInput } from '@/domain/validation'
import { useToday } from '@/hooks/useToday'
import { useMutation } from '@/store/useMutation'
import { useWorkspaceActions, useWorkspaceData } from '@/store/useWorkspace'
import {
  ASSET_CATEGORIES,
  ASSET_CONDITIONS,
  type Asset,
  type AssetCategory,
  type AssetCondition,
  type AssetFieldErrors,
  type AssetInput,
} from '@/types/domain'

/** Form state is all strings (what inputs hold); it converts to AssetInput on submit. */
type FormValues = Record<keyof AssetInput, string>

function toInput(values: FormValues): AssetInput {
  return {
    ...values,
    category: values.category as AssetCategory,
    condition: values.condition as AssetCondition,
    purchaseCost: values.purchaseCost.trim() === '' ? Number.NaN : Number(values.purchaseCost),
  }
}

function fromAsset(asset: Asset): FormValues {
  return {
    name: asset.name,
    category: asset.category,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serialNumber: asset.serialNumber,
    purchaseDate: asset.purchaseDate,
    purchaseCost: String(asset.purchaseCost),
    warrantyExpiry: asset.warrantyExpiry,
    location: asset.location,
    condition: asset.condition,
    notes: asset.notes,
  }
}

interface AssetFormDialogProps {
  /** Present when editing; absent when adding. */
  asset?: Asset
  onClose: () => void
  onCreated?: (asset: Asset) => void
}

export function AssetFormDialog({ asset, onClose, onCreated }: AssetFormDialogProps) {
  const data = useWorkspaceData()
  const { createAsset, updateAsset } = useWorkspaceActions()
  const toast = useToast()
  const today = useToday()
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const isEdit = Boolean(asset)

  const [values, setValues] = useState<FormValues>(() =>
    asset
      ? fromAsset(asset)
      : {
          name: '',
          category: 'Laptop',
          manufacturer: '',
          model: '',
          serialNumber: '',
          purchaseDate: today,
          purchaseCost: '',
          warrantyExpiry: '',
          location: '',
          condition: 'Excellent',
          notes: '',
        },
  )
  // What the form started with, to tell a real edit from a no-op save.
  const [initial] = useState(values)
  const [errors, setErrors] = useState<AssetFieldErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const save = useMutation(async (input: AssetInput) => {
    if (asset) {
      await updateAsset(asset.id, input)
      return asset
    }
    return createAsset(input)
  })

  const locations = useMemo(() => [...new Set(data.assets.map((a) => a.location))].sort(), [data.assets])
  const validate = (next: FormValues) =>
    validateAssetInput(toInput(next), data.assets, { excludeId: asset?.id, status: asset?.status })

  const set = (key: keyof FormValues) => (value: string) => {
    const next = { ...values, [key]: value }
    setValues(next)
    // Once the user has tried to submit, errors update as they fix fields.
    if (submitted) setErrors(validate(next))
  }

  const focusFirstError = (fieldErrors: AssetFieldErrors) => {
    const first = (Object.keys(values) as (keyof FormValues)[]).find((key) => fieldErrors[key])
    const element = first ? formRef.current?.elements.namedItem(first) : null
    if (element instanceof HTMLElement) element.focus()
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    const clientErrors = validate(values)
    setErrors(clientErrors)
    if (hasErrors(clientErrors)) {
      focusFirstError(clientErrors)
      return
    }
    const unchanged = (Object.keys(values) as (keyof FormValues)[]).every((k) => values[k].trim() === initial[k].trim())
    if (isEdit && unchanged) {
      onClose()
      return
    }
    const result = await save.mutate(toInput(values))
    if (result.ok) {
      toast.success(isEdit ? `${values.name.trim()} updated` : `${result.value.name} added as ${result.value.assetTag}`)
      if (!isEdit) onCreated?.(result.value)
      onClose()
    } else if (isDomainError(result.error) && result.error.fieldErrors) {
      // The server re-validates; its field errors land on the same fields.
      const fieldErrors = result.error.fieldErrors as AssetFieldErrors
      setErrors(fieldErrors)
      focusFirstError(fieldErrors)
    }
  }

  const formError = save.error && !(isDomainError(save.error) && save.error.fieldErrors) ? save.error.message : null
  const title = isEdit ? 'Edit asset' : 'Add asset'

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      dismissible={!save.isPending}
      description={isEdit ? `${asset?.assetTag} · status changes happen through the asset’s actions` : 'A unique asset tag is generated automatically.'}
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={save.isPending}>
            {isEdit ? 'Save changes' : 'Add asset'}
          </Button>
        </>
      }
    >
      <form id={formId} ref={formRef} noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          className="sm:col-span-2"
          label="Asset name"
          name="name"
          required
          data-autofocus
          placeholder='e.g. MacBook Pro 14" M3'
          value={values.name}
          onChange={(e) => set('name')(e.target.value)}
          error={errors.name}
        />
        <SelectField label="Category" name="category" required value={values.category} onChange={(e) => set('category')(e.target.value)} error={errors.category}>
          {ASSET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Condition"
          name="condition"
          required
          value={values.condition}
          onChange={(e) => set('condition')(e.target.value)}
          error={errors.condition}
          hint={!isEdit && values.condition === 'Damaged' ? 'Damaged assets are added as Under Repair.' : undefined}
        >
          {ASSET_CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <TextField label="Manufacturer" name="manufacturer" required value={values.manufacturer} onChange={(e) => set('manufacturer')(e.target.value)} error={errors.manufacturer} />
        <TextField label="Model" name="model" required value={values.model} onChange={(e) => set('model')(e.target.value)} error={errors.model} />
        <TextField
          className="sm:col-span-2"
          label="Serial number"
          name="serialNumber"
          required
          autoComplete="off"
          spellCheck={false}
          value={values.serialNumber}
          onChange={(e) => set('serialNumber')(e.target.value)}
          error={errors.serialNumber}
        />
        <TextField label="Purchase date" name="purchaseDate" type="date" required value={values.purchaseDate} onChange={(e) => set('purchaseDate')(e.target.value)} error={errors.purchaseDate} />
        <TextField
          label="Purchase cost (USD)"
          name="purchaseCost"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          required
          value={values.purchaseCost}
          onChange={(e) => set('purchaseCost')(e.target.value)}
          error={errors.purchaseCost}
        />
        <TextField label="Warranty expiry" name="warrantyExpiry" type="date" required value={values.warrantyExpiry} onChange={(e) => set('warrantyExpiry')(e.target.value)} error={errors.warrantyExpiry} />
        <TextField
          label="Location"
          name="location"
          required
          list={`${formId}-locations`}
          placeholder="e.g. SF HQ · IT storage"
          value={values.location}
          onChange={(e) => set('location')(e.target.value)}
          error={errors.location}
        />
        <datalist id={`${formId}-locations`}>
          {locations.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
        <TextareaField
          className="sm:col-span-2"
          label="Notes"
          name="notes"
          rows={3}
          value={values.notes}
          onChange={(e) => set('notes')(e.target.value)}
          error={errors.notes}
        />
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700 sm:col-span-2">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  )
}
