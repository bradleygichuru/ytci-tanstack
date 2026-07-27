import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { Paginated, PaginationParams } from './types'

export interface Challenge {
  id: string
  title: string
  description: string
  badgeName?: string
  status: 'draft' | 'active' | 'completed'
  startDate?: string
  endDate?: string
  createdAt: string
}

export function challengesApi(config: ApiConfig) {
  return {
    list: (params?: PaginationParams) =>
      apiRequest<Paginated<Challenge>>(config, '/v1/challenges', { params }),
    create: (body: Record<string, unknown>) =>
      apiRequest<{ id: string }>(config, '/v1/challenges', { method: 'POST', body }),
  }
}
