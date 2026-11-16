import { Search } from 'lucide-react'
import { cn } from '@/utils/cn'
import { controlClasses } from './Field'

interface SearchFieldProps {
  label: string
  placeholder: string
  /** Initial text (from the URL). To reset it, remount with a new `key`. */
  defaultValue: string
  onSearch: (value: string) => void
  className?: string
}

/**
 * Uncontrolled on purpose: the text is mirrored into the URL, and React Router
 * applies URL updates in a transition. A controlled input would be re-rendered
 * from a lagging value, jumping the caret and dropping fast keystrokes.
 */
export function SearchField({ label, placeholder, defaultValue, onSearch, className }: SearchFieldProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChange={(event) => onSearch(event.target.value)}
        className={cn(controlClasses, 'h-9 w-full pl-8')}
      />
    </div>
  )
}
