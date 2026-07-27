import { describe, it, expect, beforeEach, vi } from 'vitest'
import { coursesApi } from '../courses'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

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

describe('coursesApi', () => {
  it('list returns paginated courses', async () => {
    mockFetch({ items: [{ id: 'crs-1', title: 'Test Course', difficulty: 'beginner' }], nextCursor: 'abc', hasMore: true })
    const api = coursesApi(config)
    const result = await api.list()
    expect(result.items[0].title).toBe('Test Course')
    expect(result.hasMore).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/v1/courses',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }) }),
    )
  })

  it('get fetches single course by ID', async () => {
    mockFetch({ id: 'crs-1', title: 'Course Detail', difficulty: 'beginner', status: 'published', lessons: [] })
    const api = coursesApi(config)
    const result = await api.get('crs-1')
    expect(result.title).toBe('Course Detail')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/v1/courses/crs-1',
      expect.anything(),
    )
  })

  it('create sends POST with body', async () => {
    mockFetch({ id: 'crs-new' })
    const api = coursesApi(config)
    const result = await api.create({ title: 'New Course', difficulty: 'beginner' })
    expect(result.id).toBe('crs-new')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/v1/courses',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('update sends PATCH', async () => {
    mockFetch({ status: 'updated' })
    const api = coursesApi(config)
    await api.update('crs-1', { title: 'Updated' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/courses/crs-1'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('remove sends DELETE', async () => {
    mockFetch(null)
    const api = coursesApi(config)
    await api.remove('crs-1')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/courses/crs-1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
