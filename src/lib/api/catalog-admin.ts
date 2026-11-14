import type {
  CoverageRow,
  CurationCandidate,
  CurationStatus,
  GoldenFixtureRow,
  ReadinessCheck,
  ReadinessResult,
  ReviewFields,
} from '#/lib/curation'

export class CatalogApiError extends Error {
  constructor(
    message: string,
    public fields?: Record<string, string>,
    public checks?: ReadinessCheck[],
    public status = 500,
  ) {
    super(message)
    this.name = 'CatalogApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/catalog${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const body = (await response.json().catch(() => ({}))) as {
    error?: string
    fields?: Record<string, string>
    checks?: ReadinessCheck[]
  }
  if (!response.ok) {
    throw new CatalogApiError(
      body.error ?? `Request failed (${response.status})`,
      body.fields,
      body.checks,
      response.status,
    )
  }
  return body as T
}

export interface QueueResponse {
  items: CurationCandidate[]
  total: number
  limit: number
  offset: number
}

export interface CandidateResponse {
  candidate: CurationCandidate
  fields: ReviewFields
  readiness: ReadinessResult
}

export interface CoverageResponse {
  coverage: CoverageRow[]
  fixtures: GoldenFixtureRow[]
  queueCounts: Record<CurationStatus, number>
  generatedAt: string
}

export const catalogAdminApi = {
  queue: (params: {
    status?: string
    county?: string
    search?: string
    limit?: number
    offset?: number
  }) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') query.set(key, String(value))
    }
    return request<QueueResponse>(`/queue?${query.toString()}`)
  },
  candidate: (placeId: string) =>
    request<CandidateResponse>(`/candidate?placeId=${encodeURIComponent(placeId)}`),
  coverage: () => request<CoverageResponse>('/coverage'),
  draft: (placeId: string, fields: ReviewFields) =>
    request<{ destinationId: string; slug: string; status: string; readiness: ReadinessResult }>(
      '/draft',
      { method: 'POST', body: JSON.stringify({ placeId, fields }) },
    ),
  publish: (placeId: string, fields: ReviewFields) =>
    request<{ destinationId: string; slug: string; status: string; readiness: ReadinessResult }>(
      '/publish',
      { method: 'POST', body: JSON.stringify({ placeId, fields }) },
    ),
  reject: (placeId: string, reason: string) =>
    request<{ status: string }>('/reject', {
      method: 'POST',
      body: JSON.stringify({ placeId, reason }),
    }),
}
