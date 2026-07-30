import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { Paginated, PaginationParams } from './types'

export interface StoryItem {
  id: string
  creatorHandle: string
  creatorId: string
  caption: string
  mediaType: string
  thumbUrl: string
  location: string
  tags: string[]
  status: 'pending' | 'approved' | 'rejected'
  likeCount: number
  saveCount: number
  submittedAt: string
}

export interface ModerationResponse {
  id: string
  status: string
  moderatedBy: string | null
  moderatedAt: string
}

export function storiesApi(config: ApiConfig) {
  return {
    list: (params?: PaginationParams) =>
      apiRequest<Paginated<StoryItem>>(config, '/v1/stories', { params }),
    moderationList: (params?: PaginationParams & { status?: string }) =>
      apiRequest<Paginated<StoryItem>>(config, '/v1/stories/moderation', { params }),
    moderate: (id: string, action: 'approve' | 'reject', reason: string) =>
      apiRequest<ModerationResponse>(config, `/v1/stories/${id}/moderation`, { method: 'POST', body: { action, reason } }),
    report: (id: string, reason: string, comment?: string) =>
      apiRequest<void>(config, `/v1/stories/${id}/report`, { method: 'POST', body: { reason, comment } }),
  }
}
