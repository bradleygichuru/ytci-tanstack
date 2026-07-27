import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eventsApi } from '../events'

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

describe('eventsApi', () => {
  it('list returns paginated events', async () => {
    mockFetch({ items: [{ id: 'evt-1', title: 'Test Event' }], nextCursor: null, hasMore: false })
    const api = eventsApi(config)
    const result = await api.list()
    expect(result.items[0].title).toBe('Test Event')
  })

  it('updateStatus sends PATCH to status endpoint', async () => {
    mockFetch({ id: 'evt-1', status: 'postponed' })
    const api = eventsApi(config)
    await api.updateStatus('evt-1', 'postponed')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/events/evt-1/status'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'postponed' }),
      }),
    )
  })

  it('get fetches single event by ID', async () => {
    mockFetch({ id: 'evt-1', title: 'Event Detail' })
    const api = eventsApi(config)
    const result = await api.get('evt-1')
    expect(result.title).toBe('Event Detail')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/events/evt-1'),
      expect.anything(),
    )
  })
})
