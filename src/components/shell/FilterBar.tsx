/**
 * Shared filter bar.
 *
 * A search field, any number of select filters, and a reset control, laid out the
 * same on every admin list. Filter state stays with the screen (search params are
 * the recommended home); this component only renders and clears.
 */
import type { ReactNode } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils.ts'

export interface FilterBarProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Selects, chips or date pickers. */
  children?: ReactNode
  onReset?: () => void
  resetLabel?: string
  /** True when any filter is set; controls whether reset is enabled. */
  isFiltered?: boolean
  className?: string
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search',
  children,
  onReset,
  resetLabel = 'Reset',
  isFiltered = false,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
      role="search"
    >
      {onSearchChange ? (
        <div className="relative min-w-56 flex-1">
          <MagnifyingGlass
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            weight="bold"
            aria-hidden
          />
          <Input
            type="search"
            value={searchValue ?? ''}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="pl-8"
          />
        </div>
      ) : null}
      {children}
      {onReset ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!isFiltered}
          className="gap-1.5"
        >
          <X className="size-3.5" weight="bold" /> {resetLabel}
        </Button>
      ) : null}
    </div>
  )
}
