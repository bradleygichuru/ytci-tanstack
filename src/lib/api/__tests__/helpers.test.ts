import { describe, it, expect } from 'vitest'
import { safeItems } from '../helpers'

describe('safeItems', () => {
  it('returns items when present', () => {
    const result = safeItems({ items: [1, 2, 3], nextCursor: null, hasMore: false })
    expect(result).toEqual([1, 2, 3])
  })

  it('returns empty array when items is undefined', () => {
    const result = safeItems({ items: undefined, nextCursor: null, hasMore: false } as any)
    expect(result).toEqual([])
  })

  it('returns empty array when items is null', () => {
    const result = safeItems({ items: null, nextCursor: null, hasMore: false } as any)
    expect(result).toEqual([])
  })

  it('returns empty array when paginated object is undefined', () => {
    const result = safeItems(undefined as any)
    expect(result).toEqual([])
  })

  it('returns empty array when paginated object is null', () => {
    const result = safeItems(null as any)
    expect(result).toEqual([])
  })

  it('handles typed data correctly', () => {
    const items = [{ id: '1', name: 'test' }]
    const result = safeItems({ items, nextCursor: null, hasMore: false })
    expect(result).toEqual(items)
    expect(result[0].name).toBe('test')
  })
})
