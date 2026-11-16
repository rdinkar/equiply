import { useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SelectField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toastContext'
import { isDomainError } from '@/domain/errors'
import { getOnboardingProgress, getOpenOnboarding, validateNewHire, type NewHireFieldErrors } from '@/domain/onboarding'
import { getEmployeeById } from '@/domain/selectors'
import { useToday } from '@/hooks/useToday'
import { useMutation } from '@/store/useMutation'
import { useWorkspaceActions, useWorkspaceData } from '@/store/useWorkspace'
import { DEPARTMENTS, type Department, type NewHireInput } from '@/types/domain'
import { addDays, formatDate, parseISODate, toISODate } from '@/utils/date'
import { pluralize } from '@/utils/format'

const FIELD_ORDER: (keyof NewHireInput)[] = ['name', 'email', 'department', 'designation', 'joiningDate', 'location']

/** Start onboarding for someone who isn't in the directory yet. */
export function NewHireDialog({ onClose }: { onClose: () => void }) {
  const data = useWorkspaceData()
  const { addNewHire } = useWorkspaceActions()
  const toast = useToast()
  const today = useToday()
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const { mutate, isPending, error } = useMutation(addNewHire)
  const [values, setValues] = useState<NewHireInput>({
    name: '',
    email: '',
    department: 'Engineering',
    designation: '',
    joiningDate: toISODate(addDays(parseISODate(today), 14)),
    location: '',
  })
  const [errors, setErrors] = useState<NewHireFieldErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const set = <K extends keyof NewHireInput>(key: K, value: NewHireInput[K]) => {
    const next = { ...values, [key]: value }
    setValues(next)
    if (submitted) setErrors(validateNewHire(next, data.employees))
  }

  const focusFirst = (fieldErrors: NewHireFieldErrors) => {
    const first = FIELD_ORDER.find((k) => fieldErrors[k])
    const element = first ? formRef.current?.elements.namedItem(first) : null
    if (element instanceof HTMLElement) element.focus()
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    const clientErrors = validateNewHire(values, data.employees)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) {
      focusFirst(clientErrors)
      return
    }
    const result = await mutate(values)
    if (result.ok) {
      toast.success(`${result.value.name} added; onboarding started`)
      onClose()
    } else if (isDomainError(result.error) && result.error.fieldErrors) {
      const fieldErrors = result.error.fieldErrors as NewHireFieldErrors
      setErrors(fieldErrors)
      focusFirst(fieldErrors)
    }
  }

  const formError = error && !(isDomainError(error) && error.fieldErrors) ? error.message : null

  return (
    <Modal
      open
      onClose={onClose}
      title="Add new hire"
      description="Creates their profile and opens an equipment checklist for their department."
      dismissible={!isPending}
      footer={
        <>
          <Button onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Add new hire
          </Button>
        </>
      }
    >
      <form id={formId} ref={formRef} noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField className="sm:col-span-2" label="Full name" name="name" required data-autofocus value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <TextField className="sm:col-span-2" label="Work email" name="email" type="email" required autoComplete="off" value={values.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
        <SelectField
          label="Department"
          name="department"
          required
          value={values.department}
          onChange={(e) => set('department', e.target.value as Department)}
          error={errors.department}
          hint={values.department === 'Sales' ? 'Sales hires also need a phone.' : undefined}
        >
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </SelectField>
        <TextField label="Designation" name="designation" required placeholder="e.g. Product Designer" value={values.designation} onChange={(e) => set('designation', e.target.value)} error={errors.designation} />
        <TextField label="Start date" name="joiningDate" type="date" required value={values.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} error={errors.joiningDate} />
        <TextField label="Location" name="location" required placeholder="e.g. San Francisco" value={values.location} onChange={(e) => set('location', e.target.value)} error={errors.location} />
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700 sm:col-span-2">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  )
}

export function CompleteOnboardingDialog({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const data = useWorkspaceData()
  const { completeOnboarding } = useWorkspaceActions()
  const toast = useToast()
  const { mutate, isPending, error } = useMutation(completeOnboarding)
  const employee = getEmployeeById(data, employeeId)
  const record = getOpenOnboarding(data, employeeId)
  const progress = record ? getOnboardingProgress(data, record) : undefined

  const confirm = async () => {
    const result = await mutate(employeeId)
    if (result.ok) {
      toast.success(`${employee?.name} is onboarded`)
      onClose()
    }
  }

  return (
    <ConfirmDialog
      open
      title="Complete onboarding?"
      description={
        <>
          <strong className="font-medium text-zinc-900">{employee?.name}</strong> becomes an active employee with{' '}
          {pluralize(progress?.assignedCount ?? 0, 'asset')}
          {record && <> (starts {formatDate(record.startDate)})</>}. Optional items can still be assigned later.
        </>
      }
      confirmLabel="Complete onboarding"
      isPending={isPending}
      error={error?.message}
      onConfirm={confirm}
      onClose={onClose}
    />
  )
}
