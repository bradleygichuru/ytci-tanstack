import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { api } from '#/lib/api/client'
import {
  CheckCircle, XCircle, ClockAfternoon, Flag, Image as ImageIcon,
  Video, FilePdf, Compass, CloudArrowUp, Code,
} from '@phosphor-icons/react'

interface ModItem { id: string; creatorHandle: string; caption: string; mediaType: string; thumbUrl: string; location: string; tags: string[]; exifStripped: boolean; exifDetails: string; status: string; submittedAt: string; reports: { reason: string }[]; contentWarning?: string }
interface AssetItem { id: string; thumbnailUrl: string; caption: string; credit: string; type: string; status: string; rightsStatus: string; tags: string[]; fileSize: number }
interface LogItem { id: string; timestamp: string; eventType: string; assetName: string; details: string; compressionSavedKB?: number; exifStripped?: boolean }

const statusStyle: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'var(--amber-bg)', text: 'var(--amber-deep)' },
  approved: { bg: 'var(--leaf-bg)', text: 'var(--leaf)' },
  rejected: { bg: 'rgba(186,26,26,0.1)', text: 'var(--error)' },
}

function StatusPill({ status }: { status: string }) {
  const s = statusStyle[status] ?? statusStyle.pending
  return <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: s.bg, color: s.text }}>{status}</span>
}

function fmtTime(d: string) { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }

export const Route = createFileRoute('/_authenticated/media')({ component: MediaPage })

function MediaPage() {
  const [mod, setMod] = useState<ModItem[]>([])
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [logs, setLogs] = useState<LogItem[]>([])
  const [tab, setTab] = useState<'queue' | 'library' | 'logs'>('queue')

  useEffect(() => {
    api.list('media', { cursor: 'moderation' }).then(r => setMod(r.items as ModItem[]))
    api.list('media').then(r => setAssets(r.items as AssetItem[]))
    api.list('media', { cursor: 'logs' }).then(r => setLogs(r.items as LogItem[]))
  }, [])

  const handleApprove = useCallback(async (id: string) => {
    await api.update('media', id, { status: 'approved' })
    api.list('media', { cursor: 'moderation' }).then(r => setMod(r.items as ModItem[]))
  }, [])
  const handleReject = useCallback(async (id: string) => {
    await api.update('media', id, { status: 'rejected', moderatorNote: 'Rejected by moderator' })
    api.list('media', { cursor: 'moderation' }).then(r => setMod(r.items as ModItem[]))
  }, [])

  const TABS = [
    { key: 'queue' as const, label: 'Queue', count: mod.filter(m => m.status === 'pending').length },
    { key: 'library' as const, label: 'Media Library', count: assets.length },
    { key: 'logs' as const, label: 'Optimization Logs', count: logs.length },
  ]

  return (
    <div>
      <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">UGC Moderation & Media Library</h1>
      <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Review user-generated travel journals, manage media assets, and monitor optimization logs.</p>
      <div className="my-4 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold ${tab === t.key ? 'bg-white text-[var(--on-surface)] shadow-sm' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'}`}>
            {t.label} <span className="rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px]">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Queue */}
      {tab === 'queue' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-base font-bold text-[var(--on-surface)]">Moderation Queue</h2>
              <span className="rounded-full bg-[var(--amber-bg)] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[var(--amber-deep)]">{mod.filter(m => m.status === 'pending').length} Pending</span>
            </div>
            <div className="space-y-4">
              {mod.map(item => (
                <div key={item.id} className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
                  <div className="flex gap-4 p-4">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--forest)] to-[var(--forest-leaf)] text-white/40">
                      {item.mediaType === 'video' ? <Video className="h-8 w-8" weight="duotone" /> : <ImageIcon className="h-8 w-8" weight="duotone" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-widest text-[var(--forest)]">{item.creatorHandle}</span>
                          <span className="ml-2 text-[10px] text-[var(--on-surface-variant)]">{fmtTime(item.submittedAt)}</span>
                        </div>
                        <StatusPill status={item.status} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--on-surface)]">{item.caption}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.tags.map(t => <span key={t} className="rounded-full border border-[var(--surface-4)] px-2 py-0.5 text-[10px] text-[var(--on-surface-variant)]">{t}</span>)}
                        <span className="text-[10px] text-[var(--on-surface-variant)]">• {item.location}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <button onClick={() => handleApprove(item.id)} className="flex items-center gap-1 rounded-full bg-[var(--leaf)] px-4 py-1.5 text-xs font-bold text-white"><CheckCircle className="h-3.5 w-3.5" weight="fill" /> Approve</button>
                        <button onClick={() => handleReject(item.id)} className="flex items-center gap-1 rounded-full bg-[var(--error)] px-4 py-1.5 text-xs font-bold text-white"><XCircle className="h-3.5 w-3.5" weight="fill" /> Reject</button>
                        <button className="flex items-center gap-1 rounded-full border border-[var(--surface-4)] px-3 py-1.5 text-xs font-bold text-[var(--on-surface-variant)]"><Flag className="h-3.5 w-3.5" weight="duotone" /> {item.reports.length > 0 ? `${item.reports.length} reports` : 'Flag'}</button>
                      </div>
                      {!item.exifStripped && <div className="mt-2 text-[10px] text-[var(--amber-deep)]">⚠ EXIF data present — manual review required</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="flex items-center justify-between border-b border-[var(--surface-4)] px-5 py-4">
              <h2 className="font-sans text-base font-bold text-[var(--on-surface)]">System Logs</h2>
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--leaf)]" />
            </div>
            <div className="divide-y divide-[var(--surface-4)] text-xs">
              {logs.slice(0, 8).map(l => (
                <div key={l.id} className="px-5 py-3">
                  <div className="text-[10px] text-[var(--on-surface-variant)]">{new Date(l.timestamp).toLocaleTimeString()}</div>
                  <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: l.eventType === 'COMPRESSION' ? 'var(--forest)' : l.eventType === 'EXIF' ? 'var(--leaf)' : l.eventType === 'ERROR' ? 'var(--error)' : 'var(--on-surface-variant)' }}>{l.eventType}</div>
                  <div className="mt-0.5 text-[var(--on-surface-variant)]">{l.assetName} — {l.details.substring(0, 80)}{l.details.length > 80 ? '…' : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Media Library */}
      {tab === 'library' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {['All', 'image', 'video', 'pdf', '360'].map((f, i) => {
              const count = f === 'All' ? assets.length : assets.filter(a => a.type === f).length
              return <span key={f} className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--on-surface-variant)]">{f === 'All' ? 'All' : f} ({count})</span>
            })}
            <span className="ml-auto rounded-full bg-[var(--leaf-bg)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--leaf)]">Cloudflare R2</span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {assets.map(a => (
              <div key={a.id} className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                  {a.type === 'image' ? <ImageIcon className="h-8 w-8 text-[var(--on-surface-variant)]" weight="duotone" />
                    : a.type === 'video' ? <Video className="h-8 w-8 text-[var(--on-surface-variant)]" weight="duotone" />
                    : <FilePdf className="h-8 w-8 text-[var(--on-surface-variant)]" weight="duotone" />}
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-semibold text-[var(--on-surface)]">{a.caption}</div>
                  <div className="text-[10px] text-[var(--on-surface-variant)]">{a.credit}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--on-surface-variant)]">{a.type}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.rightsStatus === 'cleared' ? 'bg-[var(--leaf-bg)] text-[var(--leaf)]' : 'bg-[var(--amber-bg)] text-[var(--amber-deep)]'}`}>{a.rightsStatus}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--surface-4)] bg-white text-[var(--on-surface-variant)] hover:border-[var(--forest)]">
              <div className="text-center"><CloudArrowUp className="mx-auto h-8 w-8" weight="duotone" /><div className="mt-2 text-xs font-semibold">Upload Asset</div></div>
            </div>
          </div>
        </div>
      )}

      {/* Optimization Logs */}
      {tab === 'logs' && (
        <div>
          <div className="mb-4 grid grid-cols-3 gap-4">
            {[
              { label: 'Total Assets', value: assets.length, color: 'var(--forest)' },
              { label: 'Compression Saved', value: `${logs.filter(l => l.eventType === 'COMPRESSION').reduce((a, l) => a + (l.compressionSavedKB ?? 0), 0).toLocaleString()} KB`, color: 'var(--leaf)' },
              { label: 'EXIF Stripped', value: `${logs.filter(l => l.exifStripped).length} / ${logs.filter(l => l.eventType === 'EXIF').length}`, color: 'var(--amber)' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-[var(--surface-4)] bg-white p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">{s.label}</div>
                <div className="mt-1 font-sans text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
            <table className="w-full text-xs">
              <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
                <th className="px-4 py-3">Time</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Details</th>
              </tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-[var(--surface-2)]">
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--on-surface-variant)]">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                        style={{ backgroundColor: l.eventType === 'ERROR' ? 'rgba(186,26,26,0.1)' : l.eventType === 'COMPRESSION' ? 'var(--leaf-bg)' : l.eventType === 'EXIF' ? 'var(--amber-bg)' : 'var(--surface-2)',
                          color: l.eventType === 'ERROR' ? 'var(--error)' : l.eventType === 'COMPRESSION' ? 'var(--leaf)' : l.eventType === 'EXIF' ? 'var(--amber-deep)' : 'var(--on-surface-variant)' }}>
                        {l.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--on-surface)]">{l.assetName}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-[var(--on-surface-variant)]">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
