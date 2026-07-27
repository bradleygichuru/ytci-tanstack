import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiRequest } from '../client'

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockReset()
})

describe('apiRequest', () => {
  const config = { baseUrl: 'http://localhost:8080/v1', token: 'my-jwt' }

  it('attaches Authorization header when token is present', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'ok' }),
    } as Response)
    await apiRequest(config, '/test')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/v1/test',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-jwt' }),
      }),
    )
  })

  it('omits Authorization header when token is undefined', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response)
    await apiRequest({ baseUrl: 'http://localhost:8080/v1', token: undefined }, '/test')
    const call = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    const headers = call.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it('parses Go error envelope as ApiErrorResponse', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { code: 'UNAUTHORIZED', message: 'valid authentication required' } }),
    } as Response)
    await expect(apiRequest(config, '/test')).rejects.toThrow('valid authentication required')
  })

  it('handles unknown error responses', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve(null),
    } as Response)
    await expect(apiRequest(config, '/test')).rejects.toThrow('Internal Server Error')
  })

  it('sends POST with JSON body', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response)
    await apiRequest(config, '/create', { method: 'POST', body: { name: 'test' } })
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      }),
    )
  })

  it('builds URL with query params', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response)
    await apiRequest(config, '/list', { params: { cursor: 'abc', limit: 20 } })
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/v1/list?cursor=abc&limit=20',
      expect.anything(),
    )
  })
})
