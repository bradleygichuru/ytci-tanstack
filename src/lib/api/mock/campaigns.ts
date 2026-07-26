import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface Campaign {
  id: string; title: string; description: string; bannerUrl: string
  type: 'home_banner' | 'featured_destination' | 'push_notification' | 'seasonal'
  status: 'draft' | 'active' | 'paused' | 'ended'
  startDate: string; endDate: string; targetUrl?: string
  featuredDestinationId?: string; audience?: string
  createdAt: string
}

const store: Campaign[] = [
  { id: 'cmp-1', title: 'Discover the Coast', description: 'Summer campaign highlighting Kenya\'s coastal destinations — Diani, Watamu, Malindi.', bannerUrl: 'https://r2.example.com/campaigns/coast-banner.jpg', type: 'home_banner', status: 'active', startDate: '2025-07-01', endDate: '2025-09-30', targetUrl: '/destinations/diani-beach', createdAt: '2025-06-15T00:00:00Z' },
  { id: 'cmp-2', title: 'Wildlife Season', description: 'Promote Maasai Mara, Amboseli, and Tsavo as winter wildlife destinations.', bannerUrl: 'https://r2.example.com/campaigns/wildlife-banner.jpg', type: 'seasonal', status: 'draft', startDate: '2025-08-01', endDate: '2025-10-31', targetUrl: '/destinations/maasai-mara', createdAt: '2025-06-20T00:00:00Z' },
  { id: 'cmp-3', title: 'Maasai Mara — Great Migration', description: 'Feature Maasai Mara as the premium safari destination on the home page.', bannerUrl: 'https://r2.example.com/campaigns/mara-featured.jpg', type: 'featured_destination', status: 'active', startDate: '2025-07-15', endDate: '2025-08-31', targetUrl: '/destinations/maasai-mara', featuredDestinationId: 'dest-1', createdAt: '2025-07-01T00:00:00Z' },
  { id: 'cmp-4', title: 'Flash Sale — Mountain Treks', description: 'Limited-time push alert: 20% off guided treks on Mount Kenya this month!', bannerUrl: '', type: 'push_notification', status: 'draft', startDate: '2025-08-01', endDate: '2025-08-07', audience: 'solo_adventurers', createdAt: '2025-07-10T00:00:00Z' },
  { id: 'cmp-5', title: 'Beach Escape (Summer)', description: 'Seasonal campaign for the December holiday rush.', bannerUrl: 'https://r2.example.com/campaigns/beach-summer.jpg', type: 'seasonal', status: 'ended', startDate: '2025-04-01', endDate: '2025-06-30', targetUrl: '/destinations/diani-beach', createdAt: '2025-03-01T00:00:00Z' },
  { id: 'cmp-6', title: 'Cultural Immersion — Lamu', description: 'Feature Lamu Old Town as a cultural heritage destination.', bannerUrl: 'https://r2.example.com/campaigns/lamu-banner.jpg', type: 'home_banner', status: 'paused', startDate: '2025-07-01', endDate: '2025-07-31', targetUrl: '/destinations/lamu', createdAt: '2025-06-20T00:00:00Z' },
]

let nextId = store.length + 1

const statusTransitions: Record<string, string[]> = {
  draft: ['active'], active: ['paused', 'ended'], paused: ['active', 'ended'], ended: ['draft'],
}

const handlers: MockRegistry = {
  list(): Paginated<Record<string, unknown>> {
    return { items: store as unknown as Record<string, unknown>[], nextCursor: null, hasMore: false }
  },
  get(id: string) { return store.find(c => c.id === id) ?? store[0] },
  create(body: unknown) {
    const input = body as Partial<Campaign>
    const now = new Date().toISOString()
    const item: Campaign = { id: `cmp-${nextId++}`, title: input.title ?? '', description: input.description ?? '', bannerUrl: input.bannerUrl ?? '', type: input.type ?? 'home_banner', status: 'draft', startDate: input.startDate ?? '', endDate: input.endDate ?? '', targetUrl: input.targetUrl, createdAt: now }
    store.push(item); return item
  },
  update(id: string, patch: unknown) {
    const idx = store.findIndex(c => c.id === id)
    if (idx === -1) throw new Error('Not found')
    store[idx] = { ...store[idx], ...(patch as Partial<Campaign>) } as Campaign
    return store[idx]
  },
  remove(id: string) {
    const idx = store.findIndex(c => c.id === id); if (idx !== -1) store.splice(idx, 1)
  },
}

export default handlers
