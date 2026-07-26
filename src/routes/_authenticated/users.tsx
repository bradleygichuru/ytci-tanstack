import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { authClient } from '#/lib/auth-client'
import {
  Shield, Prohibit, CheckCircle, PencilSimple,
  FloppyDisk, X, PlusCircle, Copy,
} from '@phosphor-icons/react'
import { listUsers, createUser, updateUser, listAuditLog } from '#/lib/users.functions'
import type { UserItem, AuditItem } from '#/lib/users.functions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '#/components/ui/dialog'

const roleColors: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: '#154212', text: '#ffffff' },
  administrator: { bg: '#345a00', text: '#ffffff' },
  moderator: { bg: 'var(--amber-bg)', text: 'var(--amber-deep)' },
  county_officer: { bg: 'var(--surface-2)', text: 'var(--on-surface)' },
}

function RolePill({ role }: { role: string }) {
  const s = roleColors[role] ?? roleColors.moderator
  return <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: s.bg, color: s.text }}>{role.replace(/_/g, ' ')}</span>
}

const auditActions: Record<string, string> = { consent_granted: '#345a00', consent_revoked: '#ba1a1a', account_suspended: '#ba1a1a', account_unsuspended: '#345a00', data_exported: '#42493e', role_assigned: '#154212', user_created: '#154212' }

export const Route = createFileRoute('/_authenticated/users')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'users', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: UsersPage })

const ROLE_OPTIONS = ['super_admin', 'administrator', 'moderator', 'county_officer']

function UsersPage() {
  const { data: session } = authClient.useSession()
  const currentRole = (session?.user as Record<string, unknown>)?.role as string ?? ''
  const isSuperAdmin = currentRole === 'super_admin'

  const [data, setData] = useState<UserItem[]>([])
  const [audit, setAudit] = useState<AuditItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editData, setEditData] = useState<UserItem | null>(null)
  const [tab, setTab] = useState<'users' | 'audit'>('users')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'moderator', ageRange: '', county: '', languages: '', preferences: '' })
  const [createConsent, setCreateConsent] = useState(false)
  const [createResult, setCreateResult] = useState<{ email: string; password: string } | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  const loadData = useCallback(async () => {
    const r = await listUsers({ data: {} })
    setData(r.users)
    const ra = await listAuditLog({ data: {} })
    setAudit(ra.items)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id); const u = data.find(u => u.id === id); if (u) setEditData({ ...u })
  }, [selectedId, data])

  const handleSave = useCallback(async () => {
    if (!selectedId || !editData) return
    const patch: Record<string, unknown> = {}
    const orig = data.find(u => u.id === selectedId)
    if (!orig) return
    if (editData.name !== orig.name) patch.name = editData.name
    if (editData.role !== orig.role) patch.role = editData.role
    if (editData.banned !== orig.banned) { patch.banned = editData.banned; if (editData.banned) patch.banReason = editData.banReason }
    if (editData.ageRange !== orig.ageRange) patch.ageRange = editData.ageRange
    if (editData.county !== orig.county) patch.county = editData.county
    if (editData.languages !== orig.languages) patch.languages = editData.languages
    if (editData.preferences !== orig.preferences) patch.preferences = editData.preferences
    if (editData.consentGrantedAt !== orig.consentGrantedAt) patch.consentGrantedAt = editData.consentGrantedAt
    if (Object.keys(patch).length === 0) return
    await updateUser({ data: { userId: selectedId, ...patch } })
    await loadData()
    setSelectedId(null)
  }, [selectedId, editData, data, loadData])

  const handleCreate = useCallback(async () => {
    if (!createForm.name || !createForm.email || !createConsent) return
    setCreateLoading(true)
    try {
      const result = await createUser({ data: { ...createForm } })
      setCreateResult({ email: createForm.email, password: result.tempPassword })
      await loadData()
    } finally {
      setCreateLoading(false)
    }
  }, [createForm, createConsent, loadData])

  const resetCreate = useCallback(() => {
    setCreateOpen(false)
    setCreateForm({ name: '', email: '', role: 'moderator', ageRange: '', county: '', languages: '', preferences: '' })
    setCreateConsent(false)
    setCreateResult(null)
  }, [])

  const counts = { total: data.length, banned: data.filter(u => u.banned).length, active: data.filter(u => !u.banned).length }
  const roleCounts = { super_admin: data.filter(u => u.role === 'super_admin').length, administrator: data.filter(u => u.role === 'administrator').length, moderator: data.filter(u => u.role === 'moderator').length, county_officer: data.filter(u => u.role === 'county_officer').length }

  if (!data.length && audit.length === 0) return <div className="mt-8 text-center text-sm text-[var(--on-surface-variant)]">Loading...</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-sans text-3xl font-bold tracking-tight text-[var(--on-surface)]">User Management & Security</h1>
        <p className="mt-1 text-sm text-[var(--on-surface-variant)]">RBAC permissions, user accounts, and compliance consent auditing.</p>
      </div>

      {/* Security Health */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--surface-4)] bg-white p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Total Users</div>
          <div className="mt-1 font-sans text-3xl font-bold text-[var(--on-surface)]">{counts.total}</div>
        </div>
        <div className="rounded-lg border border-[var(--surface-4)] bg-white p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Active Directory</div>
          <div className="mt-1 font-sans text-3xl font-bold text-[var(--leaf)]">{counts.active}</div>
        </div>
        <div className="rounded-lg border border-[var(--surface-4)] bg-white p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Banned</div>
          <div className="mt-1 font-sans text-3xl font-bold text-[var(--error)]">{counts.banned}</div>
        </div>
        <div className="rounded-lg border border-[var(--surface-4)] bg-white p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Roles</div>
          <div className="mt-1 space-y-0.5 text-xs text-[var(--on-surface-variant)]">
            {Object.entries(roleCounts).map(([role, count]) => (
              <div key={role} className="flex items-center gap-1">{count} <RolePill role={role} /></div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 mt-6 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
        {(['users', 'audit'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-white text-[var(--on-surface)] shadow-sm' : 'text-[var(--on-surface-variant)]'}`}>
            {t === 'users' ? 'Users' : 'Consent Audit'} <span className="ml-1 rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px]">{t === 'users' ? data.length : audit.length}</span>
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center justify-between border-b border-[var(--surface-4)] px-5 py-3">
            <span className="text-xs font-semibold text-[var(--on-surface-variant)]">{data.length} users</span>
            <button onClick={() => { setCreateOpen(true); setCreateResult(null) }} className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-4 py-2 text-xs font-bold text-white shadow-sm"><PlusCircle className="h-4 w-4" weight="duotone" /> New User</button>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
              <th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">County</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="w-12 px-5 py-3" />
            </tr></thead>
            <tbody>
              {data.map(u => {
                const isSelected = selectedId === u.id
                return (
                  <FragmentRow key={u.id}>
                    <tr onClick={() => handleSelect(u.id)} className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}>
                      <td className="px-5 py-3"><span className="font-semibold text-[var(--on-surface)]">{u.name}</span></td>
                      <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{u.email}</td>
                      <td className="px-5 py-3"><RolePill role={u.role} /></td>
                      <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{u.county}</td>
                      <td className="px-5 py-3">{u.banned ? <span className="flex items-center gap-1 text-xs font-semibold text-[var(--error)]"><Prohibit className="h-3.5 w-3.5" weight="duotone" /> Banned</span> : <span className="flex items-center gap-1 text-xs font-semibold text-[var(--leaf)]"><CheckCircle className="h-3.5 w-3.5" weight="fill" /> Active</span>}</td>
                      <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-[var(--on-surface-variant)]" weight="duotone" /></td>
                    </tr>
                    {isSelected && editData && (
                      <tr><td colSpan={7} className="border-b p-0">
                        <div className="border-t border-[var(--surface-4)] bg-white px-6 py-5">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <UField label="Name" value={editData.name} onChange={v => setEditData({ ...editData, name: v })} />
                            <UStaticField label="Email" value={editData.email} />
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Role</label>
                              <select value={editData.role} disabled={!isSuperAdmin} onChange={e => setEditData({ ...editData, role: e.target.value })}
                                className={`w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm ${isSuperAdmin ? 'text-[var(--on-surface)]' : 'text-[var(--on-surface-variant)]'} focus:border-[var(--forest)] disabled:cursor-not-allowed`}>
                                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                              </select>
                              {!isSuperAdmin && <p className="mt-1 text-[10px] text-[var(--on-surface-variant)]">Only super-admin can change roles (#5)</p>}
                            </div>
                            <UField label="Age Range" value={editData.ageRange ?? ''} onChange={v => setEditData({ ...editData, ageRange: v })} />
                            <UField label="County" value={editData.county ?? ''} onChange={v => setEditData({ ...editData, county: v })} />
                            <UField label="Languages" value={editData.languages ?? ''} onChange={v => setEditData({ ...editData, languages: v })} />
                            <UField label="Preferences" value={editData.preferences ?? ''} onChange={v => setEditData({ ...editData, preferences: v })} />

                            {/* Suspension */}
                            <div className="rounded-lg border border-[var(--surface-4)] p-4 md:col-span-2">
                              <label className="flex cursor-pointer items-center gap-2">
                                <input type="checkbox" checked={editData.banned} disabled={!isSuperAdmin} onChange={e => setEditData({ ...editData, banned: e.target.checked, banReason: e.target.checked ? '' : null })}
                                  className="accent-[var(--error)] disabled:cursor-not-allowed" />
                                <span className="flex items-center gap-1 text-xs font-semibold text-[var(--on-surface)]"><Prohibit className="h-3.5 w-3.5" weight="duotone" /> Suspend account</span>
                              </label>
                              {editData.banned && (
                                <input value={editData.banReason ?? ''} onChange={e => setEditData({ ...editData, banReason: e.target.value })}
                                  placeholder="Reason for suspension..."
                                  className="mt-2 w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]" />
                              )}
                              {!isSuperAdmin && <p className="mt-1 text-[10px] text-[var(--on-surface-variant)]">Only super-admin can suspend users (#5)</p>}
                            </div>

                            {/* Consent toggle */}
                            <div className="rounded-lg border border-[var(--surface-4)] p-4 md:col-span-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="flex items-center gap-1 text-xs font-semibold text-[var(--on-surface)]"><Shield className="h-3.5 w-3.5" weight="duotone" /> Consent {editData.consentGrantedAt ? 'granted' : 'not granted'}</span>
                                  {editData.consentGrantedAt && <p className="mt-0.5 text-[10px] text-[var(--on-surface-variant)]">Granted at {new Date(editData.consentGrantedAt).toLocaleDateString()}</p>}
                                </div>
                                {isSuperAdmin ? (
                                  editData.consentGrantedAt ? (
                                    <button onClick={() => setEditData({ ...editData, consentGrantedAt: null })}
                                      className="rounded-md border border-[var(--error)] px-3 py-1.5 text-[11px] font-bold text-[var(--error)]">Revoke Consent</button>
                                  ) : (
                                    <button onClick={() => setEditData({ ...editData, consentGrantedAt: new Date().toISOString() })}
                                      className="rounded-md border border-[var(--leaf)] px-3 py-1.5 text-[11px] font-bold text-[var(--leaf)]">Grant Consent</button>
                                  )
                                ) : <p className="text-[10px] text-[var(--on-surface-variant)]">Only super-admin can manage consent</p>}
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
      )}

      {/* Consent Audit tab */}
      {tab === 'audit' && (
        <div className="overflow-hidden rounded-lg border border-[var(--surface-4)] bg-white" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
              <th className="px-5 py-3">User</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Details</th><th className="px-5 py-3">Timestamp</th>
            </tr></thead>
            <tbody>
              {audit.map(a => (
                <tr key={a.id} className="border-b hover:bg-[var(--surface-2)]">
                  <td className="px-5 py-3 text-sm font-semibold text-[var(--on-surface)]">{a.userName}</td>
                  <td className="px-5 py-3"><span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: `${(auditActions[a.action] ?? '#42493e')}20`, color: auditActions[a.action] ?? '#42493e' }}>{a.action.replace(/_/g, ' ')}</span></td>
                  <td className="max-w-sm truncate px-5 py-3 text-xs text-[var(--on-surface-variant)]">{a.details}</td>
                  <td className="px-5 py-3 text-xs text-[var(--on-surface-variant)]">{new Date(a.createdAt as string).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* New User Dialog */}
      <Dialog open={createOpen} onOpenChange={open => { if (!open) resetCreate(); else setCreateOpen(true) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{createResult ? 'User Created' : 'New User'}</DialogTitle>
            <DialogDescription>
              {createResult ? 'Share the temporary password securely with the user.' : 'Create a new user account with role and profile fields.'}
            </DialogDescription>
          </DialogHeader>

          {createResult ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--leaf)] bg-green-50 p-4">
                <p className="text-sm font-semibold text-[var(--leaf)]">User created: {createResult.email}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Temporary password</label>
                <div className="flex items-center gap-2 rounded-md border border-[var(--surface-4)] bg-[var(--surface-2)] px-3 py-2 font-mono text-sm">
                  <span className="flex-1">{createResult.password}</span>
                  <button onClick={() => navigator.clipboard.writeText(createResult.password)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold text-[var(--forest)] hover:bg-[var(--surface-3)]">
                    <Copy className="h-3.5 w-3.5" weight="duotone" /> Copy
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-[var(--on-surface-variant)]">Share this securely. It will not be shown again.</p>
              </div>
              <div className="flex justify-end">
                <button onClick={resetCreate} className="rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm">Done</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <UField label="Name" value={createForm.name} onChange={v => setCreateForm(f => ({ ...f, name: v }))} />
              <UField label="Email" value={createForm.email} onChange={v => setCreateForm(f => ({ ...f, email: v }))} />
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">Role</label>
                <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]">
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <UField label="Age Range" value={createForm.ageRange} onChange={v => setCreateForm(f => ({ ...f, ageRange: v }))} />
              <UField label="County" value={createForm.county} onChange={v => setCreateForm(f => ({ ...f, county: v }))} />
              <UField label="Languages" value={createForm.languages} onChange={v => setCreateForm(f => ({ ...f, languages: v }))} />
              <UField label="Preferences" value={createForm.preferences} onChange={v => setCreateForm(f => ({ ...f, preferences: v }))} />
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--surface-4)] p-3">
                <input type="checkbox" checked={createConsent} onChange={e => setCreateConsent(e.target.checked)} className="accent-[var(--forest)]" />
                <span className="text-xs text-[var(--on-surface)]">I attest that user consent has been obtained (GDPR / Kenya DPA)</span>
              </label>
              <div className="flex justify-end gap-3">
                <button onClick={resetCreate} className="rounded-full border border-[var(--surface-4)] px-5 py-2 text-xs font-bold text-[var(--on-surface-variant)]">Cancel</button>
                <button onClick={handleCreate} disabled={!createForm.name || !createForm.email || !createConsent || createLoading}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--forest)] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                  <PlusCircle className="h-4 w-4" weight="duotone" /> {createLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return <div><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">{label}</label><input value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full rounded-md border border-[var(--outline-muted)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--forest)]" /></div>
}
function UStaticField({ label, value }: { label: string; value?: string }) {
  return <div><label className="mb-1 block text-xs font-semibold text-[var(--on-surface)]">{label}</label><div className="w-full rounded-md border border-[var(--surface-4)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--on-surface-variant)]">{value}</div></div>
}
function FragmentRow({ children }: { children: React.ReactNode }) { return <>{children}</> }
