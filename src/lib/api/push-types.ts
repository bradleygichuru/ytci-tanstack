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

export interface PushTicket {
  id: string
  status: 'ok' | 'error'
  message?: string
}

export interface PushSendResult {
  sendId: string
  campaignId: string
  audience: PushAudience
  mode: 'immediate' | 'scheduled'
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'partial'
  scheduledAt?: string
  sentAt: string
  tickets: PushTicket[]
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
  tokens: PushTokenStatus[]
}

export interface PushTokenStatus {
  token: string
  status: 'sent' | 'delivered' | 'DeviceNotRegistered' | 'MessageTooBig' | 'failed'
  error?: string
}

export interface PushTokenCountResult {
  devices: number
  audience: PushAudience
}

export interface PushReceiptResponse {
  receipts: Record<string, { status: string; message?: string; details?: Record<string, unknown> }>
}
