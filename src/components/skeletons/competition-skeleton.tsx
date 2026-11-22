import { Skeleton } from '#/components/ui/skeleton'

export function CompetitionSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-3 w-72" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[var(--surface-2)] text-left">
              {Array.from({ length: 5 }).map((_, index) => (
                <th key={index} className="px-4 py-3">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="border-b">
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="mt-1 h-3 w-28" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-16" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="ml-auto h-8 w-20 rounded-md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
