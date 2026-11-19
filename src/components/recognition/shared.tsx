/**
 * Recognition admin presentation primitives.
 *
 * Owned by the recognition stream: the shared shell components are consumed,
 * never edited. These wrap the shell grammar with recognition vocabulary
 * (operation groups, award delivery states, rule diffs, engine banners).
 */
import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle, Info, Power, ShieldCheck, Warning } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { DataStateView } from '#/components/shell/DataState'
import { cn } from '#/lib/utils.ts'
import { useRecognition } from '#/lib/recognition/store'
import type { RuleDiffRow } from '#/lib/recognition/logic'
import type { BoardRow, Scenario } from '#/lib/recognition/types'

export const NAV_GROUPS: {
  group: string
  items: { to: string; label: string; key: string }[]
}[] = [
  {
    group: 'Govern',
    items: [
      { to: '/recognition', label: 'Overview', key: 'overview' },
      { to: '/recognition/rules', label: 'Rules', key: 'rules' },
      { to: '/recognition/badges', label: 'Badges', key: 'badges' },
      { to: '/recognition/missions', label: 'Missions', key: 'missions' },
      { to: '/recognition/seasons', label: 'Seasons', key: 'seasons' },
    ],
  },
  {
    group: 'Run',
    items: [
      {
        to: '/recognition/leaderboard',
        label: 'Leaderboard',
        key: 'leaderboard',
      },
      { to: '/recognition/awards', label: 'Awards ledger', key: 'awards' },
      { to: '/recognition/reports', label: 'Names & reports', key: 'reports' },
      { to: '/recognition/backfill', label: 'Backfill', key: 'backfill' },
      { to: '/recognition/audit', label: 'Audit log', key: 'audit' },
    ],
  },
  {
    group: 'Safety',
    items: [
      {
        to: '/recognition/kill-switches',
        label: 'Kill switches',
        key: 'kill-switches',
      },
    ],
  },
]

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
  back,
  children,
}: {
  kicker: string
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {back ? (
            <Link
              to={back.to}
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" weight="bold" />
              {back.label}
            </Link>
          ) : null}
          <Kicker>{kicker}</Kicker>
          <h1 className="mt-1 font-sans text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {sub ? <div className="mt-1 max-w-3xl text-sm text-muted-foreground">{sub}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}

export function RecognitionNav() {
  const location = useLocation()
  const pathname = location.pathname
  const isActive = (to: string) => {
    if (to === '/recognition') return pathname === '/recognition'
    if (to === '/recognition/rules') return pathname.startsWith('/recognition/rules')
    return pathname === to || pathname.startsWith(`${to}/`)
  }

  return (
    <nav
      aria-label="Recognition sections"
      className="flex flex-nowrap items-center gap-x-1 gap-y-0.5 overflow-x-auto border-b border-border pb-1"
    >
      {NAV_GROUPS.map((group, index) => (
        <div key={group.group} className="flex shrink-0 items-center gap-1 whitespace-nowrap">
          {index > 0 ? <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" /> : null}
          <span className="px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
            {group.group}
          </span>
          {group.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive(item.to) ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-8 items-center rounded-md px-2 text-xs font-semibold transition-colors',
                isActive(item.to)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
  { value: 'readonly', label: 'Read-only' },
]

export function FixtureStateControl() {
  const { scenario, setScenario, actions } = useRecognition()
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[var(--amber)] bg-[var(--amber-bg)] px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--amber-deep)]">
        Data state
      </span>
      <select
        aria-label="Data state"
        data-testid="recognition-fixture-state"
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
      <button
        type="button"
        onClick={actions.reset}
        className="text-[11px] font-semibold text-[var(--amber-deep)] underline-offset-2 hover:underline"
      >
        Reset sample
      </button>
    </div>
  )
}

export function ScenarioBanner() {
  const { scenario, source, apiError, apiStatus, setScenario } = useRecognition()
  if (scenario === 'stale') {
    return (
      <Notice tone="gold" title="Showing last-known recognition data.">
        Reads still work. Publishing, backfill approval, retries and corrections are disabled until live data
        is restored.{' '}
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
  if (scenario === 'readonly') {
    return (
      <Notice tone="neutral" title="Read-only preview.">
        Browse every screen and export; writes are disabled. This is the state an operator sees when they hold
        a reader-scope role.
      </Notice>
    )
  }
  if (scenario === 'error') {
    return (
      <Notice tone="red" title="The recognition service is unavailable.">
        Reads and writes both fail. Nothing was changed. The last audit entry stays the source of truth.
      </Notice>
    )
  }
  if (apiStatus === 'error' || source === 'sample') {
    return (
      <Notice tone="gold" title="Sample data is showing.">
        {apiError
          ? `The contracts API did not answer (${apiError}). Actions that need the API will fail with an explanation; overlay actions are labelled in the audit log.`
          : 'Start the contracts mock on :8099 to read live contract rows. Operator overlays stay local to this browser.'}
      </Notice>
    )
  }
  return null
}

export function EngineOffBanner() {
  const { engineOn } = useRecognition()
  if (engineOn) return null
  return (
    <Notice tone="red" title="The recognition engine is off.">
      Awards, rule publishing, simulation, backfill, adjustments and award retry are blocked. Earned XP and
      badges stay readable. Turn the global switch back on from Kill switches.
    </Notice>
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

export function StatCard({
  label,
  value,
  foot,
  accent = 'forest',
}: {
  label: string
  value: ReactNode
  foot?: ReactNode
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
        accent !== 'none' && `border-t-2 ${border}`
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-sans text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {foot ? <div className="mt-1 text-xs text-muted-foreground">{foot}</div> : null}
    </div>
  )
}

const PILL_TONES: Record<string, string> = {
  published: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  active: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  delivered: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  completed: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  approved: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  decided: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  draft: 'bg-muted text-muted-foreground border-border',
  retired: 'bg-muted text-muted-foreground border-border',
  upcoming: 'bg-primary/10 text-primary border-primary',
  frozen: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  paused: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  queued: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  failed: 'bg-destructive/10 text-destructive border-destructive dark:text-red-300',
  suppressed: 'bg-muted text-muted-foreground border-border',
  closed: 'bg-muted text-muted-foreground border-border',
  retracted: 'bg-destructive/10 text-destructive border-destructive dark:text-red-300',
  open: 'bg-destructive/10 text-destructive border-destructive dark:text-red-300',
  triaged: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  requested: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  withdrawn: 'bg-muted text-muted-foreground border-border',
  running: 'bg-primary/10 text-primary border-primary',
  dry_run: 'bg-muted text-muted-foreground border-border',
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const display = label ?? status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        PILL_TONES[status] ?? 'bg-muted text-muted-foreground border-border'
      )}
    >
      {display}
    </span>
  )
}

export function ScopeNote({ children }: { children: ReactNode }) {
  return <div className="mb-4 text-xs font-medium text-muted-foreground">{children}</div>
}

export function DataState({
  state,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
}: {
  state: 'loading' | 'empty' | 'error' | 'ready'
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  children: ReactNode
}) {
  if (state === 'ready') return <>{children}</>
  return (
    <DataStateView
      state={state}
      title={state === 'empty' ? emptyTitle : undefined}
      description={state === 'empty' ? emptyDescription : undefined}
      action={state === 'empty' ? emptyAction : undefined}
      onRetry={state === 'error' ? onRetry : undefined}
    />
  )
}

export function RuleDiff({ rows }: { rows: RuleDiffRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No staged changes yet. Edit a field to see the diff.</p>
    )
  }
  return (
    <div
      className="overflow-hidden rounded-md border border-border"
      role="table"
      aria-label="Changes against live"
    >
      <div
        className="grid grid-cols-[1.1fr_1fr_1fr] border-b bg-[var(--surface-2)] text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
        role="row"
      >
        <div className="px-3 py-2" role="columnheader">
          Field
        </div>
        <div className="px-3 py-2" role="columnheader">
          Live
        </div>
        <div className="px-3 py-2" role="columnheader">
          Staged
        </div>
      </div>
      {rows.map((row) => (
        <div
          key={row.field}
          className="grid grid-cols-[1.1fr_1fr_1fr] border-b text-sm last:border-0"
          role="row"
        >
          <div className="px-3 py-2 font-medium text-foreground" role="cell">
            {row.field}
          </div>
          <div className="px-3 py-2 text-muted-foreground line-through decoration-destructive/40" role="cell">
            {row.live}
          </div>
          <div className="px-3 py-2 font-semibold text-[var(--success-leaf)]" role="cell">
            {row.staged}
          </div>
        </div>
      ))}
    </div>
  )
}

export function BoardRows({
  rows,
  onRetract,
  onRestore,
  retractDisabledReason,
  closed,
}: {
  rows: BoardRow[]
  onRetract: (row: BoardRow) => void
  onRestore: (row: BoardRow) => void
  retractDisabledReason?: string
  closed: boolean
}) {
  const active = rows.filter((row) => row.status === 'active')
  const retracted = rows.filter((row) => row.status === 'retracted')
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <caption className="sr-only">
            Leaderboard entries with rank, XP, level and verified activity
          </caption>
          <thead>
            <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <th scope="col" className="px-4 py-3 text-right">
                Rank
              </th>
              <th scope="col" className="px-4 py-3">
                Display name
              </th>
              <th scope="col" className="px-4 py-3">
                County
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                XP
              </th>
              <th scope="col" className="px-4 py-3">
                Level
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Verified sites
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Trails
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {active.map((row) => (
              <tr key={row.displayName} className="border-b last:border-0 hover:bg-[var(--surface-2)]">
                <td className="px-4 py-3 text-right font-mono text-xs font-bold">{row.rank}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-foreground">{row.displayName}</span>
                  {row.isSelf ? (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      You
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.county ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{row.xp.toLocaleString('en-KE')}</td>
                <td className="px-4 py-3">{row.level}</td>
                <td className="px-4 py-3 text-right">{row.verifiedSites}</td>
                <td className="px-4 py-3 text-right">{row.trailCompletions}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => onRetract(row)}
                    disabled={closed || Boolean(retractDisabledReason)}
                    title={closed ? 'A closed season cannot be retracted.' : retractDisabledReason}
                  >
                    Retract
                  </Button>
                </td>
              </tr>
            ))}
            {active.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No active entries on this board.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {retracted.length > 0 ? (
        <div className="border-t border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wide">Retracted</span>
          <span className="mx-2">·</span>
          {retracted.map((row, index) => (
            <span key={row.displayName}>
              {index > 0 ? <span className="mx-2">·</span> : null}
              {row.displayName}
              <span className="mx-1 text-[10px]">({row.retractedReason})</span>
              <button
                type="button"
                onClick={() => onRestore(row)}
                disabled={closed}
                className="font-semibold text-primary underline underline-offset-2 disabled:opacity-50"
              >
                Restore
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </>
  )
}

export function EngineGuard({ children }: { children: ReactNode }) {
  const { engineOn } = useRecognition()
  if (engineOn) return <>{children}</>
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive dark:text-red-300">
      <Power className="h-4 w-4" weight="bold" aria-hidden />
      Blocked while the recognition engine is off.
    </div>
  )
}

export function PermissionHint({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="duotone" aria-hidden />
      <span>{children}</span>
    </p>
  )
}
