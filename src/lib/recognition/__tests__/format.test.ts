import { describe, expect, it } from 'vitest'
import { countLabel } from '#/lib/recognition/format'

describe('countLabel', () => {
  it('pluralises only away from one', () => {
    expect(countLabel(1, 'published rule')).toBe('1 published rule')
    expect(countLabel(0, 'published rule')).toBe('0 published rules')
    expect(countLabel(5, 'published rule')).toBe('5 published rules')
  })

  it('accepts a noun with its own plural', () => {
    expect(countLabel(1, 'entry', 'entries')).toBe('1 entry')
    expect(countLabel(2, 'entry', 'entries')).toBe('2 entries')
  })

  it('formats thousands the same way the ledger does', () => {
    expect(countLabel(1500, 'award')).toBe('1,500 awards')
  })
})
