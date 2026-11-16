import { useId, useMemo, useState, type FormEvent } from 'react'
import { CategoryIcon } from '@/components/data-display/StatusBadges'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SelectField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toastContext'
import { getOpenOffboarding } from '@/domain/offboarding'
import { getAssignedAssets, getEmployeeById } from '@/domain/selectors'
import { useToday } from '@/hooks/useToday'
import { useMutation } from '@/store/useMutation'
import { useWorkspaceActions, useWorkspaceData } from '@/store/useWorkspace'
import { DEPARTMENTS } from '@/types/domain'
import { addDays, parseISODate, toISODate } from '@/utils/date'
import { pluralize } from '@/utils/format'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

interface InitiateOffboardingDialogProps {
  /** Fixed when opened from an employee page; chosen in the dialog from the offboarding queue. */
  employeeId?: string
  onClose: () => void
}

export function InitiateOffboardingDialog({ employeeId, onClose }: InitiateOffboardingDialogProps) {
  const data = useWorkspaceData()
  const { initiateOffboarding } = useWorkspaceActions()
  const toast = useToast()
  const today = useToday()
  const formId = useId()
  const { mutate, isPending, error } = useMutation(initiateOffboarding)
  const [selected, setSelected] = useState(employeeId ?? '')
  const [lastDay, setLastDay] = useState(() => toISODate(addDays(parseISODate(today), 14)))
  const [errors, setErrors] = useState<{ employee?: string; lastDay?: string }>({})

  const activeByDepartment = useMemo(
    () =>
      DEPARTMENTS.map((department) => ({
        department,
        people: data.employees
          .filter((e) => e.department === department && e.status === 'Active')
          .sort((a, b) => a.name.localeCompare(b.name)),
      })).filter((g) => g.people.length > 0),
    [data.employees],
  )
  const employee = selected ? getEmployeeById(data, selected) : undefined
  const assets = employee ? getAssignedAssets(data, employee.id) : []

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors = {
      employee: selected ? undefined : 'Choose who is leaving.',
      lastDay: ISO_DATE.test(lastDay) ? undefined : 'Enter the last working day.',
    }
    setErrors(nextErrors)
    if (nextErrors.employee || nextErrors.lastDay) return
    const result = await mutate(selected, lastDay)
    if (result.ok) {
      toast.success(`Offboarding started for ${employee?.name} · ${pluralize(assets.length, 'asset')} to recover`)
      onClose()
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Initiate offboarding"
      description={employeeId && employee ? `${employee.name} · ${employee.designation}` : 'Start recovering equipment from someone who is leaving.'}
      dismissible={!isPending}
      footer={
        <>
          <Button onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Start offboarding
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="space-y-4">
        {!employeeId && (
          <SelectField
            label="Employee"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value)
              setErrors((x) => ({ ...x, employee: undefined }))
            }}
            error={errors.employee}
            hint="Only active employees can be offboarded."
          >
            <option value="">Choose an employee…</option>
            {activeByDepartment.map((group) => (
              <optgroup key={group.department} label={group.department}>
                {group.people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} · {person.designation}
                  </option>
                ))}
              </optgroup>
            ))}
          </SelectField>
        )}
        <TextField label="Last working day" type="date" required value={lastDay} onChange={(e) => setLastDay(e.target.value)} error={errors.lastDay} />
        {employee && (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-zinc-800">Equipment to recover ({assets.length})</p>
            {assets.length === 0 ? (
              <p className="text-[13px] text-zinc-500">No company hardware assigned; offboarding can be completed right away.</p>
            ) : (
              <ul aria-label="Equipment to recover" className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                {assets.map((asset) => (
                  <li key={asset.id} className="flex items-center gap-2.5 px-3 py-2 text-[13px]">
                    <CategoryIcon category={asset.category} />
                    <span className="min-w-0 flex-1 truncate text-zinc-900">{asset.name}</span>
                    <span className="font-mono text-xs text-zinc-500">{asset.assetTag}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-zinc-500">
              Each item starts as Pending Return. They can’t receive new equipment while offboarding.
            </p>
          </div>
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

export function CompleteOffboardingDialog({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const data = useWorkspaceData()
  const { completeOffboarding } = useWorkspaceActions()
  const toast = useToast()
  const { mutate, isPending, error } = useMutation(completeOffboarding)
  const employee = getEmployeeById(data, employeeId)
  const record = getOpenOffboarding(data, employeeId)

  const confirm = async () => {
    const result = await mutate(employeeId)
    if (result.ok) {
      toast.success(`${employee?.name} is fully offboarded`)
      onClose()
    }
  }

  return (
    <ConfirmDialog
      open
      tone="danger"
      title="Complete offboarding?"
      description={
        <>
          All {pluralize(record?.items.length ?? 0, 'asset')} from <strong className="font-medium text-zinc-900">{employee?.name}</strong>{' '}
          {record?.items.length === 1 ? 'is' : 'are'} accounted for. They’ll be marked inactive and can’t receive equipment again. This
          can’t be undone.
        </>
      }
      confirmLabel="Complete offboarding"
      isPending={isPending}
      error={error?.message}
      onConfirm={confirm}
      onClose={onClose}
    />
  )
}
