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
    caption: 'Sharing my trip story with you all — first time in CR, absolute bucket list moment.',
    timeAgo: '2h ago',
    gradient: 'linear-gradient(135deg, #154212 0%, #244100 100%)',
  },
  {
    id: '2',
    handle: '@nomad_jess',
    destination: 'Hidden Cove Discovery',
    caption: 'Possible protected wildlife found in this area. Click to learn more about this protected zone.',
    timeAgo: '4h ago',
    gradient: 'linear-gradient(135deg, #2d5a27 0%, #345a00 100%)',
  },
  {
    id: '3',
    handle: '@trail_runner',
    destination: 'Volcanic Highlands',
    caption: 'Sunrise hike on the active ridge — breathtaking views and an unforgettable day.',
    timeAgo: '6h ago',
    gradient: 'linear-gradient(135deg, #785a00 0%, #fdc002 100%)',
  },
]

const logs = [
  { time: '10:32:00 AM', tag: 'CONTENT PROVENANCE', text: 'Specific_upload.md/.jpg successfully processed via 290. - 4200kb.' },
  { time: '10:31:55 AM', tag: 'CONTENT PROVENANCE', text: 'Asset match found #88A sound asset successfully stored digital #99a reddit.' },
  { time: '10:31:48 AM', tag: 'CMS POST', text: 'Flagger: low confidence excret (D .95). Flag to be sent to Head Mod.' },
  { time: '10:31:36 AM', tag: 'CMS POST', text: 'Particle public from a public red. An alt-text tag generated.' },
  { time: '10:31:32 AM', tag: 'CMS PROCESSING', text: 'Cache: PRO public for converting to webP. Converted 4.0% to webP.' },
  { time: '10:31:24 AM', tag: 'CMS POST', text: 'Original new post 1 (00). Converted 4.0% to webP.' },
]

const globalAssets = [
  { id: 'g1', label: 'Beach cleanup volunteer', tone: 'green' },
  { id: 'g2', label: 'Heritage site visit', tone: 'red' },
  { id: 'g3', label: 'Sunrise safari drive', tone: 'amber' },
  { id: 'g4', label: '', tone: 'upload' },
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
        <div
          className="rounded-lg border border-[var(--surface-4)] bg-white"
          style={{ boxShadow: 'var(--card-shadow)' }}
        >
          <div className="flex items-center justify-between border-b border-[var(--surface-4)] px-5 py-4">
            <h2 className="font-sans text-base font-bold" style={{ color: 'var(--on-surface)' }}>
              Moderation Queue
            </h2>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: 'var(--amber-bg)', color: 'var(--amber-deep)' }}
            >
              3 Pending
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {stories.map((story) => (
              <article
                key={story.id}
                className="flex flex-col overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white transition-shadow hover:shadow-md"
              >
                <div
                  className="relative h-44 w-full"
                  style={{ background: story.gradient }}
                >
                  <div className="absolute inset-0 flex items-end p-4">
                    <div
                      className="rounded px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
                      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
                    >
                      {story.handle}
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--forest)' }}
                  >
                    <MapPin className="h-3 w-3" weight="duotone" /> {story.destination}
                  </div>
                  <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-[var(--on-surface-variant)]">
                    {story.caption}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-[var(--on-surface-variant)]">
                    <Clock className="h-3 w-3" weight="duotone" /> {story.timeAgo}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      className="flex-1 rounded-full py-2 text-xs font-bold text-white transition-colors"
                      style={{ backgroundColor: 'var(--leaf)' }}
                    >
                      Approve
                    </button>
                    <button
                      className="flex-1 rounded-full py-2 text-xs font-bold text-white transition-colors"
                      style={{ backgroundColor: 'var(--error)' }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* RIGHT: System Logs card */}
        <div
          className="rounded-lg border border-[var(--surface-4)] bg-white"
          style={{ boxShadow: 'var(--card-shadow)' }}
        >
          <div className="flex items-center justify-between border-b border-[var(--surface-4)] px-5 py-4">
            <h2 className="font-sans text-base font-bold" style={{ color: 'var(--on-surface)' }}>
              System Logs
            </h2>
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'var(--leaf)' }} />
          </div>
          <ul className="divide-y divide-[var(--surface-4)] text-xs">
            {logs.map((log, i) => (
              <li key={i} className="px-5 py-3">
                <div className="text-[10px] text-[var(--on-surface-variant)]">{log.time}</div>
                <div
                  className="mt-0.5 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--forest)' }}
                >
                  {log.tag}
                </div>
                <div className="mt-1 leading-relaxed text-[var(--on-surface-variant)]">{log.text}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* BOTTOM: Global Assets */}
      <div
        className="mt-8 rounded-lg border border-[var(--surface-4)] bg-white"
        style={{ boxShadow: 'var(--card-shadow)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--surface-4)] px-5 py-4">
          <h2 className="font-sans text-base font-bold" style={{ color: 'var(--on-surface)' }}>
            Global Assets
          </h2>
          <span
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{ backgroundColor: 'var(--leaf-bg)', color: 'var(--leaf)' }}
          >
            Cloudflare R2
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
          {globalAssets.map((asset) => (
            <div
              key={asset.id}
              className="flex h-32 flex-col items-center justify-center overflow-hidden rounded-lg border border-[var(--surface-4)] bg-[var(--surface-2)] text-center"
            >
              {asset.tone === 'upload' ? (
                <div className="flex flex-col items-center gap-1 text-[var(--on-surface-variant)]">
                  <CloudArrowUp className="h-6 w-6" weight="duotone" />
                  <span className="text-[10px] font-semibold">Upload Asset</span>
                </div>
              ) : (
                <>
                  <div
                    className="mb-1 flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'var(--leaf-bg)' }}
                  >
                    <ImageIcon className="h-4 w-4" style={{ color: 'var(--leaf)' }} weight="duotone" />
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--on-surface)]">{asset.label}</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </ShellLayout>
  )
}
