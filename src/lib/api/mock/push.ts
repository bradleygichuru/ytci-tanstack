import type { Paginated } from '../types'
import type {
  PushAudience,
  PushSendRequest,
  PushScheduleRequest,
  PushSendResult,
  PushHistoryItem,
  PushSendDetail,
  PushTokenCountResult,
  PushTokenStatus,
} from '../push-types'

interface ScheduledSend {
  id: string
  request: PushScheduleRequest
  createdAt: string
}

const historyStore: PushSendResult[] = []
const scheduleStore: ScheduledSend[] = []
let nextId = 1
let deviceCounters: Record<string, number> = {
  all: 5421,
  county_Nairobi: 1234,
  county_Kwale: 847,
  county_Narok: 563,
  county_Meru: 412,
  county_Kisumu: 789,
  role_administrator: 12,
  role_moderator: 24,
  role_county_officer: 94,
  interest_wildlife: 2198,
  interest_beach: 1845,
  interest_culture: 1567,
  interest_adventure: 1342,
  interest_food: 892,
  interest_photography: 1654,
}

function resolveDeviceCount(audience: PushAudience): number {
  if (audience.type === 'all') return deviceCounters.all
  const key = `${audience.type}_${audience.value ?? ''}`
  return deviceCounters[key] ?? Math.floor(Math.random() * 1000) + 50
}

function generateTokens(count: number): PushTokenStatus[] {
  const tokens: PushTokenStatus[] = []
  for (let i = 0; i < count; i++) {
    const hex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    const rand = Math.random()
    let status: PushTokenStatus['status']
    if (rand < 0.85) status = 'delivered'
    else if (rand < 0.93) status = 'sent'
    else if (rand < 0.97) status = 'DeviceNotRegistered'
    else status = 'failed'
    tokens.push({ token: `ExponentPushToken[${hex}]`, status })
  }
  return tokens
}

const handlers = {
  send(request: PushSendRequest): PushSendResult {
    const count = resolveDeviceCount(request.audience)
    const failed = Math.floor(count * 0.08)
    const delivered = count - failed - Math.floor(count * 0.03)
    const tickets = Array.from({ length: Math.ceil(count / 100) }, () => ({
      id: `ticket-${nextId++}`,
      status: 'ok' as const,
    }))
    const result: PushSendResult = {
      sendId: `send-${nextId++}`,
      campaignId: request.campaignId,
      audience: request.audience,
      mode: 'immediate',
      status: 'delivered',
      sentAt: new Date().toISOString(),
      tickets,
      tokenCount: count,
      deliveredCount: delivered,
      failedCount: failed,
    }
    historyStore.unshift(result)
    return result
  },

  schedule(request: PushScheduleRequest): PushScheduleRequest & { scheduleId: string } {
    const scheduled: ScheduledSend = {
      id: `schedule-${nextId++}`,
      request,
      createdAt: new Date().toISOString(),
    }
    scheduleStore.push(scheduled)
    return { ...request, scheduleId: scheduled.id }
  },

  history(params?: { campaignId?: string; page?: number; limit?: number }): Paginated<PushHistoryItem> {
    const page = params?.page ?? 1
    const limit = params?.limit ?? 20
    let items = historyStore as PushHistoryItem[]
    if (params?.campaignId) {
      items = items.filter(h => h.campaignId === params.campaignId)
    }
    const start = (page - 1) * limit
    const paged = items.slice(start, start + limit)
    return { items: paged as unknown as Record<string, unknown>[], nextCursor: paged.length === limit ? String(page + 1) : null, hasMore: paged.length === limit }
  },

  detail(id: string): PushSendDetail | undefined {
    const item = historyStore.find(h => h.sendId === id)
    if (!item) return undefined
    const count = resolveDeviceCount(item.audience)
    return {
      ...item,
      title: `Push notification for campaign ${item.campaignId}`,
      body: 'This is a simulated push notification payload.',
      tokens: generateTokens(Math.min(count, 20)),
    }
  },

  tokenCount(audience: PushAudience): PushTokenCountResult {
    return { devices: resolveDeviceCount(audience), audience }
  },
}

export type PushMockApi = typeof handlers

export default handlers
