import { Badge } from '#/components/ui/badge'
import type { Language, RevisionStatus, RiskTier, StoryStatus } from '#/lib/api/audio-stories'

const storyLabels: Record<StoryStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  scheduled: 'Scheduled',
  published: 'Published',
  unpublished: 'Unpublished',
  revoked: 'Revoked',
  archived: 'Archived',
}

const storyStyles: Record<StoryStatus, string> = {
  published: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  draft: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  in_review: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber-deep)]',
  scheduled: 'bg-primary/10 text-primary border-primary',
  unpublished: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  revoked: 'bg-[var(--error-container)] text-destructive border-destructive',
  archived: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
}

const revisionLabels: Record<RevisionStatus, string> = {
  draft: 'Draft revision',
  in_review: 'Revision in review',
  approved: 'Revision approved',
  scheduled: 'Revision scheduled',
  published: 'Live version',
  superseded: 'Superseded',
  cancelled: 'Cancelled',
}

const revisionStyles: Record<RevisionStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  in_review: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber-deep)]',
  approved: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  scheduled: 'bg-primary/10 text-primary border-primary',
  published: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  superseded: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  cancelled: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
}

const riskStyles: Record<RiskTier, string> = {
  standard: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  sensitive: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber-deep)]',
  restricted: 'bg-[var(--error-container)] text-destructive border-destructive',
}

export function StoryStatusBadge({ status }: { status: StoryStatus }) {
  return (
    <Badge variant="outline" className={`rounded-full font-semibold ${storyStyles[status]}`}>
      {storyLabels[status]}
    </Badge>
  )
}

export function RevisionStatusBadge({ status }: { status?: RevisionStatus }) {
  if (!status) return <span className="text-xs text-muted-foreground">No revision</span>
  return (
    <Badge variant="outline" className={`rounded-full font-semibold ${revisionStyles[status]}`}>
      {revisionLabels[status]}
    </Badge>
  )
}

export function RiskBadge({ risk }: { risk?: RiskTier }) {
  if (!risk) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <Badge variant="outline" className={`rounded-full font-semibold capitalize ${riskStyles[risk]}`}>
      {risk}
    </Badge>
  )
}

export function LanguageChips({ languages }: { languages?: Language[] }) {
  if (!languages || languages.length === 0) {
    return <span className="text-xs text-muted-foreground">No audio</span>
  }
  return (
    <span className="flex flex-wrap gap-1">
      {languages.map((language) => (
        <span
          key={language}
          className="rounded-md border border-border bg-[var(--surface-2)] px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]"
        >
          {language === 'en' ? 'EN' : 'SW'}
        </span>
      ))}
    </span>
  )
}

export function formatRelative(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
