import { describe, it, expect, beforeEach, vi } from 'vitest'
import { marketplaceApi } from '../marketplace'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

function mockFetch(response: unknown) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: true, status: 200, json: () => Promise.resolve(response),
  } as Response)
}

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockReset() })

describe('marketplaceApi businesses', () => {
  it('lists businesses with status and q params', async () => {
    mockFetch({ items: [{ id: 'biz-1', name: 'Mara Naboisho' }], nextCursor: null, hasMore: false })
    const api = marketplaceApi(config)
    const result = await api.businesses.list({ status: 'published', q: 'mara' })
    expect(result.items[0].name).toBe('Mara Naboisho')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/v1\/marketplace\/businesses\?.*status=published.*q=mara/),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }) }),
    )
  })

  it('gets a business by id', async () => {
    mockFetch({ id: 'biz-1', name: 'Mara Naboisho' })
    const api = marketplaceApi(config)
    const result = await api.businesses.get('biz-1')
    expect(result.name).toBe('Mara Naboisho')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/marketplace/businesses/biz-1'), expect.anything())
  })

  it('creates a business with POST', async () => {
    mockFetch({ id: 'biz-new' })
    const api = marketplaceApi(config)
    const result = await api.businesses.create({ name: 'New Partner' })
    expect(result.id).toBe('biz-new')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/marketplace/businesses'), expect.objectContaining({ method: 'POST' }))
  })

  it('updates a business with PATCH', async () => {
    mockFetch({ status: 'updated' })
    const api = marketplaceApi(config)
    await api.businesses.update('biz-1', { status: 'published' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/marketplace/businesses/biz-1'), expect.objectContaining({ method: 'PATCH' }))
  })

  it('deletes a business with DELETE', async () => {
    mockFetch(null)
    const api = marketplaceApi(config)
    await api.businesses.remove('biz-1')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/marketplace/businesses/biz-1'), expect.objectContaining({ method: 'DELETE' }))
  })
})

describe('marketplaceApi stays', () => {
  it('lists stays at /v1/stays', async () => {
    mockFetch({ items: [{ id: 'stay-1', name: 'Mara River Camp' }], nextCursor: null, hasMore: false })
    const api = marketplaceApi(config)
    const result = await api.stays.list({ status: 'published' })
    expect(result.items[0].name).toBe('Mara River Camp')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/stays?status=published'), expect.anything())
  })

  it('gets, updates, and deletes a stay', async () => {
    mockFetch({ id: 'stay-1', name: 'Mara River Camp' })
    const api = marketplaceApi(config)
    await api.stays.get('stay-1')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/stays/stay-1'), expect.anything())

    mockFetch({ status: 'updated' })
    await api.stays.update('stay-1', { status: 'draft' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/stays/stay-1'), expect.objectContaining({ method: 'PATCH' }))

    mockFetch(null)
    await api.stays.remove('stay-1')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/stays/stay-1'), expect.objectContaining({ method: 'DELETE' }))
  })
})

describe('marketplaceApi eSIM', () => {
  it('lists providers at /v1/esim-providers', async () => {
    mockFetch({ items: [{ id: 'esim-1', name: 'Airalo' }], nextCursor: null, hasMore: false })
    const api = marketplaceApi(config)
    const result = await api.esim.list()
    expect(result.items[0].name).toBe('Airalo')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/esim-providers'), expect.anything())
  })

  it('creates and updates a provider', async () => {
    mockFetch({ id: 'esim-new' })
    const api = marketplaceApi(config)
    const result = await api.esim.create({ name: 'Airalo', isFeatured: true, status: 'published' })
    expect(result.id).toBe('esim-new')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/esim-providers'), expect.objectContaining({ method: 'POST' }))

    mockFetch({ status: 'updated' })
    await api.esim.update('esim-new', { isFeatured: false })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/esim-providers/esim-new'), expect.objectContaining({ method: 'PATCH' }))
  })
})
