import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { Paginated } from './types'

export interface CommentItem {
  id: string
  storyId: string
  authorId: string
  authorName: string
  body: string
  status: 'published' | 'deleted'
  likeCount: number
  createdAt: string
  storyCaption: string
}

export function commentsApi(config: ApiConfig) {
  return {
    moderationList: (params?: { offset?: number; limit?: number }) =>
      apiRequest<Paginated<CommentItem>>(config, '/v1/comments/moderation', { params }),
    moderate: (commentId: string, action: 'delete', reason: string) =>
      apiRequest<void>(config, `/v1/comments/moderation/${commentId}`, {
        method: 'POST',
        body: { action, reason },
      }),
  }
}
