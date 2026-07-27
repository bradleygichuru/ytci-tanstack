import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { Paginated, PaginationParams } from './types'

export interface EventItem {
  id: string
  title: string
  organizer: string
  county: string
  venue: string
  date: string
  endDate: string
  type: string
  status: 'scheduled' | 'postponed' | 'cancelled'
  description: string
  contactEmail: string
  contactPhone: string
  reminderEnabled: boolean
  reminderTime: string
}

export function eventsApi(config: ApiConfig) {
  return {
    list: (params?: PaginationParams) =>
      apiRequest<Paginated<EventItem>>(config, '/v1/events', { params }),
    get: (id: string) =>
      apiRequest<EventItem>(config, `/v1/events/${id}`),
    create: (body: Record<string, unknown>) =>
      apiRequest<{ id: string }>(config, '/v1/events', { method: 'POST', body }),
    update: (id: string, patch: Record<string, unknown>) =>
      apiRequest<EventItem>(config, `/v1/events/${id}`, { method: 'PATCH', body: patch }),
    updateStatus: (id: string, status: string) =>
      apiRequest<EventItem>(config, `/v1/events/${id}/status`, { method: 'PATCH', body: { status } }),
    remove: (id: string) =>
      apiRequest<void>(config, `/v1/events/${id}`, { method: 'DELETE' }),
  }
}
