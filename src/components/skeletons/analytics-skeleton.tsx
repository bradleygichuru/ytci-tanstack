import { Skeleton } from '#/components/ui/skeleton'

const heroCards = Array.from({ length: 4 })
const statCards = Array.from({ length: 8 })

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {heroCards.map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="mb-2 flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="mb-2 flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
