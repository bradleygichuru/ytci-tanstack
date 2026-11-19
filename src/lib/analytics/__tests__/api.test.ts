import { describe, expect, it, vi } from 'vitest'
import { createAnalyticsApi } from '../api'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

function capture() {
  const calls: { url: string; method: string; body?: string }[] = []
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input)
    calls.push({
      url,
      method: input instanceof Request ? input.method : (init?.method ?? 'GET'),
      body: input instanceof Request ? await input.clone().text() : (init?.body as string | undefined),
    })
    if (url.includes('/v1/admin/analytics/journeys')) {
      return jsonResponse({
        items: [
          {
            journey: 'event_registration',
            step: 'detail_viewed',
            stepIndex: 0,
            reached: 1240,
            suppressed: false,
          },
        ],
      })
    }
    if (url.includes('/v1/admin/analytics/overview')) {
      return jsonResponse(
        {
          from: '2026-11-01',
          to: '2026-11-19',
          cells: [{ metric: 'dau', value: 821, unit: 'count', suppressed: false }],
          daily: [],
        },
        { headers: { 'Content-Type': 'application/json', 'X-Data-Stale': 'true' } },
      )
    }
    if (url.includes('/v1/admin/analytics/export')) {
      return jsonResponse({ ok: true, id: 'job-1', message: 'Export job accepted.' }, { status: 202 })
    }
    if (url.includes('/v1/admin/analytics/erasure')) {
      return jsonResponse(
        {
          id: 'erasure-1',
          subjectType: 'analytics_id',
          status: 'pending',
          requestedAt: '2026-11-19T06:00:00Z',
          targetBy: '2026-12-03T06:00:00Z',
        },
        { status: 202 },
      )
    }
    return jsonResponse({ items: [] })
  })
  return { calls, fetchImpl }
}

describe('createAnalyticsApi', () => {
  it('sends the date window and preserves the stale marker', async () => {
    const { calls, fetchImpl } = capture()
    const api = createAnalyticsApi({ fetch: fetchImpl })
    const result = await api.overview({ from: '2026-10-21', to: '2026-11-19' })
    expect(result.stale).toBe(true)
    expect(result.data.cells[0].metric).toBe('dau')
    expect(calls[0].url).toContain('from=2026-10-21')
    expect(calls[0].url).toContain('to=2026-11-19')
  })

  it('adds the journey filter only when requested', async () => {
    const { calls, fetchImpl } = capture()
    const api = createAnalyticsApi({ fetch: fetchImpl })
    await api.journeys({ from: '2026-10-21', to: '2026-11-19' })
    expect(calls[0].url).not.toContain('journey=')
    await api.journeys({
      from: '2026-10-21',
      to: '2026-11-19',
      journey: 'event_registration',
    })
    expect(calls[1].url).toContain('journey=event_registration')
  })

  it('unwraps the journey items envelope', async () => {
    const { fetchImpl } = capture()
    const api = createAnalyticsApi({ fetch: fetchImpl })
    const result = await api.journeys({ from: '2026-10-21', to: '2026-11-19' })
    expect(result.data).toHaveLength(1)
    expect(result.data[0].journey).toBe('event_registration')
  })

  it('posts the export dataset and the erasure subject', async () => {
    const { calls, fetchImpl } = capture()
    const api = createAnalyticsApi({ fetch: fetchImpl })
    const ack = await api.exportDataset({
      from: '2026-10-21',
      to: '2026-11-19',
      dataset: 'overview',
    })
    expect(ack.id).toBe('job-1')
    expect(calls[0].method).toBe('POST')
    expect(calls[0].body).toContain('"dataset":"overview"')

    const erasure = await api.requestErasure({
      subjectType: 'analytics_id',
      subjectRef: 'abc',
    })
    expect(erasure.status).toBe('pending')
    expect(calls[1].body).toContain('"subjectRef":"abc"')
  })

  it('surfaces the frozen error envelope', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        { error: { code: 'ANALYTICS_UNAVAILABLE', message: 'Rollups are still computing.' } },
        { status: 503 },
      ),
    )
    const api = createAnalyticsApi({ fetch: fetchImpl })
    await expect(api.overview({ from: '2026-10-21', to: '2026-11-19' })).rejects.toMatchObject({
      code: 'ANALYTICS_UNAVAILABLE',
      status: 503,
    })
  })
})
