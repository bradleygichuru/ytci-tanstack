/**
 * Admin shell smoke — runs against the real frozen contracts mock.
 *
 *   bun run test:shell:smoke
 *
 * Proves the typed client, the error envelope and the fixture states the shell
 * relies on. Feature screens are not exercised here.
 */
import { describe, expect, it } from 'vitest'
import {
  createContractsClient,
  fetchContractVersions,
  fetchMockHealth,
  fetchMockRoutes,
  isStale,
  toContractsError,
  unwrap,
} from '../src/lib/contracts/client'

const BASE_URL = process.env.CONTRACTS_MOCK_URL ?? 'http://127.0.0.1:8099'

describe('shell smoke against cmd/contracts-mock', () => {
  it('reports healthy at contract 1.0.0', async () => {
    const health = await fetchMockHealth(BASE_URL)
    expect(health.ok).toBe(true)
    expect(health.contract).toBe('1.0.0')
    expect(health.routes).toBeGreaterThan(100)
    expect(health.fixtureStates).toEqual(['default', 'empty', 'error', 'stale'])
  })

  it('exposes the routes the programme nav will link to', async () => {
    const routes = await fetchMockRoutes(BASE_URL)
    expect(routes.length).toBeGreaterThan(50)
    const patterns = routes.map((route) => route.pattern)
    for (const pattern of [
      '/v1/public/events',
      '/v1/public/species',
      '/v1/mobile/recognition',
      '/v1/public/contracts',
    ]) {
      expect(patterns).toContain(pattern)
    }
  })

  it('serves the frozen contract versions', async () => {
    const client = createContractsClient({ baseUrl: BASE_URL })
    const versions = await fetchContractVersions(client)
    const openapi = versions.contracts.find((entry) => entry.contract === 'openapi')
    expect(openapi?.version).toBe('1.0.0')
  })

  it('decodes a typed admin page', async () => {
    const client = createContractsClient({ baseUrl: BASE_URL })
    const page = unwrap(
      await client.GET('/v1/admin/events', { params: { query: { limit: 5 } } }),
    )
    expect(Array.isArray(page.items)).toBe(true)
  })

  it('surfaces the frozen 503 envelope', async () => {
    const client = createContractsClient({ baseUrl: BASE_URL, fixtureState: 'error' })
    const response = await client.GET('/v1/public/events', { params: { query: {} } })
    expect(response.response.status).toBe(503)
    const body = response.error as { error?: { code?: string; message?: string } }
    expect(body.error?.code).toBe('EVENTS_UNAVAILABLE')
  })

  it('marks stale responses', async () => {
    const client = createContractsClient({ baseUrl: BASE_URL, fixtureState: 'stale' })
    const response = await client.GET('/v1/public/events', { params: { query: {} } })
    expect(response.response.ok).toBe(true)
    expect(isStale(response.response)).toBe(true)
  })

  it('reports an unreachable mock as an offline-style error', async () => {
    const response = await fetch(`${BASE_URL}/definitely-not-a-route`)
    const error = await toContractsError(response)
    expect(error.status).toBe(404)
    expect(error.code).toBe('MOCK_ROUTE_NOT_FOUND')
  })
})
