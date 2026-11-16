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
  /** Per-field messages for form validation failures, keyed by input field name. */
  readonly fieldErrors?: Partial<Record<string, string>>

  constructor(code: DomainErrorCode, message: string, fieldErrors?: Partial<Record<string, string>>) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}

