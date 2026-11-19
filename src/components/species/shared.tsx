import type { ReactNode } from 'react'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import type { VariantReviewStatus } from '#/lib/species/model'

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  green: 'bg-primary/10 text-primary',
  amber: 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]',
  red: 'bg-destructive/10 text-destructive',
  blue: 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]',
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  published: { label: 'Published', tone: 'green' },
  in_review: { label: 'In review', tone: 'amber' },
  draft: { label: 'Draft', tone: 'neutral' },
  unpublished: { label: 'Unpublished', tone: 'red' },
  tombstoned: { label: 'Tombstoned', tone: 'red' },
  reviewed: { label: 'Reviewed', tone: 'green' },
  stale: { label: 'Stale', tone: 'red' },
  missing: { label: 'Missing', tone: 'red' },
  changes_requested: { label: 'Changes requested', tone: 'amber' },
  rejected: { label: 'Rejected', tone: 'red' },
  pending: { label: 'Pending', tone: 'blue' },
  approved: { label: 'Approved', tone: 'green' },
  active: { label: 'Active', tone: 'green' },
  expired: { label: 'Expired', tone: 'red' },
  withdrawn: { label: 'Withdrawn', tone: 'red' },
  accepted: { label: 'Accepted', tone: 'green' },
  synonym: { label: 'Synonym', tone: 'amber' },
  provisional: { label: 'Provisional', tone: 'amber' },
  uncertain: { label: 'Uncertain', tone: 'red' },
  full: { label: 'Full', tone: 'green' },
  summary: { label: 'Summary', tone: 'amber' },
  names: { label: 'Names', tone: 'blue' },
  audio: { label: 'Audio', tone: 'blue' },
  in_review_task: { label: 'In review', tone: 'amber' },
}

export function StatusPill({
  status,
  label,
  className,
}: {
  status: string
  label?: string
  className?: string
}) {
  const resolved = STATUS[status] ?? { label: status || 'Unknown', tone: 'neutral' as Tone }
  return (
    <Badge
      variant="outline"
      className={cn('border-transparent font-semibold', TONE_CLASS[resolved.tone], className)}
    >
      {label ?? resolved.label}
    </Badge>
  )
}

export function VariantStatusPill({ status }: { status: VariantReviewStatus }) {
  return <StatusPill status={status} />
}

export function CoverageBar({
  value,
  total,
  label,
  className,
}: {
  value: number
  total: number
  label: string
  className?: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {value}/{total} · {pct}%
        </span>
      </div>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`${label} coverage`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
      >
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-card', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Kpi({
  label,
  value,
  foot,
  alert,
}: {
  label: string
  value: string | number
  foot: string
  alert?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className={cn('mt-1 text-xs', alert ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
        {foot}
      </p>
    </div>
  )
}

export function RecordLine({
  kind,
  label,
  detail,
}: {
  kind: string
  label: string
  detail?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {detail ? <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p> : null}
      </div>
      <StatusPill status="draft" label={kind} className="shrink-0" />
    </div>
  )
}

export function ContractGapNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
      <strong className="font-semibold text-foreground">Contract gap. </strong>
      {children}
    </div>
  )
}
