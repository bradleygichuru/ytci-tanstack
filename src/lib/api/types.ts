export interface ApiErrorBody {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ApiError {
  error: ApiErrorBody
}

export class ApiErrorResponse extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiErrorResponse'
  }
}

export interface Paginated<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface PaginationParams {
  cursor?: string
  limit?: number
}

export interface AuditMeta {
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export type AreaNamespace =
  | 'analytics'
  | 'destinations'
  | 'media'
  | 'stories'
  | 'courses'
  | 'conservation'
  | 'events'
  | 'ai-config'
  | 'campaigns'
  | 'users'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export interface RequestOptions {
  method?: HttpMethod
  path: string
  body?: unknown
  params?: Record<string, string | number | undefined>
  headers?: Record<string, string>
}
