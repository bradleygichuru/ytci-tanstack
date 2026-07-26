import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState, useCallback } from 'react'
import { api } from '#/lib/api/client'
import { toast } from 'sonner'
import {
  CheckCircle, XCircle, Flag, Image as ImageIcon,
  Video, FilePdf, CloudArrowUp, Eye, Plus, Trash, PencilSimple, FloppyDisk, X,
} from '@phosphor-icons/react'
import { FormInput, FormSelect, FormTextarea } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { mediaAssetSchema } from '#/lib/schemas/media.schema'

interface ModItem { id: string; storyId: string; creatorHandle: string; caption: string; mediaType: string; thumbUrl: string; location: string; tags: string[]; exifStripped: boolean; exifDetails: string; status: string; submittedAt: string; reports: { reason: string; reporter: string; date: string }[]; contentWarning?: string }
interface AssetItem { id: string; url: string; thumbnailUrl: string; altText: string; caption: string; credit: string; type: string; status: string; fileSize: number; rightsStatus: string; tags: string[]; uploadedBy: string }
interface LogItem { id: string; timestamp: string; eventType: string; assetName: string; details: string; compressionSavedKB?: number; exifStripped?: boolean }

function fmtTime(d: string) { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }

export const Route = createFileRoute('/_authenticated/media')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'media', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: MediaPage })

function emptyAsset(): Partial<AssetItem> {
  return { caption: '', altText: '', credit: '', type: 'image', url: '', rightsStatus: 'cleared' }
}

function MediaPage() {
  const [mod, setMod] = useState<ModItem[]>([])
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [logs, setLogs] = useState<LogItem[]>([])
  const [tab, setTab] = useState<'queue' | 'library' | 'logs'>('queue')
  const [modFilter, setModFilter] = useState<string | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<AssetItem> | null>(null)
  const [assetPanelMode, setAssetPanelMode] = useState<'view' | 'edit' | 'create'>('view')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [flagModal, setFlagModal] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState('')

  const loadAll = useCallback(async () => {
    const [mr, ar, lr] = await Promise.all([
      api.list('media', { cursor: 'moderation' }),
      api.list('media'),
      api.list('media', { cursor: 'logs' }),
    ])
    setMod(mr.items as ModItem[])
    setAssets(ar.items as AssetItem[])
    setLogs(lr.items as LogItem[])
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const visibleMod = modFilter
    ? mod.filter(m => m.status === modFilter)
    : mod

  const handleSelectAsset = useCallback((id: string) => {
    if (selectedAssetId === id) { setSelectedAssetId(null); return }
    setSelectedAssetId(id)
    setAssetPanelMode('edit')
    const a = assets.find(a => a.id === id)
    if (a) setEditData({ ...a })
    setErrors({})
  }, [selectedAssetId, assets])

  const handleNewAsset = useCallback(() => {
    setSelectedAssetId(null)
    setAssetPanelMode('create')
    setEditData(emptyAsset())
    setErrors({})
  }, [])

  const handleField = (field: string, value: unknown) => {
    setEditData(prev => prev ? { ...prev, [field]: value } : prev)
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validateAsset = (): boolean => {
    if (!editData) return false
    const result = mediaAssetSchema.safeParse(editData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = issue.message
      }
      setErrors(fieldErrors)
      return false
    }
    setErrors({})
    return true
  }

  const handleSaveAsset = useCallback(async () => {
    if (!editData) return
    if (!validateAsset()) return
    setSaving(true)
    try {
      if (assetPanelMode === 'create') {
        await api.create('media', editData)
        toast.success('Asset created')
      } else if (selectedAssetId) {
        await api.update('media', selectedAssetId, editData)
        toast.success('Asset saved')
      }
      await loadAll()
      setSelectedAssetId(null)
      setAssetPanelMode('view')
    } catch {
      toast.error('Failed to save asset')
    } finally {
      setSaving(false)
    }
  }, [editData, selectedAssetId, assetPanelMode, loadAll])

  const handleDeleteAsset = useCallback(async () => {
    if (!selectedAssetId) return
    setDeleting(true)
    try {
      await api.remove('media', selectedAssetId)
      toast.success('Asset deleted')
      setShowDelete(false)
      setSelectedAssetId(null)
      setAssetPanelMode('view')
      await loadAll()
    } catch {
      toast.error('Failed to delete asset')
    } finally {
      setDeleting(false)
    }
  }, [selectedAssetId, loadAll])

  const handleApprove = useCallback(async (id: string) => {
    await api.update('media', id, { status: 'approved' })
    toast.success('Story approved')
    await loadAll()
  }, [loadAll])

  const handleReject = useCallback(async (id: string) => {
    await api.update('media', id, { status: 'rejected', moderatorNote: 'Rejected by moderator' })
    toast.success('Story rejected')
    await loadAll()
  }, [loadAll])

  const handleFlag = useCallback(async (id: string) => {
    if (!flagReason) return
    await api.update('media', id, {
      reports: [{ reason: flagReason, reporter: 'admin@example.com', date: new Date().toISOString() }],
    })
    toast.success('Story flagged')
    setFlagModal(null)
    setFlagReason('')
    await loadAll()
  }, [flagReason, loadAll])

  const handleRemoveStory = useCallback(async (id: string) => {
    await api.remove('media', id)
    toast.success('Story removed')
    await loadAll()
  }, [loadAll])

  const TABS = [
    { key: 'queue' as const, label: 'Queue', count: mod.filter(m => m.status === 'pending').length },
    { key: 'library' as const, label: 'Media Library', count: assets.length },
    { key: 'logs' as const, label: 'Optimization Logs', count: logs.length },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">UGC Moderation & Media Library</h1>
        <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Review user-generated travel journals, manage media assets, and monitor optimization logs.</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-sans text-base font-bold text-[var(--on-surface)]">Moderation Queue</h2>
              <div className="flex flex-wrap items-center gap-1">
                {[null, 'pending', 'approved', 'rejected'].map(f => (
                  <button key={f ?? 'all'} onClick={() => setModFilter(f)}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${modFilter === f ? 'bg-[var(--forest)] text-white' : 'border border-[var(--surface-4)] bg-white text-[var(--on-surface-variant)] hover:border-[var(--outline)]'}`}>
                    {f ?? 'All'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {visibleMod.map(item => (
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
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--on-surface)]">{item.caption}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.tags.map(t => <span key={t} className="rounded-full border border-[var(--surface-4)] px-2 py-0.5 text-[10px] text-[var(--on-surface-variant)]">{t}</span>)}
                        <span className="text-[10px] text-[var(--on-surface-variant)]">• {item.location}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <button onClick={() => handleApprove(item.id)} className="flex items-center gap-1 rounded-full bg-[var(--leaf)] px-4 py-1.5 text-xs font-bold text-white"><CheckCircle className="h-3.5 w-3.5" weight="fill" /> Approve</button>
                        <button onClick={() => handleReject(item.id)} className="flex items-center gap-1 rounded-full bg-[var(--error)] px-4 py-1.5 text-xs font-bold text-white"><XCircle className="h-3.5 w-3.5" weight="fill" /> Reject</button>
                        <button onClick={() => setFlagModal(item.id)} className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${item.reports.length > 0 ? 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]' : 'border-[var(--surface-4)] text-[var(--on-surface-variant)]'}`}>
                          <Flag className="h-3.5 w-3.5" weight="duotone" /> {item.reports.length > 0 ? `${item.reports.length} report${item.reports.length > 1 ? 's' : ''}` : 'Flag'}
                        </button>
                        <button onClick={() => handleRemoveStory(item.id)} className="flex items-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50"><Trash className="h-3.5 w-3.5" weight="duotone" /> Remove</button>
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
            <button onClick={handleNewAsset} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white shadow-sm"><Plus className="h-4 w-4" weight="duotone" /> Upload Asset</button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {assets.map(a => (
              <React.Fragment key={a.id}>
                <div onClick={() => handleSelectAsset(a.id)} className={`overflow-hidden rounded-lg border bg-white cursor-pointer ${selectedAssetId === a.id ? 'border-[var(--forest)] ring-2 ring-[var(--forest)]' : 'border-[var(--surface-4)]'}`} style={{ boxShadow: 'var(--card-shadow)' }}>
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
                      <StatusBadge status={a.rightsStatus} label={a.rightsStatus} />
                    </div>
                  </div>
                </div>
                {selectedAssetId === a.id && assetPanelMode === 'edit' && editData && (
                  <div className="col-span-2 md:col-span-3 rounded-lg border border-[var(--surface-4)] bg-white p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
                    <h3 className="mb-4 text-sm font-bold text-[var(--on-surface)]">Editing: {editData.caption}</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormInput label="Caption" value={editData.caption ?? ''} onChange={v => handleField('caption', v)} error={errors.caption} />
                      <FormInput label="Alt Text" value={editData.altText ?? ''} onChange={v => handleField('altText', v)} />
                      <FormInput label="Credit" value={editData.credit ?? ''} onChange={v => handleField('credit', v)} />
                      <FormSelect label="Type" value={editData.type ?? 'image'} options={['image', 'video', 'pdf', '360', 'audio']} onChange={v => handleField('type', v)} />
                      <FormInput label="URL" value={editData.url ?? ''} onChange={v => handleField('url', v)} />
                      <FormSelect label="Rights Status" value={editData.rightsStatus ?? 'cleared'} options={['cleared', 'pending', 'restricted']} onChange={v => handleField('rightsStatus', v)} />
                    </div>
                    <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                      <button onClick={handleSaveAsset} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                        {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                        Save Changes
                      </button>
                      <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                        <Trash className="h-4 w-4" weight="duotone" /> Delete
                      </button>
                      <button onClick={() => { setSelectedAssetId(null); setAssetPanelMode('view') }} className="flex items-center gap-1.5 rounded-full border border-[var(--surface-4)] px-5 py-2 text-xs font-bold text-[var(--on-surface-variant)]">
                        <X className="h-4 w-4" weight="duotone" /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
            {assetPanelMode === 'create' && editData && (
              <div className="col-span-2 md:col-span-3 rounded-lg border border-[var(--surface-4)] bg-white p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
                <h3 className="mb-4 text-sm font-bold text-[var(--on-surface)]">New Media Asset</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormInput label="Caption" required value={editData.caption ?? ''} onChange={v => handleField('caption', v)} error={errors.caption} />
                  <FormInput label="Alt Text" value={editData.altText ?? ''} onChange={v => handleField('altText', v)} />
                  <FormInput label="Credit" value={editData.credit ?? ''} onChange={v => handleField('credit', v)} />
                  <FormSelect label="Type" required value={editData.type ?? 'image'} options={['image', 'video', 'pdf', '360', 'audio']} onChange={v => handleField('type', v)} />
                  <FormInput label="URL" value={editData.url ?? ''} onChange={v => handleField('url', v)} />
                  <FormSelect label="Rights Status" value={editData.rightsStatus ?? 'cleared'} options={['cleared', 'pending', 'restricted']} onChange={v => handleField('rightsStatus', v)} />
                </div>
                <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                  <button onClick={handleSaveAsset} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                    {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                    Create Asset
                  </button>
                  <button onClick={() => { setSelectedAssetId(null); setAssetPanelMode('view'); setEditData(null) }} className="flex items-center gap-1.5 rounded-full border border-[var(--surface-4)] px-5 py-2 text-xs font-bold text-[var(--on-surface-variant)]">
                    <X className="h-4 w-4" weight="duotone" /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs */}
      {tab === 'logs' && (
        <div>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-xs">
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
        </div>
      )}

      {/* Flag dialog */}
      {flagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border border-[var(--surface-4)] bg-white p-6" style={{ boxShadow: '0px 8px 24px rgba(0,0,0,0.12)' }}>
            <h3 className="text-sm font-bold text-[var(--on-surface)]">Flag Story</h3>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">Provide a reason for flagging this story for review.</p>
            <FormTextarea label="Reason" value={flagReason} onChange={setFlagReason} placeholder="e.g. Inappropriate content, copyright violation" />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => { setFlagModal(null); setFlagReason('') }} className="rounded-full border border-[var(--surface-4)] px-4 py-1.5 text-xs font-bold text-[var(--on-surface-variant)]">Cancel</button>
              <button onClick={() => handleFlag(flagModal)} disabled={!flagReason} className="rounded-full bg-[var(--amber)] px-4 py-1.5 text-xs font-bold text-[var(--forest)] shadow-sm disabled:opacity-50">Submit Flag</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Media Asset"
        description="Are you sure you want to delete this asset? This cannot be undone."
        onConfirm={handleDeleteAsset}
        loading={deleting}
      />
    </div>
  )
}
