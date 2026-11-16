import {
  Archive,
  CircleCheck,
  PackageCheck,
  PackagePlus,
  Pencil,
  RotateCcw,
  Tag,
  UserCheck,
  UserMinus,
  UserPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ActivityAction } from '@/types/domain'

interface ActivityMeta {
  label: string
  icon: LucideIcon
  /** Icon chip colors. */
  tone: string
}

export const ACTIVITY_META: Record<ActivityAction, ActivityMeta> = {
  asset_added: { label: 'Asset added', icon: PackagePlus, tone: 'bg-accent-50 text-accent-700' },
  asset_updated: { label: 'Details updated', icon: Pencil, tone: 'bg-zinc-100 text-zinc-600' },
  asset_assigned: { label: 'Assigned', icon: UserCheck, tone: 'bg-sky-50 text-sky-700' },
  asset_returned: { label: 'Returned', icon: RotateCcw, tone: 'bg-emerald-50 text-emerald-700' },
  asset_repair: { label: 'Sent to repair', icon: Wrench, tone: 'bg-amber-50 text-amber-700' },
  asset_available: { label: 'Back in stock', icon: PackageCheck, tone: 'bg-emerald-50 text-emerald-700' },
  asset_retired: { label: 'Retired', icon: Archive, tone: 'bg-zinc-100 text-zinc-600' },
  asset_condition_updated: { label: 'Condition updated', icon: Tag, tone: 'bg-zinc-100 text-zinc-600' },
  onboarding_started: { label: 'Onboarding started', icon: UserPlus, tone: 'bg-violet-50 text-violet-700' },
  employee_onboarded: { label: 'Onboarded', icon: CircleCheck, tone: 'bg-violet-50 text-violet-700' },
  offboarding_initiated: { label: 'Offboarding started', icon: UserMinus, tone: 'bg-amber-50 text-amber-700' },
  employee_offboarded: { label: 'Offboarded', icon: CircleCheck, tone: 'bg-zinc-100 text-zinc-600' },
}
