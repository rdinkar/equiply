import { Search } from 'lucide-react'
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate, type To } from 'react-router'
import { paths, withAssetParam } from '@/app/paths'
import { CategoryIcon } from '@/components/data-display/StatusBadges'
import { Avatar } from '@/components/ui/layout'
import { useWorkspace } from '@/store/useWorkspace'
import type { AssetCategory } from '@/types/domain'
import { cn } from '@/utils/cn'
import { searchWorkspace } from './searchWorkspace'

interface Result {
  key: string
  kind: 'asset' | 'employee'
  title: string
  subtitle: string
  to: To
  category?: AssetCategory
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

/**
 * ARIA combobox for jumping to an asset or a person. Arrow keys move, Enter
 * opens, Escape clears, and "/" focuses it from anywhere. Assets open in the
 * drawer over the current page, so searching doesn't lose your place.
 */
export function GlobalSearch() {
  const { status, data } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const deferredQuery = useDeferredValue(query)

  const results = useMemo<Result[]>(() => {
    if (!data) return []
    const { assets, employees } = searchWorkspace(data, deferredQuery)
    return [
      ...assets.map<Result>((a) => ({
        key: a.id,
        kind: 'asset',
        title: a.name,
        subtitle: `${a.assetTag} · ${a.status}`,
        category: a.category,
        to: { pathname: location.pathname, search: withAssetParam(location.search, a.id) },
      })),
      ...employees.map<Result>((e) => ({
        key: e.id,
        kind: 'employee',
        title: e.name,
        subtitle: `${e.designation} · ${e.department}`,
        to: paths.employee(e.id),
      })),
    ]
  }, [data, deferredQuery, location.pathname, location.search])

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === '/' && !isTypingTarget(event.target)) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const showList = open && query.trim().length > 0
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0))

  const choose = (result: Result) => {
    navigate(result.to)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      const result = results[activeIndex]
      if (showList && result) {
        event.preventDefault()
        choose(result)
      }
    } else if (event.key === 'Escape') {
      if (query) setQuery('')
      else inputRef.current?.blur()
      setOpen(false)
    }
  }

  const optionId = (i: number) => `${listId}-option-${i}`

  return (
    <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search assets and people"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results.length > 0 ? optionId(activeIndex) : undefined}
        placeholder="Search assets, people…"
        disabled={status !== 'ready'}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-8 w-full rounded-md border border-zinc-200 bg-zinc-50 pr-8 pl-8 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-accent-500 focus:bg-white focus:ring-2 focus:ring-accent-100 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-zinc-200 bg-white px-1 text-[10px] text-zinc-400 sm:block">
        /
      </kbd>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute right-0 left-0 z-30 mt-1.5 max-h-96 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg sm:left-auto sm:w-96"
        >
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-zinc-500" role="presentation">
              No assets or people match “{query.trim()}”
            </li>
          ) : (
            results.map((result, i) => (
              // Keyboard selection happens on the combobox input (aria-activedescendant); clicks are the mouse path.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={result.key}
                id={optionId(i)}
                role="option"
                aria-selected={i === activeIndex}
                // mousedown keeps input focus long enough for the click to land.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(result)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2',
                  i === activeIndex ? 'bg-zinc-100' : 'hover:bg-zinc-50',
                )}
              >
                {result.kind === 'asset' && result.category ? (
                  <span className="flex size-6 items-center justify-center rounded bg-zinc-100">
                    <CategoryIcon category={result.category} className="size-3.5 text-zinc-500" />
                  </span>
                ) : (
                  <Avatar name={result.title} size="sm" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-zinc-900">{result.title}</span>
                  <span className="block truncate text-xs text-zinc-500">{result.subtitle}</span>
                </span>
                <span className="text-[11px] text-zinc-400 capitalize">{result.kind}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
