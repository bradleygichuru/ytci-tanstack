/**
 * Typed analytics reads and writes over the frozen contracts client.
 *
 * Every contract-backed screen goes through this module; none of them call
 * `fetch` directly. The `stale` flag comes from `X-Data-Stale` and is preserved
 * alongside the data so the UI can show last-known values without pretending
 * they are current.
 */
import {
  createContractsClient,
  isStale,
  unwrap,
  type FixtureState,
} from '#/lib/contracts/client'
import type {
  Acknowledgement,
  AdoptionMetric,
  AnalyticsOverview,
  DataQuality,
  DatasetKey,
  ErasureRequest,
  FunnelMetric,
  JourneyKey,
  JourneyStepMetric,
  RetentionMetric,
} from './types'

export interface ReadResult<T> {
  data: T
  stale: boolean
}

export interface AnalyticsQuery {
  from: string
  to: string
  journey?: JourneyKey
}

export interface AnalyticsApi {
  overview: (query: AnalyticsQuery) => Promise<ReadResult<AnalyticsOverview>>
  journeys: (query: AnalyticsQuery) => Promise<ReadResult<JourneyStepMetric[]>>
  funnels: (query: AnalyticsQuery) => Promise<ReadResult<FunnelMetric[]>>
  retention: (query: AnalyticsQuery) => Promise<ReadResult<RetentionMetric[]>>
  adoption: (query: AnalyticsQuery) => Promise<ReadResult<AdoptionMetric[]>>
  quality: (query: AnalyticsQuery) => Promise<ReadResult<DataQuality>>
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

function readResult<T>(result: {
  data?: T
  error?: unknown
  response: Response
}): ReadResult<T> {
  const data = unwrap<T>(result)
  return { data, stale: isStale(result.response) }
}

export function createAnalyticsApi(
  options: { fixtureState?: FixtureState; fetch?: typeof fetch } = {},
): AnalyticsApi {
  const client = createContractsClient({
    fixtureState: options.fixtureState,
    fetch: options.fetch,
  })

  const query = (input: AnalyticsQuery) => ({
    from: input.from,
    to: input.to,
    ...(input.journey ? { journey: input.journey } : {}),
  })

  return {
    async overview(input) {
      return readResult(
        await client.GET('/v1/admin/analytics/overview', {
          params: { query: query(input) },
        }) as { data: AnalyticsOverview; error?: unknown; response: Response },
      )
    },
    async journeys(input) {
      const result = await client.GET('/v1/admin/analytics/journeys', {
        params: { query: query(input) },
      })
      const read = readResult<{ items?: JourneyStepMetric[] }>(
        result as { data: { items?: JourneyStepMetric[] }; error?: unknown; response: Response },
      )
      return { data: read.data.items ?? [], stale: read.stale }
    },
    async funnels(input) {
      const result = await client.GET('/v1/admin/analytics/funnels', {
        params: { query: query(input) },
      })
      const read = readResult<{ items?: FunnelMetric[] }>(
        result as { data: { items?: FunnelMetric[] }; error?: unknown; response: Response },
      )
      return { data: read.data.items ?? [], stale: read.stale }
    },
    async retention(input) {
      const result = await client.GET('/v1/admin/analytics/retention', {
        params: { query: query(input) },
      })
      const read = readResult<{ items?: RetentionMetric[] }>(
        result as { data: { items?: RetentionMetric[] }; error?: unknown; response: Response },
      )
      return { data: read.data.items ?? [], stale: read.stale }
    },
    async adoption(input) {
      const result = await client.GET('/v1/admin/analytics/adoption', {
        params: { query: query(input) },
      })
      const read = readResult<{ items?: AdoptionMetric[] }>(
        result as { data: { items?: AdoptionMetric[] }; error?: unknown; response: Response },
      )
      return { data: read.data.items ?? [], stale: read.stale }
    },
    async quality(input) {
      return readResult(
        await client.GET('/v1/admin/analytics/quality', {
          params: { query: query(input) },
        }) as { data: DataQuality; error?: unknown; response: Response },
      )
    },
    async exportDataset(input) {
      return unwrap(
        await client.POST('/v1/admin/analytics/export', {
          body: {
            from: input.from,
            to: input.to,
            dataset: input.dataset as
              | 'overview'
              | 'journeys'
              | 'funnels'
              | 'retention'
              | 'adoption'
              | 'quality',
          },
        }),
      ) as Acknowledgement
    },
    async requestErasure(input) {
      return unwrap(
        await client.POST('/v1/admin/analytics/erasure', {
          body: input,
        }),
      ) as ErasureRequest
    },
  }
}
