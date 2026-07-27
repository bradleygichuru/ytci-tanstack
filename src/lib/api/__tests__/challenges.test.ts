import { describe, it, expect, beforeEach, vi } from 'vitest'
import { challengesApi } from '../challenges'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

function mockFetch(response: unknown) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: true, status: 200, json: () => Promise.resolve(response),
  } as Response)
}

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockReset() })

describe('challengesApi', () => {
  it('list returns paginated challenges', async () => {
    mockFetch({ items: [{ id: 'ch-1', title: 'Bird Watching' }], nextCursor: null, hasMore: false })
    const api = challengesApi(config)
    const result = await api.list()
    expect(result.items[0].title).toBe('Bird Watching')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/challenges'), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }),
    }))
  })

  it('create sends POST', async () => {
    mockFetch({ id: 'ch-new' })
    const api = challengesApi(config)
    const result = await api.create({ title: 'New Challenge' })
    expect(result.id).toBe('ch-new')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/challenges'), expect.objectContaining({ method: 'POST' }))
  })

  it('update sends PATCH', async () => {
    mockFetch({ status: 'updated' })
    const api = challengesApi(config)
    await api.update('ch-1', { title: 'Updated' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/challenges/ch-1'), expect.objectContaining({ method: 'PATCH' }))
  })

  it('remove sends DELETE', async () => {
    mockFetch({ status: 'deleted' })
    const api = challengesApi(config)
    await api.remove('ch-1')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/challenges/ch-1'), expect.objectContaining({ method: 'DELETE' }))
  })
})
