/**
 * Analytics admin view models.
 *
 * The contract schemas are the source of truth for anything the rollup serves.
 * The extra types here are the operator layer: filters, data states, and the
 * documented overlay for screens the frozen 1.0.0 contract does not expose
 * (search, content, programme, county suppression).
 */
import type { ContractsSchemas } from '#/lib/contracts/client'

export type AnalyticsOverview = ContractsSchemas['AnalyticsOverview']
export type MetricCell = ContractsSchemas['MetricCell']
export type JourneyStepMetric = ContractsSchemas['JourneyStepMetric']
export type FunnelMetric = ContractsSchemas['FunnelMetric']
export type RetentionMetric = ContractsSchemas['RetentionMetric']
export type AdoptionMetric = ContractsSchemas['AdoptionMetric']
export type DataQuality = ContractsSchemas['DataQuality']
export type Acknowledgement = ContractsSchemas['Acknowledgement']
export type ErasureRequest = ContractsSchemas['ErasureRequest']

export type JourneyKey = JourneyStepMetric['journey']

export const JOURNEY_LABELS: Record<JourneyKey, string> = {
  onboarding: 'Onboarding',
  first_itinerary: 'First itinerary',
  event_registration: 'Event registration → check-in',
  challenge_submission: 'Challenge submission',
  conservation_checkin: 'Conservation check-in',
  course_completion: 'Course completion',
  heritage_visit: 'Heritage visit',
  audio_playback: 'Audio playback',
  recognition_optin: 'Recognition opt-in',
}

export const JOURNEY_KEYS = Object.keys(JOURNEY_LABELS) as JourneyKey[]

export type RangeKey = '30d' | '90d' | 'season'

export interface AnalyticsFilters {
  range: RangeKey
  /** Journeys-only filter. Cleared on every other section so nothing is silently ignored. */
  journey: JourneyKey | 'all'
}

export type Scenario = 'default' | 'empty' | 'loading' | 'error' | 'stale'

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export type DatasetKey =
  | 'overview'
  | 'journeys'
  | 'funnels'
  | 'retention'
  | 'adoption'
  | 'quality'

export type AnalyticsSectionKey =
  | 'overview'
  | 'journeys'
  | 'funnels'
  | 'retention'
  | 'adoption'
  | 'search'
  | 'content'
  | 'programme'
  | 'quality'
  | 'suppressed'

export interface AnalyticsSnapshot {
  overview: AnalyticsOverview
  journeys: JourneyStepMetric[]
  funnels: FunnelMetric[]
  retention: RetentionMetric[]
  adoption: AdoptionMetric[]
  quality: DataQuality
}

export type OverlayProvenance = 'contract' | 'overlay' | 'unavailable'

/** Search is defined in ADR 0016 but no analytics 1.0.0 endpoint exposes it. */
export interface SearchGapView {
  provenance: OverlayProvenance
  /** Aggregates the contract can support (data-quality counters). */
  qualitySignals: {
    unknownKeys: number
    droppedEvents: number
    rejectedBatches: number
  }
  /** Metrics the product still needs from a future contract. */
  missing: { label: string; definition: string }[]
}

export interface ContentRow {
  surface: string
  started: number
  completed: number
  completionRate: number
  source: 'journeys' | 'overlay'
}

export interface ContentView {
  provenance: OverlayProvenance
  rows: ContentRow[]
  note: string
}

export interface ProgrammeRow {
  programme: string
  participants: number
  verified: number
  note: string
}

export interface ProgrammeView {
  provenance: OverlayProvenance
  rows: ProgrammeRow[]
  note: string
}

export interface SuppressedDemoRow {
  county: string
  events: number | null
  recognition: number | null
  learning: number | null
}

export interface SuppressionView {
  provenance: OverlayProvenance
  threshold: number
  cellsSuppressed: number
  contractCells: { dataset: DatasetKey; label: string; detail: string }[]
  demoRows: SuppressedDemoRow[]
}

export interface AnalyticsContextValue {
  filters: AnalyticsFilters
  scenario: Scenario
  data: AnalyticsSnapshot | null
  stale: boolean
  source: 'api' | 'loading' | 'error'
  apiError: string | null
  loads: Record<DatasetKey, LoadState>
  errors: Partial<Record<DatasetKey, string>>
  lastSuccess: string | null
  asOf: string | null
  searchGap: SearchGapView
  content: ContentView
  programme: ProgrammeView
  suppression: SuppressionView
  can: (permission: import('#/lib/contracts/roles').Permission) => boolean
  setRange: (range: RangeKey) => void
  setJourney: (journey: JourneyKey | 'all') => void
  resetFilters: () => void
  setScenario: (scenario: Scenario) => void
  refresh: () => Promise<void>
  exportDataset: (input: {
    from: string
    to: string
    dataset: DatasetKey
  }) => Promise<Acknowledgement>
  requestErasure: (input: {
    subjectType: 'user' | 'analytics_id'
    subjectRef: string
  }) => Promise<ErasureRequest>
}
