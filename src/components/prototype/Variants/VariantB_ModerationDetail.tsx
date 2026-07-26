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
    gradient: 'linear-gradient(135deg, #154212 0%, #244100 100%)',
  },
  {
    id: '2',
    handle: '@nomad_jess',
    destination: 'Hidden Cove Discovery',
    caption: 'Possible protected wildlife found in this area.',
    timeAgo: '4h ago',
    gradient: 'linear-gradient(135deg, #2d5a27 0%, #345a00 100%)',
  },
  {
    id: '3',
    handle: '@trail_runner',
    destination: 'Volcanic Highlands',
    caption: 'Sunrise hike on the active ridge — breathtaking.',
    timeAgo: '6h ago',
    gradient: 'linear-gradient(135deg, #785a00 0%, #fdc002 100%)',
  },
  {
    id: '4',
    handle: '@safari_kenya',
    destination: 'Maasai Mara Migration',
    caption: 'Wildebeest crossing at dawn — full herd in motion.',
    timeAgo: '8h ago',
    gradient: 'linear-gradient(135deg, #ba1a1a 0%, #fdc002 100%)',
  },
]

const aiInsights = [
  {
    icon: ShieldCheck,
    label: 'Auto-flagged',
    text: 'EXIF location data stripped successfully. Wildlife coordinates removed.',
    color: 'var(--leaf)',
    bg: 'var(--leaf-bg)',
  },
  {
    icon: Path,
    label: 'Similar past',
    text: 'A similar story from @eco_traveler was approved 2 days ago.',
    color: 'var(--forest)',
    bg: 'rgba(21, 66, 18, 0.10)',
  },
  {
    icon: Sparkle,
    label: 'Caption quality',
    text: 'On-brand. No policy flags detected. Alt text suggested for 2 of 5 images.',
    color: 'var(--amber-deep)',
    bg: 'var(--amber-bg)',
  },
  {
    icon: IdentificationCard,
    label: 'Reporter signal',
    text: 'No active reports against this creator. Account age 14 months.',
    color: 'var(--on-surface-variant)',
    bg: 'var(--surface-2)',
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* LEFT: Queue list */}
        <div
          className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white"
          style={{ boxShadow: 'var(--card-shadow)' }}
        >
          <div className="flex items-center justify-between border-b border-[var(--surface-4)] px-5 py-4">
            <h2 className="font-sans text-base font-bold" style={{ color: 'var(--on-surface)' }}>
              Queue
            </h2>
            <span
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber-deep)' }}
            >
              {queue.length} Pending
            </span>
          </div>
          <ul className="divide-y divide-[var(--surface-4)]">
            {queue.map((item) => {
              const isActive = item.id === selectedId
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setSelectedId(item.id)}
                    className={`flex w-full items-stretch gap-3 p-3 text-left transition-colors ${
                      isActive ? '' : 'hover:bg-[var(--surface-2)]'
                    }`}
                    style={isActive ? { backgroundColor: 'var(--amber-bg)' } : undefined}
                  >
                    <div
                      className="w-1 self-stretch rounded"
                      style={
                        isActive
                          ? { backgroundColor: 'var(--amber)' }
                          : { backgroundColor: 'transparent' }
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div
                          className="text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: 'var(--forest)' }}
                        >
                          {item.handle}
                        </div>
                        <div className="text-[10px] text-[var(--on-surface-variant)]">{item.timeAgo}</div>
                      </div>
                      <div className="mt-0.5 truncate text-xs font-semibold" style={{ color: 'var(--on-surface)' }}>
                        {item.destination}
                      </div>
                      <div className="mt-1 line-clamp-2 text-[11px] text-[var(--on-surface-variant)]">
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
        <div
          className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white"
          style={{ boxShadow: 'var(--card-shadow)' }}
        >
          {/* Media preview */}
          <div className="relative h-72 w-full" style={{ background: selected.gradient }}>
            <div className="absolute inset-0 flex items-end p-6">
              <span
                className="rounded px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-white"
                style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
              >
                {selected.handle}
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-sans text-2xl font-bold" style={{ color: 'var(--on-surface)' }}>
                  {selected.destination}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[var(--on-surface-variant)]">
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
                    className="rounded-full border border-[var(--outline-muted)] bg-[var(--surface-2)] px-3 py-1 text-[10px] font-semibold text-[var(--on-surface-variant)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--on-surface)' }}>
              {selected.caption}
            </p>

            {/* AI insights */}
            <div className="mt-7">
              <h3
                className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                <Sparkle className="h-3 w-3" weight="duotone" /> AI Insights
              </h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {aiInsights.map((insight) => (
                  <div
                    key={insight.label}
                    className="rounded-lg border border-[var(--surface-4)] p-4"
                    style={{ backgroundColor: insight.bg }}
                  >
                    <div
                      className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: insight.color }}
                    >
                      <insight.icon className="h-3 w-3" weight="duotone" />
                      {insight.label}
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--on-surface)]">{insight.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-[var(--surface-4)] pt-6">
              <button
                className="flex-1 rounded-full py-3 text-sm font-bold text-white transition-colors"
                style={{ backgroundColor: 'var(--forest)' }}
              >
                Approve & Publish
              </button>
              <button
                className="flex-1 rounded-full py-3 text-sm font-bold transition-colors"
                style={{ backgroundColor: 'var(--amber)', color: 'var(--forest-deep)' }}
              >
                Request Changes
              </button>
              <button
                className="flex-1 rounded-full py-3 text-sm font-bold text-white transition-colors"
                style={{ backgroundColor: 'var(--error)' }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </ShellLayout>
  )
}
