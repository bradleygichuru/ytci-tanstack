import { useCallback, useState, type ReactNode } from 'react'
import { Link, useBlocker, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowSquareOut,
  CheckCircle,
  Info,
  Warning,
  X,
} from '@phosphor-icons/react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { useThenNow } from '#/lib/then-now/store'
import {
  ACCESS_LABEL,
  SENSITIVITY_LABEL,
  STATUS_LABEL,
  type AccessMode,
  type ReadinessItem,
  type Scenario,
  type Sensitivity,
} from '#/lib/then-now/types'

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--amber-deep)]">
      <span className="h-0.5 w-5 bg-[var(--amber)]" aria-hidden="true" />
      {children}
    </div>
  )
}

export function PageHeader({
  kicker,
  title,
  sub,
  actions,
  back,
}: {
  kicker: string
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
}) {
  const navigate = useNavigate()
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <button
            type="button"
            onClick={() => navigate({ to: back.to as never })}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" weight="bold" />
            {back.label}
          </button>
        )}
        <Kicker>{kicker}</Kicker>
        <h1 className="mt-1 font-sans text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {sub && <div className="mt-1 max-w-3xl text-sm text-muted-foreground">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
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
          ? 'border-t-[var(--leaf)]'
          : ''
  return (
    <div className={`rounded-lg border border-border bg-card p-4 shadow-sm ${border} ${accent !== 'none' ? 'border-t-2' : ''}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-sans text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {foot && <div className="mt-1 text-xs text-muted-foreground">{foot}</div>}
    </div>
  )
}

export function AccessBadge({ access }: { access: AccessMode }) {
  const cls =
    access === 'camera_video'
      ? 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]'
      : access === 'not_available'
        ? 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]'
        : 'bg-muted text-muted-foreground border-border'
  return <Badge variant="outline" className={`rounded-full font-semibold ${cls}`}>{ACCESS_LABEL[access]}</Badge>
}

export function SensitivityBadge({ sensitivity }: { sensitivity: Sensitivity }) {
  if (sensitivity === 'standard') {
    return <Badge variant="outline" className="rounded-full border-border bg-muted text-muted-foreground">Standard</Badge>
  }
  return <StatusBadge status={sensitivity} label={SENSITIVITY_LABEL[sensitivity]} />
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const display = label ?? STATUS_LABEL[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  return <StatusBadge status={status} label={display} />
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string
  body: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-card px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--leaf-bg)] text-[var(--success-leaf)]">
        {icon ?? <Info className="h-6 w-6" weight="duotone" />}
      </div>
      <h2 className="font-sans text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      title="We couldn’t load the Then & Now records"
      body="The server took too long to respond. Nothing was changed in the live revision. Check the connection and try again."
      icon={<Warning className="h-6 w-6" weight="duotone" />}
      action={<Button onClick={onRetry}>Retry</Button>}
    />
  )
}

export function SkeletonTable({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b bg-[var(--surface-2)] px-5 py-3">
        <div className="h-3 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid gap-4 px-5 py-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, cell) => (
              <div key={cell} className="h-3 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'empty', label: 'Empty' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Error' },
  { value: 'offline', label: 'Offline' },
  { value: 'conflict', label: '409 conflict' },
  { value: 'readonly', label: 'Read-only' },
]

export function FixtureStateControl() {
  const { scenario, setScenario, actions } = useThenNow()
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[var(--amber)] bg-[var(--amber-bg)] px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--amber-deep)]">Fixture state</span>
      <select
        aria-label="Fixture state"
        data-testid="then-now-fixture-state"
        value={scenario}
        onChange={(event) => setScenario(event.target.value as Scenario)}
        className="h-7 rounded-md border border-[var(--amber)] bg-card px-2 text-xs font-semibold text-foreground"
      >
        {SCENARIOS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={actions.reset}
        className="text-[11px] font-semibold text-[var(--amber-deep)] underline-offset-2 hover:underline"
      >
        Reset data
      </button>
    </div>
  )
}

export function ScenarioBanner() {
  const { scenario } = useThenNow()
  if (scenario === 'offline') {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--amber)] bg-[var(--amber-bg)] px-4 py-3 text-sm text-[var(--amber-deep)]" role="status">
        <Info className="h-4 w-4" weight="duotone" />
        <span className="font-semibold">You’re offline.</span>
        <span>Changes stay on this device; uploads and server actions are paused. The last synced revision is shown.</span>
      </div>
    )
  }
  if (scenario === 'conflict') {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:text-red-300" role="status">
        <Warning className="h-4 w-4" weight="duotone" />
        <span className="font-semibold">409 conflict.</span>
        <span>A newer revision (v5) was saved by Daniel at 10:14. Your draft is based on v4. Reload before saving or submitting.</span>
      </div>
    )
  }
  if (scenario === 'readonly') {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground" role="status">
        <Info className="h-4 w-4" weight="duotone" />
        <span><strong className="text-foreground">Read-only fixture.</strong> Editing, review, and publishing are disabled.</span>
      </div>
    )
  }
  return null
}

export function ReadinessRail({
  kicker,
  stage,
  sub,
  ready,
  blockers,
  warnings,
  beforePublish,
  onSelect,
  footer,
}: {
  kicker: string
  stage: string
  sub?: ReactNode
  ready?: boolean
  blockers: ReadinessItem[]
  warnings: ReadinessItem[]
  beforePublish?: ReadinessItem[]
  onSelect: (section: ReadinessItem['section']) => void
  footer?: ReactNode
}) {
  return (
    <aside className="xl:sticky xl:top-6" aria-label={`${kicker} readiness`}>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-[var(--surface-2)] px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--amber-deep)]">{kicker}</p>
          <p className={`mt-1 font-sans text-2xl font-bold tracking-tight ${ready ? 'text-[var(--success-leaf)]' : 'text-foreground'}`}>{stage}</p>
          {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
        </div>
        <div className="divide-y">
          {blockers.length > 0 && (
            <ReadinessGroup label="Blocking" items={blockers} tone="blocking" onSelect={onSelect} />
          )}
          {beforePublish && beforePublish.length > 0 && (
            <ReadinessGroup label="Before publish" items={beforePublish} tone="pending" onSelect={onSelect} />
          )}
          {warnings.length > 0 && (
            <ReadinessGroup label="Warnings" items={warnings} tone="warning" onSelect={onSelect} />
          )}
          {blockers.length === 0 && warnings.length === 0 && (!beforePublish || beforePublish.length === 0) && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm font-semibold text-[var(--success-leaf)]">
              <CheckCircle className="h-4 w-4" weight="fill" />
              All publish checks pass.
            </div>
          )}
        </div>
        {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
      </div>
    </aside>
  )
}

function ReadinessGroup({
  label,
  items,
  tone,
  onSelect,
}: {
  label: string
  items: ReadinessItem[]
  tone: 'blocking' | 'warning' | 'pending'
  onSelect: (section: ReadinessItem['section']) => void
}) {
  return (
    <div className="px-4 py-3">
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <span>{label}</span>
        <span>{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={`${item.section}-${item.label}`}
            type="button"
            onClick={() => onSelect(item.section)}
            className={`flex w-full items-start gap-2 rounded px-1 py-1 text-left text-xs font-medium hover:bg-[var(--surface-2)] ${
              tone === 'blocking' ? 'text-destructive dark:text-red-300' : 'text-[var(--amber-deep)]'
            }`}
          >
            {tone === 'blocking'
              ? <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="fill" />
              : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="fill" />}
            <span className="flex-1">{item.label}</span>
            <span className="text-[10px] font-semibold opacity-70">Open</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function DirtyGuard({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: dirty,
    disabled: !dirty,
    withResolver: true,
  })

  if (blocker.status !== 'blocked') return null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) blocker.reset?.() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unsaved changes</DialogTitle>
          <DialogDescription>You have edits that have not been saved.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Save the draft before leaving, or leave without saving. This fixture does not keep a local copy of unsaved edits.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => blocker.reset?.()}>Stay on this page</Button>
          <Button variant="destructive" onClick={() => blocker.proceed?.()}>Leave without saving</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PreviewDialog({
  open,
  onOpenChange,
  image,
  title,
  subtitle,
  cardText,
  meta,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  image?: string
  title: string
  subtitle?: string
  cardText?: string
  meta?: ReactNode
}) {
  const [captions, setCaptions] = useState(true)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Admin preview</DialogTitle>
          <DialogDescription>Watermarked · authenticated · not public</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg border-2 border-[var(--amber)] bg-[#07140a]">
          <div className="relative aspect-video overflow-hidden">
            {image ? (
              <img src={image} alt="" className="h-full w-full object-cover opacity-90" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#154212] to-[#07140a]" />
            )}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="-rotate-12 rounded border border-[var(--amber)]/50 bg-black/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--amber)]">
                Admin preview · not public
              </span>
            </div>
            {captions && cardText && (
              <div className="absolute inset-x-3 bottom-3 flex items-start gap-2 rounded-md border border-white/20 bg-black/80 p-2.5 text-xs leading-relaxed text-white">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--amber)] text-[9px] font-bold text-primary">01</span>
                <span>{cardText}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCaptions((value) => !value)}>
              {captions ? 'Captions on' : 'Captions off'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close preview</Button>
          </div>
        </div>
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
      </DialogContent>
    </Dialog>
  )
}

export function AuditDialog({
  open,
  onOpenChange,
  events,
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  events: { id: string; title: string; meta: string; note?: string }[]
  title: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit timeline</DialogTitle>
          <DialogDescription>{title} · append-only</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {events.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No audit entries for this record yet.</p>
          ) : (
            <ol className="relative ml-2 border-l border-border pl-5">
              {events.map((event) => (
                <li key={event.id} className="relative pb-5 last:pb-0">
                  <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-[var(--amber)]" />
                  <p className="text-sm font-semibold text-foreground">{event.title}</p>
                  <p className="text-[11px] text-muted-foreground">{event.meta}</p>
                  {event.note && <p className="mt-1 rounded bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-muted-foreground">{event.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}

export function Callout({
  tone = 'neutral',
  title,
  children,
  action,
}: {
  tone?: 'neutral' | 'gold' | 'green' | 'red'
  title?: ReactNode
  children: ReactNode
  action?: ReactNode
}) {
  const cls =
    tone === 'gold'
      ? 'border-[var(--amber)] bg-[var(--amber-bg)] text-[var(--amber-deep)]'
      : tone === 'green'
        ? 'border-[var(--success-leaf)]/30 bg-[var(--leaf-bg)] text-[var(--success-leaf)]'
        : tone === 'red'
          ? 'border-destructive/30 bg-destructive/10 text-destructive dark:text-red-300'
          : 'border-border bg-[var(--surface-2)] text-muted-foreground'
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm ${cls}`}>
      {tone === 'red' ? <Warning className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
        : tone === 'green' ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
          : <Info className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />}
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5' : ''}>{children}</div>
      </div>
      {action}
    </div>
  )
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
      {children}
      <ArrowSquareOut className="h-3.5 w-3.5" weight="bold" />
    </a>
  )
}

export function CloseIcon() {
  return <X className="h-4 w-4" />
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to as never} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" weight="bold" />
      {children}
    </Link>
  )
}

export function useThenNowCallbacks() {
  const navigate = useNavigate()
  const go = useCallback((to: string) => navigate({ to: to as never }), [navigate])
  return go
}
