import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface AnalyticsData {
  // Activity
  dau: number; dauChange: number
  wau: number; wauChange: number
  mau: number; mauChange: number
  newRegistrations: number; newRegistrationsChange: number
  userLocations: { county: string; count: number }[]
  // AI itineraries
  itinerariesGenerated: number; itinerariesGeneratedChange: number
  itinerariesSaved: number
  itinerariesExported: number
  itinerariesShared: number
  // Engagement
  mapInteractions: number; mapInteractionsChange: number
  destinationDetailViews: number
  storiesSubmitted: number; storiesSubmittedChange: number
  storiesApproved: number
  storiesReported: number
  courseEnrollments: number; courseEnrollmentsChange: number
  courseCompletions: number
  challengeParticipants: number
  conservationParticipants: number; conservationParticipantsChange: number
  // Content
  topDestinations: { name: string; county: string; views: number }[]
  topCategories: { name: string; count: number }[]
  contentAwaitingReview: number
  contentScheduledUpdate: number
  systemAlerts: { id: string; title: string; description: string; severity: 'info' | 'warning' | 'critical'; timestamp: string }[]
  failedIntegrations: { name: string; lastError: string; since: string }[]
}

const data: AnalyticsData = {
  dau: 2492, dauChange: 12.5,
  wau: 8923, wauChange: 8.3,
  mau: 24592, mauChange: 4.7,
  newRegistrations: 342, newRegistrationsChange: -2.1,
  userLocations: [
    { county: 'Nairobi', count: 892 },
    { county: 'Mombasa', count: 456 },
    { county: 'Kisumu', count: 234 },
    { county: 'Narok', count: 189 },
    { county: 'Kwale', count: 145 },
  ],

  itinerariesGenerated: 1243, itinerariesGeneratedChange: 15.2,
  itinerariesSaved: 876,
  itinerariesExported: 234,
  itinerariesShared: 187,
  mapInteractions: 5432, mapInteractionsChange: 6.8,
  destinationDetailViews: 18765,
  storiesSubmitted: 287, storiesSubmittedChange: 22.1,
  storiesApproved: 231,
  storiesReported: 12,
  courseEnrollments: 456, courseEnrollmentsChange: 3.4,
  courseCompletions: 312,
  challengeParticipants: 89,
  conservationParticipants: 47, conservationParticipantsChange: 18.0,

  topDestinations: [
    { name: 'Maasai Mara', county: 'Narok', views: 12456 },
    { name: 'Diani Beach', county: 'Kwale', views: 9876 },
    { name: 'Mount Kenya', county: 'Meru', views: 6543 },
    { name: 'Nairobi National Park', county: 'Nairobi', views: 5432 },
    { name: 'Lamu Old Town', county: 'Lamu', views: 4321 },
  ],
  topCategories: [
    { name: 'Wildlife', count: 324 },
    { name: 'Beach', count: 289 },
    { name: 'Adventure', count: 156 },
    { name: 'Culture', count: 134 },
    { name: 'Conservation', count: 89 },
  ],

  contentAwaitingReview: 34,
  contentScheduledUpdate: 12,
  systemAlerts: [
    { id: 'alt-1', title: 'R2 storage quota at 85%', description: 'Cloudflare R2 bucket approaching capacity limit.', severity: 'warning', timestamp: '2025-07-26T10:30:00Z' },
    { id: 'alt-2', title: 'AI inference rate limit hit', description: 'LLM API rate limit reached during peak (14:00-15:00 EAT). Token budget throttled.', severity: 'critical', timestamp: '2025-07-26T14:15:00Z' },
    { id: 'alt-3', title: 'PostGIS unavailable', description: 'Go backend PostGIS extension currently offline. Map interactions degraded.', severity: 'critical', timestamp: '2025-07-26T16:00:00Z' },
    { id: 'alt-4', title: 'Scheduled maintenance', description: 'Server maintenance window: 2025-07-28 02:00-04:00 EAT.', severity: 'info', timestamp: '2025-07-26T08:00:00Z' },
  ],
  failedIntegrations: [
    { name: 'PostGIS extension', lastError: 'Connection refused after 5 retries', since: '2025-07-26T16:00:00Z' },
    { name: 'LLM API proxy', lastError: 'Rate limit exceeded — 429 Too Many Requests', since: '2025-07-26T14:15:00Z' },
  ],
}

const handlers: MockRegistry = {
  list(_params?: PaginationParams): Paginated<Record<string, unknown>> {
    return { items: [data], nextCursor: null, hasMore: false }
  },
  get(_id: string) {
    return data
  },
  create(body: unknown) {
    return body
  },
  update(_id: string, patch: unknown) {
    return { ...data, ...(patch as object) }
  },
  remove() {},
}

export default handlers
