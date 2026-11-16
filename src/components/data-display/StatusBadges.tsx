import {
  Cable,
  Headphones,
  Keyboard,
  Laptop,
  Monitor,
  Mouse,
  Package,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import type { AssetCategory, AssetCondition, AssetStatus, EmployeeStatus, ReturnState } from '@/types/domain'
import { cn } from '@/utils/cn'
import { daysBetween, formatDate } from '@/utils/date'
import { pluralize } from '@/utils/format'

const assetStatusTone: Record<AssetStatus, BadgeTone> = {
  Available: 'green',
  Assigned: 'blue',
  'Under Repair': 'amber',
  Retired: 'neutral',
}

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return <Badge tone={assetStatusTone[status]}>{status}</Badge>
}

const employeeStatusTone: Record<EmployeeStatus, BadgeTone> = {
  Active: 'green',
  Onboarding: 'violet',
  Offboarding: 'amber',
  Inactive: 'neutral',
}

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return <Badge tone={employeeStatusTone[status]}>{status}</Badge>
}

const returnStateTone: Record<ReturnState, BadgeTone> = {
  'Pending Return': 'amber',
  Returned: 'green',
  'Damaged on Return': 'red',
}

export function ReturnStateBadge({ state }: { state: ReturnState }) {
  return <Badge tone={returnStateTone[state]}>{state}</Badge>
}

const conditionDot: Record<AssetCondition, string> = {
  Excellent: 'bg-emerald-500',
  Good: 'bg-zinc-400',
  Fair: 'bg-amber-500',
  Damaged: 'bg-red-500',
}

export function ConditionLabel({ condition }: { condition: AssetCondition }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn('size-1.5 rounded-full', conditionDot[condition])} aria-hidden />
      {condition}
    </span>
  )
}

export const WARRANTY_WARNING_DAYS = 30

/** Warranty date with an urgency hint: amber within 30 days, muted once expired. */
export function WarrantyLabel({ date, today, showDate = true }: { date: string; today: string; showDate?: boolean }) {
  const days = daysBetween(today, date)
  const hint =
    days < 0 ? 'Expired' : days === 0 ? 'Expires today' : days <= WARRANTY_WARNING_DAYS ? `${pluralize(days, 'day')} left` : null
  return (
    <span className="whitespace-nowrap">
      {showDate && <span className={cn(days < 0 && 'text-zinc-500')}>{formatDate(date)}</span>}
      {hint && (
        <span
          className={cn(
            'text-xs',
            showDate && 'ml-1.5',
            days < 0 ? 'text-zinc-500' : 'font-medium text-amber-700',
          )}
        >
          {hint}
        </span>
      )}
    </span>
  )
}

export const CATEGORY_ICONS: Record<AssetCategory, LucideIcon> = {
  Laptop,
  Monitor,
  'Mobile Phone': Smartphone,
  Keyboard,
  Mouse,
  Headphones,
  Accessories: Cable,
  Other: Package,
}

export function CategoryIcon({ category, className }: { category: AssetCategory; className?: string }) {
  const Icon = CATEGORY_ICONS[category]
  return <Icon className={cn('size-4 shrink-0 text-zinc-400', className)} aria-hidden />
}
