/**
 * Shared MICE operations chrome.
 *
 * Built on the shell's DataTable, FilterBar and PageHeader so event screens do
 * not invent a second table grammar. None of these components are shared shell
 * files; they only compose them.
 */
import type { ReactNode } from 'react'
import {
  ArrowClockwise,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Clock,
  Flask,
  Info,
  Warning,
  WarningOctagon,
} from '@phosphor-icons/react'
import { DataTable } from '#/components/shell/DataTable'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { FIXTURE_STATES, type FixtureState } from '#/lib/contracts/client'
import { useMice } from '#/lib/mice/store'
import { cn } from '#/lib/utils.ts'
import type { AuditCategory } from '#/lib/mice/types'

export type Tone = 'neutral' | 'green' | 'gold' | 'red' | 'blue' | 'grey'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  green:
    'border-[var(--success-leaf)] bg-[var(--leaf-bg)] text-[var(--success-leaf)]',
  gold: 'border-[var(--amber)] bg-[var(--amber-bg)] text-[var(--amber-deep)]',
  red: 'border-destructive bg-destructive/10 text-destructive',
  blue: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200',
  grey: 'border-border bg-muted text-muted-foreground',
}

export function MicePill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </Badge>
  )
}

export function StatusTone(status: string): Tone {
  switch (status) {
    case 'published':
    case 'verified':
    case 'confirmed':
    case 'checked_in':
    case 'resolved':
    case 'ok':
      return 'green'
    case 'in_review':
    case 'pending':
    case 'waitlisted':
    case 'wait':
    case 'triaged':
    case 'postponed':
      return 'gold'
    case 'cancelled':
    case 'revoked':
    case 'open':
    case 'block':
    case 'late':
      return 'red'
    case 'scheduled':
    case 'draft':
    case 'unpublished':
    case 'archived':
    case 'dismissed':
      return 'grey'
    default:
      return 'neutral'
  }
}

export function statusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function StatCard({
  label,
  value,
  foot,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  foot?: ReactNode
  tone?: 'neutral' | 'warn' | 'danger'
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-1.5 text-2xl font-bold tracking-tight text-foreground',
          tone === 'warn' && 'text-[var(--amber-deep)]',
          tone === 'danger' && 'text-destructive',
        )}
      >
        {value}
      </p>
      {foot ? (
        <p className="mt-1 text-xs text-muted-foreground">{foot}</p>
      ) : null}
    </div>
  )
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  id,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section
      id={id}
      className={cn('rounded-xl border border-border bg-card p-4', className)}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Notice({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  children: ReactNode
  action?: ReactNode
}) {
  const Icon =
    tone === 'danger'
      ? WarningOctagon
      : tone === 'warning'
        ? Warning
        : tone === 'success'
          ? CheckCircle
          : Info
  const classes =
    tone === 'danger'
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : tone === 'warning'
        ? 'border-[var(--amber)] bg-[var(--amber-bg)] text-[var(--amber-deep)]'
        : tone === 'success'
          ? 'border-[var(--success-leaf)]/40 bg-[var(--leaf-bg)] text-[var(--success-leaf)]'
          : 'border-border bg-muted/60 text-muted-foreground'
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed',
        classes,
      )}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon className="mt-0.5 size-4 shrink-0" weight="bold" aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
      {action}
    </div>
  )
}

/** Local-only actions are labelled honestly; the API contract is frozen. */
export function LocalActionNote({ children }: { children?: ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
      <Flask
        className="mt-0.5 size-3.5 shrink-0"
        weight="duotone"
        aria-hidden
      />
      <span>
        {children ??
          'Recorded in the local audit log. This 1.0.0 contract has no write for it yet, so it is not synced to the API.'}
      </span>
    </p>
  )
}

export function StaleBanner() {
  const { fixtureState, setFixtureState } = useMice()
  if (fixtureState !== 'stale') return null
  return (
    <Notice
      tone="warning"
      title="Stale snapshot"
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFixtureState('default')}
        >
          Use live data
        </Button>
      }
    >
      Showing the last successful sync. Writes are disabled; search, filters and
      exports still read the last known values.
    </Notice>
  )
}

export function FixtureStateControl() {
  const { fixtureState, setFixtureState } = useMice()
  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <span className="sr-only">Data state</span>
      <Select
        value={fixtureState}
        onValueChange={(value) => setFixtureState(value as FixtureState)}
      >
        <SelectTrigger size="sm" aria-label="Data state" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIXTURE_STATES.map((state) => (
            <SelectItem key={state} value={state}>
              {statusLabel(state)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

export function EventScope({ label = 'Event' }: { label?: string }) {
  const { events, selectedEventId, selectEvent } = useMice()
  if (events.length === 0) return null
  return (
    <label className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
      {label}
      <select
        aria-label={`${label} scope`}
        className="h-8 max-w-[min(28rem,80vw)] rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground"
        value={selectedEventId ?? ''}
        onChange={(event) => selectEvent(event.target.value)}
      >
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.title}
          </option>
        ))}
      </select>
    </label>
  )
}

export interface SimpleColumn<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

export function SimpleTable<T>({
  columns,
  rows,
  caption,
  emptyTitle = 'No records',
  emptyDescription = 'Nothing matches the current filters.',
  emptyAction,
  isLoading,
  isError,
  onRetry,
  pageSize = 20,
  onRowClick,
}: {
  columns: SimpleColumn<T>[]
  rows: T[]
  caption: string
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  pageSize?: number
  onRowClick?: (row: T) => void
}) {
  const tableColumns = columns.map((column) => ({
    id: column.header.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    header: column.header,
    cell: ({ row }: { row: { original: T } }) => column.cell(row.original),
    enableSorting: false,
  }))
  return (
    <DataTable
      columns={tableColumns}
      data={rows}
      caption={caption}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyAction={emptyAction}
      pageSize={pageSize}
      onRowClick={onRowClick}
    />
  )
}

export function MetricBar({
  value,
  max,
  tone = 'green',
}: {
  value: number
  max: number
  tone?: 'green' | 'gold'
}) {
  const percent =
    max > 0 ? Math.min(100, Math.round((value / max) * 1000) / 10) : 0
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-muted"
      role="img"
      aria-label={`${value} of ${max}`}
    >
      <div
        className={cn(
          'h-full rounded-full',
          tone === 'gold' ? 'bg-[var(--amber)]' : 'bg-primary',
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export function QueueNav({
  index,
  total,
  onPrevious,
  onNext,
  label,
}: {
  index: number
  total: number
  onPrevious: () => void
  onNext: () => void
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={total <= 1}
        aria-label={`Previous ${label}`}
      >
        <CaretLeft className="size-3.5" weight="bold" /> Previous
      </Button>
      <span className="text-xs font-semibold text-muted-foreground">
        {total === 0 ? '0 of 0' : `${index + 1} of ${total}`}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={total <= 1}
        aria-label={`Next ${label}`}
      >
        Next <CaretRight className="size-3.5" weight="bold" />
      </Button>
    </div>
  )
}

export function EmptyBlock({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted">
        <CalendarBlank
          className="size-5 text-muted-foreground"
          weight="duotone"
        />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-xs text-muted-foreground">{body}</p>
      {action}
    </div>
  )
}

export function AuditCategoryBadge({ category }: { category: AuditCategory }) {
  const tone: Tone =
    category === 'safety' ? 'red' : category === 'system' ? 'grey' : 'blue'
  return <MicePill tone={tone}>{category}</MicePill>
}

export function SyncMarker({ label }: { label: string }) {
  const { fixtureState } = useMice()
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
      {fixtureState === 'stale' ? (
        <Clock className="size-3.5" weight="bold" />
      ) : (
        <ArrowClockwise className="size-3.5" weight="bold" />
      )}
      {label}
    </span>
  )
}
