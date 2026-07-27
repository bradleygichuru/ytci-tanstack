import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pushApi } from '../push'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

function mockFetch(response: unknown) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: true, status: 200, json: () => Promise.resolve(response),
  } as Response)
}

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockReset() })

describe('pushApi', () => {
  it('send sends notification', async () => {
    mockFetch({ notificationId: 'n-1', recipientCount: 42 })
    const api = pushApi(config)
    const result = await api.send({ campaignId: 'c-1', audience: { type: 'all' }, title: 'Hello', body: 'World' })
    expect(result.recipientCount).toBe(42)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/push/send'), expect.objectContaining({ method: 'POST' }))
  })

  it('schedule sends with scheduledAt', async () => {
    mockFetch({ notificationId: 'n-1', scheduledAt: '2026-08-01T00:00:00Z' })
    const api = pushApi(config)
    const result = await api.schedule({ campaignId: 'c-1', audience: { type: 'all' }, title: 'Hello', body: 'World', scheduledAt: '2026-08-01T00:00:00Z' })
    expect(result.scheduledAt).toBe('2026-08-01T00:00:00Z')
  })

  it('history fetches paginated history', async () => {
    mockFetch({ items: [{ sendId: 'n-1', status: 'sent' }], nextCursor: null, hasMore: false })
    const api = pushApi(config)
    const result = await api.history({ campaignId: 'c-1' })
    expect(result.items[0].status).toBe('sent')
  })

  it('detail fetches single send detail', async () => {
    mockFetch({ sendId: 'n-1', title: 'Test', status: 'delivered' })
    const api = pushApi(config)
    const result = await api.detail('n-1')
    expect(result.title).toBe('Test')
  })

  it('tokenCount posts audience', async () => {
    mockFetch({ devices: 150, audience: { type: 'all' } })
    const api = pushApi(config)
    const result = await api.tokenCount({ type: 'all' })
    expect(result.devices).toBe(150)
  })
})
