import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ContractsApiError,
  contractsBaseUrl,
  createContractsClient,
  isMockTarget,
  isStale,
  toContractsError,
  unwrap,
} from '#/lib/contracts/client'

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

describe('contracts api wrapper', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('points dev at the contracts mock on :8099', () => {
    expect(contractsBaseUrl()).toBe('http://localhost:8099')
    expect(isMockTarget(contractsBaseUrl())).toBe(true)
  })

  it('prefers VITE_CONTRACTS_API_URL and strips a trailing slash', () => {
    vi.stubEnv('VITE_CONTRACTS_API_URL', 'https://admin.example.test/')
    expect(contractsBaseUrl()).toBe('https://admin.example.test')
    expect(isMockTarget(contractsBaseUrl())).toBe(false)
  })

  it('reads the frozen error envelope', async () => {
    const error = await toContractsError(
      jsonResponse(
        {
          error: {
            code: 'EVENT_CAPACITY_FULL',
            message: 'No places left',
            details: { capacity: 40 },
            requestId: 'req_1',
          },
        },
        409,
      ),
    )
    expect(error).toBeInstanceOf(ContractsApiError)
    expect(error.code).toBe('EVENT_CAPACITY_FULL')
    expect(error.details).toEqual({ capacity: 40 })
    expect(error.requestId).toBe('req_1')
  })

  it('reads validation failures as field errors', async () => {
    const error = await toContractsError(
      jsonResponse({ errors: [{ field: 'title', message: 'required' }] }, 400),
    )
    expect(error.fieldErrors).toEqual([{ field: 'title', message: 'required' }])
  })

  it('unwraps data and throws on the error branch', () => {
    expect(unwrap({ data: { items: [] }, response: jsonResponse({}) })).toEqual({ items: [] })
    expect(() =>
      unwrap({ error: { error: { code: 'FORBIDDEN', message: 'no' } }, response: jsonResponse({}, 403) }),
    ).toThrow(ContractsApiError)
  })

  it('recognises the stale marker', () => {
    expect(isStale(jsonResponse({}, 200, { 'X-Data-Stale': 'true' }))).toBe(true)
    expect(isStale(jsonResponse({}))).toBe(false)
  })

  it('attaches a bearer token and fixture state when asked', async () => {
    const calls: Request[] = []
    const mockFetch = (async (input: Request) => {
      calls.push(input)
      return jsonResponse({ ok: true })
    }) as unknown as typeof fetch

    const client = createContractsClient({
      baseUrl: 'http://localhost:8099',
      getToken: () => 'token-123',
      fixtureState: 'stale',
      fetch: mockFetch,
    })

    await client.GET('/v1/public/events')

    const url = new URL(calls[0].url)
    expect(url.pathname).toBe('/v1/public/events')
    expect(url.searchParams.get('state')).toBe('stale')
    expect(calls[0].headers.get('Authorization')).toBe('Bearer token-123')
  })
})
