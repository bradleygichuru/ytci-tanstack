// THROWAWAY — UI prototype for ticket #9.
// Lives on branch prototype/shell-design. Throw away when verdict is captured.

import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  ClockAfternoon,
  Trash,
  Eye,
} from '@phosphor-icons/react'
import { ShellLayout } from '../ShellLayout'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'

const statusConfig: Record<string, { icon: typeof ClockAfternoon; label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { icon: ClockAfternoon, label: 'Pending', variant: 'outline' },
  approved: { icon: CheckCircle, label: 'Approved', variant: 'default' },
  rejected: { icon: XCircle, label: 'Rejected', variant: 'destructive' },
}

const items = [
  { id: '1', creator: 'Jane Wanjiku', caption: 'Sunset over Maasai Mara', mediaType: 'image', status: 'pending', submitted: '2h ago' },
  { id: '2', creator: 'Peter Ochieng', caption: 'Diani coral reef exploration', mediaType: 'video', status: 'pending', submitted: '5h ago' },
  { id: '3', creator: 'Amina Hassan', caption: 'Mountain trek on Mt Kenya', mediaType: 'image', status: 'approved', submitted: '1d ago' },
  { id: '4', creator: 'Brian Kiprop', caption: 'Street food in Mombasa', mediaType: 'image', status: 'rejected', submitted: '2d ago' },
  { id: '5', creator: 'Grace Akinyi', caption: 'Lake Nakuru flamingos', mediaType: 'video', status: 'pending', submitted: '2d ago' },
]

const filters = ['All', 'Pending', 'Approved', 'Rejected', 'Images', 'Videos']

export function VariantA_ModerationQueue() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = activeFilter === 'All'
    ? items
    : items.filter((i) =>
        ['Pending', 'Approved', 'Rejected'].includes(activeFilter)
          ? i.status === activeFilter.toLowerCase()
          : activeFilter === 'Images'
            ? i.mediaType === 'image'
            : i.mediaType === 'video',
      )

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  return (
    <ShellLayout
      title="UGC Moderation & Media Library"
      tabs={[
        { label: 'Queue', active: true },
        { label: 'Reports' },
      ]}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={
              activeFilter === f
                ? 'rounded-full border border-emerald-600 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700'
                : 'rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm font-medium text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
            }
          >
            {f}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
          <span className="font-medium text-amber-800">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="ml-auto h-7 text-xs">
            <CheckCircle className="mr-1 h-3.5 w-3.5" weight="duotone" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600">
            <XCircle className="mr-1 h-3.5 w-3.5" weight="duotone" /> Reject
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-neutral-50/80 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onCheckedChange={() => {
                    if (selected.size === filtered.length) setSelected(new Set())
                    else setSelected(new Set(filtered.map((i) => i.id)))
                  }}
                />
              </th>
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3">Caption</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="w-20 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const s = statusConfig[item.status]
              const StatusIcon = s.icon
              return (
                <tr key={item.id} className="border-b last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} />
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-800">{item.creator}</td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-neutral-600">{item.caption}</td>
                  <td className="px-4 py-3 text-neutral-500">{item.mediaType}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.variant} className="flex w-fit items-center gap-1 text-xs">
                      <StatusIcon className="h-3.5 w-3.5" weight="fill" /> {s.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{item.submitted}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"><Eye className="h-4 w-4" weight="duotone" /></button>
                      <button className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500"><Trash className="h-4 w-4" weight="duotone" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-neutral-500">
          <span>1–{filtered.length} of {items.length}</span>
          <div className="flex items-center gap-2">
            <button className="rounded px-2 py-1 text-neutral-400 hover:text-neutral-600" disabled>Previous</button>
            <span className="font-medium text-neutral-700">1</span>
            <button className="rounded px-2 py-1 text-neutral-400 hover:text-neutral-600" disabled>Next</button>
          </div>
        </div>
      </div>
    </ShellLayout>
  )
}
