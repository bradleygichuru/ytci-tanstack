import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useApi } from '#/lib/api/use-api'
import {
  PencilSimple, FloppyDisk, X, Plus, Star,
} from '@phosphor-icons/react'
import { FormInput, FormSelect } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'

interface Challenge {
  id: string
  title: string
  description: string
  badgeName?: string
  status: 'draft' | 'active' | 'completed'
  startDate?: string
  endDate?: string
  createdAt: string
}

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
  return { id: '', title: '', description: '', badgeName: '', status: 'draft', startDate: '', endDate: '', createdAt: '' }
}

function ChallengesPage() {
  const api = useApi()
  const [data, setData] = useState<Challenge[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create'>('view')
  const [editData, setEditData] = useState<Challenge | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadList = useCallback(async () => {
    try {
      const r = await api.challenges.list()
      setData(r.items)
    } catch {
      toast.error('Failed to load challenges')
    }
  }, [api])

  useEffect(() => { loadList() }, [loadList])

  const selected = data.find(d => d.id === selectedId) ?? null

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id)
    setPanelMode('edit')
    const c = data.find(d => d.id === id)
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

  const handleSave = useCallback(async () => {
    if (!editData) return
    setSaving(true)
    try {
      let newId: string | undefined
      if (panelMode === 'create') {
        const created = await api.challenges.create(editData as unknown as Record<string, unknown>)
        newId = created.id
        toast.success('Challenge created')
      } else if (selectedId) {
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">Challenges</h1>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Create and manage time-bound challenges for mobile users.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--on-surface-variant)]">{data.length} challenges</span>
          <button onClick={handleNew} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white shadow-sm">
            <Plus className="h-4 w-4" weight="duotone" /> New Challenge
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Badge</th>
                <th className="px-5 py-3">Dates</th>
                <th className="px-5 py-3">Status</th>
                <th className="w-12 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map(c => {
                const isSelected = selectedId === c.id
                return (
                  <tr key={c.id}>
                    <td colSpan={5} className="p-0">
                      <table className="w-full">
                        <tbody>
                          <tr onClick={() => handleSelect(c.id)}
                            className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}>
                            <td className="px-5 py-3">
                              <span className="font-semibold text-[var(--on-surface)]">{c.title}</span>
                              {c.description && <div className="text-[10px] text-[var(--on-surface-variant)]">{c.description}</div>}
                            </td>
                            <td className="px-5 py-3">
                              {c.badgeName ? (
                                <span className="flex items-center gap-1 rounded-full bg-[var(--amber-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--amber-deep)]">
                                  <Star className="h-3 w-3" weight="duotone" /> {c.badgeName}
                                </span>
                              ) : (
                                <span className="text-xs text-[var(--on-surface-variant)]">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">
                              {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}
                              {c.endDate ? ` → ${new Date(c.endDate).toLocaleDateString()}` : ''}
                            </td>
                            <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                            <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-[var(--on-surface-variant)]" weight="duotone" /></td>
                          </tr>
                          {isSelected && editData && (
                            <tr key={`${c.id}-detail`}>
                              <td colSpan={5} className="border-b bg-[var(--surface-2)] p-0">
                                <div className="border-t border-[var(--surface-4)] bg-white px-6 py-5">
                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="md:col-span-2"><FormInput label="Title" required value={editData.title} onChange={v => handleField('title', v)} error={errors.title} /></div>
                                    <div className="md:col-span-2"><FormInput label="Description" value={editData.description ?? ''} onChange={v => handleField('description', v)} /></div>
                                    <FormInput label="Badge Name" value={editData.badgeName ?? ''} onChange={v => handleField('badgeName', v)} />
                                    <FormSelect label="Status" value={editData.status} options={['draft', 'active', 'completed']} onChange={v => handleField('status', v)} />
                                    <FormInput label="Start Date" value={editData.startDate ?? ''} onChange={v => handleField('startDate', v)} />
                                    <FormInput label="End Date" value={editData.endDate ?? ''} onChange={v => handleField('endDate', v)} />
                                  </div>
                                  <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                                    <span className="text-xs text-[var(--on-surface-variant)]">Editing challenges is not yet available from the Go backend. Only creation is supported.</span>
                                    <button onClick={() => { setSelectedId(null); setPanelMode('view') }}
                                      className="flex items-center gap-1.5 rounded-full border border-[var(--surface-4)] px-5 py-2 text-xs font-bold text-[var(--on-surface-variant)] hover:bg-[var(--surface-2)]">
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
                    <div className="border-t border-[var(--surface-4)] bg-white px-6 py-5">
                                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="md:col-span-2"><FormInput label="Title" required value={editData.title} onChange={v => handleField('title', v)} error={errors.title} /></div>
                                        <div className="md:col-span-2"><FormInput label="Description" value={editData.description ?? ''} onChange={v => handleField('description', v)} /></div>
                        <FormInput label="Badge Name" value={editData.badgeName ?? ''} onChange={v => handleField('badgeName', v)} />
                        <FormSelect label="Status" value={editData.status} options={['draft', 'active', 'completed']} onChange={v => handleField('status', v)} />
                        <FormInput label="Start Date" value={editData.startDate ?? ''} onChange={v => handleField('startDate', v)} />
                        <FormInput label="End Date" value={editData.endDate ?? ''} onChange={v => handleField('endDate', v)} />
                      </div>
                      <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                        <button onClick={handleSave} disabled={saving}
                          className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                          {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                          Create Challenge
                        </button>
                        <button onClick={() => { setSelectedId(null); setPanelMode('view'); setEditData(null) }}
                          className="flex items-center gap-1.5 rounded-full border border-[var(--surface-4)] px-5 py-2 text-xs font-bold text-[var(--on-surface-variant)]">
                          <X className="h-4 w-4" weight="duotone" /> Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {data.length === 0 && panelMode !== 'create' && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[var(--on-surface-variant)]">No challenges yet. Create one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Challenge"
        description={`Are you sure you want to delete "${selected?.title}"? This cannot be undone.`}
        onConfirm={() => { setShowDelete(false) }}
      />
    </div>
  )
}
