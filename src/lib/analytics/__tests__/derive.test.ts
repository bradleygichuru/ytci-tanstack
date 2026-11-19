import { describe, expect, it } from 'vitest'
import type { ContractsSchemas } from '#/lib/contracts/client'
import {
  activeReaderKpi,
  adoptionRows,
  dailyCaption,
  dailySeries,
  funnelCaption,
  funnelSteps,
  journeySummaries,
  qualitySummary,
  retentionGrid,
  retentionTone,
  rollupStatusLine,
  sectionEmpty,
  sectionState,
  topJourneys,
} from '../derive'
import { resolveWindow } from '../filters'
import { formatMetricCell, formatRate } from '../format'

const overview: ContractsSchemas['AnalyticsOverview'] = {
  from: '2026-11-01',
  to: '2026-11-19',
  cells: [
    { metric: 'dau', value: 821, unit: 'count', suppressed: false },
    { metric: 'activation_rate', value: 0.31, unit: 'percent', suppressed: false },
    { metric: 'guest_to_account_ratio', value: 0.42, unit: 'ratio', suppressed: false },
    { metric: 'wau', value: 2410, unit: 'count', suppressed: false },
    { metric: 'mau', value: 6304, unit: 'count', suppressed: false },
  ],
  daily: [
    { day: '2026-11-17', dau: 700, guests: 400, accounts: 300, suppressed: false },
    { day: '2026-11-18', dau: 821, guests: 512, accounts: 309, suppressed: false },
    { day: '2026-11-19', dau: null, guests: null, accounts: null, suppressed: true },
  ],
}

const quality: ContractsSchemas['DataQuality'] = {
  from: '2026-11-01',
  to: '2026-11-19',
  ingest: {
    events: 84210,
    batches: 3120,
    droppedEvents: 412,
    unknownKeys: 87,
    rejectedBatches: 6,
  },
  consent: { granted: 5402, denied: 611, unknown: 291, staleVersion: 44 },
  queue: { clientDrops: 33, expired: 12 },
  suppression: { threshold: 10, cellsSuppressed: 18 },
  rollups: [
    { rollup: 'analytics_daily', lastDay: '2026-11-18', status: 'ok' },
    { rollup: 'analytics_journey_daily', lastDay: '2026-11-18', status: 'ok' },
  ],
}

describe('metric formatting', () => {
  it('formats fractions as percentages and keeps suppression visible', () => {
    expect(formatMetricCell(overview.cells[1])).toBe('31.0%')
    expect(formatMetricCell(overview.cells[2])).toBe('42.0%')
    expect(
      formatMetricCell({ metric: 'small', value: null, suppressed: true }),
    ).toBe('—')
    expect(formatRate(0.167)).toBe('16.7%')
  })
})

describe('overview and daily population', () => {
  it('draws the chart and the peak from the same DAU series', () => {
    const series = dailySeries(overview)
    expect(series.points.map((point) => point.day)).toEqual(['2026-11-17', '2026-11-18'])
    expect(series.peak).toEqual({ day: '2026-11-18', value: 821 })
    expect(series.suppressedDays).toBe(1)
    expect(activeReaderKpi(overview).value).toBe('821 / 2,410 / 6,304')
  })

  it('does not claim a peak when no daily point is visible', () => {
    const series = dailySeries({ ...overview, daily: [] })
    expect(series.peak).toBeNull()
    expect(dailyCaption(series, resolveWindow('30d', '2026-11-19'))).toContain(
      'No daily active-reader points',
    )
  })

  it('names the chart population in the caption', () => {
    const caption = dailyCaption(dailySeries(overview), resolveWindow('30d', '2026-11-19'))
    expect(caption).toContain('Peak 821 daily active readers')
    expect(caption).toContain('same DAU population as the KPI')
  })
})

describe('journeys and funnels', () => {
  const steps: ContractsSchemas['JourneyStepMetric'][] = [
    { journey: 'course_completion', step: 'started', stepIndex: 0, reached: 720, suppressed: false },
    { journey: 'course_completion', step: 'completed', stepIndex: 1, reached: 346, suppressed: false },
    {
      journey: 'event_registration',
      step: 'detail_viewed',
      stepIndex: 0,
      reached: 1240,
      suppressed: false,
    },
    {
      journey: 'event_registration',
      step: 'registration_started',
      stepIndex: 1,
      reached: 860,
      dropped: 380,
      suppressed: false,
    },
    {
      journey: 'event_registration',
      step: 'checked_in',
      stepIndex: 2,
      reached: 410,
      dropped: 450,
      suppressed: false,
    },
  ]

  it('ranks journeys by completion and keeps one source', () => {
    const summaries = journeySummaries(steps)
    expect(summaries[0].journey).toBe('course_completion')
    expect(summaries[0].completion).toBeCloseTo(346 / 720)
    expect(topJourneys(steps, 1)).toEqual([summaries[0]])
  })

  it('marks a journey suppressed when any step is suppressed', () => {
    const summaries = journeySummaries([
      steps[0],
      { ...steps[1], suppressed: true, reached: null },
    ])
    expect(summaries[0].suppressed).toBe(true)
    expect(summaries[0].completion).toBeNull()
  })

  it('captions the largest actual drop instead of a static claim', () => {
    const view = funnelSteps(steps, 'event_registration')
    expect(view.map((step) => step.share)).toEqual([1, 860 / 1240, 410 / 1240])
    const caption = funnelCaption(view, 'Event registration → check-in')
    expect(caption).toContain('between registration started and checked in')
    expect(caption).toContain('450 readers')
  })
})

describe('retention', () => {
  const rows: ContractsSchemas['RetentionMetric'][] = [
    { cohortWeek: '2026-10-20', weekIndex: 0, actors: 1240, retained: 1240, rate: 1, suppressed: false },
    { cohortWeek: '2026-10-20', weekIndex: 1, actors: 1240, retained: 769, rate: 0.62, suppressed: false },
    { cohortWeek: '2026-10-20', weekIndex: 2, actors: null, retained: null, rate: null, suppressed: true },
    { cohortWeek: '2026-10-27', weekIndex: 0, actors: 820, retained: 820, rate: 1, suppressed: false },
  ]

  it('exposes only elapsed values to assistive technology', () => {
    const grid = retentionGrid(rows)
    expect(grid.cohorts[0].rates.slice(0, 4)).toEqual([1, 0.62, null, null])
    expect(grid.cohorts[0].elapsed).toBe(2)
    expect(grid.ariaLabel).toContain('20 Oct')
    expect(grid.ariaLabel).toContain('100%, 62%')
    expect(grid.ariaLabel).not.toContain('W2')
  })

  it('buckets the heat scale without inventing a rate', () => {
    expect(retentionTone(null)).toBe(0)
    expect(retentionTone(0.1)).toBe(1)
    expect(retentionTone(0.3)).toBe(2)
    expect(retentionTone(0.6)).toBe(3)
    expect(retentionTone(0.9)).toBe(4)
  })
})

describe('adoption and quality', () => {
  it('sorts features by reach and keeps the denominator visible', () => {
    const rows = adoptionRows([
      { feature: 'species', reach: 1890, depthPerActor: 4.1, repeatRate: 0.52, suppressed: false },
      { feature: 'events', reach: 5210, depthPerActor: 2.8, repeatRate: 0.39, suppressed: false },
    ])
    expect(rows.map((row) => row.feature)).toEqual(['events', 'species'])
  })

  it('derives consent coverage and the last successful rollup', () => {
    const summary = qualitySummary(quality, resolveWindow('30d', '2026-11-19'))
    expect(summary.consentCoverage).toBeCloseTo(5402 / 6304)
    expect(summary.lastSuccess).toBe('2026-11-18')
    expect(summary.rollupFailed).toBe(false)
    expect(summary.queueDrops).toBe(45)
    expect(summary.unknownKeyRate).toBeCloseTo(87 / 84210)
  })

  it('flags a failed rollup and refuses to name a success', () => {
    const summary = qualitySummary(
      {
        ...quality,
        rollups: [{ rollup: 'analytics_daily', lastDay: '2026-11-18', status: 'failed' }],
      },
      resolveWindow('30d', '2026-11-19'),
    )
    expect(summary.lastSuccess).toBeNull()
    expect(summary.rollupFailed).toBe(true)
  })
})

describe('empty versus failed', () => {
  it('treats an all-suppressed overview as empty, not as zero', () => {
    const emptyOverview: ContractsSchemas['AnalyticsOverview'] = {
      from: '2026-11-01',
      to: '2026-11-19',
      cells: [
        { metric: 'dau', value: null, unit: 'count', suppressed: true },
        { metric: 'wau', value: null, unit: 'count', suppressed: true },
      ],
      daily: [],
    }
    const data = {
      overview: emptyOverview,
      journeys: [],
      funnels: [],
      retention: [],
      adoption: [],
      quality,
    }
    expect(sectionEmpty('overview', data)).toBe(true)
    expect(sectionState('ready', 'default', true)).toBe('empty')
    expect(sectionState('error', 'default', false)).toBe('error')
    expect(sectionState('ready', 'error', false)).toBe('error')
  })

  it('writes different sentences for empty, failed and stale', () => {
    const base = { lastSuccess: '2026-11-18', from: '2026-10-21', to: '2026-11-19' }
    expect(rollupStatusLine({ ...base, scenario: 'empty' })).toContain('no data for')
    expect(rollupStatusLine({ ...base, scenario: 'error' })).toContain('No rollup loaded')
    expect(rollupStatusLine({ ...base, scenario: 'stale' })).toContain('last-known data')
    expect(rollupStatusLine({ ...base, scenario: 'default' })).toContain('Data through 18 Nov 2026')
  })
})
