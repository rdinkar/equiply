import { useId } from 'react'
import type { AssetCondition } from '@/types/domain'
import { cn } from '@/utils/cn'

const DESCRIPTIONS: Record<AssetCondition, string> = {
  Excellent: 'Like new',
  Good: 'Normal wear',
  Fair: 'Visible wear, works fine',
  Damaged: 'Needs repair',
}

interface ConditionPickerProps {
  legend: string
  value: AssetCondition
  onChange: (value: AssetCondition) => void
  options: readonly AssetCondition[]
  hint?: string
}

/** Radio-card group; arrow keys move between options like any native radio group. */
export function ConditionPicker({ legend, value, onChange, options, hint }: ConditionPickerProps) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-zinc-800">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              'flex cursor-pointer flex-col rounded-lg border px-3 py-2 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-accent-200',
              value === option
                ? option === 'Damaged'
                  ? 'border-red-300 bg-red-50/60'
                  : 'border-accent-500 bg-accent-50/60'
                : 'border-zinc-200 hover:border-zinc-300',
            )}
          >
            <span className="flex items-center gap-2 font-medium text-zinc-900">
              <input
                type="radio"
                name={name}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
                className="accent-accent-600"
              />
              {option}
            </span>
            <span className="pl-5 text-xs text-zinc-500">{DESCRIPTIONS[option]}</span>
          </label>
        ))}
      </div>
      {hint && <p className="mt-2 text-xs text-zinc-500">{hint}</p>}
    </fieldset>
  )
}
