import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface Campaign {
  id: string
  title: string
  bannerUrl: string
  type: 'home_banner' | 'featured_destination' | 'push_notification' | 'seasonal'
  status: 'draft' | 'active' | 'paused' | 'ended'
  startDate: string
  endDate: string
  targetUrl?: string
  createdAt: string
}

const store: Campaign[] = [
  {
    id: 'cmp-1',
    title: 'Discover the Coast',
    bannerUrl: 'https://r2.example.com/campaigns/coast-banner.jpg',
    type: 'home_banner',
    status: 'active',
    startDate: '2025-07-01',
    endDate: '2025-09-30',
    targetUrl: '/destinations/diani-beach',
    createdAt: '2025-06-15T00:00:00Z',
  },
  {
    id: 'cmp-2',
    title: 'Wildlife Season',
    bannerUrl: 'https://r2.example.com/campaigns/wildlife-banner.jpg',
    type: 'seasonal',
    status: 'draft',
    startDate: '2025-08-01',
    endDate: '2025-10-31',
    targetUrl: '/destinations/maasai-mara',
    createdAt: '2025-06-20T00:00:00Z',
  },
]

let nextId = store.length + 1

const handlers: MockRegistry = {
  list(): Paginated<Campaign> {
    return { items: store, nextCursor: null, hasMore: false }
  },
  get(id: string) {
    return store.find(c => c.id === id) ?? store[0]
  },
  create(body: unknown) {
    const input = body as Partial<Campaign>
    const item: Campaign = {
      id: `cmp-${nextId++}`,
      title: input.title ?? '',
      bannerUrl: input.bannerUrl ?? '',
      type: (input.type as Campaign['type']) ?? 'home_banner',
      status: 'draft',
      startDate: input.startDate ?? '',
      endDate: input.endDate ?? '',
      targetUrl: input.targetUrl,
      createdAt: new Date().toISOString(),
    }
    store.push(item)
    return item
  },
  update(id: string, patch: unknown) {
    const idx = store.findIndex(c => c.id === id)
    if (idx === -1) throw new Error('Not found')
    store[idx] = { ...store[idx], ...(patch as object) } as Campaign
    return store[idx]
  },
  remove(id: string) {
    const idx = store.findIndex(c => c.id === id)
    if (idx !== -1) store.splice(idx, 1)
  },
}

export default handlers
