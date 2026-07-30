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
  imageUrl: string
  imageUrlKey: string
  reminderEnabled: boolean
  reminderMinutes: number | null
}

export const REMINDER_LABELS: Record<number, string> = {
  30: '30 minutes before',
  60: '1 hour before',
  1440: '1 day before',
  4320: '3 days before',
  10080: '1 week before',
}

export const REMINDER_VALUES: Record<string, number> = {
  '30 minutes before': 30,
  '1 hour before': 60,
  '1 day before': 1440,
  '3 days before': 4320,
  '1 week before': 10080,
}

const REMINDER_OPTIONS = ['30 minutes before', '1 hour before', '1 day before', '3 days before', '1 week before']

export { REMINDER_OPTIONS }

export function minutesToLabel(minutes: number | null | undefined): string {
  if (minutes == null) return ''
  return REMINDER_LABELS[minutes] ?? ''
}

export function labelToMinutes(label: string): number | null {
  if (!label) return null
  return REMINDER_VALUES[label] ?? null
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
    uploadMedia: (id: string, body: { heroMediaId?: string }) =>
      apiRequest<{ status: string }>(config, `/v1/events/${id}/media`, { method: 'POST', body }),
  }
}
