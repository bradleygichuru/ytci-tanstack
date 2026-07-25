import type { AreaNamespace, Paginated, PaginationParams, RequestOptions } from './types'
import { ApiErrorResponse } from './types'
import { getMockArea } from './mock'

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

  return { list, get, create, update, remove }
}

export const api = createApiClient()
