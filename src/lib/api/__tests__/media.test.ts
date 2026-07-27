import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mediaApi } from '../media'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

function mockFetch(response: unknown) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: true, status: 200, json: () => Promise.resolve(response),
  } as Response)
}

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockReset() })

describe('mediaApi', () => {
  it('list returns paginated media', async () => {
    mockFetch({ items: [{ id: 'm-1', objectKey: 'media/123/test.jpg', type: 'image' }], nextCursor: null, hasMore: false })
    const api = mediaApi(config)
    const result = await api.list()
    expect(result.items[0].type).toBe('image')
  })

  it('presign sends contentType, fileSize, fileName', async () => {
    mockFetch({ uploadUrl: 'https://r2.example.com/upload', objectKey: 'media/123/test.jpg', expiresAt: '2026-07-28T01:00:00Z' })
    const api = mediaApi(config)
    const result = await api.presign('image/png', 1024, 'test.png')
    expect(result.uploadUrl).toContain('r2.example.com')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/media/presign'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ contentType: 'image/png', fileSizeBytes: 1024, fileName: 'test.png' }) }),
    )
  })

  it('complete sends objectKey with metadata', async () => {
    mockFetch({ id: 'm-1', status: 'ready' })
    const api = mediaApi(config)
    const result = await api.complete('media/123/test.jpg', { caption: 'Test Image' })
    expect(result.id).toBe('m-1')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/media/complete'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updateMetadata sends PATCH', async () => {
    mockFetch({ status: 'updated' })
    const api = mediaApi(config)
    await api.updateMetadata('m-1', { caption: 'New caption' })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/media/m-1'), expect.objectContaining({ method: 'PATCH' }))
  })

  it('remove sends DELETE', async () => {
    mockFetch({ status: 'deleted' })
    const api = mediaApi(config)
    await api.remove('m-1')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/v1/media/m-1'), expect.objectContaining({ method: 'DELETE' }))
  })
})
