import { describe, expect, it } from 'vitest'
import { heritageEventLabel, sanitizeHeritageData } from '../heritage'

describe('heritage analytics', () => {
  it('keeps valid rows and labels events', () => {
    const rows = sanitizeHeritageData([
      { day: '2026-11-18', scope: 'site', siteId: 's1', siteName: 'Railway Museum', event: 'portal_opened', count: 12 },
      { day: '2026-11-18', scope: 'sensitive', siteId: '', siteName: '', event: 'verified_visit', count: 7 },
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0].siteName).toBe('Railway Museum')
    expect(rows[0].count).toBe(12)
    expect(rows[1].siteName).toBe('Sensitive sites (combined)')
    expect(heritageEventLabel('video_played')).toBe('Video played')
    expect(heritageEventLabel('other')).toBe('other')
  })

  it('drops malformed rows and coerces counts', () => {
    const rows = sanitizeHeritageData([
      null,
      { day: '2026-11-18', event: '' },
      { day: '2026-11-18', scope: 'site', event: 'portal_opened', count: '9' },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].count).toBe(9)
  })

  it('returns an empty list for a non-array payload', () => {
    expect(sanitizeHeritageData({ items: [] })).toEqual([])
  })
})
