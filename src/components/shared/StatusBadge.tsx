import { Badge } from '#/components/ui/badge'

const statusColorMap: Record<string, string> = {
  published: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  draft: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  archived: 'bg-accent/20 text-accent-foreground border-accent',
  active: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  paused: 'bg-accent/20 text-accent-foreground border-accent',
  ended: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  scheduled: 'bg-primary/10 text-primary border-primary',
  postponed: 'bg-accent/20 text-accent-foreground border-accent',
  cancelled: 'bg-red-50 text-destructive border-destructive',
  completed: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  pending: 'bg-accent/20 text-accent-foreground border-accent',
  verified: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  unverified: 'bg-muted text-muted-foreground border-[var(--outline-muted)]',
  sent: 'bg-blue-50 text-blue-700 border-blue-300',
  delivered: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  failed: 'bg-red-50 text-destructive border-destructive',
  partial: 'bg-accent/20 text-accent-foreground border-accent',
  approved: 'bg-[var(--leaf-bg)] text-[var(--success-leaf)] border-[var(--success-leaf)]',
  rejected: 'bg-red-50 text-destructive border-destructive',
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const color = statusColorMap[status] || 'bg-gray-100 text-gray-700 border-gray-300'
  return <Badge variant="outline" className={`${color} rounded-full font-medium`}>{label ?? status}</Badge>
}
