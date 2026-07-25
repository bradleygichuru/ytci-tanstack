// THROWAWAY — UI prototype for ticket #9.
// Lives on branch prototype/shell-design. Throw away when verdict is captured.

import { useState } from 'react'
import {
  ClockAfternoon,
  CheckCircle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowsCounterClockwise,
  ImageSquare,
  User,
  Tag,
  Flag,
  Clock,
} from '@phosphor-icons/react'
import { ShellLayout } from '../ShellLayout'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'

const queueItems = [
  { id: '1', creator: 'Jane Wanjiku', caption: 'Sunset over Maasai Mara', mediaType: 'image', status: 'pending', submitted: '2h ago' },
  { id: '2', creator: 'Peter Ochieng', caption: 'Diani coral reef exploration', mediaType: 'video', status: 'pending', submitted: '5h ago' },
  { id: '3', creator: 'Amina Hassan', caption: 'Mountain trek on Mt Kenya', mediaType: 'image', status: 'approved', submitted: '1d ago' },
  { id: '4', creator: 'Brian Kiprop', caption: 'Street food in Mombasa', mediaType: 'image', status: 'rejected', submitted: '2d ago' },
  { id: '5', creator: 'Grace Akinyi', caption: 'Lake Nakuru flamingos', mediaType: 'video', status: 'pending', submitted: '2d ago' },
]

const reports = [
  { label: 'Inappropriate content', count: 2 },
  { label: 'Copyright violation', count: 1 },
  { label: 'Misleading location', count: 0 },
]

export function VariantB_ModerationDetail() {
  const [selectedId, setSelectedId] = useState('1')
  const selected = queueItems.find((i) => i.id === selectedId)!

  return (
    <ShellLayout
      title="UGC Moderation & Media Library"
      tabs={[
        { label: 'Queue', active: true },
        { label: 'Reports' },
      ]}
      leftSlot={
        <div className="flex gap-1 rounded-lg bg-amber-100/60 p-0.5">
          <button className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm">
            <ThumbsUp className="-mt-0.5 mr-1 inline h-4 w-4" weight="fill" /> Approve
          </button>
          <button className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-700">
            <ArrowsCounterClockwise className="-mt-0.5 mr-1 inline h-4 w-4" weight="duotone" /> Request changes
          </button>
          <button className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
            <ThumbsDown className="-mt-0.5 mr-1 inline h-4 w-4" weight="fill" /> Reject
          </button>
        </div>
      }
    >
      <div className="flex gap-6">
        {/* Left pane — compact queue */}
        <div className="w-[280px] shrink-0">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Queue</h3>
          <div className="space-y-1">
            {queueItems.map((item) => {
              const isActive = item.id === selectedId
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={
                    isActive
                      ? 'flex w-full items-center gap-3 rounded-lg bg-emerald-50 p-3 text-left'
                      : 'flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-neutral-50'
                  }
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                    <ImageSquare className="h-5 w-5" weight="duotone" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">{item.creator}</p>
                    <p className="truncate text-xs text-neutral-500">{item.caption}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-neutral-400">{item.submitted}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right pane — full detail */}
        <div className="flex-1">
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            {/* Media preview */}
            <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-emerald-800 to-emerald-950">
              <div className="text-center text-emerald-200/50">
                <ImageSquare className="mx-auto mb-2 h-12 w-12" weight="duotone" />
                <p className="text-sm">Media preview</p>
              </div>
            </div>

            {/* Detail fields */}
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-800">{selected.caption}</h2>
                  <p className="text-sm text-neutral-500">by {selected.creator}</p>
                </div>
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <ClockAfternoon className="h-3.5 w-3.5" weight="fill" />
                  Pending
                </Badge>
              </div>

              <div className="mb-5 grid grid-cols-3 gap-4 rounded-lg bg-neutral-50 p-4 text-sm">
                {[
                  { icon: User, label: 'Creator', value: selected.creator },
                  { icon: Tag, label: 'Media type', value: selected.mediaType },
                  { icon: Clock, label: 'Submitted', value: selected.submitted },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="mb-0.5 flex items-center gap-1 text-xs text-neutral-500">
                      <row.icon className="h-3.5 w-3.5" weight="duotone" /> {row.label}
                    </div>
                    <p className="font-medium text-neutral-700">{row.value}</p>
                  </div>
                ))}
              </div>

              {/* Reports section */}
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold text-neutral-700">
                  <Flag className="h-4 w-4" weight="duotone" /> Reports (3)
                </h4>
                <div className="space-y-1">
                  {reports.map(
                    (r) =>
                      r.count > 0 && (
                        <div key={r.label} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-sm">
                          <span className="text-neutral-700">{r.label}</span>
                          <Badge variant="destructive" className="text-xs">{r.count}</Badge>
                        </div>
                      ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ShellLayout>
  )
}
