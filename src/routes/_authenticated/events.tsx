import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { api } from '#/lib/api/client'
import {
  CalendarBlank, MapPin, Clock, Envelope, Phone, Bell, PencilSimple,
  FloppyDisk, X, PlusCircle, ArrowRight, Ticket,
} from '@phosphor-icons/react'

interface EventItem { id: string; title: string; organizer: string; county: string; venue: string; date: string; endDate: string; type: string; status: string; description: string; contactEmail: string; contactPhone: string; reminderEnabled: boolean; reminderTime: string }

const statusColors: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: 'var(--leaf-bg)', text: 'var(--leaf)' },
  postponed: { bg: 'var(--amber-bg)', text: 'var(--amber-deep)' },
  cancelled: { bg: 'rgba(186,26,26,0.1)', text: 'var(--error)' },
}

function Pill({ status }: { status: string }) {
  const s = statusColors[status] ?? statusColors.scheduled
  return <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: s.bg, color: s.text }}>{status}</span>
}

const typeColors: Record<string, string> = { cultural: '#785a00', sports: '#2d5a27', conservation: '#345a00', tourism: '#154212' }

export const Route = createFileRoute('/_authenticated/events')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'events', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: EventsPage })

function EventsPage() {
  const [data, setData] = useState<EventItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EventItem | null>(null)

  useEffect(() => { api.list('events').then(r => setData(r.items as EventItem[])) }, [])

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id)
    const e = data.find(e => e.id === id)
    if (e) setEditData({ ...e })
  }, [selectedId, data])

  const handleSave = useCallback(async () => {
    if (!selectedId || !editData) return
    await api.update('events', selectedId, editData)
    const r = await api.list('events'); setData(r.items as EventItem[]); setSelectedId(null)
  }, [selectedId, editData])

  const handleStatusTransition = useCallback(async (newStatus: string) => {
    if (!editData) return
    const updated = { ...editData, status: newStatus }
    setEditData(updated)
    await api.update('events', editData.id, { status: newStatus })
    const r = await api.list('events'); setData(r.items as EventItem[])
  }, [editData])

  const transitions: Record<string, string[]> = { scheduled: ['postponed', 'cancelled'], postponed: ['scheduled', 'cancelled'], cancelled: ['scheduled'] }

  if (!data.length) return <div className="mt-8 text-center text-sm text-[var(--on-surface-variant)]">Loading...</div>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">Events Calendar Admin</h1>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Publish and manage event entries. Scheduled, postponed, cancelled status transitions.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--on-surface-variant)]">{data.length} events</span>
          <button className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white shadow-sm"><PlusCircle className="h-4 w-4" weight="duotone" /> New Event</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
            <th className="px-5 py-3">Event</th><th className="px-5 py-3">County</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Status</th><th className="w-12 px-5 py-3" />
          </tr></thead>
          <tbody>
            {data.map(e => {
              const isSelected = selectedId === e.id
              return (
                <FragmentRow key={e.id}>
                  <tr onClick={() => handleSelect(e.id)} className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}>
                    <td className="px-5 py-3"><div className="font-semibold text-[var(--on-surface)]">{e.title}</div><div className="text-[10px] text-[var(--on-surface-variant)]">{e.organizer}</div></td>
                    <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{e.county}</td>
                    <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{new Date(e.date).toLocaleDateString()}{e.endDate !== e.date ? ` — ${new Date(e.endDate).toLocaleDateString()}` : ''}</td>
                    <td className="px-5 py-3"><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${typeColors[e.type]}20`, color: typeColors[e.type] }}>{e.type}</span></td>
                    <td className="px-5 py-3"><Pill status={e.status} /></td>
                    <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-[var(--on-surface-variant)]" weight="duotone" /></td>
                  </tr>
                  {isSelected && editData && (
                    <tr><td colSpan={6} className="border-b p-0">
                      <div className="border-t border-[var(--surface-4)] bg-white px-6 py-5">
                        <div className="grid grid-cols-2 gap-4">

                          <EField label="Title" value={editData.title} onChange={v => setEditData({ ...editData, title: v })} className="col-span-2" />
                          <EField label="Organizer" value={editData.organizer} onChange={v => setEditData({ ...editData, organizer: v })} />
                          <EField label="County" value={editData.county} onChange={v => setEditData({ ...editData, county: v })} />
                          <EField label="Venue" value={editData.venue} onChange={v => setEditData({ ...editData, venue: v })} />
                          <EField label="Start Date" value={editData.date} onChange={v => setEditData({ ...editData, date: v })} />
                          <EField label="End Date" value={editData.endDate} onChange={v => setEditData({ ...editData, endDate: v })} />
                          <ESelect label="Type" value={editData.type} options={['cultural', 'sports', 'conservation', 'tourism']} onChange={v => setEditData({ ...editData, type: v })} />
                          <div className="col-span-2"><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Description</label><textarea value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} rows={3} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]" /></div>

                          {/* Status Workflow */}
                          <div className="col-span-2 rounded-lg border border-[var(--surface-4)] p-4">
                            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]"><Clock className="h-3.5 w-3.5" weight="duotone" /> Status Workflow</h3>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {['scheduled', 'postponed', 'cancelled'].map(s => {
                                const col = statusColors[s]
                                const isCurrent = editData.status === s
                                return (
                                  <span key={s} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${isCurrent ? 'shadow-sm' : ''}`} style={{ backgroundColor: s === 'cancelled' ? `${col.bg}` : col.bg, color: col.text }}>
                                    {s} {isCurrent && <span className="ml-1 rounded-full bg-white/40 px-1 text-[10px]">current</span>}
                                    {!isCurrent && <ArrowRight className="h-3 w-3" weight="bold" />}
                                  </span>
                                )
                              })}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(transitions[editData.status] ?? []).map(target => {
                                const col = statusColors[target]
                                return (
                                  <button key={target} onClick={() => handleStatusTransition(target)}
                                    className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors"
                                    style={{ backgroundColor: col.text }}>
                                    → {target}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Contacts */}
                          <EField label="Contact Email" value={editData.contactEmail} onChange={v => setEditData({ ...editData, contactEmail: v })} />
                          <EField label="Contact Phone" value={editData.contactPhone} onChange={v => setEditData({ ...editData, contactPhone: v })} />

                          {/* Reminders */}
                          <div className="col-span-2 rounded-lg border border-[var(--surface-4)] p-4">
                            <label className="flex cursor-pointer items-center gap-2">
                              <input type="checkbox" checked={editData.reminderEnabled} onChange={e => setEditData({ ...editData, reminderEnabled: e.target.checked })} className="accent-[var(--forest)]" />
                              <span className="flex items-center gap-1 text-xs font-semibold text-[var(--on-surface)]"><Bell className="h-3.5 w-3.5" weight="duotone" /> Enable Reminders</span>
                            </label>
                            {editData.reminderEnabled && (
                              <div className="mt-3 flex items-center gap-3">
                                <span className="text-xs text-[var(--on-surface-variant)]">Send</span>
                                <select value={editData.reminderTime} onChange={e => setEditData({ ...editData, reminderTime: e.target.value })} className="rounded-md border border-[var(--outline-muted)] px-3 py-1.5 text-xs text-[var(--on-surface)] focus:border-[var(--forest)]">
                                  {['30 minutes before', '1 hour before', '1 day before', '3 days before', '1 week before'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                            )}
                            <p className="mt-2 text-[10px] text-[var(--on-surface-variant)]">§5.14: Device calendar integration support — optional.</p>
                          </div>

                          {/* No Ticket Checkout */}
                          <div className="col-span-2 rounded-lg bg-[var(--surface-2)] p-3 text-xs text-[var(--on-surface-variant)]">
                            <span className="flex items-center gap-1 font-semibold text-[var(--error)]"><Ticket className="h-3.5 w-3.5" weight="duotone" /> No Ticket Checkout</span> — per spec §5.14 boundary. No ticket purchase, booking, or reservation controls in this form.
                          </div>

                        </div>

                        <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                          <button onClick={handleSave} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm"><FloppyDisk className="h-4 w-4" weight="duotone" /> Save</button>
                          <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 rounded-full border border-[var(--surface-4)] px-5 py-2 text-xs font-bold text-[var(--on-surface-variant)]"><X className="h-4 w-4" weight="duotone" /> Cancel</button>
                        </div>
                      </div>
                    </td></tr>
                  )}
                </FragmentRow>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EField({ label, value, onChange, className }: { label: string; value?: string; onChange: (v: string) => void; className?: string }) {
  return <div className={className}><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">{label}</label><input value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]" /></div>
}
function ESelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <div><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">{label}</label><select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]">{options.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
}
function FragmentRow({ children }: { children: React.ReactNode }) { return <>{children}</> }
