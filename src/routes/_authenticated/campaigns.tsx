import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { api } from '#/lib/api/client'
import {
  Megaphone, Image, PushPin, Calendar, PencilSimple,
  FloppyDisk, X, PlusCircle, MapPin, Bell, Gear,
} from '@phosphor-icons/react'

interface Campaign { id: string; title: string; description: string; bannerUrl: string; type: string; status: string; startDate: string; endDate: string; targetUrl?: string; featuredDestinationId?: string; audience?: string }

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'var(--surface-2)', text: 'var(--on-surface-variant)' },
  active: { bg: 'var(--leaf-bg)', text: 'var(--leaf)' },
  paused: { bg: 'var(--amber-bg)', text: 'var(--amber-deep)' },
  ended: { bg: 'rgba(186,26,26,0.1)', text: 'var(--error)' },
}

function Pill({ status }: { status: string }) {
  const s = statusColors[status] ?? statusColors.draft
  return <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: s.bg, color: s.text }}>{status}</span>
}

const typeStyles: Record<string, { icon: typeof Image; color: string; label: string }> = {
  home_banner: { icon: Image, color: '#154212', label: 'Banner' },
  featured_destination: { icon: MapPin, color: '#345a00', label: 'Featured' },
  push_notification: { icon: Bell, color: '#785a00', label: 'Push' },
  seasonal: { icon: Calendar, color: '#2d5a27', label: 'Seasonal' },
}

const transitions: Record<string, string[]> = { draft: ['active'], active: ['paused', 'ended'], paused: ['active', 'ended'], ended: ['draft'] }

export const Route = createFileRoute('/_authenticated/campaigns')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'campaigns', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: CampaignsPage })

function CampaignsPage() {
  const [data, setData] = useState<Campaign[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Campaign | null>(null)

  useEffect(() => { api.list('campaigns').then(r => setData(r.items as Campaign[])) }, [])

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id); const c = data.find(c => c.id === id); if (c) setEditData({ ...c })
  }, [selectedId, data])

  const handleSave = useCallback(async () => {
    if (!selectedId || !editData) return
    await api.update('campaigns', selectedId, editData)
    const r = await api.list('campaigns'); setData(r.items as Campaign[]); setSelectedId(null)
  }, [selectedId, editData])

  const handleStatus = useCallback(async (s: string) => {
    if (!editData) return
    const updated = { ...editData, status: s }
    setEditData(updated)
    await api.update('campaigns', editData.id, { status: s })
    const r = await api.list('campaigns'); setData(r.items as Campaign[])
  }, [editData])

  if (!data.length) return <div className="mt-8 text-center text-sm text-[var(--on-surface-variant)]">Loading...</div>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">Campaigns</h1>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Home banners, featured destinations, push notifications, and seasonal campaigns.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--on-surface-variant)]">{data.length} campaigns</span>
          <button className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white shadow-sm"><PlusCircle className="h-4 w-4" weight="duotone" /> New Campaign</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
            <th className="px-5 py-3">Campaign</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Schedule</th><th className="px-5 py-3">Banner</th><th className="px-5 py-3">Status</th><th className="w-12 px-5 py-3" />
          </tr></thead>
          <tbody>
            {data.map(c => {
              const isSelected = selectedId === c.id
              const ts = typeStyles[c.type]
              const Icon = ts.icon
              return (
                <FragmentRow key={c.id}>
                  <tr onClick={() => handleSelect(c.id)} className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}>
                    <td className="px-5 py-3"><div className="font-semibold text-[var(--on-surface)]">{c.title}</div><div className="text-[10px] text-[var(--on-surface-variant)]">{c.description?.substring(0, 60)}</div></td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${ts.color}20`, color: ts.color }}>
                        <Icon className="h-3 w-3" weight="duotone" /> {ts.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{new Date(c.startDate).toLocaleDateString()} — {new Date(c.endDate).toLocaleDateString()}</td>
                    <td className="px-5 py-3">{c.bannerUrl ? <div className="h-8 w-14 rounded bg-gradient-to-br from-[var(--forest)] to-[var(--forest-leaf)]" /> : <span className="text-[10px] text-[var(--on-surface-variant)]">—</span>}</td>
                    <td className="px-5 py-3"><Pill status={c.status} /></td>
                    <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-[var(--on-surface-variant)]" weight="duotone" /></td>
                  </tr>
                  {isSelected && editData && (
                    <tr><td colSpan={6} className="border-b p-0">
                      <div className="border-t border-[var(--surface-4)] bg-white px-6 py-5">
                        <div className="grid grid-cols-2 gap-4">
                          <EField label="Title" value={editData.title} onChange={v => setEditData({ ...editData, title: v })} className="col-span-2" />
                          <EField label="Description" value={editData.description} onChange={v => setEditData({ ...editData, description: v })} className="col-span-2" />
                          <ESelect label="Campaign Type" value={editData.type} options={['home_banner', 'featured_destination', 'push_notification', 'seasonal']} onChange={v => setEditData({ ...editData, type: v })} />
                          <EField label="Banner URL" value={editData.bannerUrl} onChange={v => setEditData({ ...editData, bannerUrl: v })} />
                          {editData.bannerUrl && <div className="flex h-20 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--forest)] to-[var(--forest-leaf)] text-white/60 text-xs">Banner preview</div>}
                          <EField label="Target URL" value={editData.targetUrl ?? ''} onChange={v => setEditData({ ...editData, targetUrl: v })} />
                          {editData.type === 'featured_destination' && <EField label="Destination ID" value={editData.featuredDestinationId ?? ''} onChange={v => setEditData({ ...editData, featuredDestinationId: v })} />}
                          {editData.type === 'push_notification' && <EField label="Audience" value={editData.audience ?? ''} onChange={v => setEditData({ ...editData, audience: v })} />}
                          <EField label="Start Date" value={editData.startDate} onChange={v => setEditData({ ...editData, startDate: v })} />
                          <EField label="End Date" value={editData.endDate} onChange={v => setEditData({ ...editData, endDate: v })} />

                          {/* Status Workflow */}
                          <div className="col-span-2 rounded-lg border border-[var(--surface-4)] p-4">
                            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Status Workflow</h3>
                            <div className="flex flex-wrap gap-2">
                              {['draft', 'active', 'paused', 'ended'].map(s => (
                                <span key={s} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${editData.status === s ? 'shadow-sm' : 'opacity-60'}`}
                                  style={{ backgroundColor: statusColors[s].bg, color: statusColors[s].text }}>
                                  {s} {editData.status === s && <span className="ml-1">• current</span>}
                                </span>
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(transitions[editData.status] ?? []).map(target => (
                                <button key={target} onClick={() => handleStatus(target)}
                                  className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors"
                                  style={{ backgroundColor: statusColors[target].text }}>
                                  → {target}
                                </button>
                              ))}
                            </div>
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
