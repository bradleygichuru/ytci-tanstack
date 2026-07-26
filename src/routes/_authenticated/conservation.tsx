import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { api } from '#/lib/api/client'
import { Tree, Trash, Eye, MapPin, Shield, CheckCircle, XCircle, Clock, User, PencilSimple, FloppyDisk, X, PlusCircle } from '@phosphor-icons/react'

interface Act { id: string; title: string; organizer: string; location: string; locationPrivacyLevel: string; date: string; impactMetric: string; measurementUnit: string; impactGoal: number; impactActual: number; participantCount: number; status: string; verificationRules: string; badgeAwarded: boolean; badgeName: string }
interface Evid { id: string; activityTitle: string; userName: string; description: string; imageUrl: string; status: string; submittedAt: string; reviewedAt?: string; reviewerNote?: string }

const statusStyle: Record<string, { bg: string; text: string }> = {
  open: { bg: 'var(--leaf-bg)', text: 'var(--leaf)' }, full: { bg: 'var(--amber-bg)', text: 'var(--amber-deep)' },
  completed: { bg: 'var(--surface-2)', text: 'var(--on-surface-variant)' }, cancelled: { bg: 'rgba(186,26,26,0.1)', text: 'var(--error)' },
  pending: { bg: 'var(--amber-bg)', text: 'var(--amber-deep)' }, approved: { bg: 'var(--leaf-bg)', text: 'var(--leaf)' }, rejected: { bg: 'rgba(186,26,26,0.1)', text: 'var(--error)' },
}

function Pill({ status }: { status: string }) {
  const s = statusStyle[status] ?? statusStyle.pending
  return <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: s.bg, color: s.text }}>{status}</span>
}

export const Route = createFileRoute('/_authenticated/conservation')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'conservation', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: ConservationPage })

function ConservationPage() {
  const [acts, setActs] = useState<Act[]>([])
  const [evids, setEvids] = useState<Evid[]>([])
  const [tab, setTab] = useState<'activities' | 'evidence'>('activities')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Act | null>(null)

  useEffect(() => { api.list('conservation').then(r => setActs(r.items as Act[])); api.list('conservation', { cursor: 'evidence' }).then(r => setEvids(r.items as Evid[])) }, [])

  const handleApprove = useCallback(async (id: string) => { await api.update('conservation', id, { status: 'approved' }); api.list('conservation', { cursor: 'evidence' }).then(r => setEvids(r.items as Evid[])) }, [])
  const handleReject = useCallback(async (id: string) => { await api.update('conservation', id, { status: 'rejected', reviewerNote: 'Rejected — insufficient evidence' }); api.list('conservation', { cursor: 'evidence' }).then(r => setEvids(r.items as Evid[])) }, [])

  const agg = { trees: { value: 8054, target: 10000 }, cleanups: { value: 234, target: 500 }, wildlife: { value: 1826, target: 3000 } }

  return (
    <div>
      <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">Conservation Tracker Administration</h1>
      <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Create activity sign-ups, review evidence, and track participation.</p>

      {/* Aggregate stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {Object.entries(agg).map(([key, s]) => (
          <div key={key} className="rounded-lg border border-[var(--surface-4)] bg-white p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">{s.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-sans text-3xl font-bold text-[var(--forest)]">{s.value.toLocaleString()}</span>
              <span className="text-xs text-[var(--on-surface-variant)]">/ {s.target.toLocaleString()}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--leaf)] to-[var(--forest)]" style={{ width: `${Math.min((s.value / s.target) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="my-4 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
        {(['activities', 'evidence'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-white text-[var(--on-surface)] shadow-sm' : 'text-[var(--on-surface-variant)]'}`}>
            {t === 'activities' ? 'Activities' : 'Evidence Review'} <span className="ml-1 rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px]">{t === 'activities' ? acts.length : evids.length}</span>
          </button>
        ))}
      </div>

      {/* Activities tab */}
      {tab === 'activities' && (
        <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center justify-between border-b border-[var(--surface-4)] px-5 py-3">
            <span className="text-xs font-semibold text-[var(--on-surface-variant)]">{acts.length} activities</span>
            <button className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white shadow-sm"><PlusCircle className="h-4 w-4" weight="duotone" /> New Activity</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
              <th className="px-5 py-3">Name</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Participants</th><th className="px-5 py-3">Impact</th><th className="px-5 py-3">Status</th><th className="w-12 px-5 py-3" />
            </tr></thead>
            <tbody>
              {acts.map(a => {
                const isSelected = selectedId === a.id
                const pct = a.impactGoal > 0 ? Math.min((a.impactActual / a.impactGoal) * 100, 100) : 0
                return (
                  <FragmentRow key={a.id}>
                    <tr onClick={() => { if (selectedId === a.id) { setSelectedId(null); return } setSelectedId(a.id); setEditData({ ...a }) }}
                      className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-[var(--on-surface)]">{a.title}</div>
                        <div className="text-[10px] text-[var(--on-surface-variant)]">{a.organizer}</div>
                      </td>
                      <td className="px-5 py-3">
                        {a.locationPrivacyLevel === 'sensitive'
                          ? <span className="flex items-center gap-1 text-xs text-[var(--amber-deep)]"><Shield className="h-3 w-3" weight="duotone" /> Location restricted</span>
                          : <span className="flex items-center gap-1 text-xs text-[var(--on-surface)]"><MapPin className="h-3 w-3" weight="duotone" /> {a.location}</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{new Date(a.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{a.participantCount}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--forest)]">{a.impactActual}</span>
                          <span className="text-xs text-[var(--on-surface-variant)]">/ {a.impactGoal} {a.measurementUnit}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-[var(--surface-2)]"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct > 80 ? 'var(--leaf)' : pct > 40 ? 'var(--amber)' : 'var(--on-surface-variant)' }} /></div>
                      </td>
                      <td className="px-5 py-3"><Pill status={a.status} /></td>
                      <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-[var(--on-surface-variant)]" weight="duotone" /></td>
                    </tr>
                    {isSelected && editData && (
                      <tr><td colSpan={7} className="border-b p-0">
                        <div className="border-t border-[var(--surface-4)] bg-white px-6 py-5">
                          <div className="grid grid-cols-2 gap-4">
                            <EField label="Title" value={editData.title} onChange={v => setEditData({ ...editData, title: v })} />
                            <EField label="Organizer" value={editData.organizer} onChange={v => setEditData({ ...editData, organizer: v })} />
                            <EField label="Location" value={editData.locationPrivacyLevel === 'sensitive' ? '[RESTRICTED]' : editData.location} onChange={() => {}} disabled />
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Privacy Level</label>
                              <div className="flex items-center gap-2">
                                {['public', 'sensitive'].map(p => (
                                  <label key={p} className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${editData.locationPrivacyLevel === p ? 'bg-[var(--forest)] text-white' : 'border border-[var(--surface-4)] text-[var(--on-surface-variant)]'}`}>
                                    <input type="radio" name="privacy" checked={editData.locationPrivacyLevel === p} onChange={() => setEditData({ ...editData, locationPrivacyLevel: p })} className="sr-only" />
                                    {p === 'sensitive' ? <Shield className="h-3 w-3" weight="duotone" /> : ''} {p}
                                  </label>
                                ))}
                              </div>
                              {editData.locationPrivacyLevel === 'sensitive' && <p className="mt-1 text-[10px] text-[var(--error)]">⚠ Do not display sensitive wildlife locations (§5.15)</p>}
                            </div>
                            <EField label="Date" value={editData.date} onChange={v => setEditData({ ...editData, date: v })} />
                            <EStatusSelect label="Status" value={editData.status} options={['open', 'full', 'completed', 'cancelled']} onChange={v => setEditData({ ...editData, status: v })} />
                            <EField label="Impact Metric" value={editData.impactMetric} onChange={v => setEditData({ ...editData, impactMetric: v })} />
                            <EField label="Goal Count" value={String(editData.impactGoal)} onChange={v => setEditData({ ...editData, impactGoal: Number(v) })} />
                            <EField label="Measurement Unit" value={editData.measurementUnit} onChange={v => setEditData({ ...editData, measurementUnit: v })} />
                            <EField label="Badge Name" value={editData.badgeName} onChange={v => setEditData({ ...editData, badgeName: v })} className="col-span-2" />
                            <div className="col-span-2"><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Verification Rules</label><textarea value={editData.verificationRules} onChange={e => setEditData({ ...editData, verificationRules: e.target.value })} rows={3} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]" /></div>
                          </div>
                          <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                            <button onClick={async () => { await api.update('conservation', editData.id, editData); api.list('conservation').then(r => setActs(r.items as Act[])); setSelectedId(null) }} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm"><FloppyDisk className="h-4 w-4" weight="duotone" /> Save</button>
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
      )}

      {/* Evidence Review tab */}
      {tab === 'evidence' && (
        <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
              <th className="px-5 py-3">Activity</th><th className="px-5 py-3">User</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Status</th><th className="w-28 px-5 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {evids.map(e => (
                <tr key={e.id} className="border-b hover:bg-[var(--surface-2)]">
                  <td className="px-5 py-3 text-sm font-semibold text-[var(--on-surface)]">{e.activityTitle}</td>
                  <td className="px-5 py-3"><span className="flex items-center gap-1 text-xs text-[var(--on-surface-variant)]"><User className="h-3 w-3" weight="duotone" /> {e.userName}</span></td>
                  <td className="max-w-xs truncate px-5 py-3 text-xs text-[var(--on-surface-variant)]">{e.description}</td>
                  <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{new Date(e.submittedAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3"><Pill status={e.status} /></td>
                  <td className="px-5 py-3 text-right">
                    {e.status === 'pending' && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleApprove(e.id)} className="rounded-full bg-[var(--leaf)] p-1.5 text-white"><CheckCircle className="h-4 w-4" weight="fill" /></button>
                        <button onClick={() => handleReject(e.id)} className="rounded-full bg-[var(--error)] p-1.5 text-white"><XCircle className="h-4 w-4" weight="fill" /></button>
                        <button className="rounded-full border border-[var(--surface-4)] p-1.5 text-[var(--on-surface-variant)]"><Eye className="h-4 w-4" weight="duotone" /></button>
                      </div>
                    )}
                    {e.status !== 'pending' && <span className="text-[10px] text-[var(--on-surface-variant)]">{e.reviewerNote?.substring(0, 40)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EField({ label, value, onChange, disabled, className }: { label: string; value?: string; onChange: (v: string) => void; disabled?: boolean; className?: string }) {
  return <div className={className}><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">{label}</label><input value={value ?? ''} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)] disabled:opacity-60" /></div>
}
function EStatusSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <div><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">{label}</label><select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]">{options.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
}
function FragmentRow({ children }: { children: React.ReactNode }) { return <>{children}</> }
