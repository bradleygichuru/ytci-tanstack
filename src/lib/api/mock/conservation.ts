import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface ConservationActivity {
  id: string
  title: string
  organizer: string
  location: string
  description: string
  date: string
  impactMetric: string
  participantCount: number
  status: 'open' | 'full' | 'completed' | 'cancelled'
  createdAt: string
}

const store: ConservationActivity[] = [
  {
    id: 'ca-1',
    title: 'Beach Cleanup — Diani',
    organizer: 'Kwale Conservation Trust',
    location: 'Diani Beach',
    description: 'Help clean up plastic waste along the coastline.',
    date: '2025-08-15',
    impactMetric: 'kg waste collected',
    participantCount: 0,
    status: 'open',
    createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'ca-2',
    title: 'Tree Planting — Karura Forest',
    organizer: 'KFS',
    location: 'Karura Forest, Nairobi',
    description: 'Plant indigenous trees in the green lung of Nairobi.',
    date: '2025-09-01',
    impactMetric: 'trees planted',
    participantCount: 0,
    status: 'open',
    createdAt: '2025-06-05T00:00:00Z',
  },
]

let nextId = store.length + 1

const handlers: MockRegistry = {
  list(): Paginated<ConservationActivity> {
    return { items: store, nextCursor: null, hasMore: false }
  },
  get(id: string) {
    return store.find(a => a.id === id) ?? store[0]
  },
  create(body: unknown) {
    const input = body as Partial<ConservationActivity>
    const item: ConservationActivity = {
      id: `ca-${nextId++}`,
      title: input.title ?? '',
      organizer: input.organizer ?? '',
      location: input.location ?? '',
      description: input.description ?? '',
      date: input.date ?? '',
      impactMetric: input.impactMetric ?? '',
      participantCount: 0,
      status: 'open',
      createdAt: new Date().toISOString(),
    }
    store.push(item)
    return item
  },
  update(id: string, patch: unknown) {
    const idx = store.findIndex(a => a.id === id)
    if (idx === -1) throw new Error('Not found')
    store[idx] = { ...store[idx], ...(patch as object) } as ConservationActivity
    return store[idx]
  },
  remove(id: string) {
    const idx = store.findIndex(a => a.id === id)
    if (idx !== -1) store.splice(idx, 1)
  },
}

export default handlers
