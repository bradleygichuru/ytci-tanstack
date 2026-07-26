import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface UserItem {
  id: string; email: string; name: string; role: string
  banned: boolean; banReason?: string; banExpires?: string
  emailVerified: boolean; ageRange: string; county: string; languages: string; preferences: string
  consentGrantedAt: string
  createdAt: string
}

const store: UserItem[] = [
  { id: 'user-1', email: 'admin@example.com', name: 'Admin User', role: 'super_admin', banned: false, emailVerified: true, ageRange: '35-44', county: 'Nairobi', languages: 'English, Swahili', preferences: 'Eco-tourism, Wildlife', consentGrantedAt: '2025-06-01T00:00:00Z', createdAt: '2025-06-01T00:00:00Z' },
  { id: 'user-2', email: 'moderator@example.com', name: 'Moderator User', role: 'moderator', banned: false, emailVerified: true, ageRange: '25-34', county: 'Mombasa', languages: 'English', preferences: 'Beach, Culture', consentGrantedAt: '2025-06-02T00:00:00Z', createdAt: '2025-06-02T00:00:00Z' },
  { id: 'user-3', email: 'officer@example.com', name: 'County Officer', role: 'county_officer', banned: false, emailVerified: true, ageRange: '45-54', county: 'Kisumu', languages: 'English, Swahili, Dholuo', preferences: 'Conservation, Agriculture', consentGrantedAt: '2025-06-03T00:00:00Z', createdAt: '2025-06-03T00:00:00Z' },
  { id: 'user-4', email: 'grace@example.com', name: 'Grace Akinyi', role: 'administrator', banned: false, emailVerified: true, ageRange: '25-34', county: 'Nairobi', languages: 'English, Swahili', preferences: 'Tourism, Education', consentGrantedAt: '2025-06-10T00:00:00Z', createdAt: '2025-06-10T00:00:00Z' },
  { id: 'user-5', email: 'john@example.com', name: 'John Kiprop', role: 'county_officer', banned: false, emailVerified: true, ageRange: '35-44', county: 'Narok', languages: 'English, Maa', preferences: 'Wildlife, Community', consentGrantedAt: '2025-06-15T00:00:00Z', createdAt: '2025-06-15T00:00:00Z' },
  { id: 'user-6', email: 'suspended@example.com', name: 'Suspended User', role: 'moderator', banned: true, banReason: 'Repeated content policy violations', banExpires: '2025-12-31T00:00:00Z', emailVerified: true, ageRange: '18-24', county: 'Nakuru', languages: 'English', preferences: 'Adventure, Sports', consentGrantedAt: '2025-05-01T00:00:00Z', createdAt: '2025-05-01T00:00:00Z' },
  { id: 'user-7', email: 'elena@example.com', name: 'Elena Hassan', role: 'super_admin', banned: false, emailVerified: true, ageRange: '35-44', county: 'Kwale', languages: 'English, Swahili, Arabic', preferences: 'Culture, Heritage', consentGrantedAt: '2025-06-20T00:00:00Z', createdAt: '2025-06-20T00:00:00Z' },
]

const auditLog: { id: string; userId: string; userName: string; action: string; details: string; timestamp: string }[] = [
  { id: 'aud-1', userId: 'user-1', userName: 'Admin User', action: 'consent_granted', details: 'GDPR consent granted for marketing communications', timestamp: '2025-06-01T00:00:00Z' },
  { id: 'aud-2', userId: 'user-4', userName: 'Grace Akinyi', action: 'role_assigned', details: 'Role changed from moderator to administrator by admin@example.com', timestamp: '2025-06-10T12:00:00Z' },
  { id: 'aud-3', userId: 'user-6', userName: 'Suspended User', action: 'account_suspended', details: 'Suspended for 6 months — repeated content policy violations. By admin@example.com', timestamp: '2025-07-01T10:00:00Z' },
  { id: 'aud-4', userId: 'user-3', userName: 'County Officer', action: 'data_exported', details: 'Full account data export requested by user. ZIP file generated.', timestamp: '2025-07-10T14:00:00Z' },
  { id: 'aud-5', userId: 'user-7', userName: 'Elena Hassan', action: 'consent_granted', details: 'GDPR + Kenya Data Protection Act consent granted.', timestamp: '2025-06-20T00:00:00Z' },
  { id: 'aud-6', userId: 'user-6', userName: 'Suspended User', action: 'consent_revoked', details: 'Consent for marketing withdrawn. Data held per retention policy.', timestamp: '2025-07-15T09:00:00Z' },
  { id: 'aud-7', userId: 'user-2', userName: 'Moderator User', action: 'login_noted', details: 'New device login from IP 192.168.1.100', timestamp: '2025-07-20T08:30:00Z' },
]

let nextId = store.length + 1
let nextAuditId = auditLog.length + 1

const handlers: MockRegistry = {
  list(params?: PaginationParams): Paginated<Record<string, unknown>> {
    if (params?.cursor === 'audit') return { items: auditLog as unknown as Record<string, unknown>[], nextCursor: null, hasMore: false }
    return { items: store as unknown as Record<string, unknown>[], nextCursor: null, hasMore: false }
  },
  get(id: string) { return store.find(u => u.id === id) ?? store[0] },
  create(body: unknown) {
    const input = body as Partial<UserItem>
    const now = new Date().toISOString()
    const item: UserItem = { id: `user-${nextId++}`, email: input.email ?? '', name: input.name ?? '', role: input.role ?? 'moderator', banned: false, emailVerified: false, ageRange: '', county: '', languages: '', preferences: '', consentGrantedAt: now, createdAt: now }
    store.push(item); return item
  },
  update(id: string, patch: unknown) {
    const idx = store.findIndex(u => u.id === id)
    if (idx === -1) throw new Error('Not found')
    const updated = { ...store[idx], ...(patch as Partial<UserItem>) } as UserItem
    if (patch && typeof patch === 'object' && 'banned' in (patch as object)) {
      auditLog.push({ id: `aud-${nextAuditId++}`, userId: id, userName: updated.name, action: (patch as Record<string, unknown>).banned ? 'account_suspended' : 'account_unsuspended', details: `By admin@example.com` + ((patch as Record<string, unknown>).banned ? ` — ${(patch as Record<string, unknown>).banReason ?? 'No reason provided'}` : ''), timestamp: new Date().toISOString() })
    }
    store[idx] = updated; return updated
  },
  remove(id: string) {
    const idx = store.findIndex(u => u.id === id); if (idx !== -1) store.splice(idx, 1)
  },
}

export default handlers
