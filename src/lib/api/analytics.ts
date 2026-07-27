import type { ApiConfig } from './client'
import { apiRequest } from './client'

export interface AnalyticsData {
  dau: number; dauChange: number
  wau: number; wauChange: number
  mau: number; mauChange: number
  newRegistrations: number; newRegistrationsChange: number
  userLocations: { county: string; count: number }[]
  itinerariesGenerated: number; itinerariesGeneratedChange: number
  itinerariesSaved: number; itinerariesExported: number; itinerariesShared: number
  mapInteractions: number; mapInteractionsChange: number
  destinationDetailViews: number
  storiesSubmitted: number; storiesSubmittedChange: number; storiesApproved: number; storiesReported: number
  courseEnrollments: number; courseEnrollmentsChange: number; courseCompletions: number
  challengeParticipants: number
  conservationParticipants: number; conservationParticipantsChange: number
  topDestinations: { name: string; county: string; views: number }[]
  topCategories: { name: string; count: number }[]
  contentAwaitingReview: number; contentScheduledUpdate: number
  systemAlerts: { id: string; title: string; description: string; severity: string; timestamp: string }[]
  failedIntegrations: { name: string; lastError: string; since: string }[]
}

export function analyticsApi(config: ApiConfig) {
  return {
    summary: () =>
      apiRequest<AnalyticsData>(config, '/v1/analytics/summary'),
    exportReport: (body: { format: 'csv' | 'pdf'; dateFrom: string; dateTo: string; sections: string[] }) =>
      apiRequest<{ reportId: string; status: string; createdAt: string }>(config, '/v1/analytics/reports/export', { method: 'POST', body }),
  }
}
