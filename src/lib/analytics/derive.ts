/**
 * Pure derivations for the analytics screens.
 *
 * Every number rendered by a contract-backed screen passes through one of these
 * functions. That keeps the carry-forward fixes testable:
 *   - the chart and the DAU KPI come from the same `daily`/`dau` population;
 *   - journey ranking has one source (`journeySummaries`) used by Overview and
 *     Journeys;
 *   - the funnel caption names the largest real drop instead of a static claim;
 *   - retention exposes elapsed weeks only;
 *   - empty is distinct from failed (see `sectionState`).
 */
import type { DateWindow } from './filters'
import {
  formatDate,
  formatNumber,
  formatRate,
  formatShortDate,
  humanise,
} from './format'
import { SAMPLE_CONTENT_ROWS, SUPPRESSION_DEMO_ROWS } from './fixtures'
import {
  JOURNEY_LABELS,
  type AdoptionMetric,
  type AnalyticsSnapshot,
  type ContentRow,
  type ContentView,
  type DataQuality,
  type DatasetKey,
  type JourneyKey,
  type JourneyStepMetric,
  type MetricCell,
  type ProgrammeView,
  type RetentionMetric,
  type SearchGapView,
  type SuppressionView,
  type AnalyticsOverview,
} from './types'

export interface KpiView {
  key: string
  label: string
  value: string
  foot: string
  definition: string
  suppressed: boolean
}

export interface DailyPoint {
  day: string
  dau: number
  guests: number | null
  accounts: number | null
}

export interface DailySeries {
  points: DailyPoint[]
  /** Peak from the same DAU population as the KPI card. Null when no point exists. */
  peak: { day: string; value: number } | null
  max: number
  suppressedDays: number
}

export interface JourneySummary {
  journey: JourneyKey
  label: string
  started: number | null
  completed: number | null
  completion: number | null
  suppressed: boolean
  steps: JourneyStepMetric[]
}

export interface FunnelRow {
  journey: string
  label: string
  entered: number | null
  completed: number | null
  conversion: number | null
  suppressed: boolean
}

export interface FunnelStepView {
  step: string
  reached: number | null
  dropped: number | null
  share: number | null
}

export interface RetentionCohort {
  cohortWeek: string
  label: string
  actors: number | null
  rates: (number | null)[]
  elapsed: number
}

export interface RetentionGrid {
  cohorts: RetentionCohort[]
  weeks: number[]
  ariaLabel: string
}

export interface QualitySummary {
  days: number
  eventsPerDay: number | null
  consentCoverage: number | null
  unknownKeyRate: number | null
  droppedEventRate: number | null
  queueDrops: number
  rejectedBatches: number
  totalBatches: number
  threshold: number
  cellsSuppressed: number
  lastSuccess: string | null
  rollupFailed: boolean
  rollups: NonNullable<DataQuality['rollups']>
}

export function metricMap(overview: AnalyticsOverview | null): Map<string, MetricCell> {
  const map = new Map<string, MetricCell>()
  for (const cell of overview?.cells ?? []) map.set(cell.metric, cell)
  return map
}

export function metricValue(overview: AnalyticsOverview | null, metric: string): MetricCell | undefined {
  return metricMap(overview).get(metric)
}

const KPI_DEFINITIONS: Record<string, { label: string; definition: string; foot: string }> = {
  activation_rate: {
    label: 'Activation',
    definition: 'New accounts with a verified action in their first 7 days.',
    foot: 'Verified action in first 7 days',
  },
  guest_to_account_ratio: {
    label: 'Guest-to-account',
    definition: 'Guests who create an account within 30 days of their first read.',
    foot: 'Guests who create an account',
  },
  new_accounts: {
    label: 'New accounts',
    definition: 'Accounts created in the selected range.',
    foot: 'Created in this range',
  },
}

export function activationKpi(overview: AnalyticsOverview | null): KpiView {
  return kpiFromCell('activation_rate', metricValue(overview, 'activation_rate'))
}

export function guestToAccountKpi(overview: AnalyticsOverview | null): KpiView {
  return kpiFromCell('guest_to_account_ratio', metricValue(overview, 'guest_to_account_ratio'))
}

export function newAccountsKpi(overview: AnalyticsOverview | null): KpiView {
  return kpiFromCell('new_accounts', metricValue(overview, 'new_accounts'))
}

function kpiFromCell(key: string, cell: MetricCell | undefined): KpiView {
  const spec = KPI_DEFINITIONS[key]
  const value = cell ? formatMetricValue(cell) : '—'
  return {
    key,
    label: spec?.label ?? humanise(key),
    value,
    foot: cell?.suppressed ? 'Suppressed: fewer than 10 readers' : (cell?.caveat || spec?.foot || ''),
    definition: spec?.definition ?? cell?.definition ?? humanise(key),
    suppressed: Boolean(cell?.suppressed) || !cell || cell.value == null,
  }
}

function formatMetricValue(cell: MetricCell): string {
  if (cell.suppressed || cell.value == null) return '—'
  if (cell.unit === 'percent' || cell.unit === 'ratio') return formatRate(cell.value)
  if (cell.unit === 'currency') return `KSh ${formatNumber(cell.value)}`
  return formatNumber(cell.value)
}

export function activeReaderKpi(overview: AnalyticsOverview | null): KpiView {
  const cells = metricMap(overview)
  const parts = ['dau', 'wau', 'mau'].map((key) => {
    const cell = cells.get(key)
    if (!cell || cell.suppressed || cell.value == null) return '—'
    return formatNumber(cell.value)
  })
  const anySuppressed = ['dau', 'wau', 'mau'].some((key) => {
    const cell = cells.get(key)
    return !cell || cell.suppressed || cell.value == null
  })
  return {
    key: 'active_readers',
    label: 'DAU / WAU / MAU',
    value: parts.join(' / '),
    foot: anySuppressed ? 'Some cells suppressed (under 10 readers)' : 'Daily / weekly / monthly',
    definition:
      'Distinct signed-in or guest analytics IDs active in a day, week or month. The chart uses the daily series.',
    suppressed: anySuppressed,
  }
}

/**
 * The daily chart population.
 *
 * Only points with a visible DAU value are plotted. The peak is the maximum of
 * that same series — never a separately-labelled "readers/week" figure — so the
 * chart caption and the DAU KPI always describe one population.
 */
export function dailySeries(overview: AnalyticsOverview | null): DailySeries {
  const raw = overview?.daily ?? []
  const points: DailyPoint[] = []
  let suppressedDays = 0
  for (const point of raw) {
    if (!point.day) continue
    if (point.suppressed || point.dau == null) {
      suppressedDays += 1
      continue
    }
    points.push({
      day: point.day,
      dau: point.dau,
      guests: point.guests ?? null,
      accounts: point.accounts ?? null,
    })
  }
  let peak: DailySeries['peak'] = null
  for (const point of points) {
    if (!peak || point.dau > peak.value) peak = { day: point.day, value: point.dau }
  }
  return {
    points,
    peak,
    max: peak?.value ?? 0,
    suppressedDays,
  }
}

export function dailyCaption(series: DailySeries, window: DateWindow): string {
  if (!series.peak) {
    return `No daily active-reader points are visible for ${window.label.toLowerCase()}. Suppressed days are not plotted.`
  }
  return `Peak ${formatNumber(series.peak.value)} daily active readers on ${formatDate(series.peak.day)} · same DAU population as the KPI.`
}

export function journeySummaries(steps: JourneyStepMetric[]): JourneySummary[] {
  const grouped = new Map<JourneyKey, JourneyStepMetric[]>()
  for (const step of steps) {
    const list = grouped.get(step.journey) ?? []
    list.push(step)
    grouped.set(step.journey, list)
  }
  const summaries: JourneySummary[] = []
  for (const [journey, list] of grouped) {
    const ordered = [...list].sort((a, b) => a.stepIndex - b.stepIndex)
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    const suppressed = ordered.some((step) => step.suppressed || step.reached == null)
    const started = suppressed ? null : (first?.reached ?? null)
    const completed = suppressed ? null : (last?.reached ?? null)
    const completion =
      started != null && completed != null && started > 0 ? completed / started : null
    summaries.push({
      journey,
      label: JOURNEY_LABELS[journey] ?? humanise(journey),
      started,
      completed,
      completion,
      suppressed,
      steps: ordered,
    })
  }
  return summaries.sort((a, b) => {
    if (a.completion == null && b.completion == null) return a.label.localeCompare(b.label)
    if (a.completion == null) return 1
    if (b.completion == null) return -1
    return b.completion - a.completion
  })
}

export function topJourneys(steps: JourneyStepMetric[], limit = 5): JourneySummary[] {
  return journeySummaries(steps).slice(0, limit)
}

/**
 * Funnel summary rows for the Funnels screen.
 *
 * The table and the step bars must describe one population. Both read the same
 * journey rollup: `entered` is the first step and `completed` is the last step
 * of the series `funnelSteps` renders, so the row's conversion can never
 * disagree with the bars or the largest-drop caption (#387). The separate
 * `funnels` read is not used here because it is a different aggregation.
 */
export function funnelRows(steps: JourneyStepMetric[]): FunnelRow[] {
  return journeySummaries(steps).map((summary) => ({
    journey: summary.journey,
    label: summary.label,
    entered: summary.started,
    completed: summary.completed,
    conversion: summary.completion,
    suppressed: summary.suppressed,
  }))
}

export function funnelSteps(steps: JourneyStepMetric[], journey: string): FunnelStepView[] {
  const ordered = steps
    .filter((step) => step.journey === journey)
    .sort((a, b) => a.stepIndex - b.stepIndex)
  const top = ordered[0]?.reached ?? null
  return ordered.map((step, index) => {
    const reached = step.suppressed ? null : step.reached
    const previous = index === 0 ? reached : (ordered[index - 1].suppressed ? null : ordered[index - 1].reached)
    const dropped =
      step.dropped ??
      (reached != null && previous != null && index > 0 ? Math.max(0, previous - reached) : null)
    return {
      step: humanise(step.step),
      reached,
      dropped,
      share: reached != null && top != null && top > 0 ? reached / top : null,
    }
  })
}

export function largestDrop(steps: FunnelStepView[]): {
  from: string
  to: string
  dropped: number
} | null {
  let best: { from: string; to: string; dropped: number } | null = null
  for (let index = 1; index < steps.length; index += 1) {
    const previous = steps[index - 1]
    const current = steps[index]
    if (previous.reached == null || current.reached == null) continue
    const dropped = Math.max(0, previous.reached - current.reached)
    if (!best || dropped > best.dropped) {
      best = { from: previous.step, to: current.step, dropped }
    }
  }
  return best && best.dropped > 0 ? best : null
}

export function funnelCaption(
  steps: FunnelStepView[],
  journeyLabel: string,
): string {
  if (steps.length === 0) {
    return `${journeyLabel}: step detail is not reported for this range.`
  }
  const drop = largestDrop(steps)
  if (!drop) {
    return `${journeyLabel}: every reported step retained the same readers. Suppressed steps are excluded.`
  }
  return `The largest drop in ${journeyLabel} is between ${drop.from.toLowerCase()} and ${drop.to.toLowerCase()} (${formatNumber(drop.dropped)} readers).`
}

export function retentionGrid(rows: RetentionMetric[]): RetentionGrid {
  const byCohort = new Map<string, Map<number, RetentionMetric>>()
  for (const row of rows) {
    const weeks = byCohort.get(row.cohortWeek) ?? new Map<number, RetentionMetric>()
    weeks.set(row.weekIndex, row)
    byCohort.set(row.cohortWeek, weeks)
  }
  const weeks = [0, 1, 2, 3, 4, 5, 6, 7]
  const cohorts: RetentionCohort[] = [...byCohort.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohortWeek, weekMap]) => {
      const base = weekMap.get(0)
      const rates = weeks.map((week) => {
        const cell = weekMap.get(week)
        if (!cell || cell.suppressed || cell.rate == null) return null
        return cell.rate
      })
      const elapsed = rates.filter((rate) => rate != null).length
      return {
        cohortWeek,
        label: formatShortDate(cohortWeek),
        actors: base?.suppressed ? null : (base?.actors ?? null),
        rates,
        elapsed,
      }
    })
  const elapsedText = cohorts
    .map((cohort) => {
      const values = cohort.rates
        .filter((rate): rate is number => rate != null)
        .map((rate) => formatRate(rate, 0))
      return `${cohort.label}, n=${cohort.actors == null ? 'suppressed' : formatNumber(cohort.actors)}, rates ${values.join(', ')}`
    })
    .join('; ')
  return {
    cohorts,
    weeks,
    ariaLabel: `Weekly retention cohorts, elapsed weeks only: ${elapsedText}`,
  }
}

export function retentionTone(rate: number | null): number {
  if (rate == null) return 0
  if (rate < 0.25) return 1
  if (rate < 0.5) return 2
  if (rate < 0.75) return 3
  return 4
}

export function adoptionRows(rows: AdoptionMetric[]): AdoptionMetric[] {
  return [...rows].sort((a, b) => (b.reach ?? -1) - (a.reach ?? -1))
}

export function adoptionFeatureLabel(feature: string): string {
  const labels: Record<string, string> = {
    events: 'Events',
    recognition: 'Recognition',
    learning: 'Learning',
    'audio_stories': 'Audio Stories',
    conservation: 'Conservation',
    marketplace: 'Marketplace',
    species: 'Species',
    then_now: 'Then & Now',
  }
  return labels[feature] ?? humanise(feature)
}

export function qualitySummary(quality: DataQuality | null, window: DateWindow): QualitySummary {
  if (!quality) {
    return {
      days: 0,
      eventsPerDay: null,
      consentCoverage: null,
      unknownKeyRate: null,
      droppedEventRate: null,
      queueDrops: 0,
      rejectedBatches: 0,
      totalBatches: 0,
      threshold: 10,
      cellsSuppressed: 0,
      lastSuccess: null,
      rollupFailed: false,
      rollups: [],
    }
  }
  const from = quality.from || window.from
  const to = quality.to || window.to
  const days =
    from && to
      ? Math.max(
          1,
          Math.round(
            (new Date(`${to}T00:00:00.000Z`).getTime() -
              new Date(`${from}T00:00:00.000Z`).getTime()) /
              86_400_000,
          ) + 1,
        )
      : 1
  const events = quality.ingest.events ?? 0
  const consent = quality.consent
  const consentTotal =
    (consent?.granted ?? 0) + (consent?.denied ?? 0) + (consent?.unknown ?? 0)
  const rollups = quality.rollups ?? []
  const successful = rollups
    .filter((rollup) => rollup.status === 'ok' && rollup.lastDay)
    .map((rollup) => rollup.lastDay as string)
    .sort()
  const lastSuccess = successful.length > 0 ? successful[successful.length - 1] : null
  return {
    days,
    eventsPerDay: events > 0 ? events / days : null,
    consentCoverage: consentTotal > 0 ? (consent?.granted ?? 0) / consentTotal : null,
    unknownKeyRate: events > 0 ? (quality.ingest.unknownKeys ?? 0) / events : null,
    droppedEventRate: events > 0 ? (quality.ingest.droppedEvents ?? 0) / events : null,
    queueDrops: (quality.queue?.clientDrops ?? 0) + (quality.queue?.expired ?? 0),
    rejectedBatches: quality.ingest.rejectedBatches ?? 0,
    totalBatches: quality.ingest.batches ?? 0,
    threshold: quality.suppression.threshold ?? 10,
    cellsSuppressed: quality.suppression.cellsSuppressed ?? 0,
    lastSuccess,
    rollupFailed: rollups.some((rollup) => rollup.status === 'failed'),
    rollups,
  }
}

export function sectionEmpty(section: DatasetKey, data: AnalyticsSnapshot | null): boolean {
  if (!data) return false
  switch (section) {
    case 'overview': {
      const cells = data.overview.cells ?? []
      const visibleCell = cells.some((cell) => !cell.suppressed && cell.value != null)
      return !visibleCell && dailySeries(data.overview).points.length === 0
    }
    case 'journeys':
      return data.journeys.length === 0
    case 'funnels':
      return data.funnels.length === 0
    case 'retention':
      return data.retention.length === 0
    case 'adoption':
      return data.adoption.length === 0
    case 'quality':
      return (data.quality.ingest.events ?? 0) === 0 && (data.quality.rollups ?? []).length === 0
  }
}

export function sectionState(
  load: import('./types').LoadState,
  scenario: import('./types').Scenario,
  isEmpty: boolean,
): 'loading' | 'empty' | 'error' | 'ready' {
  if (load === 'error' || scenario === 'error') return 'error'
  if (load === 'loading' || scenario === 'loading') return 'loading'
  if (scenario === 'empty' || isEmpty) return 'empty'
  return 'ready'
}

export function buildContent(steps: JourneyStepMetric[]): ContentView {
  const contentJourneys: JourneyKey[] = [
    'course_completion',
    'first_itinerary',
    'heritage_visit',
    'audio_playback',
  ]
  const summaries = journeySummaries(steps).filter((summary) =>
    contentJourneys.includes(summary.journey),
  )
  if (summaries.length > 0) {
    const rows: ContentRow[] = summaries.map((summary) => ({
      surface: summary.label,
      started: summary.started ?? 0,
      completed: summary.completed ?? 0,
      completionRate: summary.completion ?? 0,
      source: 'journeys',
    }))
    return {
      provenance: 'contract',
      rows,
      note:
        'Counts come from the same journey rollup as Journeys, so the course row reconciles with Course completion.',
    }
  }
  // No content journeys in this rollup range. Show the labelled overlay shape
  // rather than a fabricated live table; the screen badge says it is a sample.
  return {
    provenance: 'overlay',
    rows: SAMPLE_CONTENT_ROWS,
    note:
      'The frozen rollup returned no content journey steps for this range. The table below is a labelled sample of the intended shape; live rows appear when course, itinerary, heritage or audio steps are rolled up.',
  }
}

export function buildProgramme(): ProgrammeView {
  return {
    provenance: 'unavailable',
    rows: [],
    note:
      'Programme impact is read from domain tables (conservation check-ins, events, courses, badges), never from analytics telemetry. This surface does not read those tables in 1.0.0, so it deliberately shows no numbers rather than a telemetry proxy.',
  }
}

export function buildSearchGap(quality: DataQuality | null): SearchGapView {
  return {
    provenance: 'unavailable',
    qualitySignals: {
      unknownKeys: quality?.ingest.unknownKeys ?? 0,
      droppedEvents: quality?.ingest.droppedEvents ?? 0,
      rejectedBatches: quality?.ingest.rejectedBatches ?? 0,
    },
    missing: [
      {
        label: 'Zero-result rate',
        definition: 'Searches that returned no result, weighted by editor-assigned cluster.',
      },
      {
        label: 'External selection',
        definition: 'Searches where the reader chose an external result instead of a catalogue record.',
      },
      {
        label: 'Median results',
        definition: 'Median result count before the reader selected an item.',
      },
      {
        label: 'Query clusters',
        definition:
          'Editor-assigned categories over query-length buckets, result counts and hashes. Raw query text is never stored.',
      },
    ],
  }
}

export function buildSuppression(
  data: AnalyticsSnapshot | null,
  quality: DataQuality | null,
): SuppressionView {
  const cells: SuppressionView['contractCells'] = []
  if (data) {
    for (const cell of data.overview.cells ?? []) {
      if (cell.suppressed) {
        cells.push({
          dataset: 'overview',
          label: humanise(cell.metric),
          detail: 'Cell withheld — fewer readers than the suppression threshold.',
        })
      }
    }
    for (const row of data.journeys) {
      if (row.suppressed) {
        cells.push({
          dataset: 'journeys',
          label: `${JOURNEY_LABELS[row.journey]} · ${humanise(row.step)}`,
          detail: 'Step withheld — the reached count is below the threshold.',
        })
      }
    }
    for (const row of data.funnels) {
      if (row.suppressed) {
        cells.push({
          dataset: 'funnels',
          label: JOURNEY_LABELS[row.journey as JourneyKey] ?? humanise(row.journey),
          detail: 'Funnel withheld — entered or completed is below the threshold.',
        })
      }
    }
    for (const row of data.retention) {
      if (row.suppressed) {
        cells.push({
          dataset: 'retention',
          label: `${formatShortDate(row.cohortWeek)} · W${row.weekIndex}`,
          detail: 'Cohort cell withheld — the cohort is too small.',
        })
      }
    }
    for (const row of data.adoption) {
      if (row.suppressed) {
        cells.push({
          dataset: 'adoption',
          label: adoptionFeatureLabel(row.feature),
          detail: 'Feature reach withheld — fewer readers than the threshold.',
        })
      }
    }
  }
  return {
    provenance: 'overlay',
    threshold: quality?.suppression.threshold ?? 10,
    cellsSuppressed: quality?.suppression.cellsSuppressed ?? cells.length,
    contractCells: cells,
    demoRows: SUPPRESSION_DEMO_ROWS,
  }
}

/**
 * The as-of / last-success sentence.
 *
 * Empty and failed are deliberately different sentences (carry-forward P1 #4):
 * an empty range has a successful rollup behind it, a failed read does not claim
 * one. A stale read keeps the last-known data and says so.
 */
export function rollupStatusLine(input: {
  scenario: import('./types').Scenario
  lastSuccess: string | null
  from: string
  to: string
}): string {
  const success = input.lastSuccess ? formatDate(input.lastSuccess) : 'unknown'
  if (input.scenario === 'error') {
    return `No rollup loaded · last successful rollup ${success}`
  }
  if (input.scenario === 'stale') {
    return `Showing last-known data · last successful rollup ${success}`
  }
  if (input.scenario === 'empty') {
    return `Last successful rollup ${success} · no data for ${formatDate(input.from)}–${formatDate(input.to)}`
  }
  if (input.scenario === 'loading') {
    return 'Loading the nightly rollup…'
  }
  return input.lastSuccess
    ? `Data through ${formatDate(input.lastSuccess)} · nightly rollup`
    : `Rollup day not reported · range ${formatDate(input.from)}–${formatDate(input.to)}`
}

/** Human-readable metric definitions carried by Quality and the export dialog. */export const METRIC_DEFINITIONS: { metric: string; definition: string }[] = [
  { metric: 'Activation', definition: 'New accounts with a verified action in their first 7 days.' },
  {
    metric: 'DAU / WAU / MAU',
    definition: 'Distinct signed-in or guest analytics IDs active in a day, week or month.',
  },
  { metric: 'Guest-to-account', definition: 'Guests who create an account within 30 days.' },
  {
    metric: 'Award delivery',
    definition: 'Eligible actions that produced an award without manual intervention.',
  },
  { metric: 'Reach', definition: 'Distinct analytics IDs that emitted the feature.' },
  { metric: 'Depth', definition: 'Median actions per adopter in the range.' },
  { metric: 'Repeat', definition: 'Three or more sessions in 28 days.' },
  { metric: 'Completion', definition: 'Distinct IDs that reached the final journey step.' },
]

export const RETENTION_NOTE =
  'Cohorts are directional: consent-gated analytics over-represents engaged readers. A dot means the week has not elapsed yet.'
