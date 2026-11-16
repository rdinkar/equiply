import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export const controlClasses =
  'block w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-accent-500 focus:ring-2 focus:ring-accent-100 focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-500 aria-invalid:border-red-400 aria-invalid:focus:ring-red-100'

interface FieldChromeProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
}

/**
 * Label, hint and error wiring shared by every form control: the control gets
 * aria-invalid and aria-describedby pointing at whichever messages are shown.
 */
function FieldChrome({
  label,
  error,
  hint,
  required,
  className,
  children,
}: FieldChromeProps & { children: (ids: { id: string; describedBy: string | undefined }) => ReactNode }) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[13px] font-medium text-zinc-800">
        {label}
        {required && (
          <span className="text-red-600" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children({ id, describedBy })}
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type TextFieldProps = FieldChromeProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>

export function TextField({ label, error, hint, required, className, ...input }: TextFieldProps) {
  return (
    <FieldChrome label={label} error={error} hint={hint} required={required} className={className}>
      {({ id, describedBy }) => (
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClasses, 'h-9')}
          {...input}
        />
      )}
    </FieldChrome>
  )
}

type SelectFieldProps = FieldChromeProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>

export function SelectField({ label, error, hint, required, className, children, ...select }: SelectFieldProps) {
  return (
    <FieldChrome label={label} error={error} hint={hint} required={required} className={className}>
      {({ id, describedBy }) => (
        <select
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClasses, 'h-9 pr-8')}
          {...select}
        >
          {children}
        </select>
      )}
    </FieldChrome>
  )
}

type TextareaFieldProps = FieldChromeProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>

export function TextareaField({ label, error, hint, required, className, ...textarea }: TextareaFieldProps) {
  return (
    <FieldChrome label={label} error={error} hint={hint} required={required} className={className}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlClasses, 'min-h-20 py-2')}
          {...textarea}
        />
      )}
    </FieldChrome>
  )
}
