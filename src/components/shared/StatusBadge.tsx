import { Badge } from '#/components/ui/badge'

const statusColorMap: Record<string, string> = {
  published: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  draft: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  archived: 'bg-accent/20 text-accent-foreground border-accent',
  active: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  paused: 'bg-accent/20 text-accent-foreground border-accent',
  ended: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  scheduled: 'bg-primary/10 text-primary border-primary dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-700',
  postponed: 'bg-accent/20 text-accent-foreground border-accent',
  cancelled: 'bg-destructive/10 text-destructive border-destructive dark:text-red-300',
  completed: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  pending: 'bg-accent/20 text-accent-foreground border-accent',
  verified: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  unverified: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  sent: 'bg-blue-50 text-blue-700 border-blue-300',
  delivered: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  failed: 'bg-destructive/10 text-destructive border-destructive dark:text-red-300',
  partial: 'bg-accent/20 text-accent-foreground border-accent',
  approved: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  rejected: 'bg-destructive/10 text-destructive border-destructive dark:text-red-300',
  in_review: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  unpublished: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  revoked: 'bg-destructive/10 text-destructive border-destructive dark:text-red-300',
  sensitive: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  restricted: 'bg-destructive/10 text-destructive border-destructive dark:text-red-300',
  ready: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  missing: 'bg-destructive/10 text-destructive border-destructive dark:text-red-300',
  consultation: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  open: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  judging: 'bg-primary/10 text-primary border-primary dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-700',
  voting: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  closed: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  invited: 'bg-primary/10 text-primary border-primary dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-700',
  recused: 'bg-destructive/10 text-destructive border-destructive dark:text-red-300',
  inactive: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  assigned: 'bg-primary/10 text-primary border-primary dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-700',
  resolved: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  dismissed: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  eligible: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  ineligible: 'bg-destructive/10 text-destructive border-destructive dark:text-red-300',
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const color = statusColorMap[status] || 'bg-gray-100 text-gray-700 border-gray-300'
  return <Badge variant="outline" className={`${color} rounded-full font-medium`}>{label ?? status}</Badge>
}
