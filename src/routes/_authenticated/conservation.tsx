import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useApi } from '#/lib/api/use-api'
import { useCursorPagination } from '#/lib/api/use-cursor-pagination'
import { Trash, MapPin, Shield, CheckCircle, XCircle, Eye, User, PencilSimple, FloppyDisk, X, Plus } from '@phosphor-icons/react'
import { FormInput, FormSelect, FormTextarea } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { CursorPagination } from '#/components/shared/CursorPagination'
import { ConservationActivitiesSkeleton, EvidenceSkeleton } from '#/components/skeletons/conservation-skeleton'
import { conservationActivitySchema } from '#/lib/schemas/conservation.schema'

interface Act { id: string; title: string; organizer: string; location: string; locationPrivacyLevel: string; date: string; impactMetric: string; measurementUnit: string; impactGoal: number; impactActual: number; participantCount: number; status: string; verificationRules: string; badgeAwarded: boolean; badgeName: string }
interface Evid { id: string; activityTitle: string; userName: string; description: string; imageUrl: string; status: string; submittedAt: string; reviewedAt?: string; reviewerNote?: string }

export const Route = createFileRoute('/_authenticated/conservation')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'conservation', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: ConservationPage })

function emptyAct(): Act {
  return { id: '', title: '', organizer: '', location: '', locationPrivacyLevel: 'public', date: '', impactMetric: '', measurementUnit: '', impactGoal: 0, impactActual: 0, participantCount: 0, status: 'open', verificationRules: '', badgeAwarded: false, badgeName: '' }
}

function ConservationPage() {
  const api = useApi()
  const [acts, setActs] = useState<Act[] | null>(null)
  const [evids, setEvids] = useState<Evid[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'activities' | 'evidence'>('activities')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create'>('view')
  const [editData, setEditData] = useState<Act | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { cursor, hasMore, setHasMore, setCursor, handleNext: handleNextCursor, handlePrev: handlePrevCursor } = useCursorPagination()

  const loadList = useCallback(async (c?: string | null) => {
    setLoading(true)
    try {
      const r = await api.conservation.activities.list(c ? { cursor: c } : undefined)
      setActs(r.items)
      setHasMore(r.hasMore)
      setCursor(r.nextCursor)
    } catch {
      toast.error('Failed to load activities')
    } finally {
      setLoading(false)
    }
  }, [api])

  const handleNext = useCallback(() => {
    handleNextCursor((c) => loadList(c))
  }, [handleNextCursor, loadList])

  const handlePrev = useCallback(() => {
    handlePrevCursor((c) => loadList(c))
  }, [handlePrevCursor, loadList])

  const loadEvidence = useCallback(async () => {
    try {
      const r = await api.conservation.evidence.list()
      setEvids(r.items)
    } catch {
      toast.error('Failed to load evidence')
    }
  }, [api])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.conservation.activities.list(),
      api.conservation.evidence.list(),
    ]).then(([ar, er]) => {
      setActs(ar.items)
      setHasMore(ar.hasMore)
      setCursor(ar.nextCursor)
      setEvids(er.items)
    }).catch(() => {
      toast.error('Failed to load conservation data')
      setActs([])
      setEvids([])
    }).finally(() => {
      setLoading(false)
    })
  }, [api])

  const handleApprove = useCallback(async (id: string) => {
    await api.conservation.evidence.review(id, 'approve')
    await loadEvidence()
    toast.success('Evidence approved')
  }, [api, loadEvidence])

  const handleReject = useCallback(async (id: string) => {
    await api.conservation.evidence.review(id, 'reject')
    await loadEvidence()
    toast.success('Evidence rejected')
  }, [api, loadEvidence])

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id)
    setPanelMode('edit')
    const a = acts?.find(a => a.id === id)
    if (a) setEditData({ ...a })
    setErrors({})
  }, [selectedId, acts])

  const handleNew = useCallback(() => {
    setSelectedId(null)
    setPanelMode('create')
    setEditData(emptyAct())
    setErrors({})
  }, [])

  const handleField = (field: string, value: unknown) => {
    setEditData(prev => prev ? { ...prev, [field]: value } : prev)
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate = (): boolean => {
    if (!editData) return false
    const result = conservationActivitySchema.safeParse(editData)
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
        const created = await api.conservation.activities.create(editData as unknown as Record<string, unknown>)
        newId = created.id
        toast.success('Activity created')
      } else if (selectedId) {
        await api.conservation.activities.update(selectedId, editData as unknown as Record<string, unknown>)
        toast.success('Activity saved')
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
      toast.error('Failed to save activity')
    } finally {
      setSaving(false)
    }
  }, [editData, selectedId, panelMode, api, loadList])

  const handleDelete = useCallback(async () => {
    if (!selectedId) return
    setDeleting(true)
    try {
      await api.conservation.activities.update(selectedId, { status: 'cancelled' })
      toast.success('Activity deleted')
      setShowDelete(false)
      setSelectedId(null)
      setPanelMode('view')
      await loadList()
    } catch {
      toast.error('Failed to delete activity')
    } finally {
      setDeleting(false)
    }
  }, [selectedId, loadList, api])

  const actsArr = acts ?? []
  const agg = {
    trees: {
      value: actsArr.reduce((sum, a) => sum + (a.impactMetric === 'trees planted' ? a.impactActual : 0), 0),
      target: Math.max(10000, actsArr.length * 1000),
      label: 'Trees Planted',
    },
    cleanups: {
      value: actsArr.reduce((sum, a) => sum + (a.impactMetric === 'kg waste collected' ? a.impactActual : 0), 0),
      target: Math.max(500, actsArr.length * 200),
      label: 'Cleanups',
    },
    wildlife: {
      value: actsArr.reduce((sum, a) => sum + (a.impactMetric === 'corridor observations' ? a.impactActual : 0), 0),
      target: Math.max(3000, actsArr.length * 500),
      label: 'Wildlife Surveyed',
    },
  }
  const selected = acts?.find(d => d.id === selectedId) ?? null

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">Conservation Tracker Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create activity sign-ups, review evidence, and track participation.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Object.entries(agg).map(([key, s]) => (
          <div key={key} className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-sans text-3xl font-bold text-primary">{s.value.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">/ {s.target.toLocaleString()}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--leaf)] to-[var(--forest)]" style={{ width: `${Math.min((s.value / s.target) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 mt-4 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
        {(['activities', 'evidence'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            {t === 'activities' ? 'Activities' : 'Evidence Review'} <span className="ml-1 rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px]">{t === 'activities' ? acts?.length ?? 0 : evids?.length ?? 0}</span>
          </button>
        ))}
      </div>

      {tab === 'activities' && (loading ? <ConservationActivitiesSkeleton /> : <>
        <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="text-xs font-semibold text-muted-foreground">{acts?.length ?? 0} activities</span>
            <button onClick={handleNew} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm"><Plus className="h-4 w-4" weight="duotone" /> New Activity</button>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <th className="px-5 py-3">Name</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Participants</th><th className="px-5 py-3">Impact</th><th className="px-5 py-3">Status</th><th className="w-12 px-5 py-3" />
            </tr></thead>
            <tbody>
              {(acts ?? []).map(a => {
                const isSelected = selectedId === a.id
                const pct = a.impactGoal > 0 ? Math.min((a.impactActual / a.impactGoal) * 100, 100) : 0
                return (
                  <React.Fragment key={a.id}>
                    <tr onClick={() => handleSelect(a.id)}
                      className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-foreground">{a.title}</div>
                        <div className="text-[10px] text-muted-foreground">{a.organizer}</div>
                      </td>
                      <td className="px-5 py-3">
                        {a.locationPrivacyLevel === 'sensitive'
                          ? <span className="flex items-center gap-1 text-xs text-[var(--amber-deep)]"><Shield className="h-3 w-3" weight="duotone" /> Location restricted</span>
                          : <span className="flex items-center gap-1 text-xs text-foreground"><MapPin className="h-3 w-3" weight="duotone" /> {a.location}</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(a.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{a.participantCount}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-primary">{a.impactActual}</span>
                          <span className="text-xs text-muted-foreground">/ {a.impactGoal}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-[var(--surface-2)]"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct > 80 ? 'var(--leaf)' : pct > 40 ? 'var(--amber)' : 'var(--on-surface-variant)' }} /></div>
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-muted-foreground" weight="duotone" /></td>
                    </tr>
                    {isSelected && editData && (
                      <tr><td colSpan={7} className="border-b p-0">
                        <div className="border-t border-border bg-card px-6 py-5">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormInput label="Title" required value={editData.title} onChange={v => handleField('title', v)} error={errors.title} />
                            <FormInput label="Organizer" required value={editData.organizer} onChange={v => handleField('organizer', v)} error={errors.organizer} />
                            <FormInput label="Location" value={editData.locationPrivacyLevel === 'sensitive' ? '[RESTRICTED]' : editData.location} onChange={() => {}} />
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-foreground">Privacy Level</label>
                              <div className="flex items-center gap-2">
                                {['public', 'sensitive'].map(p => (
                                  <label key={p} className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${editData.locationPrivacyLevel === p ? 'bg-primary text-white' : 'border border-border text-muted-foreground'}`}>
                                    <input type="radio" name="privacy" checked={editData.locationPrivacyLevel === p} onChange={() => handleField('locationPrivacyLevel', p)} className="sr-only" />
                                    {p === 'sensitive' ? <Shield className="h-3 w-3" weight="duotone" /> : ''} {p}
                                  </label>
                                ))}
                              </div>
                              {editData.locationPrivacyLevel === 'sensitive' && <p className="mt-1 text-[10px] text-destructive">⚠ Do not display sensitive wildlife locations (§5.15)</p>}
                            </div>
                            <FormInput label="Date" value={editData.date} onChange={v => handleField('date', v)} />
                      <FormSelect label="Status" value={editData.status} options={['open', 'full', 'completed', 'cancelled']} onChange={v => handleField('status', v)} />
                            <FormInput label="Impact Metric" value={editData.impactMetric} onChange={v => handleField('impactMetric', v)} />
                            <FormInput label="Goal Count" value={String(editData.impactGoal)} onChange={v => handleField('impactGoal', Number(v))} />
                            <FormInput label="Measurement Unit" value={editData.measurementUnit} onChange={v => handleField('measurementUnit', v)} />
                            <FormInput label="Badge Name" value={editData.badgeName} onChange={v => handleField('badgeName', v)} />
                            <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-foreground">Verification Rules</label><textarea value={editData.verificationRules} onChange={e => handleField('verificationRules', e.target.value)} rows={3} className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground focus:border-primary" /></div>
                          </div>
                          <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                              {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                              {panelMode === 'create' ? 'Create Activity' : 'Save Changes'}
                            </button>
                            {panelMode === 'edit' && (
                              <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 rounded-full border border-red-300 bg-card px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                                <Trash className="h-4 w-4" weight="duotone" /> Delete
                              </button>
                            )}
                            <button onClick={() => { setSelectedId(null); setPanelMode('view') }} className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground">
                              <X className="h-4 w-4" weight="duotone" /> Cancel
                            </button>
                          </div>
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                )
              })}
              {acts?.length === 0 && panelMode !== 'create' && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">No activities yet. Create one to get started.</td></tr>
              )}
              {panelMode === 'create' && editData && (
                <tr key="create-row"><td colSpan={7} className="border-b p-0">
                  <div className="border-t border-border bg-card px-6 py-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormInput label="Title" required value={editData.title} onChange={v => handleField('title', v)} error={errors.title} />
                      <FormInput label="Organizer" required value={editData.organizer} onChange={v => handleField('organizer', v)} error={errors.organizer} />
                      {editData.locationPrivacyLevel === 'sensitive'
                        ? <div><label className="mb-1 block text-xs font-semibold text-foreground">Location</label><div className="flex items-center gap-1 rounded-md border border-border bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--amber-deep)]"><Shield className="h-3 w-3" weight="duotone" /> Location restricted for wildlife protection</div><input type="hidden" value={editData.location} /></div>
                        : <FormInput label="Location" value={editData.location} onChange={v => handleField('location', v)} />}
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-foreground">Privacy Level</label>
                        <div className="flex items-center gap-2">
                          {['public', 'sensitive'].map(p => (
                            <label key={p} className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${editData.locationPrivacyLevel === p ? 'bg-primary text-white' : 'border border-border text-muted-foreground'}`}>
                              <input type="radio" name="privacy-c" checked={editData.locationPrivacyLevel === p} onChange={() => handleField('locationPrivacyLevel', p)} className="sr-only" />
                              {p === 'sensitive' ? <Shield className="h-3 w-3" weight="duotone" /> : ''} {p}
                            </label>
                          ))}
                        </div>
                        {editData.locationPrivacyLevel === 'sensitive' && <p className="mt-1 text-[10px] text-destructive">⚠ Do not display sensitive wildlife locations (§5.15)</p>}
                      </div>
                      <FormInput label="Date" value={editData.date} onChange={v => handleField('date', v)} />
                      <FormSelect label="Status" value={editData.status} options={['open', 'full', 'completed', 'cancelled']} onChange={v => handleField('status', v)} />
                      <FormInput label="Impact Metric" value={editData.impactMetric} onChange={v => handleField('impactMetric', v)} />
                      <FormInput label="Goal Count" value={String(editData.impactGoal)} onChange={v => handleField('impactGoal', Number(v))} />
                      <FormInput label="Measurement Unit" value={editData.measurementUnit} onChange={v => handleField('measurementUnit', v)} />
                      <FormInput label="Badge Name" value={editData.badgeName} onChange={v => handleField('badgeName', v)} />
                    </div>
                    <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                      <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                        {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                        Create Activity
                      </button>
                      <button onClick={() => { setSelectedId(null); setPanelMode('view'); setEditData(null) }} className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground">
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
          loading={loading}
        />
      </>)}

      {tab === 'evidence' && (loading ? <EvidenceSkeleton /> : 
        <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <th className="px-5 py-3">Activity</th><th className="px-5 py-3">User</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Status</th><th className="w-28 px-5 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {evids.map(e => (
                <tr key={e.id} className="border-b hover:bg-[var(--surface-2)]">
                  <td className="px-5 py-3 text-sm font-semibold text-foreground">{e.activityTitle}</td>
                  <td className="px-5 py-3"><span className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" weight="duotone" /> {e.userName}</span></td>
                  <td className="max-w-xs truncate px-5 py-3 text-xs text-muted-foreground">{e.description}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(e.submittedAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                  <td className="px-5 py-3 text-right">
                    {e.status === 'pending' && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleApprove(e.id)} className="rounded-full bg-[var(--leaf)] p-1.5 text-white"><CheckCircle className="h-4 w-4" weight="fill" /></button>
                        <button onClick={() => handleReject(e.id)} className="rounded-full bg-destructive p-1.5 text-white"><XCircle className="h-4 w-4" weight="fill" /></button>
                        <button className="rounded-full border border-border p-1.5 text-muted-foreground"><Eye className="h-4 w-4" weight="duotone" /></button>
                      </div>
                    )}
                    {e.status !== 'pending' && <span className="text-[10px] text-muted-foreground">{e.reviewerNote?.substring(0, 40)}</span>}
                  </td>
                </tr>
              ))}
              {evids && evids.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">No evidence items to review.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Activity"
        description={`Are you sure you want to delete "${selected?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
