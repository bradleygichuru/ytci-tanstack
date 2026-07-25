import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface AnalyticsSummary {
  dau: number
  wau: number
  mau: number
  newRegistrations: number
  topDestinations: { name: string; views: number }[]
  itinerariesGenerated: number
  storiesSubmitted: number
  courseEnrollments: number
  conservationParticipants: number
}

const summary: AnalyticsSummary = {
  dau: 142,
  wau: 612,
  mau: 1800,
  newRegistrations: 34,
  topDestinations: [
    { name: 'Maasai Mara', views: 1234 },
    { name: 'Diani Beach', views: 987 },
    { name: 'Mount Kenya', views: 654 },
  ],
  itinerariesGenerated: 89,
  storiesSubmitted: 23,
  courseEnrollments: 12,
  conservationParticipants: 7,
}

const handlers: MockRegistry = {
  list(_params?: PaginationParams): Paginated<Record<string, unknown>> {
    return { items: [summary], nextCursor: null, hasMore: false }
  },
  get(_id: string) {
    return summary
  },
  create(body: unknown) {
    return body
  },
  update(_id: string, patch: unknown) {
    return { ...summary, ...(patch as object) }
  },
  remove() {},
}

export default handlers
