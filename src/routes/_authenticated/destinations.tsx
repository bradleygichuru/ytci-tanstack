import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useApi } from '#/lib/api/use-api'
import { MediaUpload } from '#/components/shared/MediaUpload'
import { CursorPagination } from '#/components/shared/CursorPagination'
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
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [totalDestinations, setTotalDestinations] = useState(0)

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
    if (cursor) {
      setCursorHistory(prev => [...prev, cursor])
      loadList(cursor)
      setSelectedId(null)
    }
  }, [cursor, loadList])

  const handlePrev = useCallback(() => {
    const prev = cursorHistory[cursorHistory.length - 1]
    if (prev === undefined) {
      setCursorHistory([])
      loadList(null)
      setSelectedId(null)
      return
    }
    const prevCursor = cursorHistory.length > 1 ? cursorHistory[cursorHistory.length - 2] : null
    setCursorHistory(prev => prev.slice(0, -1))
    loadList(prevCursor)
    setSelectedId(null)
  }, [cursorHistory, loadList])

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
        toast.success('Destination created')
      } else if (selectedId) {
        await api.destinations.update(selectedId, editData)
        toast.success('Destination saved')
        const galleryUrls = editData.gallery ?? []
        if (editData.heroImageUrl || galleryUrls.length > 0 || editData.videoUrl) {
          api.destinations.uploadMedia(selectedId, {
            heroMediaId: editData.heroImageUrl,
            galleryMediaIds: galleryUrls.length > 0 ? galleryUrls : undefined,
            videoMediaId: editData.videoUrl,
          }).catch(() => {})
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
          <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">Destination CMS</h1>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Manage location profiles, pricing guides, GIS data, and rich media.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--on-surface-variant)]" weight="duotone" />
          <input placeholder="Search destinations..." className="h-9 w-56 rounded-md border border-[var(--outline-muted)] bg-white pl-9 text-sm text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:border-[var(--forest)] focus:ring-1 focus:ring-[var(--forest)]" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => (
            <button key={f ?? 'all'} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? 'bg-[var(--forest)] text-white' : 'border border-[var(--surface-4)] bg-white text-[var(--on-surface-variant)] hover:border-[var(--outline)]'}`}>
              {f ?? 'All'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--on-surface-variant)]">{visible?.length ?? 0} destinations</span>
          <button onClick={handleNew} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white shadow-sm">
            <Plus className="h-4 w-4" weight="duotone" /> New Destination
          </button>
          <button className="flex items-center gap-1.5 rounded-full border border-[var(--forest)] px-4 py-2 text-xs font-bold text-[var(--forest)]">
            <CloudArrowDown className="h-4 w-4" weight="duotone" /> Bulk Import
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--forest)] border-t-transparent" />
        </div>
      )}

      {(visible || panelMode === 'create') && (
        <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
                <th className="px-5 py-3">Name</th><th className="px-5 py-3">County</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Updated</th><th className="w-24 px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(d => (
                <React.Fragment key={d.id}>
                  <tr onClick={() => handleSelect(d.id)}
                    className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${selectedId === d.id ? 'bg-[var(--amber-bg)]' : ''}`}>
                    <td className="px-5 py-3"><span className="font-semibold text-[var(--on-surface)]">{d.name}</span></td>
                    <td className="px-5 py-3 text-[var(--on-surface-variant)]">{d.county}</td>
                    <td className="px-5 py-3"><span className="rounded-full bg-[var(--leaf-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--leaf)]">{d.category}</span></td>
                    <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-5 py-3 text-[var(--on-surface-variant)]">{formatDate(d.updatedAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <button className="rounded p-1 text-[var(--on-surface-variant)] hover:bg-[var(--surface-2)]"><PencilSimple className="h-4 w-4" weight="duotone" /></button>
                    </td>
                  </tr>
                  {selectedId === d.id && editData && (
                    <tr key={`${d.id}-detail`}>
                      <td colSpan={6} className="border-b bg-[var(--surface-2)] p-0">
                        <div className="border-t border-[var(--surface-4)]">
                          <div className="flex gap-1 border-b border-[var(--surface-4)] bg-white px-5 pt-3">
                            {TABS.map(t => (
                              <button key={t.key} onClick={() => setActiveTab(t.key)}
                                className={`px-3 py-2 text-xs font-semibold ${activeTab === t.key ? 'border-b-2 border-[var(--forest)] text-[var(--on-surface)]' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'}`}>
                                {t.label}
                              </button>
                            ))}
                          </div>
                          <div className="bg-white px-6 py-5">
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
                                <div className="md:col-span-2 flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--surface-4)] bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                                  <div className="text-center">
                                    <MapPin className="mx-auto h-8 w-8 text-[var(--on-surface-variant)]" weight="duotone" />
                                    <p className="mt-2 text-xs text-[var(--on-surface-variant)]">County boundary map + cluster markers (Leaflet/Mapbox — pending)</p>
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
                                  <label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Accessibility Tags</label>
                                  <div className="flex flex-wrap gap-2">
                                    {['wheelchair-accessible-lodges', 'guided-tours', 'wheelchair-accessible-hotels', 'beach-wheelchair', 'guide-required'].map(tag => (
                                      <label key={tag} className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium cursor-pointer ${(editData.accessibility ?? []).includes(tag) ? 'bg-[var(--leaf-bg)] text-[var(--leaf)] border-[var(--leaf)]' : 'border-[var(--surface-4)] text-[var(--on-surface-variant)]'}`}>
                                        <input type="checkbox" checked={(editData.accessibility ?? []).includes(tag)} onChange={() => {
                                          const current = editData.accessibility ?? []
                                          handleField('accessibility', current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag])
                                        }} className="sr-only" />
                                        <Wheelchair className="h-3.5 w-3.5" weight="duotone" /> {tag.replace(/-/g, ' ')}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div className="md:col-span-2 mt-2 rounded-lg bg-[var(--surface-2)] p-3 text-xs text-[var(--on-surface-variant)]">
                                  <span className="font-semibold text-[var(--forest)]">No Book Now / Checkout</span> — per spec §5.5 and §13 boundary.
                                </div>
                              </div>
                            )}
                            {activeTab === 'media' && (
                              <div className="space-y-6">
                                <div>
                                  <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Hero Image</h4>
                                  <MediaUpload
                                    label={editData.heroImageUrl ? 'Replace hero image' : 'Upload hero image'}
                                    onComplete={(result) => {
                                      handleField('heroImageUrl', result.objectKey)
                                      toast.success('Hero image uploaded')
                                    }}
                                    onError={(msg) => toast.error(msg)}
                                  />
                                  {editData.heroImageUrl && (
                                    <p className="mt-1 text-xs text-[var(--leaf)] truncate">{editData.heroImageUrl}</p>
                                  )}
                                  <div className="mt-2 grid grid-cols-3 gap-3">
                                    <FormInput label="Caption" value={editData.heroCaption ?? ''} onChange={v => handleField('heroCaption', v)} />
                                    <FormInput label="Credit" value={editData.heroCredit ?? ''} onChange={v => handleField('heroCredit', v)} />
                                    <FormInput label="Alt Text" value={editData.heroAlt ?? ''} onChange={v => handleField('heroAlt', v)} />
                                  </div>
                                </div>

                                <div>
                                  <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Gallery Images</h4>
                                  <MediaUpload
                                    label="Add gallery image"
                                    onComplete={(result) => {
                                      const current = editData.gallery ?? []
                                      handleField('gallery', [...current, result.objectKey])
                                      toast.success('Gallery image added')
                                    }}
                                    onError={(msg) => toast.error(msg)}
                                  />
                                  {editData.gallery && editData.gallery.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {editData.gallery.map((url, i) => (
                                        <span key={i} className="flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-1 text-[10px] text-[var(--on-surface-variant)]">
                                          Image {i + 1}
                                          <button onClick={() => handleField('gallery', editData.gallery?.filter((_, j) => j !== i))}
                                            className="ml-1 text-[var(--error)] hover:text-red-700">×</button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Video</h4>
                                  <MediaUpload
                                    label={editData.videoUrl ? 'Replace video' : 'Upload video'}
                                    onComplete={(result) => {
                                      handleField('videoUrl', result.objectKey)
                                      toast.success('Video uploaded')
                                    }}
                                    onError={(msg) => toast.error(msg)}
                                  />
                                  {editData.videoUrl && (
                                    <div className="mt-1 flex items-center gap-2">
                                      <span className="text-xs text-[var(--leaf)] truncate">{editData.videoUrl}</span>
                                      <button onClick={() => handleField('videoUrl', '')} className="text-[var(--error)] hover:text-red-700 text-xs">×</button>
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
                            <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                                {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                                Save Changes
                              </button>
                              <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                                <Trash className="h-4 w-4" weight="duotone" /> Delete
                              </button>
                              <button onClick={() => { setSelectedId(null); setPanelMode('view') }} className="flex items-center gap-1.5 rounded-full border border-[var(--surface-4)] px-5 py-2 text-xs font-bold text-[var(--on-surface-variant)] hover:bg-[var(--surface-2)]">
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
                    <div className="border-t border-[var(--surface-4)]">
                      <div className="flex gap-1 border-b border-[var(--surface-4)] bg-white px-5 pt-3">
                        {TABS.map(t => (
                          <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`px-3 py-2 text-xs font-semibold ${activeTab === t.key ? 'border-b-2 border-[var(--forest)] text-[var(--on-surface)]' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <div className="bg-white px-6 py-5">
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
                              <label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Accessibility Tags</label>
                              <div className="flex flex-wrap gap-2">
                                {['wheelchair-accessible-lodges', 'guided-tours', 'wheelchair-accessible-hotels', 'beach-wheelchair', 'guide-required'].map(tag => (
                                  <label key={tag} className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium cursor-pointer ${(editData.accessibility ?? []).includes(tag) ? 'bg-[var(--leaf-bg)] text-[var(--leaf)] border-[var(--leaf)]' : 'border-[var(--surface-4)] text-[var(--on-surface-variant)]'}`}>
                                    <input type="checkbox" checked={(editData.accessibility ?? []).includes(tag)} onChange={() => {
                                      const current = editData.accessibility ?? []
                                      handleField('accessibility', current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag])
                                    }} className="sr-only" />
                                    <Wheelchair className="h-3.5 w-3.5" weight="duotone" /> {tag.replace(/-/g, ' ')}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="md:col-span-2 mt-2 rounded-lg bg-[var(--surface-2)] p-3 text-xs text-[var(--on-surface-variant)]">
                              <span className="font-semibold text-[var(--forest)]">No Book Now / Checkout</span> — per spec §5.5 and §13 boundary.
                            </div>
                          </div>
                        )}
                        {activeTab === 'media' && (
                          <div className="space-y-6">
                            <div>
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Hero Image</h4>
                              <MediaUpload
                                label="Upload hero image"
                                onComplete={(result) => {
                                  handleField('heroImageUrl', result.objectKey)
                                  toast.success('Hero image uploaded')
                                }}
                                onError={(msg) => toast.error(msg)}
                              />
                              {editData.heroImageUrl && (
                                <p className="mt-1 text-xs text-[var(--leaf)] truncate">{editData.heroImageUrl}</p>
                              )}
                            </div>
                            <div>
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Gallery Images</h4>
                              <MediaUpload
                                label="Add gallery image"
                                onComplete={(result) => {
                                  const current = editData.gallery ?? []
                                  handleField('gallery', [...current, result.objectKey])
                                  toast.success('Gallery image added')
                                }}
                                onError={(msg) => toast.error(msg)}
                              />
                            </div>
                            <div>
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Video</h4>
                              <MediaUpload
                                label="Upload video"
                                onComplete={(result) => {
                                  handleField('videoUrl', result.objectKey)
                                  toast.success('Video uploaded')
                                }}
                                onError={(msg) => toast.error(msg)}
                              />
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
                        <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                            Create Destination
                          </button>
                          <button onClick={() => { setSelectedId(null); setPanelMode('view'); setEditData(null) }} className="flex items-center gap-1.5 rounded-full border border-[var(--surface-4)] px-5 py-2 text-xs font-bold text-[var(--on-surface-variant)] hover:bg-[var(--surface-2)]">
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
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[var(--on-surface-variant)]">No destinations match the selected filter.</td></tr>
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

