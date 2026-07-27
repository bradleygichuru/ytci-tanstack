import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { Paginated, PaginationParams } from './types'

export interface Campaign {
  id: string
  title: string
  description: string
  type: 'home_banner' | 'featured_destination' | 'push_notification' | 'seasonal'
  bannerUrl: string
  targetUrl: string
  destinationId: string
  audience: string
  startDate: string
  endDate: string
  status: 'draft' | 'active' | 'paused' | 'ended'
}

export function campaignsApi(config: ApiConfig) {
  return {
    list: (params?: PaginationParams) =>
      apiRequest<Paginated<Campaign>>(config, '/v1/campaigns', { params }),
    get: (id: string) =>
      apiRequest<Campaign>(config, `/v1/campaigns/${id}`),
    create: (body: Record<string, unknown>) =>
      apiRequest<{ id: string }>(config, '/v1/campaigns', { method: 'POST', body }),
    update: (id: string, patch: Record<string, unknown>) =>
      apiRequest<Campaign>(config, `/v1/campaigns/${id}`, { method: 'PATCH', body: patch }),
    remove: (id: string) =>
      apiRequest<void>(config, `/v1/campaigns/${id}`, { method: 'DELETE' }),
  }
}
