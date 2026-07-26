import type { AreaNamespace, Paginated, PaginationParams, RequestOptions } from './types'
import { ApiErrorResponse } from './types'
import { getMockArea } from './mock'
import type { PushAudience, PushSendRequest, PushScheduleRequest, PushSendResult, PushHistoryItem, PushSendDetail, PushTokenCountResult } from './push-types'

function apiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
}

function useMock(): boolean {
  return import.meta.env.VITE_MOCK_API !== 'false'
}

async function mock<T>(area: AreaNamespace, op: string, ...args: unknown[]): Promise<T> {
  const mod = await getMockArea(area)
  const handler = (mod as Record<string, (...a: unknown[]) => T>)[op]
  if (!handler) throw new ApiErrorResponse(500, 'MOCK_NOT_FOUND', `Mock handler "${op}" not found for area "${area}"`)
  return handler(...args)
}

export async function apiRequest<T = unknown>(opts: RequestOptions): Promise<T> {
  const base = apiBaseUrl()
  const url = new URL(`${base}${opts.path}`, window.location.origin)

  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }

  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const err = body?.error ?? { code: 'UNKNOWN', message: res.statusText }
    throw new ApiErrorResponse(res.status, err.code, err.message, err.details)
  }

  return res.json() as Promise<T>
}

async function getToken(): Promise<string | null> {
  try {
    const { authClient } = await import('#/lib/auth-client')
    const session = await authClient.getSession()
    const token = session?.data?.session?.token
    return token ?? null
  } catch {
    return null
  }
}

export function createApiClient() {
  const mockMode = useMock()

  function list<T>(area: AreaNamespace, params?: PaginationParams): Promise<Paginated<T>> {
    if (mockMode) return mock<Paginated<T>>(area, 'list', params)
    return apiRequest<Paginated<T>>({ path: `/${area}`, params: params as Record<string, string> })
  }

  function get<T>(area: AreaNamespace, id: string): Promise<T> {
    if (mockMode) return mock<T>(area, 'get', id)
    return apiRequest<T>({ path: `/${area}/${id}` })
  }

  function create<T>(area: AreaNamespace, body: unknown): Promise<T> {
    if (mockMode) return mock<T>(area, 'create', body)
    return apiRequest<T>({ method: 'POST', path: `/${area}`, body })
  }

  function update<T>(area: AreaNamespace, id: string, patch: unknown): Promise<T> {
    if (mockMode) return mock<T>(area, 'update', id, patch)
    return apiRequest<T>({ method: 'PATCH', path: `/${area}/${id}`, body: patch })
  }

  function remove(area: AreaNamespace, id: string): Promise<void> {
    if (mockMode) return mock<void>(area, 'remove', id)
    return apiRequest<void>({ method: 'DELETE', path: `/${area}/${id}` })
  }

  async function pushSend(body: PushSendRequest): Promise<PushSendResult> {
    if (mockMode) {
      const mod = await import('./mock/push')
      return mod.default.send(body)
    }
    return apiRequest<PushSendResult>({ method: 'POST', path: '/push/send', body })
  }

  async function pushSchedule(body: PushScheduleRequest): Promise<PushScheduleRequest & { scheduleId: string }> {
    if (mockMode) {
      const mod = await import('./mock/push')
      return mod.default.schedule(body)
    }
    return apiRequest<PushScheduleRequest & { scheduleId: string }>({ method: 'POST', path: '/push/schedule', body })
  }

  async function pushHistory(params?: { campaignId?: string; page?: number; limit?: number }): Promise<Paginated<PushHistoryItem>> {
    if (mockMode) {
      const mod = await import('./mock/push')
      return mod.default.history(params)
    }
    return apiRequest<Paginated<PushHistoryItem>>({ method: 'GET', path: '/push/history', params: params as Record<string, string | number | undefined> })
  }

  async function pushDetail(id: string): Promise<PushSendDetail> {
    if (mockMode) {
      const mod = await import('./mock/push')
      const result = mod.default.detail(id)
      if (!result) throw new ApiErrorResponse(404, 'NOT_FOUND', 'Push send not found')
      return result
    }
    return apiRequest<PushSendDetail>({ method: 'GET', path: `/push/history/${id}` })
  }

  async function pushTokenCount(audience: PushAudience): Promise<PushTokenCountResult> {
    if (mockMode) {
      const mod = await import('./mock/push')
      return mod.default.tokenCount(audience)
    }
    return apiRequest<PushTokenCountResult>({ method: 'POST', path: '/push/validate-tokens', body: audience })
  }

  return { list, get, create, update, remove, pushSend, pushSchedule, pushHistory, pushDetail, pushTokenCount }
}

export const api = createApiClient()
