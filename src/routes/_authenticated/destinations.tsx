import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useApi } from '#/lib/api/use-api'
import { useCursorPagination } from '#/lib/api/use-cursor-pagination'
import { MediaUpload } from '#/components/shared/MediaUpload'
import { CursorPagination } from '#/components/shared/CursorPagination'
import { DestinationsSkeleton } from '#/components/skeletons/destinations-skeleton'
import {
  MapPin, PencilSimple, MagnifyingGlass,
  CloudArrowDown, X, FloppyDisk, Image as ImageIcon,
  Wheelchair, Plus, Trash,
} from '@phosphor-icons/react'
import type { Destination } from '#/lib/api/destinations'
import { destinationSchema } from '#/lib/schemas/destination.schema'
import { FormInput, FormSelect, FormTextarea } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'

const STATUS = ['draft', 'published', 'archived'] as const
const CATEGORIES = ['wildlife', 'beach', 'adventure', 'culture', 'conservation']

const TABS = [
  { key: 'identity', label: 'Identity' },
  { key: 'location', label: 'Location' },
  { key: 'overview', label: 'Overview' },
  { key: 'experience', label: 'Experience' },
  { key: 'planning', label: 'Planning' },
  { key: 'media', label: 'Media' },
  { key: 'related', label: 'Related' },
  { key: 'governance', label: 'Governance' },
] as const

const formatDate = (d: string) => new Date(d).toLocaleDateString()

export const Route = createFileRoute('/_authenticated/destinations')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'destinations', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: DestinationsPage,
})

function emptyDestination(): Partial<Destination> {
  return {
    name: '', slug: '', county: '', locality: '', category: '', status: 'draft',
    latitude: 0, longitude: 0, mapLabel: '', accessRoute: '', distanceReference: '',
    shortDescription: '', fullDescription: '', significance: '', history: '',
    thingsToDo: '', suitableAudiences: '', duration: '', difficulty: 'easy', seasonality: '',
    indicativeFees: '', openingInfo: '', transportNotes: '', accessibility: [], facilities: '', safetyNotes: '',
    heroImageUrl: '', heroCaption: '', heroCredit: '', heroAlt: '',
    gallery: [], videoUrl: '', videoCaption: '', videoCredit: '',
    nearbyAttractions: '', associatedEvents: '', associatedStories: '', associatedCourses: '', associatedConservation: '',
    source: '', contentOwner: '', verificationStatus: 'pending',
    curationFlags: { trending: false, hiddenGem: false },
  }
}

function DestinationsPage() {
  const api = useApi()
  const [data, setData] = useState<Destination[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create'>('view')
  const [activeTab, setActiveTab] = useState('identity')
  const [editData, setEditData] = useState<Partial<Destination> | null>(null)
  const [filter, setFilter] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [totalDestinations, setTotalDestinations] = useState(0)
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})
  const [mediaIds, setMediaIds] = useState<Record<string, string>>({})
  const mediaUrlCache = useRef<Record<string, string>>({})

  const loadMediaUrl = useCallback(async (objectKey: string) => {
    if (!objectKey) return null
    if (mediaUrlCache.current[objectKey]) return mediaUrlCache.current[objectKey]
    try {
      const resp = await api.media.getUrl(objectKey)
      if (resp?.url) {
        mediaUrlCache.current[objectKey] = resp.url
        setMediaUrls(prev => ({ ...prev, [objectKey]: resp.url! }))
        return resp.url
      }
    } catch {}
    return null
  }, [api])

  useEffect(() => {
    if (!editData) return
    const keys = [editData.heroImageUrl, editData.videoUrl, ...(editData.gallery ?? [])].filter(Boolean) as string[]
    for (const key of keys) {
      if (!mediaUrlCache.current[key]) {
        loadMediaUrl(key)
      }
    }
  }, [editData?.heroImageUrl, editData?.videoUrl, editData?.gallery])

  const { cursor, hasMore, setHasMore, setCursor, handleNext: handleNextCursor, handlePrev: handlePrevCursor } = useCursorPagination()

  const loadList = useCallback(async (c?: string | null) => {
    setLoading(true)
    try {
      const r = await api.destinations.list(c ? { cursor: c } : undefined)
      setData(r.items)
      setHasMore(r.hasMore)
      setCursor(r.nextCursor)
      setTotalDestinations(prev => Math.max(prev, r.items.length))
    } catch {
      toast.error('Failed to load destinations')
      if (!data) setData([])
    } finally {
      setLoading(false)
    }
  }, [api])

  const handleNext = useCallback(() => {
    handleNextCursor((c) => { loadList(c); setSelectedId(null) })
  }, [handleNextCursor, loadList])

  const handlePrev = useCallback(() => {
    handlePrevCursor((c) => { loadList(c); setSelectedId(null) })
  }, [handlePrevCursor, loadList])

  useEffect(() => { loadList() }, [loadList])

  const selected = data?.find(d => d.id === selectedId) ?? null

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id)
    setPanelMode('edit')
    setActiveTab('identity')
    const dest = data?.find(d => d.id === id)
    setEditData(dest ? { ...dest } : null)
    setErrors({})
  }, [selectedId, data])

  const handleNew = useCallback(() => {
    setSelectedId(null)
    setPanelMode('create')
    setActiveTab('identity')
    setEditData(emptyDestination())
    setErrors({})
  }, [])

  const handleField = (field: string, value: unknown) => {
    setEditData(prev => prev ? { ...prev, [field]: value } : prev)
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate = (): boolean => {
    if (!editData) return false
    const result = destinationSchema.safeParse(editData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = issue.message
      }
      setErrors(fieldErrors)
      if (fieldErrors['name']) setActiveTab('identity')
      return false
    }
    setErrors({})
    return true
  }

  const handleSave = useCallback(async () => {
    if (!editData) return
    if (!validate()) return
    setSaving(true)
    try {
      let newId: string | undefined
      if (panelMode === 'create') {
        const created = await api.destinations.create(editData)
        newId = created.id
        const galleryUrls = editData.gallery ?? []
        const heroMid = editData.heroImageUrl ? (mediaIds[editData.heroImageUrl] || editData.heroImageUrl) : undefined
        const videoMid = editData.videoUrl ? (mediaIds[editData.videoUrl] || editData.videoUrl) : undefined
        const galleryMids = galleryUrls.map(u => mediaIds[u] || u)
        if (heroMid || galleryMids.length > 0 || videoMid) {
          try {
            await api.destinations.uploadMedia(newId, {
              heroMediaId: heroMid,
              galleryMediaIds: galleryMids.length > 0 ? galleryMids : undefined,
              videoMediaId: videoMid,
            })
          } catch {
            toast.warning('Destination created but media linking failed')
          }
        }
        toast.success('Destination created')
      } else if (selectedId) {
        await api.destinations.update(selectedId, editData)
        toast.success('Destination saved')
        const galleryUrls = editData.gallery ?? []
        const heroMid = editData.heroImageUrl ? (mediaIds[editData.heroImageUrl] || editData.heroImageUrl) : undefined
        const videoMid = editData.videoUrl ? (mediaIds[editData.videoUrl] || editData.videoUrl) : undefined
        const galleryMids = galleryUrls.map(u => mediaIds[u] || u)
        if (heroMid || galleryMids.length > 0 || videoMid) {
          try {
            await api.destinations.uploadMedia(selectedId, {
              heroMediaId: heroMid,
              galleryMediaIds: galleryMids.length > 0 ? galleryMids : undefined,
              videoMediaId: videoMid,
            })
          } catch {
            toast.warning('Destination saved but media linking failed')
          }
        }
      }
      await loadList()
      if (newId) {
        setPanelMode('edit')
        setSelectedId(newId)
      } else {
        setPanelMode('view')
        setSelectedId(null)
      }
    } catch {
      toast.error('Failed to save destination')
    } finally {
      setSaving(false)
    }
  }, [editData, selectedId, panelMode, api, loadList])

  const handleDelete = useCallback(async () => {
    if (!selectedId) return
    setDeleting(true)
    try {
      await api.destinations.remove(selectedId)
      toast.success('Destination deleted')
      setShowDelete(false)
      setSelectedId(null)
      await loadList()
    } catch {
      toast.error('Failed to delete destination')
    } finally {
      setDeleting(false)
    }
  }, [selectedId, loadList, api])

  const visible = (filter
    ? data?.filter(d => d.status === filter || d.category === filter || d.county === filter)
    : data) ?? []

  const filters = [null, 'published', 'draft', 'archived', 'wildlife', 'beach', 'adventure', 'Narok', 'Kwale', 'Meru']

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">Destination CMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage location profiles, pricing guides, GIS data, and rich media.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" weight="duotone" />
          <input placeholder="Search destinations..." className="h-9 w-56 rounded-md border border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => (
            <button key={f ?? 'all'} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? 'bg-primary text-white' : 'border border-border bg-card text-muted-foreground hover:border-[var(--outline)]'}`}>
              {f ?? 'All'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{visible?.length ?? 0} destinations</span>
          <button onClick={handleNew} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm">
            <Plus className="h-4 w-4" weight="duotone" /> New Destination
          </button>
          <button className="flex items-center gap-1.5 rounded-full border border-primary px-4 py-2 text-xs font-bold text-primary">
            <CloudArrowDown className="h-4 w-4" weight="duotone" /> Bulk Import
          </button>
        </div>
      </div>

      {loading && <DestinationsSkeleton />}

      {!loading && (visible || panelMode === 'create') && (
        <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <th className="px-5 py-3">Name</th><th className="px-5 py-3">County</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Updated</th><th className="w-24 px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(d => (
                <React.Fragment key={d.id}>
                  <tr onClick={() => handleSelect(d.id)}
                    className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${selectedId === d.id ? 'bg-[var(--amber-bg)]' : ''}`}>
                    <td className="px-5 py-3"><span className="font-semibold text-foreground">{d.name}</span></td>
                    <td className="px-5 py-3 text-muted-foreground">{d.county}</td>
                    <td className="px-5 py-3"><span className="rounded-full bg-[var(--leaf-bg)] px-2 py-0.5 text-[10px] font-semibold text-success-leaf">{d.category}</span></td>
                    <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(d.updatedAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <button className="rounded p-1 text-muted-foreground hover:bg-[var(--surface-2)]"><PencilSimple className="h-4 w-4" weight="duotone" /></button>
                    </td>
                  </tr>
                  {selectedId === d.id && editData && (
                    <tr key={`${d.id}-detail`}>
                      <td colSpan={6} className="border-b bg-[var(--surface-2)] p-0">
                        <div className="border-t border-border">
                          <div className="flex gap-1 border-b border-border bg-card px-5 pt-3">
                            {TABS.map(t => (
                              <button key={t.key} onClick={() => setActiveTab(t.key)}
                                className={`px-3 py-2 text-xs font-semibold ${activeTab === t.key ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                {t.label}
                              </button>
                            ))}
                          </div>
                          <div className="bg-card px-6 py-5">
                            {activeTab === 'identity' && (
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormInput label="Name" required value={editData.name ?? ''} onChange={v => handleField('name', v)} error={errors.name} />
                                <FormInput label="Slug" required value={editData.slug ?? ''} onChange={v => handleField('slug', v)} error={errors.slug} />
                                <FormInput label="County" required value={editData.county ?? ''} onChange={v => handleField('county', v)} error={errors.county} />
                                <FormInput label="Locality" value={editData.locality ?? ''} onChange={v => handleField('locality', v)} />
                                <FormSelect label="Category" required value={editData.category ?? ''} options={CATEGORIES} onChange={v => handleField('category', v)} error={errors.category} />
                                <FormSelect label="Status" value={editData.status ?? 'draft'} options={STATUS as unknown as string[]} onChange={v => handleField('status', v)} />
                              </div>
                            )}
                            {activeTab === 'location' && (
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormInput label="Latitude" value={String(editData.latitude ?? 0)} onChange={v => handleField('latitude', Number(v))} />
                                <FormInput label="Longitude" value={String(editData.longitude ?? 0)} onChange={v => handleField('longitude', Number(v))} />
                                <FormInput label="Map Label" value={editData.mapLabel ?? ''} onChange={v => handleField('mapLabel', v)} />
                                <FormInput label="Access Route" value={editData.accessRoute ?? ''} onChange={v => handleField('accessRoute', v)} />
                                <FormInput label="Distance Reference" value={editData.distanceReference ?? ''} onChange={v => handleField('distanceReference', v)} />
                                <div className="md:col-span-2 flex h-48 items-center justify-center rounded-lg border border-dashed border-border bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                                  <div className="text-center">
                                    <MapPin className="mx-auto h-8 w-8 text-muted-foreground" weight="duotone" />
                                    <p className="mt-2 text-xs text-muted-foreground">County boundary map + cluster markers (Leaflet/Mapbox — pending)</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {activeTab === 'overview' && (
                              <div className="space-y-4">
                                <FormTextarea label="Short Description" value={editData.shortDescription ?? ''} onChange={v => handleField('shortDescription', v)} />
                                <FormTextarea label="Full Description" value={editData.fullDescription ?? ''} onChange={v => handleField('fullDescription', v)} />
                                <FormTextarea label="Significance" value={editData.significance ?? ''} onChange={v => handleField('significance', v)} />
                                <FormTextarea label="History" value={editData.history ?? ''} onChange={v => handleField('history', v)} />
                              </div>
                            )}
                            {activeTab === 'experience' && (
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormInput label="Things to Do" value={editData.thingsToDo ?? ''} onChange={v => handleField('thingsToDo', v)} />
                                <FormInput label="Suitable Audiences" value={editData.suitableAudiences ?? ''} onChange={v => handleField('suitableAudiences', v)} />
                                <FormInput label="Duration" value={editData.duration ?? ''} onChange={v => handleField('duration', v)} />
                                <FormSelect label="Difficulty" value={editData.difficulty ?? 'easy'} options={['easy', 'moderate', 'hard']} onChange={v => handleField('difficulty', v)} />
                                <FormInput label="Seasonality" value={editData.seasonality ?? ''} onChange={v => handleField('seasonality', v)} />
                              </div>
                            )}
                            {activeTab === 'planning' && (
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormInput label="Indicative Fees" value={editData.indicativeFees ?? ''} onChange={v => handleField('indicativeFees', v)} />
                                <FormInput label="Opening Info" value={editData.openingInfo ?? ''} onChange={v => handleField('openingInfo', v)} />
                                <FormInput label="Transport Notes" value={editData.transportNotes ?? ''} onChange={v => handleField('transportNotes', v)} />
                                <FormInput label="Facilities" value={editData.facilities ?? ''} onChange={v => handleField('facilities', v)} />
                                <FormInput label="Safety Notes" value={editData.safetyNotes ?? ''} onChange={v => handleField('safetyNotes', v)} />
                                <div className="md:col-span-2">
                                  <label className="mb-1 block text-xs font-semibold text-foreground">Accessibility Tags</label>
                                  <div className="flex flex-wrap gap-2">
                                    {['wheelchair-accessible-lodges', 'guided-tours', 'wheelchair-accessible-hotels', 'beach-wheelchair', 'guide-required'].map(tag => (
                                      <label key={tag} className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium cursor-pointer ${(editData.accessibility ?? []).includes(tag) ? 'bg-[var(--leaf-bg)] text-success-leaf border-[var(--leaf)]' : 'border-border text-muted-foreground'}`}>
                                        <input type="checkbox" checked={(editData.accessibility ?? []).includes(tag)} onChange={() => {
                                          const current = editData.accessibility ?? []
                                          handleField('accessibility', current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag])
                                        }} className="sr-only" />
                                        <Wheelchair className="h-3.5 w-3.5" weight="duotone" /> {tag.replace(/-/g, ' ')}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div className="md:col-span-2 mt-2 rounded-lg bg-[var(--surface-2)] p-3 text-xs text-muted-foreground">
                                  <span className="font-semibold text-primary">No Book Now / Checkout</span> — per spec §5.5 and §13 boundary.
                                </div>
                              </div>
                            )}
                            {activeTab === 'media' && (
                              <div className="space-y-6">
                                <div>
                                  <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Hero Image</h4>
                                  <MediaUpload
                                    label={editData.heroImageUrl ? 'Replace hero image' : 'Upload hero image'}
                                    onComplete={(result) => {
                                      handleField('heroImageUrl', result.objectKey)
                                      if (result.id) setMediaIds(prev => ({ ...prev, [result.objectKey]: result.id }))
                                      if (result.url) {
                                        mediaUrlCache.current[result.objectKey] = result.url
                                        setMediaUrls(prev => ({ ...prev, [result.objectKey]: result.url! }))
                                      }
                                      toast.success('Hero image uploaded')
                                    }}
                                    onError={(msg) => toast.error(msg)}
                                  />
                                  {editData.heroImageUrl && mediaUrls[editData.heroImageUrl] && (
                                    <div className="mt-2 overflow-hidden rounded-lg border border-border">
                                      <img src={mediaUrls[editData.heroImageUrl]} alt={editData.heroAlt ?? ''} className="h-40 w-full object-cover" />
                                    </div>
                                  )}
                                  {editData.heroImageUrl && (
                                    <p className="mt-1 text-xs text-success-leaf truncate">{editData.heroImageUrl}</p>
                                  )}
                                  <div className="mt-2 grid grid-cols-3 gap-3">
                                    <FormInput label="Caption" value={editData.heroCaption ?? ''} onChange={v => handleField('heroCaption', v)} />
                                    <FormInput label="Credit" value={editData.heroCredit ?? ''} onChange={v => handleField('heroCredit', v)} />
                                    <FormInput label="Alt Text" value={editData.heroAlt ?? ''} onChange={v => handleField('heroAlt', v)} />
                                  </div>
                                </div>

                                <div>
                                  <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Gallery Images</h4>
                                  <MediaUpload
                                    label="Add gallery image"
                                    onComplete={(result) => {
                                      const current = editData.gallery ?? []
                                      handleField('gallery', [...current, result.objectKey])
                                      if (result.id) setMediaIds(prev => ({ ...prev, [result.objectKey]: result.id }))
                                      if (result.url) {
                                        mediaUrlCache.current[result.objectKey] = result.url
                                        setMediaUrls(prev => ({ ...prev, [result.objectKey]: result.url! }))
                                      }
                                      toast.success('Gallery image added')
                                    }}
                                    onError={(msg) => toast.error(msg)}
                                  />
                                  {editData.gallery && editData.gallery.length > 0 && (
                                    <div className="mt-2 grid grid-cols-3 gap-3">
                                      {editData.gallery.map((url, i) => (
                                        <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
                                          {mediaUrls[url] ? (
                                            <img src={mediaUrls[url]} alt="" className="h-24 w-full object-cover" />
                                          ) : (
                                            <div className="flex h-24 items-center justify-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                                              <ImageIcon className="h-6 w-6 text-muted-foreground" weight="duotone" />
                                            </div>
                                          )}
                                          <div className="flex items-center justify-between px-2 py-1">
                                            <span className="text-[10px] text-muted-foreground">Image {i + 1}</span>
                                            <button onClick={() => handleField('gallery', editData.gallery?.filter((_, j) => j !== i))}
                                              className="text-destructive hover:text-red-700 text-xs">×</button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Video</h4>
                                  <MediaUpload
                                    label={editData.videoUrl ? 'Replace video' : 'Upload video'}
                                    onComplete={(result) => {
                                      handleField('videoUrl', result.objectKey)
                                      if (result.id) setMediaIds(prev => ({ ...prev, [result.objectKey]: result.id }))
                                      if (result.thumbnailUrl) {
                                        mediaUrlCache.current[result.objectKey] = result.thumbnailUrl
                                        setMediaUrls(prev => ({ ...prev, [result.objectKey]: result.thumbnailUrl! }))
                                      }
                                      toast.success('Video uploaded')
                                    }}
                                    onError={(msg) => toast.error(msg)}
                                  />
                                  {editData.videoUrl && (
                                    <div className="mt-2 flex items-center gap-2">
                                      {mediaUrls[editData.videoUrl] ? (
                                        <div className="h-16 w-24 overflow-hidden rounded-lg border border-border">
                                          <img src={mediaUrls[editData.videoUrl]} alt="" className="h-full w-full object-cover" />
                                        </div>
                                      ) : null}
                                      <span className="text-xs text-success-leaf truncate">{editData.videoUrl}</span>
                                      <button onClick={() => handleField('videoUrl', '')} className="text-destructive hover:text-red-700 text-xs">×</button>
                                    </div>
                                  )}
                                  <div className="mt-2 grid grid-cols-2 gap-3">
                                    <FormInput label="Video Caption" value={editData.videoCaption ?? ''} onChange={v => handleField('videoCaption', v)} />
                                    <FormInput label="Video Credit" value={editData.videoCredit ?? ''} onChange={v => handleField('videoCredit', v)} />
                                  </div>
                                </div>
                              </div>
                            )}
                            {activeTab === 'related' && (
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormInput label="Nearby Attractions" value={editData.nearbyAttractions ?? ''} onChange={v => handleField('nearbyAttractions', v)} />
                                <FormInput label="Associated Events" value={editData.associatedEvents ?? ''} onChange={v => handleField('associatedEvents', v)} />
                                <FormInput label="Associated Stories" value={editData.associatedStories ?? ''} onChange={v => handleField('associatedStories', v)} />
                                <FormInput label="Associated Courses" value={editData.associatedCourses ?? ''} onChange={v => handleField('associatedCourses', v)} />
                                <FormInput label="Conservation Activities" value={editData.associatedConservation ?? ''} onChange={v => handleField('associatedConservation', v)} />
                              </div>
                            )}
                            {activeTab === 'governance' && (
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormInput label="Source" value={editData.source ?? ''} onChange={v => handleField('source', v)} />
                                <FormInput label="Content Owner" value={editData.contentOwner ?? ''} onChange={v => handleField('contentOwner', v)} />
                                <FormSelect label="Verification Status" value={editData.verificationStatus ?? 'pending'} options={['verified', 'unverified', 'pending']} onChange={v => handleField('verificationStatus', v)} />
                                <FormInput label="Next Review Date" value={editData.reviewDate ?? ''} onChange={v => handleField('reviewDate', v)} />
                              </div>
                            )}
                            <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                                {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                                Save Changes
                              </button>
                              <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 rounded-full border border-red-300 bg-card px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                                <Trash className="h-4 w-4" weight="duotone" /> Delete
                              </button>
                              <button onClick={() => { setSelectedId(null); setPanelMode('view') }} className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground hover:bg-[var(--surface-2)]">
                                <X className="h-4 w-4" weight="duotone" /> Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-[var(--surface-2)]" />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {panelMode === 'create' && !selectedId && editData && (
                <tr key="create-row">
                  <td colSpan={6} className="border-b bg-[var(--surface-2)] p-0">
                    <div className="border-t border-border">
                      <div className="flex gap-1 border-b border-border bg-card px-5 pt-3">
                        {TABS.map(t => (
                          <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`px-3 py-2 text-xs font-semibold ${activeTab === t.key ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <div className="bg-card px-6 py-5">
                        {/* same form content as above */}
                        {activeTab === 'identity' && (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormInput label="Name" required value={editData.name ?? ''} onChange={v => handleField('name', v)} error={errors.name} />
                            <FormInput label="Slug" required value={editData.slug ?? ''} onChange={v => handleField('slug', v)} error={errors.slug} />
                            <FormInput label="County" required value={editData.county ?? ''} onChange={v => handleField('county', v)} error={errors.county} />
                            <FormInput label="Locality" value={editData.locality ?? ''} onChange={v => handleField('locality', v)} />
                            <FormSelect label="Category" required value={editData.category ?? ''} options={CATEGORIES} onChange={v => handleField('category', v)} error={errors.category} />
                            <FormSelect label="Status" value={editData.status ?? 'draft'} options={STATUS as unknown as string[]} onChange={v => handleField('status', v)} />
                          </div>
                        )}
                        {activeTab === 'location' && (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormInput label="Latitude" value={String(editData.latitude ?? 0)} onChange={v => handleField('latitude', Number(v))} />
                            <FormInput label="Longitude" value={String(editData.longitude ?? 0)} onChange={v => handleField('longitude', Number(v))} />
                            <FormInput label="Map Label" value={editData.mapLabel ?? ''} onChange={v => handleField('mapLabel', v)} />
                            <FormInput label="Access Route" value={editData.accessRoute ?? ''} onChange={v => handleField('accessRoute', v)} />
                            <FormInput label="Distance Reference" value={editData.distanceReference ?? ''} onChange={v => handleField('distanceReference', v)} />
                          </div>
                        )}
                        {activeTab === 'overview' && (
                          <div className="space-y-4">
                            <FormTextarea label="Short Description" value={editData.shortDescription ?? ''} onChange={v => handleField('shortDescription', v)} />
                            <FormTextarea label="Full Description" value={editData.fullDescription ?? ''} onChange={v => handleField('fullDescription', v)} />
                            <FormTextarea label="Significance" value={editData.significance ?? ''} onChange={v => handleField('significance', v)} />
                            <FormTextarea label="History" value={editData.history ?? ''} onChange={v => handleField('history', v)} />
                          </div>
                        )}
                        {activeTab === 'experience' && (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormInput label="Things to Do" value={editData.thingsToDo ?? ''} onChange={v => handleField('thingsToDo', v)} />
                            <FormInput label="Suitable Audiences" value={editData.suitableAudiences ?? ''} onChange={v => handleField('suitableAudiences', v)} />
                            <FormInput label="Duration" value={editData.duration ?? ''} onChange={v => handleField('duration', v)} />
                            <FormSelect label="Difficulty" value={editData.difficulty ?? 'easy'} options={['easy', 'moderate', 'hard']} onChange={v => handleField('difficulty', v)} />
                            <FormInput label="Seasonality" value={editData.seasonality ?? ''} onChange={v => handleField('seasonality', v)} />
                          </div>
                        )}
                        {activeTab === 'planning' && (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormInput label="Indicative Fees" value={editData.indicativeFees ?? ''} onChange={v => handleField('indicativeFees', v)} />
                            <FormInput label="Opening Info" value={editData.openingInfo ?? ''} onChange={v => handleField('openingInfo', v)} />
                            <FormInput label="Transport Notes" value={editData.transportNotes ?? ''} onChange={v => handleField('transportNotes', v)} />
                            <FormInput label="Facilities" value={editData.facilities ?? ''} onChange={v => handleField('facilities', v)} />
                            <FormInput label="Safety Notes" value={editData.safetyNotes ?? ''} onChange={v => handleField('safetyNotes', v)} />
                            <div className="md:col-span-2">
                              <label className="mb-1 block text-xs font-semibold text-foreground">Accessibility Tags</label>
                              <div className="flex flex-wrap gap-2">
                                {['wheelchair-accessible-lodges', 'guided-tours', 'wheelchair-accessible-hotels', 'beach-wheelchair', 'guide-required'].map(tag => (
                                  <label key={tag} className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium cursor-pointer ${(editData.accessibility ?? []).includes(tag) ? 'bg-[var(--leaf-bg)] text-success-leaf border-[var(--leaf)]' : 'border-border text-muted-foreground'}`}>
                                    <input type="checkbox" checked={(editData.accessibility ?? []).includes(tag)} onChange={() => {
                                      const current = editData.accessibility ?? []
                                      handleField('accessibility', current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag])
                                    }} className="sr-only" />
                                    <Wheelchair className="h-3.5 w-3.5" weight="duotone" /> {tag.replace(/-/g, ' ')}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="md:col-span-2 mt-2 rounded-lg bg-[var(--surface-2)] p-3 text-xs text-muted-foreground">
                              <span className="font-semibold text-primary">No Book Now / Checkout</span> — per spec §5.5 and §13 boundary.
                            </div>
                          </div>
                        )}
                        {activeTab === 'media' && (
                          <div className="space-y-6">
                            <div>
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Hero Image</h4>
                              <MediaUpload
                                label="Upload hero image"
                                onComplete={(result) => {
                                  handleField('heroImageUrl', result.objectKey)
                                  if (result.id) setMediaIds(prev => ({ ...prev, [result.objectKey]: result.id }))
                                  if (result.url) {
                                    mediaUrlCache.current[result.objectKey] = result.url
                                    setMediaUrls(prev => ({ ...prev, [result.objectKey]: result.url! }))
                                  }
                                  toast.success('Hero image uploaded')
                                }}
                                onError={(msg) => toast.error(msg)}
                              />
                              {editData.heroImageUrl && mediaUrls[editData.heroImageUrl] && (
                                <div className="mt-2 overflow-hidden rounded-lg border border-border">
                                  <img src={mediaUrls[editData.heroImageUrl]} alt={editData.heroAlt ?? ''} className="h-40 w-full object-cover" />
                                </div>
                              )}
                              {editData.heroImageUrl && (
                                <p className="mt-1 text-xs text-success-leaf truncate">{editData.heroImageUrl}</p>
                              )}
                            </div>
                            <div>
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Gallery Images</h4>
                              <MediaUpload
                                label="Add gallery image"
                                onComplete={(result) => {
                                  const current = editData.gallery ?? []
                                  handleField('gallery', [...current, result.objectKey])
                                  if (result.id) setMediaIds(prev => ({ ...prev, [result.objectKey]: result.id }))
                                  if (result.url) {
                                    mediaUrlCache.current[result.objectKey] = result.url
                                    setMediaUrls(prev => ({ ...prev, [result.objectKey]: result.url! }))
                                  }
                                  toast.success('Gallery image added')
                                }}
                                onError={(msg) => toast.error(msg)}
                              />
                              {editData.gallery && editData.gallery.length > 0 && (
                                <div className="mt-2 grid grid-cols-3 gap-3">
                                  {editData.gallery.map((url, i) => (
                                    <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
                                      {mediaUrls[url] ? (
                                        <img src={mediaUrls[url]} alt="" className="h-24 w-full object-cover" />
                                      ) : (
                                        <div className="flex h-24 items-center justify-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                                          <ImageIcon className="h-6 w-6 text-muted-foreground" weight="duotone" />
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between px-2 py-1">
                                        <span className="text-[10px] text-muted-foreground">Image {i + 1}</span>
                                        <button onClick={() => handleField('gallery', editData.gallery?.filter((_, j) => j !== i))}
                                          className="text-destructive hover:text-red-700 text-xs">×</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Video</h4>
                              <MediaUpload
                                label="Upload video"
                                onComplete={(result) => {
                                  handleField('videoUrl', result.objectKey)
                                  if (result.id) setMediaIds(prev => ({ ...prev, [result.objectKey]: result.id }))
                                  if (result.thumbnailUrl) {
                                    mediaUrlCache.current[result.objectKey] = result.thumbnailUrl
                                    setMediaUrls(prev => ({ ...prev, [result.objectKey]: result.thumbnailUrl! }))
                                  }
                                  toast.success('Video uploaded')
                                }}
                                onError={(msg) => toast.error(msg)}
                              />
                              {editData.videoUrl && (
                                <div className="mt-2 flex items-center gap-2">
                                  {mediaUrls[editData.videoUrl] ? (
                                    <div className="h-16 w-24 overflow-hidden rounded-lg border border-border">
                                      <img src={mediaUrls[editData.videoUrl]} alt="" className="h-full w-full object-cover" />
                                    </div>
                                  ) : null}
                                  <span className="text-xs text-success-leaf truncate">{editData.videoUrl}</span>
                                  <button onClick={() => handleField('videoUrl', '')} className="text-destructive hover:text-red-700 text-xs">×</button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {activeTab === 'related' && (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormInput label="Nearby Attractions" value={editData.nearbyAttractions ?? ''} onChange={v => handleField('nearbyAttractions', v)} />
                            <FormInput label="Associated Events" value={editData.associatedEvents ?? ''} onChange={v => handleField('associatedEvents', v)} />
                            <FormInput label="Associated Stories" value={editData.associatedStories ?? ''} onChange={v => handleField('associatedStories', v)} />
                            <FormInput label="Associated Courses" value={editData.associatedCourses ?? ''} onChange={v => handleField('associatedCourses', v)} />
                            <FormInput label="Conservation Activities" value={editData.associatedConservation ?? ''} onChange={v => handleField('associatedConservation', v)} />
                          </div>
                        )}
                        {activeTab === 'governance' && (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormInput label="Source" value={editData.source ?? ''} onChange={v => handleField('source', v)} />
                            <FormInput label="Content Owner" value={editData.contentOwner ?? ''} onChange={v => handleField('contentOwner', v)} />
                            <FormSelect label="Verification Status" value={editData.verificationStatus ?? 'pending'} options={['verified', 'unverified', 'pending']} onChange={v => handleField('verificationStatus', v)} />
                            <FormInput label="Next Review Date" value={editData.reviewDate ?? ''} onChange={v => handleField('reviewDate', v)} />
                          </div>
                        )}
                        <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                            Create Destination
                          </button>
                          <button onClick={() => { setSelectedId(null); setPanelMode('view'); setEditData(null) }} className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground hover:bg-[var(--surface-2)]">
                            <X className="h-4 w-4" weight="duotone" /> Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="h-2 bg-[var(--surface-2)]" />
                  </td>
                </tr>
              )}
              {visible.length === 0 && !panelMode && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">No destinations match the selected filter.</td></tr>
              )}
            </tbody>
          </table>
          </div>
          <CursorPagination
            nextCursor={cursor}
            hasMore={hasMore}
            onNext={handleNext}
            onPrev={handlePrev}
            loading={loading}
          />
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Destination"
        description={`Are you sure you want to delete "${selected?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

