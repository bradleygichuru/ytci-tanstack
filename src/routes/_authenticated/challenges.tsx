import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useApi } from '#/lib/api/use-api'
import {
  PencilSimple, FloppyDisk, X, Plus, Star, Trash, CheckCircle, XCircle, User,
} from '@phosphor-icons/react'
import { FormInput, FormSelect, FormTextarea } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { ChallengesSkeleton } from '#/components/skeletons/challenges-skeleton'
import { challengeSchema } from '#/lib/schemas/challenge.schema'
import type { Challenge, ChallengeEvidence } from '#/lib/api/challenges'

export const Route = createFileRoute('/_authenticated/challenges')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'challenges', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: ChallengesPage,
})

function emptyChallenge(): Challenge {
  return { id: '', title: '', description: '', badgeName: '', rules: '', badgeIconUrl: '', eligibility: '', status: 'draft', startDate: '', endDate: '', createdAt: '' }
}

function ChallengesPage() {
  const api = useApi()
  const [data, setData] = useState<Challenge[] | null>(null)
  const [evids, setEvids] = useState<ChallengeEvidence[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'challenges' | 'evidence'>('challenges')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create'>('view')
  const [editData, setEditData] = useState<Challenge | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.challenges.list()
      setData(r.items)
    } catch {
      toast.error('Failed to load challenges')
      setData(current => current === null ? [] : current)
    } finally {
      setLoading(false)
    }
  }, [api])

  const loadEvidence = useCallback(async () => {
    try {
      const r = await api.challenges.evidence.list()
      setEvids(r.items)
    } catch {
      toast.error('Failed to load evidence')
    }
  }, [api])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.challenges.list(),
      api.challenges.evidence.list(),
    ]).then(([cr, er]) => {
      setData(cr.items)
      setEvids(er.items)
    }).catch(() => {
      toast.error('Failed to load challenge data')
      setData([])
      setEvids([])
    }).finally(() => {
      setLoading(false)
    })
  }, [api])

  const handleApprove = useCallback(async (id: string) => {
    await api.challenges.evidence.review(id, 'approve')
    await loadEvidence()
    toast.success('Evidence approved')
  }, [api, loadEvidence])

  const handleReject = useCallback(async (id: string) => {
    await api.challenges.evidence.review(id, 'reject')
    await loadEvidence()
    toast.success('Evidence rejected')
  }, [api, loadEvidence])

  const selected = data?.find(d => d.id === selectedId) ?? null

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id)
    setPanelMode('edit')
    const c = data?.find(d => d.id === id)
    if (c) setEditData({ ...c })
    setErrors({})
  }, [selectedId, data])

  const handleNew = useCallback(() => {
    setSelectedId(null)
    setPanelMode('create')
    setEditData(emptyChallenge())
    setErrors({})
  }, [])

  const handleField = (field: string, value: unknown) => {
    setEditData(prev => prev ? { ...prev, [field]: value } : prev)
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate = (): boolean => {
    if (!editData) return false
    const result = challengeSchema.safeParse(editData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = issue.message
      }
      setErrors(fieldErrors)
      toast.error('Validation failed. Check highlighted fields.')
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
        const created = await api.challenges.create(editData as unknown as Record<string, unknown>)
        newId = created.id
        toast.success('Challenge created')
      } else if (selectedId) {
        await api.challenges.update(selectedId, editData as unknown as Record<string, unknown>)
        toast.success('Challenge saved')
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
      toast.error('Failed to save challenge')
    } finally {
      setSaving(false)
    }
  }, [editData, selectedId, panelMode, api, loadList])

  const handleDelete = useCallback(async () => {
    if (!selectedId) return
    setDeleting(true)
    try {
      await api.challenges.remove(selectedId)
      toast.success('Challenge ended')
      setShowDelete(false)
      setSelectedId(null)
      setPanelMode('view')
      await loadList()
    } catch {
      toast.error('Failed to end challenge')
    } finally {
      setDeleting(false)
    }
  }, [selectedId, loadList, api])

  if (loading) return <ChallengesSkeleton />

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">Challenges</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage challenges and review evidence.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{data?.length ?? 0} challenges</span>
          <button onClick={handleNew} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm">
            <Plus className="h-4 w-4" weight="duotone" /> New Challenge
          </button>
        </div>
      </div>

      <div className="mb-6 mt-4 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
        {(['challenges', 'evidence'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            {t === 'challenges' ? 'Challenges' : 'Evidence Review'} <span className="ml-1 rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px]">{t === 'challenges' ? data?.length ?? 0 : evids?.length ?? 0}</span>
          </button>
        ))}
      </div>

      {tab === 'challenges' && (
        <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Badge</th>
                  <th className="px-5 py-3">Dates</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="w-12 px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map(c => {
                  const isSelected = selectedId === c.id
                  return (
                    <tr key={c.id}>
                      <td colSpan={5} className="p-0">
                        <table className="w-full">
                          <tbody>
                            <tr onClick={() => handleSelect(c.id)}
                              className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}>
                              <td className="px-5 py-3">
                                <span className="font-semibold text-foreground">{c.title}</span>
                                {c.description && <div className="text-[10px] text-muted-foreground">{c.description}</div>}
                              </td>
                              <td className="px-5 py-3">
                                {c.badgeName ? (
                                  <span className="flex items-center gap-1 rounded-full bg-[var(--amber-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--amber-deep)]">
                                    <Star className="h-3 w-3" weight="duotone" /> {c.badgeName}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-xs text-muted-foreground">
                                {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}
                                {c.endDate ? ` → ${new Date(c.endDate).toLocaleDateString()}` : ''}
                              </td>
                              <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                              <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-muted-foreground" weight="duotone" /></td>
                            </tr>
                            {isSelected && editData && (
                              <tr key={`${c.id}-detail`}>
                                <td colSpan={5} className="border-b bg-[var(--surface-2)] p-0">
                                  <div className="border-t border-border bg-card px-6 py-5">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                      <div className="md:col-span-2"><FormInput label="Title" required value={editData.title} onChange={v => handleField('title', v)} error={errors.title} /></div>
                                      <div className="md:col-span-2"><FormInput label="Description" required value={editData.description ?? ''} onChange={v => handleField('description', v)} error={errors.description} /></div>
                                      <FormInput label="Badge Name" required value={editData.badgeName ?? ''} onChange={v => handleField('badgeName', v)} error={errors.badgeName} />
                                      <FormSelect label="Status" value={editData.status} options={['draft', 'active', 'ended']} onChange={v => handleField('status', v)} />
                                      <FormInput label="Start Date" value={editData.startDate ?? ''} onChange={v => handleField('startDate', v)} />
                                      <FormInput label="End Date" value={editData.endDate ?? ''} onChange={v => handleField('endDate', v)} />
                                      <FormInput label="Badge Icon URL" value={editData.badgeIconUrl ?? ''} onChange={v => handleField('badgeIconUrl', v)} />
                                      <div className="md:col-span-2"><FormTextarea label="Rules" value={editData.rules ?? ''} onChange={v => handleField('rules', v)} /></div>
                                      <div className="md:col-span-2"><FormTextarea label="Eligibility (JSON)" value={editData.eligibility ?? ''} onChange={v => handleField('eligibility', v)} /></div>
                                    </div>
                                    <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                                      <button onClick={handleSave} disabled={saving}
                                        className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                                        {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                                        Save Changes
                                      </button>
                                      <button onClick={() => setShowDelete(true)}
                                        className="flex items-center gap-1.5 rounded-full border border-red-300 bg-card px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                                        <Trash className="h-4 w-4" weight="duotone" /> End Challenge
                                      </button>
                                      <button onClick={() => { setSelectedId(null); setPanelMode('view') }}
                                        className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground hover:bg-[var(--surface-2)]">
                                        <X className="h-4 w-4" weight="duotone" /> Cancel
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )
                })}
                {panelMode === 'create' && editData && (
                  <tr key="create-row">
                    <td colSpan={5} className="border-b bg-[var(--surface-2)] p-0">
                      <div className="border-t border-border bg-card px-6 py-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="md:col-span-2"><FormInput label="Title" required value={editData.title} onChange={v => handleField('title', v)} error={errors.title} /></div>
                          <div className="md:col-span-2"><FormInput label="Description" required value={editData.description ?? ''} onChange={v => handleField('description', v)} error={errors.description} /></div>
                          <FormInput label="Badge Name" required value={editData.badgeName ?? ''} onChange={v => handleField('badgeName', v)} error={errors.badgeName} />
                          <FormSelect label="Status" value={editData.status} options={['draft', 'active', 'ended']} onChange={v => handleField('status', v)} />
                          <FormInput label="Start Date" value={editData.startDate ?? ''} onChange={v => handleField('startDate', v)} />
                          <FormInput label="End Date" value={editData.endDate ?? ''} onChange={v => handleField('endDate', v)} />
                          <FormInput label="Badge Icon URL" value={editData.badgeIconUrl ?? ''} onChange={v => handleField('badgeIconUrl', v)} />
                          <div className="md:col-span-2"><FormTextarea label="Rules" value={editData.rules ?? ''} onChange={v => handleField('rules', v)} /></div>
                          <div className="md:col-span-2"><FormTextarea label="Eligibility (JSON)" value={editData.eligibility ?? ''} onChange={v => handleField('eligibility', v)} /></div>
                        </div>
                        <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                          <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                            Create Challenge
                          </button>
                          <button onClick={() => { setSelectedId(null); setPanelMode('view'); setEditData(null) }}
                            className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground">
                            <X className="h-4 w-4" weight="duotone" /> Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {data?.length === 0 && panelMode !== 'create' && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">No challenges yet. Create one to get started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'evidence' && (
        <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <th className="px-5 py-3">Challenge</th><th className="px-5 py-3">User</th><th className="px-5 py-3">Evidence</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Submitted</th><th className="w-28 px-5 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {(evids ?? []).map(e => (
                  <tr key={e.id} className="border-b hover:bg-[var(--surface-2)]">
                    <td className="px-5 py-3 text-sm font-semibold text-foreground">{e.challengeTitle}</td>
                    <td className="px-5 py-3"><span className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" weight="duotone" /> {e.userName}</span></td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {(() => {
                        if (!e.evidence) return '—'
                        try {
                          const ev = typeof e.evidence === 'string' ? JSON.parse(e.evidence) : e.evidence
                          return (
                            <div className="space-y-0.5">
                              {ev.description && <div className="max-w-xs truncate">{ev.description}</div>}
                              {ev.lat != null && ev.lng != null && (
                                <a href={`https://www.google.com/maps?q=${ev.lat},${ev.lng}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                  {ev.lat.toFixed(4)}, {ev.lng.toFixed(4)}
                                </a>
                              )}
                            </div>
                          )
                        } catch { return '—' }
                      })()}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      {e.status === 'submitted' && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleApprove(e.id)} className="rounded-full bg-[var(--leaf)] p-1.5 text-white"><CheckCircle className="h-4 w-4" weight="fill" /></button>
                          <button onClick={() => handleReject(e.id)} className="rounded-full bg-destructive p-1.5 text-white"><XCircle className="h-4 w-4" weight="fill" /></button>
                        </div>
                      )}
                      {e.status !== 'submitted' && (
                        <span className="text-[10px] text-muted-foreground">
                          {e.status === 'approved' && `Awarded ${e.badgeAwardedAt ? new Date(e.badgeAwardedAt).toLocaleDateString() : ''}`}
                          {e.status === 'in_progress' && 'Resubmit allowed'}
                          {e.status === 'rejected' && e.moderationNote ? e.moderationNote.substring(0, 40) : 'Rejected'}
                        </span>
                      )}
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
        title="End Challenge"
        description={`Are you sure you want to end "${selected?.title}"? This will stop new participation.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
