import type { AssetFieldErrors } from '@/types/domain'

export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'ASSET_NOT_ASSIGNABLE'
  | 'EMPLOYEE_NOT_ELIGIBLE'
  | 'INVALID_TRANSITION'
  | 'PENDING_RETURNS'
  | 'ONBOARDING_INCOMPLETE'

/**
 * A business-rule violation. The message is written for the IT admin and is
 * safe to show in the UI as-is.
 */
export class DomainError extends Error {
  readonly code: DomainErrorCode
  readonly fieldErrors?: AssetFieldErrors

  constructor(code: DomainErrorCode, message: string, fieldErrors?: AssetFieldErrors) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}

/** User-facing message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}
