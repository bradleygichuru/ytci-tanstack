import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useApi } from '#/lib/api/use-api'
import { useCursorPagination } from '#/lib/api/use-cursor-pagination'
import { MediaUpload } from '#/components/shared/MediaUpload'
import type { PushAudience, PushHistoryItem } from '#/lib/api/push'
import {
  Megaphone, GlobeHemisphereWest, Bell, Timer, PencilSimple,
  FloppyDisk, X, Plus, Trash, PaperPlaneTilt, CalendarBlank,
} from '@phosphor-icons/react'
import { FormInput, FormSelect } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { CursorPagination } from '#/components/shared/CursorPagination'
import { campaignSchema } from '#/lib/schemas/campaign.schema'

interface Campaign { id: string; title: string; description: string; type: 'home_banner' | 'featured_destination' | 'push_notification' | 'seasonal'; bannerUrl: string; targetUrl: string; destinationId: string; audience: string; startDate: string; endDate: string; status: string }

const typeMeta: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  home_banner: { icon: Megaphone, color: '#154212', label: 'Banner' },
  featured_destination: { icon: GlobeHemisphereWest, color: '#345a00', label: 'Featured' },
  push_notification: { icon: Bell, color: '#785a00', label: 'Push' },
  seasonal: { icon: Timer, color: '#2d5a27', label: 'Seasonal' },
}

export const Route = createFileRoute('/_authenticated/campaigns')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'campaigns', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: CampaignsPage })

function emptyCampaign(): Campaign {
  return { id: '', title: '', description: '', type: 'home_banner', bannerUrl: '', targetUrl: '', destinationId: '', audience: '', startDate: '', endDate: '', status: 'draft' }
}

function CampaignsPage() {
  const api = useApi()
  const [data, setData] = useState<Campaign[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create'>('view')
  const [editData, setEditData] = useState<Campaign | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pushAudience, setPushAudience] = useState<PushAudience>({ type: 'all' })
  const [pushHistory, setPushHistory] = useState<PushHistoryItem[]>([])
  const [pushCount, setPushCount] = useState<number | null>(null)
  const [sendingPush, setSendingPush] = useState(false)
  const [scheduleTime, setScheduleTime] = useState('')
  const [pushSending, setPushSending] = useState(false)

  const { cursor, hasMore, setHasMore, setCursor, handleNext: handleNextCursor, handlePrev: handlePrevCursor } = useCursorPagination()

  const loadList = useCallback(async (c?: string | null) => {
    try {
      const r = await api.campaigns.list(c ? { cursor: c } : undefined)
      setData(r.items)
      setHasMore(r.hasMore)
      setCursor(r.nextCursor)
    } catch {
      toast.error('Failed to load campaigns')
    } finally {
      setLoaded(true)
    }
  }, [api])

  const handleNext = useCallback(() => {
    handleNextCursor((c) => loadList(c))
  }, [handleNextCursor, loadList])

  const handlePrev = useCallback(() => {
    handlePrevCursor((c) => loadList(c))
  }, [handlePrevCursor, loadList])

  useEffect(() => { loadList() }, [loadList])

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id)
    setPanelMode('edit')
    const c = data.find(c => c.id === id)
    if (c) setEditData({ ...c })
    setErrors({})
  }, [selectedId, data])

  const handleNew = useCallback(() => {
    setSelectedId(null)
    setPanelMode('create')
    setEditData(emptyCampaign())
    setErrors({})
  }, [])

  const handleField = (field: string, value: unknown) => {
    setEditData(prev => prev ? { ...prev, [field]: value } : prev)
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate = (): boolean => {
    if (!editData) return false
    const result = campaignSchema.safeParse(editData)
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
        const created = await api.campaigns.create(editData as unknown as Record<string, unknown>)
        newId = created.id
        toast.success('Campaign created')
      } else if (selectedId) {
        await api.campaigns.update(selectedId, editData as unknown as Record<string, unknown>)
        toast.success('Campaign saved')
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
      toast.error('Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }, [editData, selectedId, panelMode, api, loadList])

  const handleDelete = useCallback(async () => {
    if (!selectedId) return
    setDeleting(true)
    try {
      await api.campaigns.remove(selectedId)
      toast.success('Campaign deleted')
      setShowDelete(false)
      setSelectedId(null)
      setPanelMode('view')
      await loadList()
    } catch {
      toast.error('Failed to delete campaign')
    } finally {
      setDeleting(false)
    }
  }, [selectedId, loadList, api])

  const handlePreviewCount = useCallback(async () => {
    setSendingPush(true)
    try {
      const result = await api.push.tokenCount(pushAudience)
      setPushCount(result.devices)
    } catch {
      toast.error('Failed to estimate reach')
    } finally {
      setSendingPush(false)
    }
  }, [pushAudience, api])

  const handlePushSend = useCallback(async () => {
    if (!selectedId || !editData) return
    setPushSending(true)
    try {
      await api.push.send({ campaignId: selectedId, audience: pushAudience, title: editData.title, body: editData.description })
      toast.success('Push notification sent')
      const hist = await api.push.history({ campaignId: selectedId })
      setPushHistory(hist.items)
    } catch {
      toast.error('Failed to send push notification')
    } finally {
      setPushSending(false)
    }
  }, [selectedId, editData, pushAudience, api])

  const handlePushSchedule = useCallback(async () => {
    if (!selectedId || !editData || !scheduleTime) return
    setPushSending(true)
    try {
      await api.push.schedule({ campaignId: selectedId, audience: pushAudience, title: editData.title, body: editData.description, scheduledAt: scheduleTime })
      toast.success('Push notification scheduled')
    } catch {
      toast.error('Failed to schedule push notification')
    } finally {
      setPushSending(false)
    }
  }, [selectedId, editData, pushAudience, scheduleTime, api])

  useEffect(() => {
    if (selectedId) {
      api.push.history({ campaignId: selectedId }).then(r => setPushHistory(r.items)).catch(() => {})
    }
  }, [selectedId, api])

  const statusTransitions: Record<string, string[]> = { draft: ['active'], active: ['paused', 'ended'], paused: ['active', 'ended'], ended: ['draft'] }
  const selected = data.find(d => d.id === selectedId) ?? null

  if (!loaded) return <div className="mt-8 text-center text-sm text-[var(--on-surface-variant)]">Loading campaigns...</div>

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">Campaigns</h1>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">Home banners, featured destinations, push notifications, and seasonal campaigns.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--on-surface-variant)]">{data.length} campaigns</span>
          <button onClick={handleNew} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white shadow-sm"><Plus className="h-4 w-4" weight="duotone" /> New Campaign</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
            <th className="px-5 py-3">Campaign</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Dates</th><th className="px-5 py-3">Status</th><th className="w-12 px-5 py-3" />
          </tr></thead>
          <tbody>
            {data.map(c => {
              const meta = typeMeta[c.type]
              const Icon = meta?.icon ?? Megaphone
              const isSelected = selectedId === c.id
              return (
                <React.Fragment key={c.id}>
                  <tr onClick={() => handleSelect(c.id)} className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-[var(--on-surface)]">{c.title}</div>
                      <div className="text-[10px] text-[var(--on-surface-variant)]">{c.description}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${meta?.color}20`, color: meta?.color }}>
                        <Icon className="h-3 w-3" weight="duotone" /> {meta?.label ?? c.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'} — {c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-[var(--on-surface-variant)]" weight="duotone" /></td>
                  </tr>
                  {isSelected && editData && (
                    <tr><td colSpan={5} className="border-b p-0">
                      <div className="border-t border-[var(--surface-4)] bg-white px-6 py-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="md:col-span-2"><FormInput label="Title" required value={editData.title} onChange={v => handleField('title', v)} error={errors.title} /></div>
                          <div className="md:col-span-2"><FormInput label="Description" value={editData.description} onChange={v => handleField('description', v)} /></div>
                          <FormSelect label="Campaign Type" required value={editData.type} options={['home_banner', 'featured_destination', 'push_notification', 'seasonal']} onChange={v => { handleField('type', v); handleField('destinationId', ''); handleField('audience', '') }} error={errors.type} />
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Banner Image</label>
                            <MediaUpload
                              label={editData.bannerUrl ? 'Replace banner' : 'Upload banner'}
                              onComplete={(result) => {
                                handleField('bannerUrl', result.objectKey)
                                toast.success('Banner uploaded')
                              }}
                              onError={(msg) => toast.error(msg)}
                            />
                            {editData.bannerUrl && (
                              <p className="mt-1 text-xs text-[var(--leaf)] truncate">{editData.bannerUrl}</p>
                            )}
                          </div>
                          <FormInput label="Target URL" value={editData.targetUrl} onChange={v => handleField('targetUrl', v)} />
                          {editData.type === 'featured_destination' && (
                            <FormInput label="Destination ID" required value={editData.destinationId} onChange={v => handleField('destinationId', v)} error={errors.destinationId} />
                          )}
                          {editData.type === 'push_notification' && (
                            <FormInput label="Audience" required value={editData.audience} onChange={v => handleField('audience', v)} error={errors.audience} description="Target audience for push notification (e.g. all, county, role, interest)" />
                          )}
                          <FormInput label="Start Date" value={editData.startDate} onChange={v => handleField('startDate', v)} />
                          <FormInput label="End Date" value={editData.endDate} onChange={v => handleField('endDate', v)} />

                          <div className="col-span-2 rounded-lg border border-[var(--surface-4)] p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              {['draft', 'active', 'paused', 'ended'].map(s => {
                                const isCurrent = editData.status === s
                                return <span key={s} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isCurrent ? 'shadow-sm' : 'opacity-50'}`}>{s} {isCurrent && '(current)'}</span>
                              })}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {(statusTransitions[editData.status] ?? []).map(target => (
                                  <button key={target} onClick={async () => {
                                    handleField('status', target)
                                    await api.campaigns.update(editData.id, { status: target })
                                    await loadList()
                                  }} className="rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm bg-[var(--forest)]">
                                    → {target}
                                  </button>
                                ))}
                            </div>
                          </div>
                        </div>

                        {/* Push notification send UI — only for push_notification type on saved campaigns */}
                        {editData.type === 'push_notification' && selectedId && (
                          <div className="col-span-2 mt-4 rounded-lg border border-[var(--surface-4)] p-4">
                            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--on-surface-variant)] mb-3">
                              <Bell className="h-3.5 w-3.5" weight="duotone" /> Push Notification Send
                            </h3>

                            {/* Audience selector */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 mb-3">
                              <div>
                                <label htmlFor="push-target" className="mb-1 block text-[10px] font-semibold text-[var(--on-surface-variant)]">Target</label>
                                <select id="push-target" value={pushAudience.type} onChange={e => { setPushAudience({ type: e.target.value as PushAudience['type'] }); setPushCount(null) }}
                                  className="w-full rounded-md border border-[var(--outline-muted)] px-2 py-1.5 text-xs text-[var(--on-surface)] focus:border-[var(--forest)]">
                                  <option value="all">All Users</option>
                                  <option value="county">By County</option>
                                  <option value="role">By Role</option>
                                  <option value="interest">By Interest</option>
                                </select>
                              </div>
                              {pushAudience.type !== 'all' && (
                                <div>
                                  <label htmlFor="push-value" className="mb-1 block text-[10px] font-semibold text-[var(--on-surface-variant)]">Value</label>
                                  <input id="push-value" value={pushAudience.value ?? ''} onChange={e => { setPushAudience({ ...pushAudience, value: e.target.value }); setPushCount(null) }}
                                    placeholder={pushAudience.type === 'county' ? 'e.g. Kwale' : pushAudience.type === 'role' ? 'e.g. administrator' : 'e.g. wildlife'}
                                    className="w-full rounded-md border border-[var(--outline-muted)] px-2 py-1.5 text-xs text-[var(--on-surface)] focus:border-[var(--forest)]" />
                                </div>
                              )}
                              <div className="flex items-end">
                                <button onClick={handlePreviewCount} disabled={sendingPush}
                                  className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--on-surface)] hover:bg-[var(--surface-3)] disabled:opacity-50">
                                  {sendingPush ? 'Counting...' : 'Preview Count'}
                                </button>
                              </div>
                              {pushCount !== null && (
                                <div className="flex items-end">
                                  <span className="text-sm font-bold text-[var(--forest)]">{pushCount.toLocaleString()} devices</span>
                                </div>
                              )}
                            </div>

                            {/* Send controls */}
                            <div className="flex flex-wrap items-center gap-2">
                              <button onClick={handlePushSend} disabled={pushSending || (pushAudience.type !== 'all' && !pushAudience.value)}
                                className="flex items-center gap-1 rounded-full bg-[var(--forest)] px-4 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                                {pushSending ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <PaperPlaneTilt className="h-3.5 w-3.5" weight="duotone" />}
                                Send Now
                              </button>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-[var(--on-surface-variant)]">or schedule:</span>
                                <input id="push-schedule" type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                                  className="rounded-md border border-[var(--outline-muted)] px-2 py-1.5 text-xs text-[var(--on-surface)] focus:border-[var(--forest)]" />
                                <button onClick={handlePushSchedule} disabled={pushSending || !scheduleTime || (pushAudience.type !== 'all' && !pushAudience.value)}
                                  className="rounded-full bg-[var(--amber)] px-3 py-1.5 text-xs font-bold text-[var(--forest)] shadow-sm disabled:opacity-50">
                                  <CalendarBlank className="inline h-3 w-3" weight="duotone" /> Schedule
                                </button>
                              </div>
                            </div>

                            {/* Delivery history */}
                            {pushHistory.length > 0 && (
                              <div className="mt-3">
                                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Send History</h4>
                                <div className="space-y-1">
                                  {pushHistory.map(h => (
                                    <div key={h.sendId} className="flex items-center justify-between rounded-md bg-[var(--surface-2)] px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-[var(--on-surface-variant)]">{new Date(h.sentAt).toLocaleString()}</span>
                                        <StatusBadge status={h.status} label={`${h.status}`} />
                                      </div>
                                      <span className="text-[10px] text-[var(--on-surface-variant)]">{h.deliveredCount}/{h.tokenCount} delivered</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                            {panelMode === 'create' ? 'Create Campaign' : 'Save Changes'}
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
              <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[var(--on-surface-variant)]">No campaigns found. Create one to get started.</td></tr>
            )}
            {panelMode === 'create' && editData && (
              <tr key="create-row"><td colSpan={5} className="border-b p-0">
                <div className="border-t border-[var(--surface-4)] bg-white px-6 py-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2"><FormInput label="Title" required value={editData.title} onChange={v => handleField('title', v)} error={errors.title} /></div>
                    <div className="md:col-span-2"><FormInput label="Description" value={editData.description} onChange={v => handleField('description', v)} /></div>
                    <FormSelect label="Campaign Type" required value={editData.type} options={['home_banner', 'featured_destination', 'push_notification', 'seasonal']} onChange={v => { handleField('type', v); handleField('destinationId', ''); handleField('audience', '') }} error={errors.type} />
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Banner Image</label>
                      <MediaUpload
                        label="Upload banner"
                        onComplete={(result) => {
                          handleField('bannerUrl', result.objectKey)
                          toast.success('Banner uploaded')
                        }}
                        onError={(msg) => toast.error(msg)}
                      />
                      {editData.bannerUrl && (
                        <p className="mt-1 text-xs text-[var(--leaf)] truncate">{editData.bannerUrl}</p>
                      )}
                    </div>
                    <FormInput label="Target URL" value={editData.targetUrl} onChange={v => handleField('targetUrl', v)} />
                    {editData.type === 'featured_destination' && (
                      <FormInput label="Destination ID" required value={editData.destinationId} onChange={v => handleField('destinationId', v)} error={errors.destinationId} />
                    )}
                    {editData.type === 'push_notification' && (
                      <FormInput label="Audience" required value={editData.audience} onChange={v => handleField('audience', v)} error={errors.audience} description="Target audience for push notification" />
                    )}
                    <FormInput label="Start Date" value={editData.startDate} onChange={v => handleField('startDate', v)} />
                    <FormInput label="End Date" value={editData.endDate} onChange={v => handleField('endDate', v)} />
                  </div>
                  <div className="mt-5 flex items-center gap-3 border-t border-[var(--surface-4)] pt-4">
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                      {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FloppyDisk className="h-4 w-4" weight="duotone" />}
                      Create Campaign
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
        title="Delete Campaign"
        description={`Are you sure you want to delete "${selected?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
