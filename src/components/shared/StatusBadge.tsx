import { Badge } from '#/components/ui/badge'

const statusColorMap: Record<string, string> = {
  published: 'bg-[var(--leaf-bg)] text-[var(--leaf)] border-[var(--leaf)]',
  draft: 'bg-[var(--surface-dim)] text-[var(--on-surface-variant)] border-[var(--outline-muted)]',
  archived: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  active: 'bg-[var(--leaf-bg)] text-[var(--leaf)] border-[var(--leaf)]',
  paused: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  ended: 'bg-[var(--surface-dim)] text-[var(--on-surface-variant)] border-[var(--outline-muted)]',
  scheduled: 'bg-primary/10 text-primary border-[var(--forest)]',
  postponed: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  cancelled: 'bg-red-50 text-destructive border-[var(--error)]',
  completed: 'bg-[var(--leaf-bg)] text-[var(--leaf)] border-[var(--leaf)]',
  pending: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  verified: 'bg-[var(--leaf-bg)] text-[var(--leaf)] border-[var(--leaf)]',
  unverified: 'bg-[var(--surface-dim)] text-[var(--on-surface-variant)] border-[var(--outline-muted)]',
  sent: 'bg-blue-50 text-blue-700 border-blue-300',
  delivered: 'bg-[var(--leaf-bg)] text-[var(--leaf)] border-[var(--leaf)]',
  failed: 'bg-red-50 text-destructive border-[var(--error)]',
  partial: 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]',
  approved: 'bg-[var(--leaf-bg)] text-[var(--leaf)] border-[var(--leaf)]',
  rejected: 'bg-red-50 text-destructive border-[var(--error)]',
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const color = statusColorMap[status] || 'bg-gray-100 text-gray-700 border-gray-300'
  return <Badge variant="outline" className={`${color} rounded-full font-medium`}>{label ?? status}</Badge>
}
