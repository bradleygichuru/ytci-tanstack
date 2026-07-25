import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface UserItem {
  id: string
  email: string
  name: string
  role: string
  banned: boolean
  banReason?: string
  emailVerified: boolean
  createdAt: string
}

const store: UserItem[] = [
  {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'super_admin',
    banned: false,
    emailVerified: true,
    createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'user-2',
    email: 'moderator@example.com',
    name: 'Moderator User',
    role: 'moderator',
    banned: false,
    emailVerified: true,
    createdAt: '2025-06-02T00:00:00Z',
  },
  {
    id: 'user-3',
    email: 'officer@example.com',
    name: 'County Officer',
    role: 'county_officer',
    banned: false,
    emailVerified: true,
    createdAt: '2025-06-03T00:00:00Z',
  },
]

let nextId = store.length + 1

const handlers: MockRegistry = {
  list(): Paginated<UserItem> {
    return { items: store, nextCursor: null, hasMore: false }
  },
  get(id: string) {
    return store.find(u => u.id === id) ?? store[0]
  },
  create(body: unknown) {
    const input = body as Partial<UserItem>
    const item: UserItem = {
      id: `user-${nextId++}`,
      email: input.email ?? '',
      name: input.name ?? '',
      role: input.role ?? 'moderator',
      banned: false,
      emailVerified: false,
      createdAt: new Date().toISOString(),
    }
    store.push(item)
    return item
  },
  update(id: string, patch: unknown) {
    const idx = store.findIndex(u => u.id === id)
    if (idx === -1) throw new Error('Not found')
    store[idx] = { ...store[idx], ...(patch as object) } as UserItem
    return store[idx]
  },
  remove(id: string) {
    const idx = store.findIndex(u => u.id === id)
    if (idx !== -1) store.splice(idx, 1)
  },
}

export default handlers
