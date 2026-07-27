import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useApi } from '#/lib/api/use-api'
import {
  Clock, Bell, PencilSimple,
  FloppyDisk, X, Plus, ArrowRight, Ticket, Trash,
} from '@phosphor-icons/react'
import { FormInput, FormSelect } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { CursorPagination } from '#/components/shared/CursorPagination'
import { eventSchema } from '#/lib/schemas/event.schema'

interface EventItem { id: string; title: string; organizer: string; county: string; venue: string; date: string; endDate: string; type: string; status: string; description: string; contactEmail: string; contactPhone: string; reminderEnabled: boolean; reminderTime: string }

const typeColors: Record<string, string> = { cultural: '#785a00', sports: '#2d5a27', conservation: '#345a00', tourism: '#154212' }

const statusColors: Record<string, string> = { scheduled: 'var(--forest)', postponed: 'var(--amber-deep)', cancelled: 'var(--error)' }

export const Route = createFileRoute('/_authenticated/events')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'events', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: EventsPage })

function emptyEvent(): EventItem {
  return { id: '', title: '', organizer: '', county: '', venue: '', date: '', endDate: '', type: '', status: 'scheduled', description: '', contactEmail: '', contactPhone: '', reminderEnabled: false, reminderTime: '' }
}

function EventsPage() {
  const api = useApi()
  const [data, setData] = useState<EventItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create'>('view')
  const [editData, setEditData] = useState<EventItem | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [hasMore, setHasMore] = useState(false)

  const loadList = useCallback(async (c?: string | null) => {
    try {
      const r = await api.events.list(c ? { cursor: c } : undefined)
      setData(r.items)
      setHasMore(r.hasMore)
      setCursor(r.nextCursor)
    } catch {
      toast.error('Failed to load events')
      if (!data.length) setData([])
    }
  }, [api])

  const handleNext = useCallback(() => {
    if (cursor) {
      setCursorHistory(prev => [...prev, cursor])
      loadList(cursor)
    }
  }, [cursor, loadList])

  const handlePrev = useCallback(() => {
    const prev = cursorHistory[cursorHistory.length - 1]
    if (prev === undefined) {
      setCursorHistory([])
      loadList(null)
      return
    }
    const prevCursor = cursorHistory.length > 1 ? cursorHistory[cursorHistory.length - 2] : null
    setCursorHistory(prev => prev.slice(0, -1))
    loadList(prevCursor)
  }, [cursorHistory, loadList])

  useEffect(() => { loadList() }, [loadList])

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id)
    setPanelMode('edit')
    const e = data.find(e => e.id === id)
    if (e) setEditData({ ...e })
    setErrors({})
  }, [selectedId, data])

  const handleNew = useCallback(() => {
    setSelectedId(null)
    setPanelMode('create')
    setEditData(emptyEvent())
    setErrors({})
  }, [])

  const handleField = (field: string, value: unknown) => {
    setEditData(prev => prev ? { ...prev, [field]: value } : prev)
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate = (): boolean => {
    if (!editData) return false
    const result = eventSchema.safeParse(editData)
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

  const handleSave = useCallback(async () => {
    if (!editData) return
    if (!validate()) return
    setSaving(true)
    try {
      let newId: string | undefined
      if (panelMode === 'create') {
        const created = await api.events.create(editData as unknown as Record<string, unknown>)
        newId = created.id
        toast.success('Event created')
      } else if (selectedId) {
        await api.events.update(selectedId, editData as unknown as Record<string, unknown>)
        toast.success('Event saved')
      }
      await loadList()
      if (newId) {
        setPanelMode('edit')
        setSelectedId(newId)
      } else {
        setSelectedId(null)
        setPanelMode('view')
      }
    } catch {
      toast.error('Failed to save event')
    } finally {
      setSaving(false)
    }
  }, [editData, selectedId, panelMode, api, loadList])

  const handleDelete = useCallback(async () => {
    if (!selectedId) return
    setDeleting(true)
    try {
      await api.events.remove(selectedId)
      toast.success('Event deleted')
      setShowDelete(false)
      setSelectedId(null)
      setPanelMode('view')
      await loadList()
    } catch {
      toast.error('Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }, [selectedId, loadList, api])

  const handleStatusTransition = useCallback(async (newStatus: string) => {
    if (!editData) return
    const updated = { ...editData, status: newStatus }
    setEditData(updated)
    await api.events.update(editData.id, { status: newStatus })
    await loadList()
  }, [editData, loadList, api])

  const transitions: Record<string, string[]> = { scheduled: ['postponed', 'cancelled'], postponed: ['scheduled', 'cancelled'], cancelled: ['scheduled'] }
  const selected = data.find(d => d.id === selectedId) ?? null

  return (
    <>
      <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">Events Calendar Admin</h1>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Publish and manage event entries. Scheduled, postponed, cancelled status transitions.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--on-surface-variant)]">{data.length} events</span>
          <button onClick={handleNew} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white shadow-sm"><Plus className="h-4 w-4" weight="duotone" /> New Event</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
            <th className="px-5 py-3">Event</th><th className="px-5 py-3">County</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Status</th><th className="w-12 px-5 py-3" />
          </tr></thead>
          <tbody>
            {data.map(e => {
              const isSelected = selectedId === e.id
              return (
                <React.Fragment key={e.id}>
                  <tr onClick={() => handleSelect(e.id)} className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}>
                    <td className="px-5 py-3"><div className="font-semibold text-[var(--on-surface)]">{e.title}</div><div className="text-[10px] text-[var(--on-surface-variant)]">{e.organizer}</div></td>
                    <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{e.county}</td>
                    <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{new Date(e.date).toLocaleDateString()}{e.endDate !== e.date ? ` — ${new Date(e.endDate).toLocaleDateString()}` : ''}</td>
                    <td className="px-5 py-3"><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${typeColors[e.type]}20`, color: typeColors[e.type] }}>{e.type}</span></td>
                    <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-[var(--on-surface-variant)]" weight="duotone" /></td>
                  </tr>
                  {isSelected && editData && (
                    <tr><td colSpan={6} className="border-b p-0">
                      <div className="border-t border-[var(--surface-4)] bg-white px-6 py-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="md:col-span-2"><FormInput label="Title" required value={editData.title} onChange={v => handleField('title', v)} error={errors.title} /></div>
                          <FormInput label="Organizer" value={editData.organizer} onChange={v => handleField('organizer', v)} />
                          <FormInput label="County" required value={editData.county} onChange={v => handleField('county', v)} error={errors.county} />
                          <FormInput label="Venue" value={editData.venue} onChange={v => handleField('venue', v)} />
                          <FormInput label="Start Date" required value={editData.date} onChange={v => handleField('date', v)} error={errors.date} />
                          <FormInput label="End Date" value={editData.endDate} onChange={v => handleField('endDate', v)} error={errors.endDate} />
                          <FormSelect label="Type" value={editData.type} options={['cultural', 'sports', 'conservation', 'tourism']} onChange={v => handleField('type', v)} />
                          <div className="md:col-span-2"><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Description</label><textarea value={editData.description} onChange={e => handleField('description', e.target.value)} rows={3} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]" /></div>

                          <div className="col-span-2 rounded-lg border border-[var(--surface-4)] p-4">
                            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]"><Clock className="h-3.5 w-3.5" weight="duotone" /> Status Workflow</h3>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {['scheduled', 'postponed', 'cancelled'].map(s => {
                                const isCurrent = editData.status === s
                                return (
                                  <span key={s} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${isCurrent ? 'shadow-sm' : ''}`}>
                                    {s} {isCurrent && <span className="ml-1 rounded-full bg-white/40 px-1 text-[10px]">current</span>}
                                    {!isCurrent && <ArrowRight className="h-3 w-3" weight="bold" />}
                                  </span>
                                )
                              })}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(transitions[editData.status] ?? []).map(target => {
                                return (
                                  <button key={target} onClick={() => handleStatusTransition(target)}
                                    className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors"
                                    style={{ backgroundColor: statusColors[target] ?? 'var(--forest)' }}>
                                    → {target}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <FormInput label="Contact Email" value={editData.contactEmail} onChange={v => handleField('contactEmail', v)} />
                          <FormInput label="Contact Phone" value={editData.contactPhone} onChange={v => handleField('contactPhone', v)} />

                          <div className="col-span-2 rounded-lg border border-[var(--surface-4)] p-4">
                            <label className="flex cursor-pointer items-center gap-2">
                              <input type="checkbox" checked={editData.reminderEnabled} onChange={e => handleField('reminderEnabled', e.target.checked)} className="accent-[var(--forest)]" />
                              <span className="flex items-center gap-1 text-xs font-semibold text-[var(--on-surface)]"><Bell className="h-3.5 w-3.5" weight="duotone" /> Enable Reminders</span>
                            </label>
                            {editData.reminderEnabled && (
                              <div className="mt-3 flex items-center gap-3">
                                <span className="text-xs text-[var(--on-surface-variant)]">Send</span>
                                <select value={editData.reminderTime} onChange={e => handleField('reminderTime', e.target.value)} className="rounded-md border border-[var(--outline-muted)] px-3 py-1.5 text-xs text-[var(--on-surface)] focus:border-[var(--forest)]">
                                  {['30 minutes before', '1 hour before', '1 day before', '3 days before', '1 week before'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                            )}
                            <p className="mt-2 text-[10px] text-[var(--on-surface-variant)]">§5.14: Device calendar integration support — optional.</p>
                          </div>

                          <div className="col-span-2 rounded-lg bg-[var(--surface-2)] p-3 text-xs text-[var(--on-surface-variant)]">
                            <span className="flex items-center gap-1 font-semibold text-[var(--error)]"><Ticket className="h-3.5 w-3.5" weight="duotone" /> No Ticket Checkout</span> — per spec §5.14 boundary. No ticket purchase, booking, or reservation controls in this form.
                          </div>
                        </div>

                        <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                            {panelMode === 'create' ? 'Create Event' : 'Save Changes'}
                          </button>
                          {panelMode === 'edit' && (
                            <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                              <Trash className="h-4 w-4" weight="duotone" /> Delete
                            </button>
                          )}
                          <button onClick={() => { setSelectedId(null); setPanelMode('view') }} className="flex items-center gap-1.5 rounded-full border border-[var(--surface-4)] px-5 py-2 text-xs font-bold text-[var(--on-surface-variant)] hover:bg-[var(--surface-2)]">
                            <X className="h-4 w-4" weight="duotone" /> Cancel
                          </button>
                        </div>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              )
            })}
            {data.length === 0 && panelMode !== 'create' && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[var(--on-surface-variant)]">No events found. Create one to get started.</td></tr>
            )}
            {panelMode === 'create' && editData && (
              <tr key="create-row"><td colSpan={6} className="border-b p-0">
                <div className="border-t border-[var(--surface-4)] bg-white px-6 py-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2"><FormInput label="Title" required value={editData.title} onChange={v => handleField('title', v)} error={errors.title} /></div>
                    <FormInput label="Organizer" value={editData.organizer} onChange={v => handleField('organizer', v)} />
                    <FormInput label="County" required value={editData.county} onChange={v => handleField('county', v)} error={errors.county} />
                    <FormInput label="Venue" value={editData.venue} onChange={v => handleField('venue', v)} />
                    <FormInput label="Start Date" required value={editData.date} onChange={v => handleField('date', v)} error={errors.date} />
                    <FormInput label="End Date" value={editData.endDate} onChange={v => handleField('endDate', v)} error={errors.endDate} />
                    <FormSelect label="Type" value={editData.type} options={['cultural', 'sports', 'conservation', 'tourism']} onChange={v => handleField('type', v)} />
                    <div className="md:col-span-2"><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Description</label><textarea value={editData.description} onChange={e => handleField('description', e.target.value)} rows={3} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]" /></div>
                    <FormInput label="Contact Email" value={editData.contactEmail} onChange={v => handleField('contactEmail', v)} />
                    <FormInput label="Contact Phone" value={editData.contactPhone} onChange={v => handleField('contactPhone', v)} />
                    <div className="col-span-2 rounded-lg border border-[var(--surface-4)] p-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={editData.reminderEnabled} onChange={e => handleField('reminderEnabled', e.target.checked)} className="accent-[var(--forest)]" />
                        <span className="flex items-center gap-1 text-xs font-semibold text-[var(--on-surface)]"><Bell className="h-3.5 w-3.5" weight="duotone" /> Enable Reminders</span>
                      </label>
                      {editData.reminderEnabled && (
                        <div className="mt-3 flex items-center gap-3">
                          <span className="text-xs text-[var(--on-surface-variant)]">Send</span>
                          <select value={editData.reminderTime} onChange={e => handleField('reminderTime', e.target.value)} className="rounded-md border border-[var(--outline-muted)] px-3 py-1.5 text-xs text-[var(--on-surface)] focus:border-[var(--forest)]">
                            {['30 minutes before', '1 hour before', '1 day before', '3 days before', '1 week before'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 rounded-lg bg-[var(--surface-2)] p-3 text-xs text-[var(--on-surface-variant)]">
                      <span className="flex items-center gap-1 font-semibold text-[var(--error)]"><Ticket className="h-3.5 w-3.5" weight="duotone" /> No Ticket Checkout</span> — per spec §5.14 boundary. No ticket purchase, booking, or reservation controls in this form.
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                      {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                      Create Event
                    </button>
                    <button onClick={() => { setSelectedId(null); setPanelMode('view'); setEditData(null) }} className="flex items-center gap-1.5 rounded-full border border-[var(--surface-4)] px-5 py-2 text-xs font-bold text-[var(--on-surface-variant)]">
                      <X className="h-4 w-4" weight="duotone" /> Cancel
                    </button>
                  </div>
                </div>
              </td></tr>
            )}
            </tbody>
          </table>
          </div>
        </div>
        <CursorPagination
          nextCursor={cursor}
          hasMore={hasMore}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Event"
        description={`Are you sure you want to delete "${selected?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}

