import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { api } from '#/lib/api/client'
import {
  MapPin, PencilSimple, Archive, CheckCircle, MagnifyingGlass,
  CloudArrowDown, X, FloppyDisk, ArrowSquareUpRight, Image as ImageIcon,
  Video, GlobeHemisphereWest, Compass, CurrencyDollar, Wheelchair,
  Tree, BookmarkSimple, Sparkle, Copyright,
} from '@phosphor-icons/react'
import type { Destination } from '#/lib/api/mock/destinations'

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

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'var(--surface-2)', text: 'var(--on-surface-variant)' },
    published: { bg: 'var(--leaf-bg)', text: 'var(--leaf)' },
    archived: { bg: 'rgba(186,26,26,0.1)', text: 'var(--error)' },
  }
  const c = colors[status] ?? colors.draft
  return <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest" style={{ backgroundColor: c.bg, color: c.text }}>{status}</span>
}

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

function DestinationsPage() {
  const [data, setData] = useState<Destination[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('identity')
  const [editData, setEditData] = useState<Partial<Destination> | null>(null)
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    api.list('destinations').then(r => setData(r.items as Destination[]))
  }, [])

  const selected = data?.find(d => d.id === selectedId) ?? null

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id)
    setActiveTab('identity')
    const dest = data?.find(d => d.id === id)
    setEditData(dest ? { ...dest } : null)
  }, [selectedId, data])

  const handleSave = useCallback(async () => {
    if (!selectedId || !editData) return
    await api.update('destinations', selectedId, editData)
    const r = await api.list('destinations') as { items: Destination[] }
    setData(r.items)
    setSelectedId(null)
  }, [selectedId, editData])

  const handleField = (field: string, value: unknown) => {
    setEditData(prev => prev ? { ...prev, [field]: value } : prev)
  }

  const visible = filter
    ? data?.filter(d => d.status === filter || d.category === filter || d.county === filter)
    : data

  const filters = [null, 'published', 'draft', 'archived', 'wildlife', 'beach', 'adventure', 'Narok', 'Kwale', 'Meru']

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">Destination CMS</h1>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Manage location profiles, pricing guides, GIS data, and rich media.</p>
        </div>
      </div>

      {/* Toolbar */}
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
          <button className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white shadow-sm">
            <CloudArrowDown className="h-4 w-4" weight="duotone" /> Bulk Import
          </button>
        </div>
      </div>

      {/* Table */}
      {visible && (
        <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
                <th className="px-5 py-3">Name</th> <th className="px-5 py-3">County</th> <th className="px-5 py-3">Category</th> <th className="px-5 py-3">Status</th> <th className="px-5 py-3">Updated</th> <th className="w-24 px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(d => (
                <FragmentRow key={d.id}>
                  <tr onClick={() => handleSelect(d.id)}
                    className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${selectedId === d.id ? 'bg-[var(--amber-bg)]' : ''}`}>
                    <td className="px-5 py-3"><span className="font-semibold text-[var(--on-surface)]">{d.name}</span></td>
                    <td className="px-5 py-3 text-[var(--on-surface-variant)]">{d.county}</td>
                    <td className="px-5 py-3"><span className="rounded-full bg-[var(--leaf-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--leaf)]">{d.category}</span></td>
                    <td className="px-5 py-3"><StatusPill status={d.status} /></td>
                    <td className="px-5 py-3 text-[var(--on-surface-variant)]">{formatDate(d.updatedAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <button className="rounded p-1 text-[var(--on-surface-variant)] hover:bg-[var(--surface-2)]"><PencilSimple className="h-4 w-4" weight="duotone" /></button>
                      <button className="rounded p-1 text-[var(--on-surface-variant)] hover:bg-[var(--surface-2)]"><Archive className="h-4 w-4" weight="duotone" /></button>
                      <button className="rounded p-1 text-[var(--leaf)] hover:bg-[var(--leaf-bg)]"><CheckCircle className="h-4 w-4" weight="duotone" /></button>
                    </td>
                  </tr>
                  {selectedId === d.id && editData && (
                    <tr key={`${d.id}-detail`}>
                      <td colSpan={6} className="border-b bg-[var(--surface-2)] p-0">
                        {/* Inline detail panel */}
                        <div className="border-t border-[var(--surface-4)]">
                          {/* Tabs */}
                          <div className="flex gap-1 border-b border-[var(--surface-4)] bg-white px-5 pt-3">
                            {TABS.map(t => (
                              <button key={t.key} onClick={() => setActiveTab(t.key)}
                                className={`px-3 py-2 text-xs font-semibold ${activeTab === t.key ? 'border-b-2 border-[var(--forest)] text-[var(--on-surface)]' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'}`}>
                                {t.label}
                              </button>
                            ))}
                          </div>
                          {/* Tab content */}
                          <div className="bg-white px-6 py-5">
                            {activeTab === 'identity' && (
                              <div className="grid grid-cols-2 gap-4">
                                <Field label="Name" value={editData.name} onChange={v => handleField('name', v)} />
                                <Field label="Slug" value={editData.slug} onChange={v => handleField('slug', v)} />
                                <Field label="County" value={editData.county} onChange={v => handleField('county', v)} />
                                <Field label="Locality" value={editData.locality} onChange={v => handleField('locality', v)} />
                                <Select label="Category" value={editData.category} options={CATEGORIES} onChange={v => handleField('category', v)} />
                                <Select label="Status" value={editData.status} options={STATUS as unknown as string[]} onChange={v => handleField('status', v)} />
                              </div>
                            )}
                            {activeTab === 'location' && (
                              <div className="grid grid-cols-2 gap-4">
                                <Field label="Latitude" value={String(editData.latitude)} onChange={v => handleField('latitude', Number(v))} />
                                <Field label="Longitude" value={String(editData.longitude)} onChange={v => handleField('longitude', Number(v))} />
                                <Field label="Map Label" value={editData.mapLabel} onChange={v => handleField('mapLabel', v)} />
                                <Field label="Access Route" value={editData.accessRoute} onChange={v => handleField('accessRoute', v)} />
                                <Field label="Distance Reference" value={editData.distanceReference} onChange={v => handleField('distanceReference', v)} className="col-span-2" />
                                {/* Map placeholder */}
                                <div className="col-span-2 flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--surface-4)] bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                                  <div className="text-center">
                                    <MapPin className="mx-auto h-8 w-8 text-[var(--on-surface-variant)]" weight="duotone" />
                                    <p className="mt-2 text-xs text-[var(--on-surface-variant)]">County boundary map + cluster markers (Leaflet/Mapbox — pending)</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {activeTab === 'overview' && (
                              <div className="space-y-4">
                                <TextArea label="Short Description" value={editData.shortDescription} onChange={v => handleField('shortDescription', v)} />
                                <TextArea label="Full Description" value={editData.fullDescription} onChange={v => handleField('fullDescription', v)} rows={5} />
                                <TextArea label="Significance" value={editData.significance} onChange={v => handleField('significance', v)} />
                                <TextArea label="History" value={editData.history} onChange={v => handleField('history', v)} />
                              </div>
                            )}
                            {activeTab === 'experience' && (
                              <div className="grid grid-cols-2 gap-4">
                                <Field label="Things to Do" value={editData.thingsToDo} onChange={v => handleField('thingsToDo', v)} className="col-span-2" />
                                <Field label="Suitable Audiences" value={editData.suitableAudiences} onChange={v => handleField('suitableAudiences', v)} />
                                <Field label="Duration" value={editData.duration} onChange={v => handleField('duration', v)} />
                                <Select label="Difficulty" value={editData.difficulty} options={['easy', 'moderate', 'hard']} onChange={v => handleField('difficulty', v)} />
                                <Field label="Seasonality" value={editData.seasonality} onChange={v => handleField('seasonality', v)} />
                              </div>
                            )}
                            {activeTab === 'planning' && (
                              <div className="grid grid-cols-2 gap-4">
                                <Field label="Indicative Fees" value={editData.indicativeFees} onChange={v => handleField('indicativeFees', v)} />
                                <Field label="Opening Info" value={editData.openingInfo} onChange={v => handleField('openingInfo', v)} />
                                <Field label="Transport Notes" value={editData.transportNotes} onChange={v => handleField('transportNotes', v)} />
                                <Field label="Facilities" value={editData.facilities} onChange={v => handleField('facilities', v)} />
                                <Field label="Safety Notes" value={editData.safetyNotes} onChange={v => handleField('safetyNotes', v)} className="col-span-2" />
                                <div className="col-span-2">
                                  <label className="mb-1 text-xs font-semibold text-[var(--on-surface)]">Accessibility Tags</label>
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
                                {/* No Book Now / Checkout — hard boundary. Planning tab has NO booking/payment fields. */}
                                <div className="col-span-2 mt-2 rounded-lg bg-[var(--surface-2)] p-3 text-xs text-[var(--on-surface-variant)]">
                                  <span className="font-semibold text-[var(--forest)]">No Book Now / Checkout</span> — per spec §5.5 and §13 boundary. No booking, payment, reservation, or checkout controls in this form.
                                </div>
                              </div>
                            )}
                            {activeTab === 'media' && (
                              <div className="space-y-5">
                                <div>
                                  <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Hero Image</h4>
                                  <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-[var(--surface-4)] bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]">
                                    <ImageIcon className="h-8 w-8 text-[var(--on-surface-variant)]" weight="duotone" />
                                  </div>
                                  <div className="mt-2 grid grid-cols-3 gap-3">
                                    <Field label="Caption" value={editData.heroCaption ?? ''} onChange={v => handleField('heroCaption', v)} />
                                    <Field label="Credit" value={editData.heroCredit ?? ''} onChange={v => handleField('heroCredit', v)} />
                                    <Field label="Alt Text" value={editData.heroAlt ?? ''} onChange={v => handleField('heroAlt', v)} />
                                  </div>
                                </div>
                                <div>
                                  <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Gallery ({editData.gallery?.length ?? 0} images)</h4>
                                  <div className="grid grid-cols-3 gap-3">
                                    {(editData.gallery ?? []).map((img, i) => (
                                      <div key={i} className="flex h-24 items-center justify-center rounded-lg border border-dashed border-[var(--surface-4)] bg-[var(--surface-2)]">
                                        <div className="text-center">
                                          <ImageIcon className="mx-auto h-5 w-5 text-[var(--on-surface-variant)]" weight="duotone" />
                                          <div className="mt-1 text-[10px] text-[var(--on-surface-variant)]">{img.caption || 'No caption'}</div>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="flex h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--surface-4)] bg-[var(--surface-2)] text-[var(--on-surface-variant)] hover:border-[var(--forest)]">
                                      <div className="text-center"><ImageIcon className="mx-auto h-5 w-5" weight="duotone" /><div className="mt-1 text-[10px]">+ Add</div></div>
                                    </div>
                                  </div>
                                  <div className="mt-3">
                                    <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Video</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                      <Field label="Video URL" value={editData.videoUrl ?? ''} onChange={v => handleField('videoUrl', v)} />
                                      <Field label="Caption" value={editData.videoCaption ?? ''} onChange={v => handleField('videoCaption', v)} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {activeTab === 'related' && (
                              <div className="grid grid-cols-2 gap-4">
                                <Field label="Nearby Attractions" value={editData.nearbyAttractions ?? ''} onChange={v => handleField('nearbyAttractions', v)} />
                                <Field label="Associated Events" value={editData.associatedEvents ?? ''} onChange={v => handleField('associatedEvents', v)} />
                                <Field label="Associated Stories" value={editData.associatedStories ?? ''} onChange={v => handleField('associatedStories', v)} />
                                <Field label="Associated Courses" value={editData.associatedCourses ?? ''} onChange={v => handleField('associatedCourses', v)} />
                                <Field label="Conservation Activities" value={editData.associatedConservation ?? ''} onChange={v => handleField('associatedConservation', v)} className="col-span-2" />
                              </div>
                            )}
                            {activeTab === 'governance' && (
                              <div className="grid grid-cols-2 gap-4">
                                <Field label="Source" value={editData.source ?? ''} onChange={v => handleField('source', v)} />
                                <Field label="Content Owner" value={editData.contentOwner ?? ''} onChange={v => handleField('contentOwner', v)} />
                                <Select label="Verification Status" value={editData.verificationStatus ?? 'pending'} options={['verified', 'unverified', 'pending']} onChange={v => handleField('verificationStatus', v)} />
                                <Field label="Reviewed At" value={editData.reviewedAt ? formatDate(editData.reviewedAt) : ''} onChange={() => {}} />
                                <Field label="Next Review Date" value={editData.reviewDate ?? ''} onChange={v => handleField('reviewDate', v)} />
                              </div>
                            )}
                            {/* Save / Cancel */}
                            <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                              <button onClick={handleSave} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm">
                                <FloppyDisk className="h-4 w-4" weight="duotone" /> Save Changes
                              </button>
                              <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 rounded-full border border-[var(--surface-4)] px-5 py-2 text-xs font-bold text-[var(--on-surface-variant)] hover:bg-[var(--surface-2)]">
                                <X className="h-4 w-4" weight="duotone" /> Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-[var(--surface-2)]" />
                      </td>
                    </tr>
                  )}
                </FragmentRow>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[var(--on-surface-variant)]">No destinations match the selected filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, className }: { label: string; value?: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">{label}</label>
      <input value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)] focus:ring-1 focus:ring-[var(--forest)]" />
    </div>
  )
}

function Select({ label, value, options, onChange }: { label: string; value?: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)] focus:ring-1 focus:ring-[var(--forest)]">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function TextArea({ label, value, onChange, rows = 3 }: { label: string; value?: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">{label}</label>
      <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={rows} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)] focus:ring-1 focus:ring-[var(--forest)]" />
    </div>
  )
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
