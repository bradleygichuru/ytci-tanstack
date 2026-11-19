import { describe, expect, it, vi } from 'vitest'
import { fetchAllSpecies, type SpeciesClient } from '../api'

function pageResponse(items: unknown[], nextCursor: string | null) {
  return {
    data: { items, nextCursor, hasMore: Boolean(nextCursor) },
    response: new Response('{}', { status: 200 }),
  }
}

describe('fetchAllSpecies', () => {
  it('walks every cursor page and stops at the end', async () => {
    const GET = vi
      .fn()
      .mockResolvedValueOnce(pageResponse([{ slug: 'one' }], 'cursor-2'))
      .mockResolvedValueOnce(pageResponse([{ slug: 'two' }], 'cursor-3'))
      .mockResolvedValueOnce(pageResponse([{ slug: 'three' }], null))

    const result = await fetchAllSpecies({ GET } as unknown as SpeciesClient)

    expect(result.items.map((item) => item.slug)).toEqual(['one', 'two', 'three'])
    expect(result.truncated).toBe(false)
    expect(GET).toHaveBeenCalledTimes(3)
    expect(GET.mock.calls[0][1].params.query).toEqual({ limit: 100 })
    expect(GET.mock.calls[1][1].params.query).toEqual({ limit: 100, cursor: 'cursor-2' })
    expect(GET.mock.calls[2][1].params.query).toEqual({ limit: 100, cursor: 'cursor-3' })
  })

  it('reports truncation rather than looping forever', async () => {
    const GET = vi.fn().mockResolvedValue(pageResponse([{ slug: 'one' }], 'always-more'))

    const result = await fetchAllSpecies({ GET } as unknown as SpeciesClient)

    expect(result.truncated).toBe(true)
    expect(GET).toHaveBeenCalledTimes(20)
  })
})
