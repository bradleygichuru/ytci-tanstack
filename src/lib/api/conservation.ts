import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { Paginated, PaginationParams } from './types'

export interface ConservationActivity {
  id: string
  title: string
  organizer: string
  location: string
  locationPrivacyLevel: 'public' | 'sensitive'
  date: string
  impactMetric: string
  measurementUnit: string
  impactGoal: number
  impactActual: number
  participantCount: number
  status: 'open' | 'full' | 'completed' | 'cancelled'
  verificationRules: string
  badgeAwarded: boolean
  badgeName: string
  badgeIconUrl?: string
}

export interface EvidenceItem {
  id: string
  activityTitle: string
  activityId: string
  userName: string
  userId: string
  description: string
  imageUrl: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  reviewerNote?: string
}

export function conservationApi(config: ApiConfig) {
  return {
    activities: {
      list: (params?: PaginationParams) =>
        apiRequest<Paginated<ConservationActivity>>(config, '/v1/conservation/activities', { params }),
      create: (body: Record<string, unknown>) =>
        apiRequest<{ id: string }>(config, '/v1/conservation/activities', { method: 'POST', body }),
      update: (id: string, patch: Record<string, unknown>) =>
        apiRequest<ConservationActivity>(config, `/v1/conservation/activities/${id}`, { method: 'PATCH', body: patch }),
    },
    evidence: {
      list: (params?: PaginationParams) =>
        apiRequest<Paginated<EvidenceItem>>(config, '/v1/conservation/evidence', { params }),
      review: (id: string, action: 'approve' | 'reject') =>
        apiRequest<EvidenceItem>(config, `/v1/conservation/evidence/${id}/review`, { method: 'POST', body: { action, note: '' } }),
    },
  }
}
