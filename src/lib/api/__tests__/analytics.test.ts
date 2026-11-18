import { describe, it, expect, beforeEach, vi } from 'vitest'
import { analyticsApi } from '../analytics'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

function mockFetch(response: unknown) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: true, status: 200, json: () => Promise.resolve(response),
  } as Response)
}

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockReset() })

describe('analyticsApi', () => {
  it('summary fetches analytics', async () => {
    mockFetch({ dau: 150, wau: 800, mau: 3000, newRegistrations: 45 })
    const api = analyticsApi(config)
    const result = await api.summary()
    expect(result.dau).toBe(150)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/analytics/summary'), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }),
    }))
  })

  it('heritage fetches anonymous aggregate counts', async () => {
    mockFetch({ items: [{ day: '2026-11-18', scope: 'site', siteId: 's1', siteName: 'Railway Museum', event: 'portal_opened', count: 12 }] })
    const api = analyticsApi(config)
    const result = await api.heritage()
    expect(result.items).toHaveLength(1)
    expect(result.items[0].count).toBe(12)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/analytics/heritage'), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }),
    }))
  })

  it('exportReport sends POST', async () => {
    mockFetch({ reportId: 'r-1', status: 'pending', createdAt: new Date().toISOString() })
    const api = analyticsApi(config)
    const result = await api.exportReport({ format: 'csv', dateFrom: '2026-01-01', dateTo: '2026-07-01', sections: ['User Activity'] })
    expect(result.reportId).toBe('r-1')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/analytics/reports/export'), expect.objectContaining({ method: 'POST' }))
  })
})
