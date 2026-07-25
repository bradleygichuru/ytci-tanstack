import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface EventItem {
  id: string
  title: string
  organizer: string
  county: string
  venue: string
  date: string
  type: 'cultural' | 'sports' | 'conservation' | 'tourism'
  status: 'scheduled' | 'postponed' | 'cancelled'
  description: string
  contactEmail: string
  createdAt: string
}

const store: EventItem[] = [
  {
    id: 'evt-1',
    title: 'Lake Turkana Cultural Festival',
    organizer: 'Turkana County Government',
    county: 'Turkana',
    venue: 'Loiyangalani',
    date: '2025-09-15',
    type: 'cultural',
    status: 'scheduled',
    description: 'Celebration of Turkana culture, music and dance.',
    contactEmail: 'info@turkana.go.ke',
    createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'evt-2',
    title: 'Nairobi Marathon',
    organizer: 'Athletics Kenya',
    county: 'Nairobi',
    venue: 'Nyayo Stadium',
    date: '2025-10-26',
    type: 'sports',
    status: 'scheduled',
    description: 'Annual marathon through the streets of Nairobi.',
    contactEmail: 'info@athleticskenya.or.ke',
    createdAt: '2025-06-05T00:00:00Z',
  },
]

let nextId = store.length + 1

const handlers: MockRegistry = {
  list(): Paginated<EventItem> {
    return { items: store, nextCursor: null, hasMore: false }
  },
  get(id: string) {
    return store.find(e => e.id === id) ?? store[0]
  },
  create(body: unknown) {
    const input = body as Partial<EventItem>
    const item: EventItem = {
      id: `evt-${nextId++}`,
      title: input.title ?? '',
      organizer: input.organizer ?? '',
      county: input.county ?? '',
      venue: input.venue ?? '',
      date: input.date ?? '',
      type: (input.type as EventItem['type']) ?? 'tourism',
      status: 'scheduled',
      description: input.description ?? '',
      contactEmail: input.contactEmail ?? '',
      createdAt: new Date().toISOString(),
    }
    store.push(item)
    return item
  },
  update(id: string, patch: unknown) {
    const idx = store.findIndex(e => e.id === id)
    if (idx === -1) throw new Error('Not found')
    store[idx] = { ...store[idx], ...(patch as object) } as EventItem
    return store[idx]
  },
  remove(id: string) {
    const idx = store.findIndex(e => e.id === id)
    if (idx !== -1) store.splice(idx, 1)
  },
}

export default handlers
