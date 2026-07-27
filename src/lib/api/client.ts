import { ApiErrorResponse } from './types'
import type { PaginationParams } from './types'

export interface ApiConfig {
  baseUrl: string
  token: string | undefined
}

type ParamsLike = PaginationParams | Record<string, string | number | undefined>

function toRecord(params?: ParamsLike): Record<string, string | number | undefined> | undefined {
  if (!params) return undefined
  const r: Record<string, string | number | undefined> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) r[k] = String(v)
  }
  return Object.keys(r).length > 0 ? r : undefined
}

export async function apiRequest<T = unknown>(
  config: ApiConfig,
  path: string,
  opts?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
    params?: PaginationParams | Record<string, string | number | undefined>
    headers?: Record<string, string>
  },
): Promise<T> {
  const url = new URL(`${config.baseUrl}${path}`)

  const record = toRecord(opts?.params)
  if (record) {
    for (const [k, v] of Object.entries(record)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...opts?.headers,
  }

  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`
  }

  const res = await fetch(url.toString(), {
    method: opts?.method ?? 'GET',
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const err = body?.error ?? { code: 'UNKNOWN', message: res.statusText }
    throw new ApiErrorResponse(res.status, err.code, err.message, err.details)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
