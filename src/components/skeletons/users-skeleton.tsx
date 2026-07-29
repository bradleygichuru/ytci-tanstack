import { Skeleton } from '#/components/ui/skeleton'

const rows = Array.from({ length: 5 })

export function UsersSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">County</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Created</th>
              <th className="w-12 px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-5 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-5 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                <td className="px-5 py-3"><Skeleton className="h-4 w-20" /></td>
                <td className="px-5 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-5 py-3"><Skeleton className="h-4 w-4" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AuditSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Details</th>
              <th className="px-5 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-5 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                <td className="px-5 py-3"><Skeleton className="h-4 w-48" /></td>
                <td className="px-5 py-3"><Skeleton className="h-4 w-28" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
