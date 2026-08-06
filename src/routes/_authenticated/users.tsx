import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback, useRef } from 'react'
import { authClient } from '#/lib/auth-client'
import {
  Shield, Prohibit, CheckCircle, PencilSimple,
  FloppyDisk, X, PlusCircle, Copy, MagnifyingGlass,
  CaretLeft, CaretRight, CaretUp, CaretDown,
} from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '#/components/ui/dialog'
import { UsersSkeleton, AuditSkeleton } from '#/components/skeletons/users-skeleton'

interface UserItem { id: string; email: string; name: string; role: string; banned: boolean; banReason?: string | null; ageRange?: string | null; county?: string | null; languages?: string | null; preferences?: string | null; consentGrantedAt?: string | null; onboardingCompleted: boolean; createdAt: string }
interface AuditItem { id: string; userId: string; userName: string; action: string; details: string | null; performedBy: string; performedByName: string; createdAt: string }

const roleColors: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: '#154212', text: '#ffffff' },
  administrator: { bg: '#345a00', text: '#ffffff' },
  moderator: { bg: 'var(--amber-bg)', text: 'var(--amber-deep)' },
  county_officer: { bg: 'var(--surface-2)', text: 'var(--on-surface)' },
  user: { bg: '#42493e', text: '#ffffff' },
}

function RolePill({ role }: { role: string }) {
  const s = roleColors[role] ?? roleColors.user
  return <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: s.bg, color: s.text }}>{role.replace(/_/g, ' ')}</span>
}

const auditActions: Record<string, string> = { consent_granted: '#345a00', consent_revoked: '#ba1a1a', account_suspended: '#ba1a1a', account_unsuspended: '#345a00', data_exported: '#42493e', role_assigned: '#154212', user_created: '#154212' }

export const Route = createFileRoute('/_authenticated/users')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'user', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: UsersPage })

const ROLE_OPTIONS = ['super_admin', 'administrator', 'moderator', 'county_officer', 'user'] as const
type RoleFilter = (typeof ROLE_OPTIONS)[number] | null
type StatusFilter = 'all' | 'active' | 'banned'
const PAGE_SIZE = 50
const API_BASE = '/api/admin/users'

async function apiGet(path: string, params?: Record<string, unknown>): Promise<unknown> {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : ''
  const res = await fetch(`${API_BASE}/${path}${qs}`, { credentials: 'same-origin' })
  if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error) }
  return res.json()
}

async function apiPost(path: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), credentials: 'same-origin',
  })
  if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error) }
  return res.json()
}

interface Filters { search: string; role: RoleFilter; status: StatusFilter; sortBy?: string; sortDirection?: string; page: number }

const columnHeaders: { key: string; label: string; sortable: boolean }[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
  { key: 'county', label: 'County', sortable: true },
  { key: 'onboardingCompleted', label: 'Onboarded', sortable: false },
  { key: 'banned', label: 'Status', sortable: false },
  { key: 'createdAt', label: 'Created', sortable: true },
]

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
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const filtersRef = useRef<Filters>({ search: '', role: null, status: 'all', page: 1 })
  const [filters, setFilters] = useState<Filters>({ search: '', role: null, status: 'all', page: 1 })
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const loadData = useCallback(async (f: Filters) => {
    const params: Record<string, unknown> = {}
    if (f.search) {
      params.search = f.search
      params.searchField = f.search.includes('@') ? 'email' : 'name'
    }
    if (f.role) params.role = f.role
    if (f.status === 'active') params.banned = 'false'
    if (f.status === 'banned') params.banned = 'true'
    params.limit = PAGE_SIZE
    params.offset = (f.page - 1) * PAGE_SIZE
    if (f.sortBy) { params.sortBy = f.sortBy; params.sortDirection = f.sortDirection ?? 'asc' }
    setLoading(true)
    try {
      const res = await apiGet('list', params) as { users: UserItem[]; total: number }
      setData(res.users)
      setTotal(res.total)
      const ra = await apiGet('audit', { limit: 50 }) as { items: AuditItem[] }
      setAudit(ra.items)
    } catch (err) {
      console.error('Failed to load users:', err)
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    loadData(filtersRef.current)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [])

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    const next = { ...filtersRef.current, ...patch }
    if (patch.search !== undefined && patch.page === undefined) {
      next.page = 1
    }
    filtersRef.current = next
    setFilters(next)
    loadData(next)
  }, [loadData])

  const handleSearchChange = useCallback((val: string) => {
    filtersRef.current.search = val
    setFilters(f => ({ ...f, search: val, page: 1 }))
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      loadData(filtersRef.current)
    }, 300)
  }, [loadData])

  const handleSort = useCallback((key: string) => {
    const current = filtersRef.current
    const dir = current.sortBy === key && current.sortDirection === 'asc' ? 'desc' : 'asc'
    updateFilters({ sortBy: key, sortDirection: dir, page: 1 })
  }, [updateFilters])

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); return }
    setSelectedId(id); const u = data.find(u => u.id === id); if (u) setEditData({ ...u })
  }, [selectedId, data])

  const handleSave = useCallback(async () => {
    if (!selectedId || !editData) return
    const patch: Record<string, unknown> = { userId: selectedId }
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
    if (Object.keys(patch).length <= 1) return
    await apiPost('update', patch)
    await loadData(filtersRef.current)
    setSelectedId(null)
  }, [selectedId, editData, data, loadData])

  const handleCreate = useCallback(async () => {
    if (!createForm.name || !createForm.email || !createConsent) return
    setCreateLoading(true)
    try {
      const payload: Record<string, unknown> = { name: createForm.name, email: createForm.email, role: createForm.role }
      for (const k of ['ageRange', 'county', 'languages', 'preferences'] as const) {
        if (createForm[k]) payload[k] = createForm[k]
      }
      const result = await apiPost('create', payload) as { user: UserItem; tempPassword: string }
      setCreateResult({ email: createForm.email, password: result.tempPassword })
      await loadData(filtersRef.current)
    } catch (err) {
      console.error('Create user failed:', err)
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

  const counts = { banned: data.filter(u => u.banned).length, active: data.filter(u => !u.banned).length }

  const sortIcon = (key: string) => {
    if (filters.sortBy !== key) return null
    return filters.sortDirection === 'asc' ? <CaretUp className="ml-0.5 h-3 w-3" weight="fill" /> : <CaretDown className="ml-0.5 h-3 w-3" weight="fill" />
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">User Management & Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">RBAC permissions, user accounts, and compliance consent auditing.</p>
      </div>

      {/* Security Health */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Total Users</div>
          <div className="mt-1 font-sans text-3xl font-bold text-foreground">{total}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Active Directory</div>
          <div className="mt-1 font-sans text-3xl font-bold text-success-leaf">{counts.active}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Banned</div>
          <div className="mt-1 font-sans text-3xl font-bold text-destructive">{counts.banned}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Roles</div>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {ROLE_OPTIONS.map(role => (
              <div key={role} className="flex items-center gap-1">{data.filter(u => u.role === role).length} <RolePill role={role} /></div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 mt-6 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
        {(['users', 'audit'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            {t === 'users' ? 'Users' : 'Consent Audit'} <span className="ml-1 rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px]">{t === 'users' ? total : audit.length}</span>
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        loading ? <UsersSkeleton /> :
        <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" weight="duotone" />
              <input
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={e => handleSearchChange(e.target.value)}
                className="h-9 w-60 rounded-md border border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>

            {(['all', 'active', 'banned'] as StatusFilter[]).map(st => (
              <button key={st} onClick={() => updateFilters({ status: st, page: 1 })}
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${filters.status === st ? 'bg-primary text-white' : 'border border-border bg-card text-muted-foreground hover:border-[var(--outline)]'}`}>
                {st === 'all' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}

            <div className="h-5 w-px bg-[var(--surface-4)]" />

            {([null, ...ROLE_OPTIONS] as const).map(r => (
              <button key={r ?? 'all'} onClick={() => updateFilters({ role: r, page: 1 })}
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${filters.role === r ? 'bg-primary text-white' : 'border border-border bg-card text-muted-foreground hover:border-[var(--outline)]'}`}>
                {r ? r.replace(/_/g, ' ') : 'All Roles'}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">{total} users</span>
              <button onClick={() => { setCreateOpen(true); setCreateResult(null) }} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm"><PlusCircle className="h-4 w-4" weight="duotone" /> New User</button>
            </div>
          </div>

          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {columnHeaders.map(col => (
                <th key={col.key} className={`px-5 py-3 ${col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}>
                  <span className="inline-flex items-center">{col.label}{sortIcon(col.key)}</span>
                </th>
              ))}
              <th className="w-12 px-5 py-3" />
            </tr></thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-muted-foreground">No users match the current filters.</td></tr>
              ) : (
                data.map(u => {
                  const isSelected = selectedId === u.id
                  return (
                    <FragmentRow key={u.id}>
                      <tr onClick={() => handleSelect(u.id)} className={`cursor-pointer border-b hover:bg-[var(--surface-2)] ${isSelected ? 'bg-[var(--amber-bg)]' : ''}`}>
                        <td className="px-5 py-3"><span className="font-semibold text-foreground">{u.name}</span></td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{u.email}</td>
                        <td className="px-5 py-3"><RolePill role={u.role} /></td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{u.county}</td>
                        <td className="px-5 py-3">{u.onboardingCompleted ? <span className="flex items-center gap-1 text-xs font-semibold text-success-leaf"><CheckCircle className="h-3.5 w-3.5" weight="fill" /> Yes</span> : <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">— No</span>}</td>
                        <td className="px-5 py-3">{u.banned ? <span className="flex items-center gap-1 text-xs font-semibold text-destructive"><Prohibit className="h-3.5 w-3.5" weight="duotone" /> Banned</span> : <span className="flex items-center gap-1 text-xs font-semibold text-success-leaf"><CheckCircle className="h-3.5 w-3.5" weight="fill" /> Active</span>}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-5 py-3"><PencilSimple className="h-4 w-4 text-muted-foreground" weight="duotone" /></td>
                      </tr>
                        {isSelected && editData && (
                        <tr><td colSpan={8} className="border-b p-0">
                          <div className="border-t border-border bg-card px-6 py-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <UField label="Name" value={editData.name} onChange={v => setEditData({ ...editData, name: v })} />
                              <UStaticField label="Email" value={editData.email} />
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">Role</label>
                                <select value={editData.role} disabled={!isSuperAdmin} onChange={e => setEditData({ ...editData, role: e.target.value })}
                                  className={`w-full rounded-md border border-border px-3 py-2 text-sm ${isSuperAdmin ? 'text-foreground' : 'text-muted-foreground'} focus:border-primary disabled:cursor-not-allowed`}>
                                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                                </select>
                                {!isSuperAdmin && <p className="mt-1 text-[10px] text-muted-foreground">Only super-admin can change roles (#5)</p>}
                              </div>
                              <UField label="Age Range" value={editData.ageRange ?? ''} onChange={v => setEditData({ ...editData, ageRange: v })} />
                              <UField label="County" value={editData.county ?? ''} onChange={v => setEditData({ ...editData, county: v })} />
                              <UField label="Languages" value={editData.languages ?? ''} onChange={v => setEditData({ ...editData, languages: v })} />
                              <UField label="Preferences" value={editData.preferences ?? ''} onChange={v => setEditData({ ...editData, preferences: v })} />

                              {/* Suspension */}
                              <div className="rounded-lg border border-border p-4 md:col-span-2">
                                <label className="flex cursor-pointer items-center gap-2">
                                  <input type="checkbox" checked={editData.banned} disabled={!isSuperAdmin} onChange={e => setEditData({ ...editData, banned: e.target.checked, banReason: e.target.checked ? '' : null })}
                                    className="accent-[var(--error)] disabled:cursor-not-allowed" />
                                  <span className="flex items-center gap-1 text-xs font-semibold text-foreground"><Prohibit className="h-3.5 w-3.5" weight="duotone" /> Suspend account</span>
                                </label>
                                {editData.banned && (
                                  <input value={editData.banReason ?? ''} onChange={e => setEditData({ ...editData, banReason: e.target.value })}
                                    placeholder="Reason for suspension..."
                                    className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm text-foreground focus:border-primary" />
                                )}
                                {!isSuperAdmin && <p className="mt-1 text-[10px] text-muted-foreground">Only super-admin can suspend users (#5)</p>}
                              </div>

                              {/* Consent toggle */}
                              <div className="rounded-lg border border-border p-4 md:col-span-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="flex items-center gap-1 text-xs font-semibold text-foreground"><Shield className="h-3.5 w-3.5" weight="duotone" /> Consent {editData.consentGrantedAt ? 'granted' : 'not granted'}</span>
                                    {editData.consentGrantedAt && <p className="mt-0.5 text-[10px] text-muted-foreground">Granted at {new Date(editData.consentGrantedAt).toLocaleDateString()}</p>}
                                  </div>
                                  {isSuperAdmin ? (
                                    editData.consentGrantedAt ? (
                                      <button onClick={() => setEditData({ ...editData, consentGrantedAt: null })}
                                        className="rounded-md border border-[var(--error)] px-3 py-1.5 text-[11px] font-bold text-destructive">Revoke Consent</button>
                                    ) : (
                                      <button onClick={() => setEditData({ ...editData, consentGrantedAt: new Date().toISOString() })}
                                        className="rounded-md border border-[var(--leaf)] px-3 py-1.5 text-[11px] font-bold text-success-leaf">Grant Consent</button>
                                    )
                                  ) : <p className="text-[10px] text-muted-foreground">Only super-admin can manage consent</p>}
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                              <button onClick={handleSave} className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm"><FloppyDisk className="h-4 w-4" weight="duotone" /> Save</button>
                              <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground"><X className="h-4 w-4" weight="duotone" /> Cancel</button>
                            </div>
                          </div>
                        </td></tr>
                      )}
                    </FragmentRow>
                  )
                })
              )}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <span className="text-xs text-muted-foreground">Showing {Math.min((filters.page - 1) * PAGE_SIZE + 1, total)}–{Math.min(filters.page * PAGE_SIZE, total)} of {total}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateFilters({ page: Math.max(1, filters.page - 1) })}
                  disabled={filters.page <= 1}
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-2)]">
                  <CaretLeft className="h-3.5 w-3.5" weight="bold" /> Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(filters.page - 2, totalPages - 4))
                  const p = start + i
                  if (p > totalPages) return null
                  return (
                    <button key={p} onClick={() => updateFilters({ page: p })}
                      className={`h-7 min-w-7 rounded-md text-xs font-bold ${filters.page === p ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-[var(--surface-2)]'}`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => updateFilters({ page: Math.min(totalPages, filters.page + 1) })}
                  disabled={filters.page >= totalPages}
                  className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-2)]">
                  Next <CaretRight className="h-3.5 w-3.5" weight="bold" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consent Audit tab */}
      {tab === 'audit' && (loading ? <AuditSkeleton /> :
        <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-b bg-[var(--surface-2)] text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <th className="px-5 py-3">User</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Details</th><th className="px-5 py-3">Timestamp</th>
            </tr></thead>
            <tbody>
              {audit.map(a => (
                <tr key={a.id} className="border-b hover:bg-[var(--surface-2)]">
                  <td className="px-5 py-3 text-sm font-semibold text-foreground">{a.userName}</td>
                  <td className="px-5 py-3"><span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: `${(auditActions[a.action] ?? '#42493e')}20`, color: auditActions[a.action] ?? '#42493e' }}>{a.action.replace(/_/g, ' ')}</span></td>
                  <td className="max-w-sm truncate px-5 py-3 text-xs text-muted-foreground">{a.details}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(a.createdAt as string).toLocaleString()}</td>
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
                <p className="text-sm font-semibold text-success-leaf">User created: {createResult.email}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">Temporary password</label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-[var(--surface-2)] px-3 py-2 font-mono text-sm">
                  <span className="flex-1">{createResult.password}</span>
                  <button onClick={() => navigator.clipboard.writeText(createResult.password)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold text-primary hover:bg-[var(--surface-3)]">
                    <Copy className="h-3.5 w-3.5" weight="duotone" /> Copy
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Share this securely. It will not be shown again.</p>
              </div>
              <div className="flex justify-end">
                <button onClick={resetCreate} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm">Done</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <UField label="Name" value={createForm.name} onChange={v => setCreateForm(f => ({ ...f, name: v }))} />
              <UField label="Email" value={createForm.email} onChange={v => setCreateForm(f => ({ ...f, email: v }))} />
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">Role</label>
                <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground focus:border-primary">
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <UField label="Age Range" value={createForm.ageRange} onChange={v => setCreateForm(f => ({ ...f, ageRange: v }))} />
              <UField label="County" value={createForm.county} onChange={v => setCreateForm(f => ({ ...f, county: v }))} />
              <UField label="Languages" value={createForm.languages} onChange={v => setCreateForm(f => ({ ...f, languages: v }))} />
              <UField label="Preferences" value={createForm.preferences} onChange={v => setCreateForm(f => ({ ...f, preferences: v }))} />
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3">
                <input type="checkbox" checked={createConsent} onChange={e => setCreateConsent(e.target.checked)} className="accent-primary" />
                <span className="text-xs text-foreground">I attest that user consent has been obtained (GDPR / Kenya DPA)</span>
              </label>
              <div className="flex justify-end gap-3">
                <button onClick={resetCreate} className="rounded-full border border-border px-5 py-2 text-xs font-bold text-muted-foreground">Cancel</button>
                <button onClick={handleCreate} disabled={!createForm.name || !createForm.email || !createConsent || createLoading}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
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
  return <div><label className="mb-1 block text-xs font-semibold text-foreground">{label}</label><input value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground focus:border-primary" /></div>
}
function UStaticField({ label, value }: { label: string; value?: string }) {
  return <div><label className="mb-1 block text-xs font-semibold text-foreground">{label}</label><div className="w-full rounded-md border border-border bg-[var(--surface-2)] px-3 py-2 text-sm text-muted-foreground">{value}</div></div>
}
function FragmentRow({ children }: { children: React.ReactNode }) { return <>{children}</> }
