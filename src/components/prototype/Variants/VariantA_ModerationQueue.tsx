// THROWAWAY — UI prototype for ticket #9.
// Lives on branch prototype/shell-design. Throw away when verdict is captured.
// Variant A — card-feed pattern (matches Stitch "Story Recap & Moderation" Insights tab view)

import { useState } from 'react'
import {
  MapPin,
  Clock,
  Image as ImageIcon,
  CloudArrowUp,
} from '@phosphor-icons/react'
import { ShellLayout } from '../ShellLayout'

const stories = [
  {
    id: '1',
    handle: '@eco_traveler',
    destination: 'Costa Rica Canopy Tour',
    caption: 'Sharing my trip story with you all — First time in CR, absolute bucket list moment.',
    timeAgo: '2h ago',
    gradient: 'from-emerald-700 via-emerald-800 to-emerald-950',
  },
  {
    id: '2',
    handle: '@nomad_jess',
    destination: 'Hidden Cove Discovery',
    caption: 'Possible protected wildlife found in this area. Click to learn more about this protected zone.',
    timeAgo: '4h ago',
    gradient: 'from-sky-700 via-sky-800 to-slate-900',
  },
  {
    id: '3',
    handle: '@trail_runner',
    destination: 'Volcanic Highlands',
    caption: 'Sunrise hike on the active ridge — breathtaking views and an unforgettable day.',
    timeAgo: '6h ago',
    gradient: 'from-orange-500 via-rose-600 to-purple-900',
  },
]

const logs = [
  { time: '10:32:00 AM', tag: 'CONTENT PROVENANCE', text: 'Specific_upload.md/.jpg successfully processed via 290. - 4200kb.' },
  { time: '10:31:55 AM', tag: 'CONTENT PROVENANCE', text: 'Asset match found #88A sound asset successfully stored digital #99a reddit.' },
  { time: '10:31:48 AM', tag: 'CMS POST', text: 'Flagger: low confidence excret (D (.95). Flag to be sent to Head Mod.' },
  { time: '10:31:36 AM', tag: 'CMS POST', text: 'Particle public from a public red. An alt-text tag generated.' },
  { time: '10:31:32 AM', tag: 'CMS PROCESSING', text: 'Cache: PRO public for converting to webP. Converted 4.0% to webP.' },
  { time: '10:31:24 AM', tag: 'CMS POST', text: 'Original new post 1 (00). Converted 4.0% to webP.' },
]

const globalAssets = [
  { id: 'g1', label: 'Beach cleanup volunteer' },
  { id: 'g2', label: 'Heritage site visit' },
  { id: 'g3', label: 'Sunrise safari drive' },
  { id: 'g4', label: '' },
]

const TABS = [
  { label: 'Dashboard' },
  { label: 'Action Items' },
  { label: 'Insights' },
]

export function VariantA_ModerationQueue() {
  const [activeTab, setActiveTab] = useState('Insights')

  return (
    <ShellLayout
      title="Story Recap & Moderation"
      subtitle="Review user-generated travel journals, manage media assets, and monitor optimization logs."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        {/* LEFT: Moderation Queue card */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
            <h2 className="font-serif text-lg font-semibold text-neutral-800">Moderation Queue</h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              3 Pending
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {stories.map((story) => (
              <article
                key={story.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200/60 bg-white"
              >
                <div
                  className={`relative h-44 w-full bg-gradient-to-br ${story.gradient}`}
                >
                  <div className="absolute inset-0 flex items-end p-4">
                    <div className="rounded-md bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur">
                      {story.handle}
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                    <MapPin className="h-3 w-3" weight="duotone" /> {story.destination}
                  </div>
                  <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-neutral-600">
                    {story.caption}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-neutral-400">
                    <Clock className="h-3 w-3" weight="duotone" /> {story.timeAgo}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 rounded-full bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                      Approve
                    </button>
                    <button className="flex-1 rounded-full bg-red-500 py-2 text-xs font-semibold text-white hover:bg-red-600">
                      Reject
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* RIGHT: System Logs card */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <h2 className="font-serif text-base font-semibold text-neutral-800">System Logs</h2>
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          </div>
          <ul className="divide-y divide-neutral-100 text-xs">
            {logs.map((log, i) => (
              <li key={i} className="px-5 py-3">
                <div className="text-[10px] text-neutral-400">{log.time}</div>
                <div className="mt-0.5 font-bold uppercase tracking-wider text-emerald-800">
                  {log.tag}
                </div>
                <div className="mt-1 leading-relaxed text-neutral-600">{log.text}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* BOTTOM: Global Assets */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <h2 className="font-serif text-lg font-semibold text-neutral-800">Global Assets</h2>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
            Cloudflare R2
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
          {globalAssets.map((asset) => (
            <div
              key={asset.id}
              className="flex h-32 flex-col items-center justify-center overflow-hidden rounded-xl border border-neutral-200/60 bg-gradient-to-br from-neutral-100 to-neutral-50 text-center"
            >
              {asset.label ? (
                <>
                  <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                    <ImageIcon className="h-4 w-4 text-emerald-700" weight="duotone" />
                  </div>
                  <div className="text-[10px] font-medium text-neutral-600">{asset.label}</div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-neutral-400">
                  <CloudArrowUp className="h-6 w-6" weight="duotone" />
                  <span className="text-[10px]">Upload Asset</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ShellLayout>
  )
}
