import { describe, it, expect, beforeEach, vi } from 'vitest'
import { challengesApi } from '../challenges'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

function mockFetch(response: unknown, status = 200) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: status >= 200 && status < 300, status, json: () => Promise.resolve(response),
  } as Response)
}

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockReset() })

describe('challengesApi', () => {
  it('list returns paginated challenges', async () => {
    mockFetch({ items: [{ id: 'ch-1', title: 'Bird Watching', status: 'active', createdAt: '2026-01-01' }], nextCursor: null, hasMore: false })
    const api = challengesApi(config)
    const result = await api.list()
    expect(result.items[0].title).toBe('Bird Watching')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/challenges'), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }),
    }))
  })

  it('create sends POST', async () => {
    mockFetch({ id: 'ch-new', status: 'draft' }, 201)
    const api = challengesApi(config)
    const result = await api.create({ title: 'New Challenge', description: 'Desc', badgeName: 'Badge' })
    expect(result.id).toBe('ch-new')
    expect(result.status).toBe('draft')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/challenges'), expect.objectContaining({ method: 'POST' }))
  })

  it('update sends PATCH', async () => {
    mockFetch({ status: 'updated' })
    const api = challengesApi(config)
    await api.update('ch-1', { title: 'Updated' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/challenges/ch-1'), expect.objectContaining({ method: 'PATCH' }))
  })

  it('remove sends DELETE', async () => {
    mockFetch({ status: 'ended' })
    const api = challengesApi(config)
    await api.remove('ch-1')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/challenges/ch-1'), expect.objectContaining({ method: 'DELETE' }))
  })

  it('evidence list returns evidence items', async () => {
    mockFetch({ items: [{ id: 'ev-1', challengeTitle: 'Eco', userName: 'Alice', status: 'submitted', createdAt: '2026-01-01' }], nextCursor: null, hasMore: false })
    const api = challengesApi(config)
    const result = await api.evidence.list()
    expect(result.items[0].challengeTitle).toBe('Eco')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/challenges/evidence'), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }),
    }))
  })

  it('evidence review sends POST', async () => {
    mockFetch({ status: 'approved' })
    const api = challengesApi(config)
    const result = await api.evidence.review('ev-1', 'approve')
    expect(result.status).toBe('approved')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/challenges/evidence/ev-1/review'), expect.objectContaining({ method: 'POST' }))
  })
})

