import { describe, expect, it } from 'vitest'
import { deriveDataState } from '#/components/shell/DataState'

describe('deriveDataState', () => {
  it('prefers cached content over every failure', () => {
    expect(
      deriveDataState({ isError: true, isOffline: true, isEmpty: true, hasCachedData: true }),
    ).toBe('ready')
  })

  it('shows loading only when there is nothing cached', () => {
    expect(deriveDataState({ isPending: true })).toBe('loading')
    expect(deriveDataState({ isPending: true, hasCachedData: true })).toBe('ready')
  })

  it('tells an offline story before a server-error story', () => {
    expect(deriveDataState({ isError: true, isOffline: true })).toBe('offline')
    expect(deriveDataState({ isError: true })).toBe('error')
  })

  it('falls through to empty and ready', () => {
    expect(deriveDataState({ isEmpty: true })).toBe('empty')
    expect(deriveDataState({})).toBe('ready')
  })
})
