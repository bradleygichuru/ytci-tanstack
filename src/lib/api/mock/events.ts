import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface EventItem {
  id: string; title: string; organizer: string; county: string; venue: string
  date: string; endDate: string; type: 'cultural' | 'sports' | 'conservation' | 'tourism'
  status: 'scheduled' | 'postponed' | 'cancelled'
  description: string; contactEmail: string; contactPhone: string
  reminderEnabled: boolean; reminderTime: string
  mediaAttachments: string[]
  createdAt: string
}

const store: EventItem[] = [
  { id: 'evt-1', title: 'Lake Turkana Cultural Festival', organizer: 'Turkana County Government', county: 'Turkana', venue: 'Loiyangalani', date: '2025-09-15', endDate: '2025-09-18', type: 'cultural', status: 'scheduled', description: 'Celebration of Turkana culture, music and dance featuring over 20 communities.', contactEmail: 'info@turkana.go.ke', contactPhone: '+254 720 123456', reminderEnabled: true, reminderTime: '1 day before', mediaAttachments: ['poster.jpg'], createdAt: '2025-06-01T00:00:00Z' },
  { id: 'evt-2', title: 'Nairobi Marathon', organizer: 'Athletics Kenya', county: 'Nairobi', venue: 'Nyayo Stadium', date: '2025-10-26', endDate: '2025-10-26', type: 'sports', status: 'scheduled', description: 'Annual marathon through the streets of Nairobi. Categories: full, half, 10km.', contactEmail: 'info@athleticskenya.or.ke', contactPhone: '+254 722 654321', reminderEnabled: false, reminderTime: '1 day before', mediaAttachments: [], createdAt: '2025-06-05T00:00:00Z' },
  { id: 'evt-3', title: 'Coastal Cleanup Challenge', organizer: 'Kwale Conservation Trust', county: 'Kwale', venue: 'Diani Beach', date: '2025-08-15', endDate: '2025-08-15', type: 'conservation', status: 'scheduled', description: 'Join the community for a beach cleanup and marine conservation awareness day.', contactEmail: 'cleanup@kwaleconservation.org', contactPhone: '+254 733 987654', reminderEnabled: true, reminderTime: '3 days before', mediaAttachments: ['cleanup-banner.jpg'], createdAt: '2025-06-10T00:00:00Z' },
  { id: 'evt-4', title: 'Maasai Cultural Exchange', organizer: 'Maasai Tourism Board', county: 'Narok', venue: 'Mara Serena Lodge', date: '2025-07-20', endDate: '2025-07-22', type: 'cultural', status: 'postponed', description: 'Immersive cultural exchange with Maasai elders. Originally scheduled for June, moved due to weather.', contactEmail: 'culture@maasaitourism.co.ke', contactPhone: '+254 733 111222', reminderEnabled: true, reminderTime: '1 week before', mediaAttachments: [], createdAt: '2025-05-01T00:00:00Z' },
  { id: 'evt-5', title: 'Kisumu Tourism Expo 2025', organizer: 'Kisumu County', county: 'Kisumu', venue: 'Jomo Kenyatta Sports Ground', date: '2025-04-10', endDate: '2025-04-12', type: 'tourism', status: 'cancelled', description: 'Regional tourism expo showcasing western Kenya attractions. Cancelled due to venue renovation.', contactEmail: 'tourism@kisumu.go.ke', contactPhone: '+254 757 333444', reminderEnabled: false, reminderTime: '1 day before', mediaAttachments: [], createdAt: '2025-03-01T00:00:00Z' },
]

let nextId = store.length + 1

const transitionMap: Record<string, string[]> = {
  scheduled: ['postponed', 'cancelled'],
  postponed: ['scheduled', 'cancelled'],
  cancelled: ['scheduled'],
}

const handlers: MockRegistry = {
  list(): Paginated<Record<string, unknown>> {
    return { items: store as unknown as Record<string, unknown>[], nextCursor: null, hasMore: false }
  },
  get(id: string) { return store.find(e => e.id === id) ?? store[0] },
  create(body: unknown) {
    const input = body as Partial<EventItem>
    const now = new Date().toISOString()
    const item: EventItem = { id: `evt-${nextId++}`, title: input.title ?? '', organizer: input.organizer ?? '', county: input.county ?? '', venue: input.venue ?? '', date: input.date ?? '', endDate: input.endDate ?? '', type: input.type ?? 'tourism', status: 'scheduled', description: input.description ?? '', contactEmail: input.contactEmail ?? '', contactPhone: '', reminderEnabled: false, reminderTime: '1 day before', mediaAttachments: [], createdAt: now }
    store.push(item); return item
  },
  update(id: string, patch: unknown) {
    const idx = store.findIndex(e => e.id === id)
    if (idx === -1) throw new Error('Not found')
    store[idx] = { ...store[idx], ...(patch as Partial<EventItem>) } as EventItem
    return store[idx]
  },
  remove(id: string) {
    const idx = store.findIndex(e => e.id === id); if (idx !== -1) store.splice(idx, 1)
  },
}

export default handlers
