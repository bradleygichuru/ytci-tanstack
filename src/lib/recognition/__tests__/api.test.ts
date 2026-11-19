import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRecognitionApi } from '../api'
import { ADJUSTMENT_ERROR_COPY } from '../errors'

const adjustment = {
  subjectRef: 'reader-1',
  amount: 60,
  reason: 'adjustment' as const,
  note: 'SUP-2026-1188 · verified check-in evidence',
  compensatingFor: null,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubFetch(response: (request: Request) => Response) {
  const calls: Request[] = []
  const fetchMock = vi.fn(async (input: Request | string | URL) => {
    const request = input instanceof Request ? input : new Request(String(input))
    calls.push(request.clone())
    return response(request)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createAdjustment', () => {
  it('sends the selected approver on a credit', async () => {
    const { calls } = stubFetch(() => jsonResponse({ id: 'xp-1' }, 201))
    const api = createRecognitionApi()

    await api.createAdjustment(adjustment, 'approver-9')

    expect(calls).toHaveLength(1)
    expect(calls[0].headers.get('X-Second-Approver')).toBe('approver-9')
    expect(await calls[0].json()).toMatchObject({ reason: 'adjustment', amount: 60 })
  })

  it('sends the selected approver on a reversal', async () => {
    const { calls } = stubFetch(() => jsonResponse({ id: 'xp-2' }, 201))
    const api = createRecognitionApi()

    await api.createAdjustment(
      { ...adjustment, amount: -60, reason: 'reversal', compensatingFor: 'award-1' },
      'approver-9'
    )

    expect(calls).toHaveLength(1)
    expect(calls[0].headers.get('X-Second-Approver')).toBe('approver-9')
    expect(await calls[0].json()).toMatchObject({ reason: 'reversal', amount: -60 })
  })

  it('refuses to call the API without an approver', async () => {
    const { fetchMock } = stubFetch(() => jsonResponse({ id: 'xp-3' }, 201))
    const api = createRecognitionApi()

    await expect(api.createAdjustment(adjustment, '  ')).rejects.toThrow(
      ADJUSTMENT_ERROR_COPY.SECOND_APPROVER_REQUIRED
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    'SECOND_APPROVER_REQUIRED',
    'SECOND_APPROVER_UNKNOWN',
    'SECOND_APPROVER_INACTIVE',
    'SECOND_APPROVER_FORBIDDEN',
  ] as const)('maps %s to actionable copy', async (code) => {
    stubFetch(() =>
      jsonResponse(
        { error: { code, message: 'the second approver was rejected' } },
        403
      )
    )
    const api = createRecognitionApi()

    await expect(api.createAdjustment(adjustment, 'approver-9')).rejects.toThrow(
      ADJUSTMENT_ERROR_COPY[code]
    )
  })
})
