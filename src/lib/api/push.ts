import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { Paginated } from './types'

export interface PushAudience {
  type: 'all' | 'county' | 'role' | 'interest'
  value?: string
}

export interface PushSendRequest {
  campaignId: string
  audience: PushAudience
  title: string
  body: string
  imageUrl?: string
  data?: Record<string, string>
}

export interface PushScheduleRequest extends PushSendRequest {
  scheduledAt: string
}

export interface PushSendResult {
  sendId: string
  campaignId: string
  audience: PushAudience
  mode: 'immediate' | 'scheduled'
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'partial'
  scheduledAt?: string
  sentAt: string
  tokenCount: number
  deliveredCount: number
  failedCount: number
}

export interface PushHistoryItem {
  sendId: string
  campaignId: string
  mode: 'immediate' | 'scheduled'
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'partial'
  audience: PushAudience
  sentAt: string
  scheduledAt?: string
  tokenCount: number
  deliveredCount: number
  failedCount: number
}

export interface PushSendDetail {
  sendId: string
  campaignId: string
  mode: 'immediate' | 'scheduled'
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'partial'
  audience: PushAudience
  sentAt: string
  scheduledAt?: string
  title: string
  body: string
}

export interface PushTokenCountResult {
  devices: number
  audience: PushAudience
}

export function pushApi(config: ApiConfig) {
  return {
    send: (body: PushSendRequest) =>
      apiRequest<{ notificationId: string; recipientCount: number }>(config, '/v1/push/send', { method: 'POST', body }),
    schedule: (body: PushScheduleRequest) =>
      apiRequest<{ notificationId: string; scheduledAt: string }>(config, '/v1/push/schedule', { method: 'POST', body }),
    history: (params?: { campaignId?: string; cursor?: string; limit?: number }) =>
      apiRequest<Paginated<PushHistoryItem>>(config, '/v1/push/history', { params }),
    detail: (id: string) =>
      apiRequest<PushSendDetail>(config, `/v1/push/history/${id}`),
    tokenCount: (audience: PushAudience) =>
      apiRequest<PushTokenCountResult>(config, '/v1/push/validate-tokens', { method: 'POST', body: audience }),
  }
}
