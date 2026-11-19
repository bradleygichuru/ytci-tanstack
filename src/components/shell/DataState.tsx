/**
 * Shared data-state view for admin surfaces.
 *
 * Screens pass a derived state, not hand-rolled markup. Cached data always wins:
 * an offline or failing refetch keeps the table visible with a stale marker
 * instead of blanking the page.
 */
import type { ReactNode } from 'react'
import { CircleNotch, CloudSlash, Tray, WarningCircle } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils.ts'

export type DataState = 'loading' | 'empty' | 'error' | 'offline' | 'ready'

export interface DeriveDataStateInput {
  isPending?: boolean
  isError?: boolean
  isEmpty?: boolean
  isOffline?: boolean
  hasCachedData?: boolean
}

/** Precedence: cached content > loading > offline > error > empty > ready. */
export function deriveDataState({
  isPending = false,
  isError = false,
  isEmpty = false,
  isOffline = false,
  hasCachedData = false,
}: DeriveDataStateInput): DataState {
  if (hasCachedData) return 'ready'
  if (isPending) return 'loading'
  if (isOffline) return 'offline'
  if (isError) return 'error'
  if (isEmpty) return 'empty'
  return 'ready'
}

const DEFAULTS = {
  loading: {
    title: 'Loading',
    description: 'Fetching the latest from the programme API.',
  },
  empty: {
    title: 'Nothing here yet',
    description: 'When there is something to show, it will appear here.',
  },
  error: {
    title: "We couldn't load this",
    description: 'The API returned an error. Try again; if it persists, check the service status.',
  },
  offline: {
    title: 'You are offline',
    description: 'Showing the last data this browser saved.',
  },
} as const

export interface DataStateViewProps {
  state: DataState
  title?: string
  description?: string
  action?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  children?: ReactNode
  className?: string
}

export function DataStateView({
  state,
  title,
  description,
  action,
  onRetry,
  retryLabel = 'Try again',
  children,
  className,
}: DataStateViewProps) {
  if (state === 'ready') {
    return <div className={className}>{children}</div>
  }

  if (state === 'loading') {
    return (
      <div
        className={cn(
          'flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8 text-center',
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <CircleNotch className="size-6 animate-spin text-muted-foreground" weight="bold" />
        <p className="text-sm font-semibold text-foreground">{title ?? DEFAULTS.loading.title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {description ?? DEFAULTS.loading.description}
        </p>
      </div>
    )
  }

  const Icon = state === 'empty' ? Tray : state === 'error' ? WarningCircle : CloudSlash

  return (
    <div
      className={cn(
        'flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-8 text-center',
        className,
      )}
      role={state === 'error' ? 'alert' : 'status'}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" weight="duotone" />
      </span>
      <p className="text-base font-semibold text-foreground">
        {title ?? DEFAULTS[state].title}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {description ?? DEFAULTS[state].description}
      </p>
      {action ??
        (onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null)}
    </div>
  )
}

/** Small inline marker for stale or cached data. */
export function StaleNotice({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground',
        className,
      )}
      role="status"
    >
      <CloudSlash className="size-3.5" weight="bold" aria-hidden />
      {label}
    </div>
  )
}
