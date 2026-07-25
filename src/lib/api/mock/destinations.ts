import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface Destination {
  id: string
  name: string
  slug: string
  county: string
  category: string
  status: 'draft' | 'published' | 'archived'
  shortDescription: string
  latitude: number
  longitude: number
  createdAt: string
  updatedAt: string
}

const store: Destination[] = [
  {
    id: 'dest-1',
    name: 'Maasai Mara National Reserve',
    slug: 'maasai-mara',
    county: 'Narok',
    category: 'wildlife',
    status: 'published',
    shortDescription: 'World-renowned savannah and Great Migration.',
    latitude: -1.4833,
    longitude: 35.0,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-15T00:00:00Z',
  },
  {
    id: 'dest-2',
    name: 'Diani Beach',
    slug: 'diani-beach',
    county: 'Kwale',
    category: 'beach',
    status: 'published',
    shortDescription: 'White sand beaches on the Indian Ocean coast.',
    latitude: -4.3167,
    longitude: 39.5833,
    createdAt: '2025-06-02T00:00:00Z',
    updatedAt: '2025-06-14T00:00:00Z',
  },
  {
    id: 'dest-3',
    name: 'Mount Kenya',
    slug: 'mount-kenya',
    county: 'Meru',
    category: 'adventure',
    status: 'published',
    shortDescription: 'Africa\'s second-highest peak and UNESCO site.',
    latitude: -0.15,
    longitude: 37.3,
    createdAt: '2025-06-03T00:00:00Z',
    updatedAt: '2025-06-13T00:00:00Z',
  },
]

let nextId = store.length + 1

const handlers: MockRegistry = {
  list(_params?: PaginationParams): Paginated<Destination> {
    return { items: store, nextCursor: null, hasMore: false }
  },
  get(id: string) {
    const item = store.find(d => d.id === id)
    if (!item) throw new Error('Not found')
    return item
  },
  create(body: unknown) {
    const input = body as Partial<Destination>
    const now = new Date().toISOString()
    const item: Destination = {
      id: `dest-${nextId++}`,
      name: input.name ?? '',
      slug: input.slug ?? '',
      county: input.county ?? '',
      category: input.category ?? '',
      status: 'draft',
      shortDescription: input.shortDescription ?? '',
      latitude: input.latitude ?? 0,
      longitude: input.longitude ?? 0,
      createdAt: now,
      updatedAt: now,
    }
    store.push(item)
    return item
  },
  update(id: string, patch: unknown) {
    const idx = store.findIndex(d => d.id === id)
    if (idx === -1) throw new Error('Not found')
    store[idx] = { ...store[idx], ...(patch as object), updatedAt: new Date().toISOString() } as Destination
    return store[idx]
  },
  remove(id: string) {
    const idx = store.findIndex(d => d.id === id)
    if (idx !== -1) store.splice(idx, 1)
  },
}

export default handlers
