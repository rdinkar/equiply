import {
  ASSET_CATEGORIES,
  ASSET_CONDITIONS,
  type Asset,
  type AssetFieldErrors,
  type AssetInput,
  type AssetStatus,
} from '@/types/domain'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function normalizeSerial(serial: string): string {
  return serial.trim().toUpperCase()
}

interface ValidateOptions {
  /** The asset being edited, excluded from the duplicate-serial check. */
  excludeId?: string
  /** Current status when editing; an Available asset may not be Damaged. */
  status?: AssetStatus
}

/**
 * Validates add and edit input. The form runs it for instant feedback and the
 * service runs it again before writing, so the rule exists only here.
 */
export function validateAssetInput(
  input: AssetInput,
  assets: Asset[],
  { excludeId, status }: ValidateOptions = {},
): AssetFieldErrors {
  const errors: AssetFieldErrors = {}

  if (!input.name.trim()) errors.name = 'Enter an asset name.'
  else if (input.name.trim().length > 120) errors.name = 'Keep the name under 120 characters.'

  if (!ASSET_CATEGORIES.includes(input.category)) errors.category = 'Choose a category.'
  if (!input.manufacturer.trim()) errors.manufacturer = 'Enter the manufacturer.'
  if (!input.model.trim()) errors.model = 'Enter the model.'

  const serial = normalizeSerial(input.serialNumber)
  if (!serial) {
    errors.serialNumber = 'Enter the serial number.'
  } else {
    const clash = assets.find((a) => a.id !== excludeId && normalizeSerial(a.serialNumber) === serial)
    if (clash) errors.serialNumber = `This serial number already belongs to ${clash.assetTag}.`
  }

  if (!ISO_DATE.test(input.purchaseDate)) errors.purchaseDate = 'Enter the purchase date.'

  if (!Number.isFinite(input.purchaseCost)) errors.purchaseCost = 'Enter the purchase cost.'
  else if (input.purchaseCost < 0) errors.purchaseCost = 'Cost cannot be negative.'

  if (!ISO_DATE.test(input.warrantyExpiry)) errors.warrantyExpiry = 'Enter the warranty expiry date.'
  else if (ISO_DATE.test(input.purchaseDate) && input.warrantyExpiry < input.purchaseDate)
    errors.warrantyExpiry = 'Warranty cannot end before the purchase date.'

  if (!input.location.trim()) errors.location = 'Enter where the asset is kept.'

  if (!ASSET_CONDITIONS.includes(input.condition)) errors.condition = 'Choose a condition.'
  else if (status === 'Available' && input.condition === 'Damaged')
    errors.condition = 'A damaged asset can’t stay available. Use “Mark under repair” instead.'

  if (input.notes.length > 1000) errors.notes = 'Keep notes under 1,000 characters.'

  return errors
}

export function hasErrors(errors: AssetFieldErrors): boolean {
  return Object.keys(errors).length > 0
}
