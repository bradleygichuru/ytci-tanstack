import { describe, it, expect, beforeEach, vi } from 'vitest'
import { campaignsApi } from '../campaigns'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

function mockFetch(response: unknown) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: true, status: 200, json: () => Promise.resolve(response),
  } as Response)
}

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockReset() })

describe('campaignsApi', () => {
  it('list fetches campaigns', async () => {
    mockFetch({ items: [{ id: 'cmp-1', title: 'Summer Promo' }], nextCursor: null, hasMore: false })
    const api = campaignsApi(config)
    const result = await api.list()
    expect(result.items[0].title).toBe('Summer Promo')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/campaigns'), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }),
    }))
  })

  it('get fetches single campaign', async () => {
    mockFetch({ id: 'cmp-1', title: 'Campaign Detail' })
    const api = campaignsApi(config)
    const result = await api.get('cmp-1')
    expect(result.title).toBe('Campaign Detail')
  })

  it('create sends POST', async () => {
    mockFetch({ id: 'cmp-new' })
    const api = campaignsApi(config)
    const result = await api.create({ title: 'New Campaign', type: 'home_banner' })
    expect(result.id).toBe('cmp-new')
  })

  it('update sends PATCH', async () => {
    mockFetch({ status: 'updated' })
    const api = campaignsApi(config)
    await api.update('cmp-1', { status: 'active' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/campaigns/cmp-1'), expect.objectContaining({ method: 'PATCH' }))
  })

  it('remove sends DELETE', async () => {
    mockFetch(null)
    const api = campaignsApi(config)
    await api.remove('cmp-1')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/campaigns/cmp-1'), expect.objectContaining({ method: 'DELETE' }))
  })
})
