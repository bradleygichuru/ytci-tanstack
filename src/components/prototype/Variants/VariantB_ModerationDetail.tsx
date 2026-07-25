// THROWAWAY — UI prototype for ticket #9.
// Lives on branch prototype/shell-design. Throw away when verdict is captured.
// Variant B — split-pane review with AI insights (matches Stitch "Action Items" tab view)

import { useState } from 'react'
import {
  Clock,
  MapPin,
  Path,
  IdentificationCard,
  ShieldCheck,
  Sparkle,
} from '@phosphor-icons/react'
import { ShellLayout } from '../ShellLayout'

const queue = [
  {
    id: '1',
    handle: '@eco_traveler',
    destination: 'Costa Rica Canopy Tour',
    caption: 'Sharing my trip story with you all — first time in CR.',
    timeAgo: '2h ago',
    gradient: 'from-emerald-700 via-emerald-800 to-emerald-950',
  },
  {
    id: '2',
    handle: '@nomad_jess',
    destination: 'Hidden Cove Discovery',
    caption: 'Possible protected wildlife found in this area.',
    timeAgo: '4h ago',
    gradient: 'from-sky-700 via-sky-800 to-slate-900',
  },
  {
    id: '3',
    handle: '@trail_runner',
    destination: 'Volcanic Highlands',
    caption: 'Sunrise hike on the active ridge — breathtaking.',
    timeAgo: '6h ago',
    gradient: 'from-orange-500 via-rose-600 to-purple-900',
  },
  {
    id: '4',
    handle: '@safari_kenya',
    destination: 'Maasai Mara Migration',
    caption: 'Wildebeest crossing at dawn — full herd in motion.',
    timeAgo: '8h ago',
    gradient: 'from-amber-500 via-orange-600 to-red-700',
  },
]

const aiInsights = [
  {
    icon: ShieldCheck,
    label: 'Auto-flagged',
    text: 'EXIF location data stripped successfully. Wildlife coordinates removed.',
    color: 'text-emerald-600',
  },
  {
    icon: Path,
    label: 'Similar past',
    text: 'A similar story from @eco_traveler was approved 2 days ago.',
    color: 'text-sky-600',
  },
  {
    icon: Sparkle,
    label: 'Caption quality',
    text: 'On-brand. No policy flags detected. Alt text suggested for 2 of 5 images.',
    color: 'text-amber-600',
  },
  {
    icon: IdentificationCard,
    label: 'Reporter signal',
    text: 'No active reports against this creator. Account age 14 months.',
    color: 'text-neutral-500',
  },
]

const TABS = [
  { label: 'Dashboard' },
  { label: 'Action Items' },
  { label: 'Insights' },
]

export function VariantB_ModerationDetail() {
  const [activeTab, setActiveTab] = useState('Action Items')
  const [selectedId, setSelectedId] = useState('1')
  const selected = queue.find((q) => q.id === selectedId)!

  return (
    <ShellLayout
      title="Story Recap & Moderation"
      subtitle="Review user-generated travel journals, manage media assets, and monitor optimization logs."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* LEFT: Queue list */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <h2 className="font-serif text-base font-semibold text-neutral-800">Queue</h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
              {queue.length} Pending
            </span>
          </div>
          <ul className="divide-y divide-neutral-100">
            {queue.map((item) => {
              const isActive = item.id === selectedId
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setSelectedId(item.id)}
                    className={`flex w-full items-stretch gap-3 p-3 text-left transition-colors ${
                      isActive
                        ? 'bg-amber-50/60'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div
                      className={`w-1 self-stretch rounded ${
                        isActive ? 'bg-amber-500' : 'bg-transparent'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                          {item.handle}
                        </div>
                        <div className="text-[10px] text-neutral-400">{item.timeAgo}</div>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] font-medium text-neutral-700">
                        {item.destination}
                      </div>
                      <div className="mt-1 line-clamp-2 text-[11px] text-neutral-500">
                        {item.caption}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* RIGHT: Review card */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm">
          {/* Media preview */}
          <div className={`relative h-64 w-full bg-gradient-to-br ${selected.gradient}`}>
            <div className="absolute inset-0 flex items-end p-5">
              <span className="rounded-md bg-black/30 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur">
                {selected.handle}
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-semibold text-neutral-800">
                  {selected.destination}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" weight="duotone" /> Kenya
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" weight="duotone" /> {selected.timeAgo}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Wildlife', 'Conservation', 'Eco-tourism', 'Africa'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[10px] font-medium text-neutral-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-neutral-700">
              {selected.caption}
            </p>

            {/* AI insights */}
            <div className="mt-6">
              <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                <Sparkle className="h-3 w-3" weight="duotone" /> AI Insights
              </h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {aiInsights.map((insight) => (
                  <div
                    key={insight.label}
                    className="rounded-lg border border-neutral-200/60 bg-neutral-50/60 p-3"
                  >
                    <div className={`mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${insight.color}`}>
                      <insight.icon className="h-3 w-3" weight="duotone" />
                      {insight.label}
                    </div>
                    <p className="text-xs leading-relaxed text-neutral-600">{insight.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-5">
              <button className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
                Approve & Publish
              </button>
              <button className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-600">
                Request Changes
              </button>
              <button className="flex-1 rounded-full bg-red-500 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-600">
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </ShellLayout>
  )
}
