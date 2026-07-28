import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useApi } from '#/lib/api/use-api'
import {
  CheckCircle, XCircle, Flag, Image as ImageIcon,
  Video, FilePdf, Plus, Trash, FloppyDisk, X,
} from '@phosphor-icons/react'
import { FormInput, FormSelect, FormTextarea } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { MediaUpload } from '#/components/shared/MediaUpload'
import { mediaAssetSchema } from '#/lib/schemas/media.schema'
import type { StoryItem } from '#/lib/api/stories'
import type { MediaAsset } from '#/lib/api/media'
import { safeItems } from '#/lib/api/helpers'

interface ModItem extends StoryItem {
  reports: { reason: string; reporter: string; date: string }[]
  exifStripped: boolean
  mediaType: string
  contentWarning?: string
}
interface AssetItem extends MediaAsset {
  url?: string
  thumbnailUrl?: string
  rightsStatus?: string
  tags?: string[]
  uploadedBy?: string
  fileSize?: number
}

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
  const api = useApi()
  const [mod, setMod] = useState<ModItem[]>([])
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [tab, setTab] = useState<'queue' | 'library'>('queue')
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
    const [mr, lr] = await Promise.all([
      api.stories.moderationList(),
      api.media.list(),
    ])
    setMod(safeItems(mr) as ModItem[])
    setAssets(safeItems(lr) as AssetItem[])
  }, [api])

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

  const handleUploadComplete = useCallback(() => {
    toast.success('Asset uploaded')
    loadAll()
    setAssetPanelMode('view')
  }, [loadAll])

  const handleSaveAsset = useCallback(async () => {
    if (!editData || !selectedAssetId) return
    if (!validateAsset()) return
    setSaving(true)
    try {
      await api.media.updateMetadata(selectedAssetId, editData as { caption?: string; altText?: string; credit?: string })
      toast.success('Asset saved')
      await loadAll()
      setSelectedAssetId(null)
      setAssetPanelMode('view')
    } catch {
      toast.error('Failed to save asset')
    } finally {
      setSaving(false)
    }
  }, [editData, selectedAssetId, api, loadAll])

  const handleDeleteAsset = useCallback(async () => {
    if (!selectedAssetId) return
    setDeleting(true)
    try {
      await api.media.remove(selectedAssetId)
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
  }, [selectedAssetId, api, loadAll])

  const handleApprove = useCallback(async (id: string) => {
    await api.stories.moderate(id, 'approve', '')
    toast.success('Story approved')
    await loadAll()
  }, [api, loadAll])

  const handleReject = useCallback(async (id: string) => {
    await api.stories.moderate(id, 'reject', 'Rejected by moderator')
    toast.success('Story rejected')
    await loadAll()
  }, [api, loadAll])

  const handleFlag = useCallback(async (id: string) => {
    if (!flagReason) return
    await api.stories.report(id, flagReason, 'Reported by admin')
    toast.success('Story flagged')
    setFlagModal(null)
    setFlagReason('')
    await loadAll()
  }, [flagReason, api, loadAll])

  const handleRemoveStory = useCallback(async (id: string) => {
    await api.stories.moderate(id, 'reject', 'Removed by admin')
    toast.success('Story removed')
    await loadAll()
  }, [api, loadAll])

  const TABS = [
    { key: 'queue' as const, label: 'Queue', count: mod.filter(m => m.status === 'pending').length },
    { key: 'library' as const, label: 'Media Library', count: assets.length },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">UGC Moderation & Media Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review user-generated travel journals, manage media assets, and monitor optimization logs.</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold ${tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label} <span className="rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px]">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Queue */}
      {tab === 'queue' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-sans text-base font-bold text-foreground">Moderation Queue</h2>
            <div className="flex flex-wrap items-center gap-1">
              {[null, 'pending', 'approved', 'rejected'].map(f => (
                <button key={f ?? 'all'} onClick={() => setModFilter(f)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${modFilter === f ? 'bg-primary text-white' : 'border border-border bg-card text-muted-foreground hover:border-[var(--outline)]'}`}>
                  {f ?? 'All'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {visibleMod.map(item => (
              <div key={item.id} className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
                <div className="flex gap-4 p-4">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[var(--forest)] to-[var(--forest-leaf)] text-white/40">
                    {item.thumbUrl
                      ? <img src={item.thumbUrl} alt={item.caption} className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).hidden = true }} />
                      : item.mediaType === 'video' ? <Video className="h-8 w-8" weight="duotone" /> : <ImageIcon className="h-8 w-8" weight="duotone" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-widest text-primary">{item.creatorHandle}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground">{fmtTime(item.submittedAt)}</span>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground">{item.caption}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(item.tags ?? []).map(t => <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>)}
                      <span className="text-[10px] text-muted-foreground">• {item.location}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <button onClick={() => handleApprove(item.id)} className="flex items-center gap-1 rounded-full bg-[var(--leaf)] px-4 py-1.5 text-xs font-bold text-white"><CheckCircle className="h-3.5 w-3.5" weight="fill" /> Approve</button>
                      <button onClick={() => handleReject(item.id)} className="flex items-center gap-1 rounded-full bg-destructive px-4 py-1.5 text-xs font-bold text-white"><XCircle className="h-3.5 w-3.5" weight="fill" /> Reject</button>
                      <button onClick={() => setFlagModal(item.id)} className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${(item.reports ?? []).length > 0 ? 'bg-[var(--amber-bg)] text-[var(--amber-deep)] border-[var(--amber)]' : 'border-border text-muted-foreground'}`}>
                        <Flag className="h-3.5 w-3.5" weight="duotone" /> {(item.reports ?? []).length > 0 ? `${(item.reports ?? []).length} report${(item.reports ?? []).length > 1 ? 's' : ''}` : 'Flag'}
                      </button>
                      <button onClick={() => handleRemoveStory(item.id)} className="flex items-center gap-1 rounded-full border border-red-200 bg-card px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50"><Trash className="h-3.5 w-3.5" weight="duotone" /> Remove</button>
                    </div>
                    {!item.exifStripped && <div className="mt-2 text-[10px] text-[var(--amber-deep)]">⚠ EXIF data present — manual review required</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media Library */}
      {tab === 'library' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {['All', 'image', 'video', 'pdf', '360'].map((f) => {
              const count = f === 'All' ? assets.length : assets.filter(a => a.type === f).length
              return <span key={f} className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-muted-foreground">{f === 'All' ? 'All' : f} ({count})</span>
            })}
            <span className="ml-auto rounded-full bg-[var(--leaf-bg)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-success-leaf">Cloudflare R2</span>
            <button onClick={handleNewAsset} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm"><Plus className="h-4 w-4" weight="duotone" /> Upload Asset</button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {assets.map(a => (
              <React.Fragment key={a.id}>
                <div onClick={() => handleSelectAsset(a.id)} className={`overflow-hidden rounded-lg border bg-card cursor-pointer ${selectedAssetId === a.id ? 'border-[var(--forest)] ring-2 ring-[var(--forest)]' : 'border-border'}`} style={{ boxShadow: 'var(--card-shadow)' }}>
                  <div className="flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                    {(a.thumbnailUrl ?? a.url)
                      ? <img src={a.thumbnailUrl ?? a.url} alt={a.caption ?? ''} className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).hidden = true }} />
                      : a.type === 'image' ? <ImageIcon className="h-8 w-8 text-muted-foreground" weight="duotone" />
                      : a.type === 'video' ? <Video className="h-8 w-8 text-muted-foreground" weight="duotone" />
                      : <FilePdf className="h-8 w-8 text-muted-foreground" weight="duotone" />}
                  </div>
                  <div className="p-3">
                    <div className="truncate text-sm font-semibold text-foreground">{a.caption}</div>
                    <div className="text-[10px] text-muted-foreground">{a.credit}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-muted-foreground">{a.type}</span>
                      <StatusBadge status={a.rightsStatus ?? 'cleared'} label={a.rightsStatus ?? 'cleared'} />
                    </div>
                  </div>
                </div>
                {selectedAssetId === a.id && assetPanelMode === 'edit' && editData && (
                  <div className="col-span-2 md:col-span-3 rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
                    <h3 className="mb-4 text-sm font-bold text-foreground">Editing: {editData.caption}</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormInput label="Caption" value={editData.caption ?? ''} onChange={v => handleField('caption', v)} error={errors.caption} />
                      <FormInput label="Alt Text" value={editData.altText ?? ''} onChange={v => handleField('altText', v)} />
                      <FormInput label="Credit" value={editData.credit ?? ''} onChange={v => handleField('credit', v)} />
                      <FormSelect label="Type" value={editData.type ?? 'image'} options={['image', 'video', 'pdf', '360', 'audio']} onChange={v => handleField('type', v)} />
                      <FormInput label="URL" value={editData.url ?? ''} onChange={v => handleField('url', v)} />
                      <FormSelect label="Rights Status" value={editData.rightsStatus ?? 'cleared'} options={['cleared', 'pending', 'restricted']} onChange={v => handleField('rightsStatus', v)} />
                    </div>
                    <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                      <button onClick={handleSaveAsset} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                        {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                        Save Changes
                      </button>
                      <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 rounded-full border border-red-300 bg-card px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                        <Trash className="h-4 w-4" weight="duotone" /> Delete
                      </button>
                      <button onClick={() => { setSelectedAssetId(null); setAssetPanelMode('view') }} className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground">
                        <X className="h-4 w-4" weight="duotone" /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
            {assetPanelMode === 'create' && (
              <div className="col-span-2 md:col-span-3 rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
                <h3 className="mb-4 text-sm font-bold text-foreground">Upload Media Asset</h3>
                <MediaUpload
                  label="Choose a file to upload"
                  onComplete={handleUploadComplete}
                  onError={(msg) => toast.error(msg)}
                />
                <div className="mt-4 flex justify-end">
                  <button onClick={() => { setAssetPanelMode('view'); setEditData(null) }}
                    className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground">
                    <X className="h-4 w-4" weight="duotone" /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flag dialog */}
      {flagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6" style={{ boxShadow: '0px 8px 24px rgba(0,0,0,0.12)' }}>
            <h3 className="text-sm font-bold text-foreground">Flag Story</h3>
            <p className="mt-1 text-xs text-muted-foreground">Provide a reason for flagging this story for review.</p>
            <FormTextarea label="Reason" value={flagReason} onChange={setFlagReason} placeholder="e.g. Inappropriate content, copyright violation" />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => { setFlagModal(null); setFlagReason('') }} className="rounded-full border border-border px-4 py-1.5 text-xs font-bold text-muted-foreground">Cancel</button>
              <button onClick={() => handleFlag(flagModal)} disabled={!flagReason} className="rounded-full bg-[var(--amber)] px-4 py-1.5 text-xs font-bold text-primary shadow-sm disabled:opacity-50">Submit Flag</button>
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
