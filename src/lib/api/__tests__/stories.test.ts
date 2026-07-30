import { describe, it, expect, beforeEach, vi } from 'vitest'
import { storiesApi } from '../stories'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

function mockFetch(response: unknown) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: true, status: 200, json: () => Promise.resolve(response),
  } as Response)
}

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockReset() })

describe('storiesApi', () => {
  it('list returns paginated stories', async () => {
    mockFetch({ items: [{ id: 'st-1', caption: 'Nice photo!', status: 'pending' }], nextCursor: null, hasMore: false })
    const api = storiesApi(config)
    const result = await api.list()
    expect(result.items[0].caption).toBe('Nice photo!')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/stories'), expect.anything())
  })

  it('moderationList includes status param', async () => {
    mockFetch({ items: [], nextCursor: null, hasMore: false })
    const api = storiesApi(config)
    await api.moderationList({ status: 'pending' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('status=pending'), expect.anything())
  })

  it('moderate sends POST with action and reason', async () => {
    mockFetch({ id: 'st-1', status: 'approved' })
    const api = storiesApi(config)
    await api.moderate('st-1', 'approve', 'Looks good')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/stories/st-1/moderation'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'approve', reason: 'Looks good' }) }),
    )
  })

  it('report sends POST with reason', async () => {
    mockFetch(null)
    const api = storiesApi(config)
    await api.report('st-1', 'Inappropriate', 'Spam content')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/stories/st-1/report'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ reason: 'Inappropriate', comment: 'Spam content' }) }),
    )
  })
})
