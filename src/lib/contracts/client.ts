/**
 * Typed client for the frozen execution contracts.
 *
 * Types come from `src/lib/contracts/generated/contracts.ts`, generated from
 * `openapi/contracts.v1.yaml`. The admin app calls the Go API directly in local
 * development (`cmd/contracts-mock` on :8099) and through the BFF proxy in
 * deployed environments; both speak this contract.
 *
 * Feature streams import `contractsApi` and the helpers here. They must not
 * build their own fetch wrapper, error parser or fixture-state handling.
 */
import createClient, { type Middleware } from 'openapi-fetch'
import type { components, operations, paths } from '#/lib/contracts/generated/contracts'

export type ContractsPaths = paths
export type ContractsOperations = operations
export type ContractsSchemas = components['schemas']

export type ContractErrorBody = {
  error?: { code?: string; message?: string; details?: unknown; requestId?: string }
  errors?: { field: string; message: string }[]
}

export class ContractsApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown
  readonly requestId?: string
  readonly fieldErrors: { field: string; message: string }[]

  constructor(
    status: number,
    code: string,
    message: string,
    options: {
      details?: unknown
      requestId?: string
      fieldErrors?: { field: string; message: string }[]
    } = {},
  ) {
    super(message)
    this.name = 'ContractsApiError'
    this.status = status
    this.code = code
    this.details = options.details
    this.requestId = options.requestId
    this.fieldErrors = options.fieldErrors ?? []
  }
}

export const FIXTURE_STATES = ['default', 'empty', 'error', 'stale'] as const
export type FixtureState = (typeof FIXTURE_STATES)[number]

export const MOCK_ADDR = 'http://localhost:8099'

/**
 * `VITE_CONTRACTS_API_URL` wins (deployed BFF). In dev the mock is the default.
 * Relative URLs go through the BFF proxy that attaches the session cookie.
 */
export function contractsBaseUrl(): string {
  const explicit = import.meta.env.VITE_CONTRACTS_API_URL
  if (explicit) return explicit.replace(/\/$/, '')
  if (import.meta.env.DEV) return MOCK_ADDR
  return ''
}

export function isMockTarget(baseUrl: string = contractsBaseUrl()): boolean {
  return /localhost:8099|127\.0\.0\.1:8099/.test(baseUrl)
}

export interface ContractsClientOptions {
  baseUrl?: string
  /** Bearer token for the direct Go API; the BFF path uses cookies instead. */
  getToken?: () => string | null | undefined
  /** Dev/mock only: force a fixture state. */
  fixtureState?: FixtureState
  fetch?: typeof fetch
}

function parseErrorBody(body: unknown): ContractErrorBody {
  if (!body || typeof body !== 'object') return {}
  return body as ContractErrorBody
}

export async function toContractsError(response: Response): Promise<ContractsApiError> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }
  const parsed = parseErrorBody(body)
  return new ContractsApiError(
    response.status,
    parsed.error?.code ?? (response.status === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR'),
    parsed.error?.message ?? `HTTP ${response.status}`,
    {
      details: parsed.error?.details,
      requestId: parsed.error?.requestId ?? response.headers.get('X-Request-Id') ?? undefined,
      fieldErrors: Array.isArray(parsed.errors) ? parsed.errors : [],
    },
  )
}

let sessionTokenCache: { token: string; expiresAt: number } | null = null

/** Mints the better-auth JWT for direct Go API calls. */
async function sessionToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (sessionTokenCache && sessionTokenCache.expiresAt > Date.now() + 30_000) {
    return sessionTokenCache.token
  }
  try {
    const res = await fetch('/api/auth/token', { credentials: 'include' })
    if (!res.ok) return null
    const body = (await res.json()) as { token?: string }
    if (!body.token) return null
    const part = body.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(part + '='.repeat((4 - (part.length % 4)) % 4)))
    sessionTokenCache = { token: body.token, expiresAt: Number(payload.exp ?? 0) * 1000 }
    return body.token
  } catch {
    return null
  }
}

export function createContractsClient(options: ContractsClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? contractsBaseUrl()).replace(/\/$/, '')

  const middleware: Middleware = {
    async onRequest({ request }) {
      const token =
        options.getToken?.() ?? (baseUrl && !isMockTarget(baseUrl) ? await sessionToken() : null)
      if (token) request.headers.set('Authorization', `Bearer ${token}`)
      if (options.fixtureState && request.method === 'GET') {
        const url = new URL(request.url, globalThis.location?.origin ?? 'http://localhost')
        url.searchParams.set('state', options.fixtureState)
        return new Request(url.toString(), request)
      }
      return request
    },
  }

  const client = createClient<paths>({
    baseUrl,
    // Direct Go API calls authenticate with a bearer token; same-origin calls
    // (the BFF path) rely on cookies.
    credentials: baseUrl ? 'omit' : 'include',
    fetch: options.fetch,
  })
  client.use(middleware)
  return client
}

export const contractsApi = createContractsClient()

/** Throws the frozen envelope so screens render one error component. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.error || !result.response.ok) {
    const body = parseErrorBody(result.error)
    throw new ContractsApiError(
      result.response.status,
      body.error?.code ?? 'INTERNAL_ERROR',
      body.error?.message ?? `HTTP ${result.response.status}`,
      {
        details: body.error?.details,
        requestId:
          body.error?.requestId ?? result.response.headers.get('X-Request-Id') ?? undefined,
        fieldErrors: Array.isArray(body.errors) ? body.errors : [],
      },
    )
  }
  return result.data as T
}

export function isStale(response: Response): boolean {
  return response.headers.get('X-Data-Stale') === 'true'
}

export async function fetchContractVersions(
  client = contractsApi,
): Promise<ContractsSchemas['ContractVersions']> {
  return unwrap(await client.GET('/v1/public/contracts'))
}

export interface MockHealth {
  ok: boolean
  contract: string
  fixtureStates: string[]
  routes: number
}

export async function fetchMockHealth(
  baseUrl: string = contractsBaseUrl(),
  doFetch: typeof fetch = fetch,
): Promise<MockHealth> {
  const response = await doFetch(`${baseUrl.replace(/\/$/, '')}/health`)
  if (!response.ok) throw await toContractsError(response)
  return (await response.json()) as MockHealth
}

export interface MockFixtureRoute {
  method: string
  pattern: string
  base?: string
  states: string[]
}

export async function fetchMockRoutes(
  baseUrl: string = contractsBaseUrl(),
  doFetch: typeof fetch = fetch,
): Promise<MockFixtureRoute[]> {
  const response = await doFetch(`${baseUrl.replace(/\/$/, '')}/__fixtures`)
  if (!response.ok) throw await toContractsError(response)
  const body = (await response.json()) as { routes?: MockFixtureRoute[] } | MockFixtureRoute[]
  return Array.isArray(body) ? body : (body.routes ?? [])
}
