import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  normaliseJourney,
  normaliseRange,
  resolveWindow,
  sectionAcceptsJourney,
  summariseFilters,
  toQuery,
} from '../filters'

describe('resolveWindow', () => {
  it('anchors the 30-day window to the supplied day', () => {
    const window = resolveWindow('30d', '2026-11-19')
    expect(window.to).toBe('2026-11-19')
    expect(window.from).toBe('2026-10-21')
    expect(window.label).toBe('Last 30 days')
  })

  it('anchors the 90-day window', () => {
    const window = resolveWindow('90d', '2026-11-19')
    expect(window.from).toBe('2026-08-22')
    expect(window.label).toBe('Last 90 days')
  })

  it('uses the calendar quarter for the season window', () => {
    const window = resolveWindow('season', '2026-11-19')
    expect(window.from).toBe('2026-10-01')
    expect(window.label).toContain('This season')
    expect(window.label).toContain('Oct')
  })
})

describe('filter contract', () => {
  it('offers the journey filter on Journeys only', () => {
    expect(sectionAcceptsJourney('journeys')).toBe(true)
    for (const section of [
      'overview',
      'funnels',
      'retention',
      'adoption',
      'search',
      'content',
      'programme',
      'quality',
      'suppressed',
    ] as const) {
      expect(sectionAcceptsJourney(section)).toBe(false)
    }
  })

  it('describes the applied scope per section', () => {
    const window = resolveWindow('30d', '2026-11-19')
    const overview = summariseFilters('overview', DEFAULT_FILTERS, window)
    expect(overview.scope).toContain('Last 30 days')
    expect(overview.scope).toContain('applied to this screen')

    const journeys = summariseFilters(
      'journeys',
      { range: '30d', journey: 'course_completion' },
      window,
    )
    expect(journeys.scope).toContain('Course completion')

    const programme = summariseFilters('programme', DEFAULT_FILTERS, window)
    expect(programme.scope).toContain('Domain-table view')
  })

  it('flags a set filter that a section cannot apply', () => {
    const window = resolveWindow('30d', '2026-11-19')
    const summary = summariseFilters(
      'overview',
      { range: '30d', journey: 'event_registration' },
      window,
    )
    expect(summary.unapplied).toEqual([
      { key: 'journey', label: 'Event registration → check-in' },
    ])
  })

  it('only adds the journey query parameter when it is set', () => {
    const window = resolveWindow('30d', '2026-11-19')
    expect(toQuery(window, 'all')).toEqual({ from: window.from, to: window.to })
    expect(toQuery(window, 'heritage_visit')).toEqual({
      from: window.from,
      to: window.to,
      journey: 'heritage_visit',
    })
  })

  it('normalises unknown URL values instead of sending them to the API', () => {
    expect(normaliseRange('90d')).toBe('90d')
    expect(normaliseRange('tomorrow')).toBe('30d')
    expect(normaliseJourney('audio_playback')).toBe('audio_playback')
    expect(normaliseJourney('not-a-journey')).toBe('all')
  })
})
