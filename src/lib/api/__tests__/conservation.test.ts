import { describe, it, expect, beforeEach, vi } from 'vitest'
import { conservationApi } from '../conservation'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

function mockFetch(response: unknown) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: true, status: 200, json: () => Promise.resolve(response),
  } as Response)
}

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockReset() })

describe('conservationApi', () => {
  it('activities.list fetches activities', async () => {
    mockFetch({ items: [{ id: 'act-1', title: 'Tree Planting' }], nextCursor: null, hasMore: false })
    const api = conservationApi(config)
    const result = await api.activities.list()
    expect(result.items[0].title).toBe('Tree Planting')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/conservation/activities'), expect.anything())
  })

  it('activities.create sends POST', async () => {
    mockFetch({ id: 'act-new' })
    const api = conservationApi(config)
    const result = await api.activities.create({ title: 'New Activity', organizer: 'Test' })
    expect(result.id).toBe('act-new')
  })

  it('evidence.list fetches evidence', async () => {
    mockFetch({ items: [{ id: 'ev-1', status: 'pending' }], nextCursor: null, hasMore: false })
    const api = conservationApi(config)
    const result = await api.evidence.list()
    expect(result.items[0].status).toBe('pending')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/conservation/evidence'), expect.anything())
  })

  it('evidence.review sends POST with action', async () => {
    mockFetch({ id: 'ev-1', status: 'approved' })
    const api = conservationApi(config)
    await api.evidence.review('ev-1', 'approve')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/conservation/evidence/ev-1/review'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'approve', note: '' }) }),
    )
  })
})
