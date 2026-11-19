/**
 * Analytics admin presentation primitives.
 *
 * Owned by the analytics stream. The shared shell components are consumed, not
 * edited: these wrap the shell grammar with analytics vocabulary (rollup stamps,
 * suppression markers, chart populations, contract-gap badges).
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  ArrowClockwise,
  CheckCircle,
  ClockCounterClockwise,
  Database,
  DownloadSimple,
  Info,
  ShieldCheck,
  Tray,
  Warning,
  X,
} from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { DataStateView, StaleNotice } from '#/components/shell/DataState'
import { cn } from '#/lib/utils.ts'
import { useAnalytics } from '#/lib/analytics/store'
import {
  resolveWindow,
  sectionAcceptsJourney,
  summariseFilters,
  RANGE_OPTIONS,
  type DateWindow,
} from '#/lib/analytics/filters'
import {
  formatDate,
  formatMetricCell,
  formatNumber,
  formatRate,
  formatShortDate,
  todayIso,
} from '#/lib/analytics/format'
import {
  rollupStatusLine,
  retentionTone,
  sectionEmpty,
  sectionState,
  type DailySeries,
  type FunnelStepView,
  type JourneySummary,
  type KpiView,
  type RetentionGrid,
} from '#/lib/analytics/derive'
import {
  JOURNEY_LABELS,
  JOURNEY_KEYS,
  type AnalyticsSectionKey,
  type DatasetKey,
  type JourneyKey,
  type MetricCell,
  type Scenario,
} from '#/lib/analytics/types'

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background'

export const ANALYTICS_NAV: {
  group: string
  items: { to: string; label: string; key: AnalyticsSectionKey }[]
}[] = [
  {
    group: 'Product health',
    items: [
      { to: '/analytics', label: 'Overview', key: 'overview' },
      { to: '/analytics/journeys', label: 'Journeys', key: 'journeys' },
      { to: '/analytics/funnels', label: 'Funnels', key: 'funnels' },
      { to: '/analytics/retention', label: 'Retention', key: 'retention' },
      { to: '/analytics/adoption', label: 'Adoption', key: 'adoption' },
    ],
  },
  {
    group: 'Content',
    items: [
      { to: '/analytics/search', label: 'Search gaps', key: 'search' },
      { to: '/analytics/content', label: 'Content', key: 'content' },
    ],
  },
  {
    group: 'Programme',
    items: [
      { to: '/analytics/programme', label: 'Programme', key: 'programme' },
    ],
  },
  {
    group: 'Trust',
    items: [
      { to: '/analytics/quality', label: 'Data quality', key: 'quality' },
      {
        to: '/analytics/suppressed',
        label: 'Suppressed cells',
        key: 'suppressed',
      },
    ],
  },
]

const SECTION_KEYS: { path: string; key: AnalyticsSectionKey }[] = [
  { path: '/analytics', key: 'overview' },
  { path: '/analytics/journeys', key: 'journeys' },
  { path: '/analytics/funnels', key: 'funnels' },
  { path: '/analytics/retention', key: 'retention' },
  { path: '/analytics/adoption', key: 'adoption' },
  { path: '/analytics/search', key: 'search' },
  { path: '/analytics/content', key: 'content' },
  { path: '/analytics/programme', key: 'programme' },
  { path: '/analytics/quality', key: 'quality' },
  { path: '/analytics/suppressed', key: 'suppressed' },
]

export function sectionForKey(pathname: string): AnalyticsSectionKey {
  const exact = SECTION_KEYS.find((entry) => entry.path === pathname)
  if (exact) return exact.key
  const nested = SECTION_KEYS.filter((entry) => entry.path !== '/analytics').find((entry) =>
    pathname.startsWith(`${entry.path}/`),
  )
  return nested?.key ?? 'overview'
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--amber-deep)]">
      <span className="h-0.5 w-5 bg-[var(--amber)]" aria-hidden="true" />
      {children}
    </div>
  )
}

export function AdminPage({
  kicker,
  title,
  sub,
  actions,
  badge,
  children,
}: {
  kicker: string
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Kicker>{kicker}</Kicker>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            {badge}
          </div>
          {sub ? <div className="mt-1 max-w-3xl text-sm text-muted-foreground">{sub}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}

export function AnalyticsNav() {
  const location = useLocation()
  const pathname = location.pathname
  const active = sectionForKey(pathname)

  return (
    <nav
      aria-label="Analytics sections"
      className="flex flex-wrap items-center gap-x-1 gap-y-1 border-b border-border pb-2"
    >
      {ANALYTICS_NAV.map((group, index) => (
        <div key={group.group} className="flex flex-wrap items-center gap-1">
          {index > 0 ? (
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
          ) : null}
          <span className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
            {group.group}
          </span>
          {group.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active === item.key ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-8 items-center rounded-md px-2 text-xs font-semibold transition-colors',
                FOCUS_RING,
                active === item.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'empty', label: 'Empty' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Error' },
  { value: 'stale', label: 'Stale' },
]

export function FilterStateControl({ section }: { section: AnalyticsSectionKey }) {
  const { filters, setRange, setJourney, resetFilters, scenario, setScenario } = useAnalytics()
  const isFiltered = filters.range !== '30d' || filters.journey !== 'all'

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[var(--amber)] bg-[var(--amber-bg)] px-3 py-2"
      role="group"
      aria-label="Analytics filters"
    >
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--amber-deep)]">
        <ClockCounterClockwise className="h-3.5 w-3.5" weight="duotone" aria-hidden />
        Range
        <select
          aria-label="Date range"
          value={filters.range}
          onChange={(event) => setRange(event.target.value as (typeof RANGE_OPTIONS)[number]['value'])}
          className="h-7 rounded-md border border-[var(--amber)] bg-card px-2 text-xs font-semibold text-foreground"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {sectionAcceptsJourney(section) ? (
        <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--amber-deep)]">
          Journey
          <select
            aria-label="Journey"
            value={filters.journey}
            onChange={(event) => setJourney(event.target.value as JourneyKey | 'all')}
            className="h-7 max-w-[220px] rounded-md border border-[var(--amber)] bg-card px-2 text-xs font-semibold text-foreground"
          >
            <option value="all">All journeys</option>
            {JOURNEY_KEYS.map((journey) => (
              <option key={journey} value={journey}>
                {JOURNEY_LABELS[journey]}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <button
        type="button"
        onClick={resetFilters}
        disabled={!isFiltered}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--amber-deep)] underline-offset-2 hover:underline disabled:opacity-50"
      >
        <X className="h-3 w-3" weight="bold" /> Reset filters
      </button>

      <span className="mx-1 hidden h-5 w-px bg-[var(--amber)]/50 sm:block" aria-hidden="true" />

      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--amber-deep)]">
        <Database className="h-3.5 w-3.5" weight="duotone" aria-hidden />
        Data state
        <select
          aria-label="Data state"
          data-testid="analytics-fixture-state"
          value={scenario}
          onChange={(event) => setScenario(event.target.value as Scenario)}
          className="h-7 rounded-md border border-[var(--amber)] bg-card px-2 text-xs font-semibold text-foreground"
        >
          {SCENARIOS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function ScopeLine({
  section,
  windowOverride,
}: {
  section: AnalyticsSectionKey
  windowOverride?: DateWindow
}) {
  const { filters, scenario, lastSuccess, stale } = useAnalytics()
  const window = windowOverride ?? resolveWindow(filters.range, todayIso())
  const summary = summariseFilters(section, filters, window)
  const asOf = rollupStatusLine({
    scenario,
    lastSuccess,
    from: window.from,
    to: window.to,
  })

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1.5">
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            scenario === 'error'
              ? 'bg-destructive'
              : scenario === 'empty'
                ? 'bg-[var(--amber)]'
                : stale || scenario === 'stale'
                  ? 'bg-[var(--amber)]'
                  : 'bg-[var(--success-leaf)]',
          )}
          aria-hidden="true"
        />
        {asOf}
      </span>
      <span aria-hidden="true">·</span>
      <span>{summary.scope}</span>
      {summary.unapplied.length > 0 ? (
        <span className="rounded-full border border-[var(--amber)] bg-[var(--amber-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--amber-deep)]">
          Not applied here: {summary.unapplied.map((item) => item.label).join(', ')}
        </span>
      ) : null}
      {stale ? <StaleNotice label="Stale rollup" /> : null}
    </div>
  )
}

export function ContractGapBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive dark:text-red-300">
      <Warning className="h-3 w-3" weight="bold" aria-hidden />
      Contract gap
    </span>
  )
}

export function OverlayBadge({ label = 'Sample overlay' }: { label?: string }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-[var(--amber)] bg-[var(--amber-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--amber-deep)]">
      {label}
    </span>
  )
}

export function Notice({
  tone = 'neutral',
  title,
  children,
  icon,
}: {
  tone?: 'neutral' | 'gold' | 'red' | 'green'
  title?: string
  children: ReactNode
  icon?: ReactNode
}) {
  const toneClass =
    tone === 'red'
      ? 'border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300'
      : tone === 'gold'
        ? 'border-[var(--amber)] bg-[var(--amber-bg)] text-[var(--amber-deep)]'
        : tone === 'green'
          ? 'border-[var(--success-leaf)]/40 bg-[var(--leaf-bg)] text-[var(--success-leaf)]'
          : 'border-border bg-muted/60 text-muted-foreground'
  const Icon =
    tone === 'red' ? Warning : tone === 'green' ? CheckCircle : tone === 'gold' ? ShieldCheck : Info
  return (
    <div
      className={cn('mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm', toneClass)}
      role={tone === 'red' ? 'alert' : 'status'}
    >
      <span className="mt-0.5 shrink-0">{icon ?? <Icon className="h-4 w-4" weight="duotone" />}</span>
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? 'mt-0.5' : undefined}>{children}</div>
      </div>
    </div>
  )
}

export function Panel({
  title,
  hint,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  hint?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-lg border border-border bg-card', className)}>
      {title || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-sans text-base font-bold tracking-tight text-foreground">{title}</h2>
            ) : null}
            {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function KpiCard({
  kpi,
  compact,
  accent = 'forest',
}: {
  kpi: KpiView
  compact?: boolean
  accent?: 'forest' | 'gold' | 'danger' | 'none'
}) {
  const border =
    accent === 'gold'
      ? 'border-t-[var(--amber)]'
      : accent === 'danger'
        ? 'border-t-destructive'
        : accent === 'forest'
          ? 'border-t-[var(--success-leaf)]'
          : ''
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 shadow-sm',
        accent !== 'none' && `border-t-2 ${border}`,
      )}
      data-testid={`kpi-${kpi.key}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {kpi.label}
      </p>
      <p
        className={cn(
          'mt-1 whitespace-nowrap font-sans font-bold tracking-tight text-foreground',
          compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl',
          kpi.suppressed && 'text-muted-foreground',
        )}
        title={kpi.definition}
      >
        {kpi.value}
      </p>
      <div className="mt-1 text-xs text-muted-foreground">{kpi.foot}</div>
    </div>
  )
}

export function SuppressedMark({ label = 'Suppressed cell' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground" title={label}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}: fewer readers than the suppression threshold.</span>
    </span>
  )
}

export function MetricValue({ cell }: { cell: MetricCell | undefined }) {
  if (!cell || cell.suppressed || cell.value == null) return <SuppressedMark />
  return <>{formatMetricCell(cell)}</>
}

/**
 * Daily active readers.
 *
 * The bar height, peak caption and KPI all come from the same `daily` series.
 * Guests and accounts stack to the daily total; a missing day is never drawn as
 * zero.
 */
export function ActiveReadersChart({
  series,
  windowLabel,
}: {
  series: DailySeries
  windowLabel: string
}) {
  if (series.points.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No visible daily active-reader points for {windowLabel.toLowerCase()}.
        {series.suppressedDays > 0 ? ` ${series.suppressedDays} suppressed day(s) are not plotted.` : ''}
      </div>
    )
  }

  const label = `Daily active readers, ${windowLabel}. ${series.points
    .map((point) => `${formatShortDate(point.day)}: ${formatNumber(point.dau)}`)
    .join(', ')}.`

  return (
    <div>
      <div
        className="flex h-48 items-end gap-1 border-b border-border pb-1"
        role="img"
        aria-label={label}
      >
        {series.points.map((point) => {
          const total = series.max > 0 ? Math.max(4, (point.dau / series.max) * 100) : 0
          const guestShare =
            point.guests != null && point.dau > 0 ? Math.min(100, (point.guests / point.dau) * 100) : 0
          const accountShare =
            point.accounts != null && point.dau > 0
              ? Math.min(100, (point.accounts / point.dau) * 100)
              : 0
          return (
            <div
              key={point.day}
              className="group relative flex min-w-0 flex-1 flex-col justify-end"
              style={{ height: '100%' }}
              title={`${formatShortDate(point.day)} · ${formatNumber(point.dau)} active readers`}
            >
              <div
                className="relative w-full overflow-hidden rounded-t-sm bg-[var(--success-leaf)]/25 transition-colors group-hover:bg-[var(--success-leaf)]/40"
                style={{ height: `${total}%` }}
                aria-hidden="true"
              >
                {accountShare > 0 ? (
                  <span
                    className="absolute inset-x-0 bottom-0 bg-[var(--primary-container)]"
                    style={{ height: `${accountShare}%` }}
                  />
                ) : null}
                {guestShare > 0 ? (
                  <span
                    className="absolute inset-x-0 top-0 bg-[var(--amber)]"
                    style={{ height: `${guestShare}%` }}
                  />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{formatShortDate(series.points[0].day)}</span>
        <span>{formatShortDate(series.points[series.points.length - 1].day)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--primary-container)]" aria-hidden />
          Accounts
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--amber)]" aria-hidden />
          Guests
        </span>
        {series.suppressedDays > 0 ? (
          <span>· {series.suppressedDays} suppressed day(s) not plotted</span>
        ) : null}
      </div>
    </div>
  )
}

export function JourneyBar({
  journey,
  showCounts = true,
}: {
  journey: JourneySummary
  showCounts?: boolean
}) {
  const pct = journey.completion == null ? 0 : Math.round(journey.completion * 100)
  return (
    <div
      className="grid grid-cols-[minmax(0,1.4fr)_minmax(70px,2fr)_auto] items-center gap-3 py-2"
      title={
        journey.suppressed
          ? 'Suppressed: one or more steps are below the threshold.'
          : `${formatNumber(journey.completed)} completed of ${formatNumber(journey.started)} started`
      }
    >
      <span className="truncate text-sm font-medium text-foreground">{journey.label}</span>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`${journey.label} completion`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={journey.suppressed ? 'Suppressed' : `${pct}%`}
      >
        <span
          className="block h-full rounded-full bg-[var(--success-leaf)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-20 text-right text-sm font-semibold tabular-nums text-foreground">
        {journey.suppressed ? (
          <SuppressedMark />
        ) : showCounts ? (
          `${pct}%`
        ) : (
          formatNumber(journey.completed)
        )}
      </span>
    </div>
  )
}

export function FunnelBars({ steps }: { steps: FunnelStepView[] }) {
  if (steps.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Step detail is not reported for this range.
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const pct = step.share == null ? 0 : Math.round(step.share * 100)
        return (
          <div
            key={`${step.step}-${index}`}
            className="grid grid-cols-[minmax(0,1.3fr)_minmax(80px,2fr)_auto_auto] items-center gap-3"
          >
            <span className="truncate text-sm font-medium text-foreground">{step.step}</span>
            <div
              className="h-3 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label={`${step.step} reached`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-valuetext={step.reached == null ? 'Suppressed' : `${pct}% of entrants`}
            >
              <span
                className="block h-full rounded-full bg-[var(--primary-container)]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-16 text-right text-sm font-semibold tabular-nums text-foreground">
              {step.reached == null ? <SuppressedMark /> : formatNumber(step.reached)}
            </span>
            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
              {step.reached == null ? '—' : `${pct}%`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function retentionCellClass(tone: number): string {
  switch (tone) {
    case 4:
      return 'bg-[var(--primary-container)] text-primary-foreground'
    case 3:
      return 'bg-[var(--success-leaf)]/40 text-foreground'
    case 2:
      return 'bg-[var(--success-leaf)]/25 text-foreground'
    case 1:
      return 'bg-[var(--success-leaf)]/10 text-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function RetentionTable({ grid }: { grid: RetentionGrid }) {
  if (grid.cohorts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No elapsed cohorts in this range.
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <caption className="sr-only">{grid.ariaLabel}</caption>
        <thead>
          <tr className="border-b text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            <th scope="col" className="px-2 py-2">
              Cohort
            </th>
            <th scope="col" className="px-2 py-2 text-right">
              n
            </th>
            {grid.weeks.map((week) => (
              <th key={week} scope="col" className="px-1 py-2 text-center">
                W{week}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.cohorts.map((cohort) => (
            <tr key={cohort.cohortWeek} className="border-b last:border-0">
              <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-left text-xs font-semibold text-foreground">
                {cohort.label}
              </th>
              <td className="whitespace-nowrap px-2 py-1.5 text-right text-xs tabular-nums text-muted-foreground">
                {cohort.actors == null ? <SuppressedMark label="Cohort size suppressed" /> : formatNumber(cohort.actors)}
              </td>
              {cohort.rates.map((rate, index) => (
                <td key={index} className="p-0.5">
                  <span
                    className={cn(
                      'flex h-8 min-w-10 items-center justify-center rounded-sm text-[11px] font-semibold tabular-nums',
                      retentionCellClass(retentionTone(rate)),
                    )}
                    title={
                      rate == null
                        ? 'Not yet available or suppressed'
                        : `${cohort.label} · W${index} · ${formatRate(rate, 0)}`
                    }
                  >
                    {rate == null ? '·' : formatRate(rate, 0)}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RetentionLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span>· not yet available or suppressed</span>
      {[
        { tone: 1, label: '0–24%' },
        { tone: 2, label: '25–49%' },
        { tone: 3, label: '50–74%' },
        { tone: 4, label: '75–100%' },
      ].map((entry) => (
        <span key={entry.label} className="inline-flex items-center gap-1.5">
          <span className={cn('h-3 w-3 rounded-sm', retentionCellClass(entry.tone))} aria-hidden />
          {entry.label}
        </span>
      ))}
    </div>
  )
}

export function TableShell({
  caption,
  head,
  children,
  minWidth = 640,
}: {
  caption: string
  head: ReactNode
  children: ReactNode
  minWidth?: number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {head}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function OverviewState({
  section,
  isEmpty,
  onRetry,
  onReset,
}: {
  section: DatasetKey
  isEmpty: boolean
  onRetry: () => void
  onReset: () => void
}) {
  const { scenario, loads, errors, lastSuccess, apiError } = useAnalytics()
  const state = sectionState(loads[section], scenario, isEmpty)
  const lastSuccessLabel = lastSuccess ? formatDate(lastSuccess) : 'unknown'
  if (state === 'loading') {
    return (
      <DataStateView
        state="loading"
        title="Loading the rollup"
        description="Reading aggregates only. No per-user timeline is requested."
      />
    )
  }
  if (state === 'error') {
    return (
      <DataStateView
        state="error"
        title="We couldn't load the rollup"
        description={`${errors[section] ?? apiError ?? 'The analytics service returned an error.'} No partial numbers are shown. Last successful rollup: ${lastSuccessLabel}.`}
        onRetry={onRetry}
        retryLabel="Retry rollup"
      />
    )
  }
  if (state === 'empty') {
    return (
      <DataStateView
        state="empty"
        title="No data for these filters"
        description={`Last successful rollup: ${lastSuccessLabel}. Reset the filters, or check that the nightly job has finished. Cells under the threshold are suppressed before they reach this screen.`}
        action={
          <Button variant="secondary" size="sm" onClick={onReset}>
            <X className="h-4 w-4" weight="bold" /> Reset filters
          </Button>
        }
      />
    )
  }
  return null
}

export function ExportDialog({
  defaultFrom,
  defaultTo,
}: {
  defaultFrom: string
  defaultTo: string
}) {
  const { can, stale, exportDataset } = useAnalytics()
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [dataset, setDataset] = useState<DatasetKey>('overview')
  const [pending, setPending] = useState(false)
  const [ack, setAck] = useState<{ id?: string; message?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const allowed = can('analytics.export')
  const exportable: { value: DatasetKey; label: string }[] = useMemo(
    () => [
      { value: 'overview', label: 'Overview' },
      { value: 'journeys', label: 'Journeys' },
      { value: 'funnels', label: 'Funnels' },
      { value: 'retention', label: 'Retention' },
      { value: 'adoption', label: 'Adoption' },
      { value: 'quality', label: 'Data quality' },
    ],
    [],
  )

  const openDialog = () => {
    setFrom(defaultFrom)
    setTo(defaultTo)
    setAck(null)
    setError(null)
    setOpen(true)
  }

  const submit = async () => {
    if (pending) return
    setPending(true)
    setError(null)
    setAck(null)
    try {
      const result = await exportDataset({ from, to, dataset })
      setAck({ id: result.id, message: result.message })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The export could not be queued.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={openDialog}
        disabled={!allowed || stale}
        title={
          !allowed
            ? 'Your role cannot export analytics.'
            : stale
              ? 'Exports are disabled while showing stale rollups.'
              : undefined
        }
      >
        <DownloadSimple className="h-4 w-4" weight="duotone" /> Export CSV
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Export analytics</DialogTitle>
            <DialogDescription>
              Aggregates only, no PII. The server queues the CSV job and returns an
              acknowledgement; the date range must be inside the rollup window.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <label className="text-sm font-semibold text-foreground">
              From
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
              />
            </label>
            <label className="text-sm font-semibold text-foreground">
              To
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
              />
            </label>
            <label className="text-sm font-semibold text-foreground sm:col-span-2">
              Dataset
              <select
                value={dataset}
                onChange={(event) => setDataset(event.target.value as DatasetKey)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
              >
                {exportable.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!allowed ? (
            <Notice tone="gold" title="Read-only role">
              Exporting needs <code>analytics.export</code>. Ask an administrator.
            </Notice>
          ) : null}
          {stale ? (
            <Notice tone="gold" title="Stale rollup">
              Restore live data before exporting; a stale file would be presented as current.
            </Notice>
          ) : null}
          {error ? (
            <Notice tone="red" title="Export blocked">
              {error}
            </Notice>
          ) : null}
          {ack ? (
            <Notice tone="green" title="Export queued">
              Job {ack.id ?? 'queued'} accepted. {ack.message ?? 'The CSV is generated from aggregate rows.'}
            </Notice>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={submit} disabled={pending || !allowed || stale}>
              {pending ? 'Queueing…' : 'Queue export'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ScenarioBanner() {
  const { scenario, apiError, source, stale, setScenario } = useAnalytics()
  if (scenario === 'stale' || stale) {
    return (
      <Notice tone="gold" title="Showing last-known analytics.">
        Reads still work and export is disabled until live data returns.{' '}
        <button
          type="button"
          onClick={() => setScenario('default')}
          className="font-bold underline underline-offset-2"
        >
          Use live data
        </button>
      </Notice>
    )
  }
  if (scenario === 'error' || source === 'error') {
    return (
      <Notice tone="red" title="The analytics service is unavailable.">
        {apiError ?? 'No rollup was loaded. No partial numbers are shown.'} Start the contracts mock on
        :8099 in development, or retry after the nightly job.
      </Notice>
    )
  }
  return null
}

export function SourceFooter() {
  const { source, scenario, data, lastSuccess } = useAnalytics()
  const label =
    scenario === 'empty'
      ? 'Empty dataset'
      : source === 'loading'
        ? 'Loading'
        : source === 'error'
          ? 'Rollup unavailable'
          : 'Contract API'
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
          label === 'Contract API'
            ? 'border-[var(--success-leaf)] bg-[var(--leaf-bg)] text-[var(--success-leaf)]'
            : label === 'Rollup unavailable'
              ? 'border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300'
              : 'border-border bg-muted text-muted-foreground',
        )}
      >
        {label}
      </span>
      <span>
        Aggregates only. Per-user event streams are never rendered; named support access is
        reason-recorded, 30 days, and excludes recognition data.
      </span>
      <span className="ml-auto">
        {data
          ? `${data.journeys.length} journey step(s) · ${data.adoption.length} feature row(s) · last success ${lastSuccess ? formatDate(lastSuccess) : 'unknown'}`
          : 'No aggregate rows loaded'}
      </span>
    </div>
  )
}

export function MetricNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

export function MetricDefinitions({ rows }: { rows: { metric: string; definition: string }[] }) {
  return (
    <TableShell
      caption="Metric definitions carried with analytics exports"
      head={
        <>
          <th scope="col" className="px-4 py-2.5">
            Metric
          </th>
          <th scope="col" className="px-4 py-2.5">
            Definition
          </th>
        </>
      }
      minWidth={520}
    >
      {rows.map((row) => (
        <tr key={row.metric} className="border-b last:border-0">
          <th scope="row" className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-foreground">
            {row.metric}
          </th>
          <td className="px-4 py-2.5 text-sm text-muted-foreground">{row.definition}</td>
        </tr>
      ))}
    </TableShell>
  )
}

export function EmptyPanel({ title, body }: { title: string; body: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted">
        <Tray className="size-5 text-muted-foreground" weight="duotone" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

export function SectionFrame({
  section,
  dataset = null,
  forceEmpty = false,
  ignoreEmpty = false,
  kicker,
  title,
  sub,
  actions,
  children,
}: {
  section: AnalyticsSectionKey
  dataset?: DatasetKey | null
  forceEmpty?: boolean
  ignoreEmpty?: boolean
  kicker: string
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  const { filters, refresh, resetFilters, data, loads, scenario } = useAnalytics()
  const window = resolveWindow(filters.range, todayIso())
  const isEmpty = dataset ? (ignoreEmpty ? false : sectionEmpty(dataset, data)) || forceEmpty : false
  const state = dataset ? sectionState(loads[dataset], scenario, isEmpty) : 'ready'

  return (
    <AdminPage
      kicker={kicker}
      title={title}
      sub={sub}
      actions={
        <>
          {actions}
          <ExportDialog defaultFrom={window.from} defaultTo={window.to} />
        </>
      }
    >
      <FilterStateControl section={section} />
      <div className="mt-3">
        <ScopeLine section={section} windowOverride={window} />
      </div>
      {dataset && state !== 'ready' ? (
        <OverviewState
          section={dataset}
          isEmpty={isEmpty}
          onRetry={() => void refresh()}
          onReset={resetFilters}
        />
      ) : (
        children
      )}
    </AdminPage>
  )
}

export function RefreshButton() {  const { refresh, source } = useAnalytics()
  return (
    <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={source === 'loading'}>
      <ArrowClockwise className="h-4 w-4" weight={'bold' as const} /> Refresh
    </Button>
  )
}

