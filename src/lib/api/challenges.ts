import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { Paginated, PaginationParams } from './types'

export interface Challenge {
  id: string
  title: string
  description: string
  rules?: string
  badgeName?: string
  badgeIconUrl?: string
  eligibility?: string
  status: 'draft' | 'active' | 'ended'
  startDate?: string
  endDate?: string
  createdAt: string
}

export interface ChallengeEvidence {
  id: string
  userId: string
  challengeId: string
  challengeTitle: string
  userName: string
  status: 'submitted' | 'approved' | 'in_progress' | 'rejected'
  moderatedBy?: string
  moderationNote?: string
  badgeAwardedAt?: string
  evidence?: string | null
  createdAt: string
}

export function challengesApi(config: ApiConfig) {
  return {
    list: (params?: PaginationParams) =>
      apiRequest<Paginated<Challenge>>(config, '/v1/challenges', { params }),
    create: (body: Record<string, unknown>) =>
      apiRequest<{ id: string; status: string }>(config, '/v1/challenges', { method: 'POST', body }),
    update: (id: string, patch: Record<string, unknown>) =>
      apiRequest<{ status: string }>(config, `/v1/challenges/${id}`, { method: 'PATCH', body: patch }),
    remove: (id: string) =>
      apiRequest<{ status: string }>(config, `/v1/challenges/${id}`, { method: 'DELETE' }),
    evidence: {
      list: (params?: PaginationParams) =>
        apiRequest<Paginated<ChallengeEvidence>>(config, '/v1/challenges/evidence', { params }),
      review: (id: string, action: 'approve' | 'reject') =>
        apiRequest<{ status: string }>(config, `/v1/challenges/evidence/${id}/review`, { method: 'POST', body: { action, note: '' } }),
    },
  }
}
