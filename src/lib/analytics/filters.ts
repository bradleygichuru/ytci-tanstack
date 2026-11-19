/**
 * The analytics filter contract.
 *
 * Carry-forward P1s #2 and #3: do not offer a filter the rollup cannot apply,
 * and never let a section read global data under a filtered headline.
 *
 * The frozen 1.0.0 contract exposes two query dimensions:
 *   - `from` / `to` on every admin analytics read
 *   - `journey` on the journeys read only
 *
 * There is no county or platform dimension anywhere in the contract. The
 * prototype offered both; showing them here would reproduce the defect, so the
 * filter bar exposes the date window on every section and the journey filter on
 * the Journeys section only. `appliedFilters` is the single source of truth for
 * what the scope line says.
 */
import type {
  AnalyticsSectionKey,
  JourneyKey,
  RangeKey,
} from './types'
import { JOURNEY_KEYS, JOURNEY_LABELS } from './types'

export interface DateWindow {
  from: string
  to: string
  /** Human label for the scope line, e.g. "Last 30 days". */
  label: string
  /** The comparison the backend would use for deltas, shown for context. */
  comparison: string
}

export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'season', label: 'This season' },
]

export const DEFAULT_FILTERS = {
  range: '30d' as RangeKey,
  journey: 'all' as JourneyKey | 'all',
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function parseIso(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

/** The season is the calendar quarter, matching the programme season window. */
export function seasonStart(asOf: string): string {
  const date = parseIso(asOf)
  const month = date.getUTCMonth()
  const quarterStartMonth = Math.floor(month / 3) * 3
  return isoDate(new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 1)))
}

export function resolveWindow(range: RangeKey, asOf: string): DateWindow {
  const to = parseIso(asOf)
  const days = range === '90d' ? 89 : 29
  const from = range === 'season' ? seasonStart(asOf) : isoDate(addDays(to, -days))
  const label =
    range === '90d'
      ? 'Last 90 days'
      : range === 'season'
        ? `This season (${seasonLabel(from, asOf)})`
        : 'Last 30 days'
  const comparison =
    range === '90d'
      ? 'vs previous 90 days'
      : range === 'season'
        ? 'vs previous season'
        : 'vs previous 30 days'
  return { from, to: isoDate(to), label, comparison }
}

function seasonLabel(from: string, to: string): string {
  const format = (value: string) =>
    new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(parseIso(value))
  return `${format(from)}–${format(to)}`
}

/**
 * Which filters each section actually applies. The scope line and the
 * "not applied" badge both read this table, so the UI cannot drift from the
 * request it makes.
 */
export const SECTION_FILTERS: Record<
  AnalyticsSectionKey,
  { range: boolean; journey: boolean }
> = {
  overview: { range: true, journey: false },
  journeys: { range: true, journey: true },
  funnels: { range: true, journey: false },
  retention: { range: true, journey: false },
  adoption: { range: true, journey: false },
  search: { range: true, journey: false },
  content: { range: true, journey: false },
  programme: { range: false, journey: false },
  quality: { range: true, journey: false },
  suppressed: { range: true, journey: false },
}

export interface FilterSummary {
  window: DateWindow
  /** True when the reader has moved away from the defaults. */
  isFiltered: boolean
  /** Filters that are set but are not applied to this section. */
  unapplied: { key: 'journey'; label: string }[]
  /** The exact sentence rendered under the section title. */
  scope: string
}

export function summariseFilters(
  section: AnalyticsSectionKey,
  filters: { range: RangeKey; journey: JourneyKey | 'all' },
  window: DateWindow,
): FilterSummary {
  const applied = SECTION_FILTERS[section]
  const journeyActive = filters.journey !== 'all'
  const journeyLabel = filters.journey === 'all' ? null : JOURNEY_LABELS[filters.journey]
  const unapplied: FilterSummary['unapplied'] = []

  if (journeyActive && !applied.journey && journeyLabel) {
    unapplied.push({ key: 'journey', label: journeyLabel })
  }

  const parts: string[] = []
  if (applied.range) parts.push(window.label)
  if (applied.journey && journeyLabel) parts.push(journeyLabel)
  if (applied.journey && !journeyActive) parts.push('All journeys')

  const scope =
    parts.length > 0
      ? `${parts.join(' · ')} · applied to this screen`
      : section === 'programme'
        ? 'Domain-table view · analytics filters do not apply'
        : 'Illustrative overlay · not filter-aware'

  return {
    window,
    isFiltered: filters.range !== DEFAULT_FILTERS.range || journeyActive,
    unapplied,
    scope,
  }
}

/** Query parameters for a contract read. */
export function toQuery(
  window: DateWindow,
  journey?: JourneyKey | 'all',
): { from: string; to: string; journey?: JourneyKey } {
  if (journey && journey !== 'all' && JOURNEY_KEYS.includes(journey)) {
    return { from: window.from, to: window.to, journey }
  }
  return { from: window.from, to: window.to }
}

/** True when a route may offer the journey filter. */
export function sectionAcceptsJourney(section: AnalyticsSectionKey): boolean {
  return SECTION_FILTERS[section].journey
}

/**
 * The filter model is URL-ready without committing the surface to a router
 * search schema yet: an unknown range falls back to 30 days, and an unknown
 * journey falls back to "all" rather than sending a value the API rejects.
 */
export function normaliseRange(value: unknown): RangeKey {
  return value === '90d' || value === 'season' || value === '30d' ? value : DEFAULT_FILTERS.range
}

export function normaliseJourney(value: unknown): JourneyKey | 'all' {
  return typeof value === 'string' && (JOURNEY_KEYS as string[]).includes(value)
    ? (value as JourneyKey)
    : 'all'
}
