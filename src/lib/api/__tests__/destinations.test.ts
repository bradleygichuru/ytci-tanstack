import { describe, it, expect, beforeEach, vi } from 'vitest'
import { destinationsApi } from '../destinations'

const config = { baseUrl: 'http://localhost:8080/v1', token: 'test-jwt' }

function mockFetch(response: unknown) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(response),
  } as Response)
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockReset()
})

describe('destinationsApi', () => {
  it('list constructs correct URL and auth header', async () => {
    const mock = mockFetch({ items: [], nextCursor: null, hasMore: false })
    const api = destinationsApi(config)
    await api.list()
    expect(mock).toHaveBeenCalledWith(
      'http://localhost:8080/v1/v1/destinations',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }),
      }),
    )
  })

  it('list passes cursor and limit params', async () => {
    const mock = mockFetch({ items: [], nextCursor: 'abc123', hasMore: true })
    const api = destinationsApi(config)
    await api.list({ cursor: 'abc123', limit: 20 })
    expect(mock).toHaveBeenCalledWith(
      'http://localhost:8080/v1/v1/destinations?cursor=abc123&limit=20',
      expect.anything(),
    )
  })

  it('create sends POST with body', async () => {
    const mock = mockFetch({ id: 'dest-1' })
    const api = destinationsApi(config)
    const body = { name: 'Test', slug: 'test', county: 'Narok', category: 'wildlife', lat: -1, lng: 35 }
    const result = await api.create(body)
    expect(result.id).toBe('dest-1')
    expect(mock).toHaveBeenCalledWith(
      'http://localhost:8080/v1/v1/destinations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      }),
    )
  })

  it('update sends PATCH with partial body', async () => {
    mockFetch({ id: 'dest-1', status: 'published' })
    const api = destinationsApi(config)
    await api.update('dest-1', { status: 'published' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/destinations/dest-1'),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'published' }) }),
    )
  })

  it('remove sends DELETE', async () => {
    mockFetch(null)
    const api = destinationsApi(config)
    await api.remove('dest-1')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/destinations/dest-1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('throws ApiErrorResponse on non-ok status', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: { code: 'FORBIDDEN', message: 'admin access required' } }),
    } as Response)
    const api = destinationsApi(config)
    await expect(api.list()).rejects.toThrow('admin access required')
  })

  it('handles null nextCursor for last page', async () => {
    mockFetch({ items: [{ id: '1', name: 'Test' }], nextCursor: null, hasMore: false })
    const api = destinationsApi(config)
    const result = await api.list()
    expect(result.nextCursor).toBeNull()
    expect(result.hasMore).toBe(false)
    expect(result.items).toHaveLength(1)
  })

  it('works without token', async () => {
    const mock = mockFetch({ items: [], nextCursor: null, hasMore: false })
    const api = destinationsApi({ baseUrl: 'http://localhost:8080/v1', token: undefined })
    await api.list()
    const headers = mock.mock.calls[0][1] as RequestInit
    expect(headers.headers).not.toHaveProperty('Authorization')
  })
})
