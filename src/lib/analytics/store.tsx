/**
 * Analytics admin provider.
 *
 * One provider for the surface: the contract reads, the filter contract, the
 * data state, and the export/erasure actions. Screens never fetch directly and
 * never keep their own copy of the filters.
 *
 * There is deliberately no sample fallback for contract reads. A failed rollup
 * is shown as a failed rollup, never as plausible-looking sample numbers.
 */
import { dataStatesAllowed } from '#/lib/env'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { normaliseRole, roleHasPermission, type Permission } from '#/lib/contracts/roles'
import { createAnalyticsApi } from './api'
import { DEFAULT_FILTERS, resolveWindow, toQuery, type DateWindow } from './filters'
import { todayIso } from './format'
import {
  buildContent,
  buildProgramme,
  buildSearchGap,
  buildSuppression,
  qualitySummary,
} from './derive'
import type {
  Acknowledgement,
  AdoptionMetric,
  AnalyticsContextValue,
  AnalyticsFilters,
  AnalyticsOverview,
  AnalyticsSectionKey,
  AnalyticsSnapshot,
  DataQuality,
  DatasetKey,
  ErasureRequest,
  FunnelMetric,
  JourneyKey,
  JourneyStepMetric,
  RangeKey,
  RetentionMetric,
  Scenario,
} from './types'

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

const DATASETS: DatasetKey[] = [
  'overview',
  'journeys',
  'funnels',
  'retention',
  'adoption',
  'quality',
]

function emptyLoads(status: 'idle' | 'loading' | 'error' = 'idle'): Record<DatasetKey, import('./types').LoadState> {
  return Object.fromEntries(DATASETS.map((key) => [key, status])) as Record<
    DatasetKey,
    import('./types').LoadState
  >
}

function errorText(reason: unknown): string {
  if (reason instanceof Error && reason.message) return reason.message
  return 'The analytics service returned an error.'
}

function emptyOverview(window: DateWindow): AnalyticsOverview {
  return { from: window.from, to: window.to, cells: [], daily: [] }
}

function emptyQuality(window: DateWindow): DataQuality {
  return {
    from: window.from,
    to: window.to,
    ingest: {},
    suppression: { threshold: 10, cellsSuppressed: 0 },
    rollups: [],
  }
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const routeContext = useRouteContext({ from: '/_authenticated' })
  const role = normaliseRole(routeContext.user?.role)
  const can = useCallback(
    (permission: Permission) => roleHasPermission(role, permission),
    [role],
  )

  const [filters, setFilters] = useState<AnalyticsFilters>({ ...DEFAULT_FILTERS })
  const [scenario, setScenarioState] = useState<Scenario>('default')
  const [data, setData] = useState<AnalyticsSnapshot | null>(null)
  const [loads, setLoads] = useState<Record<DatasetKey, import('./types').LoadState>>(() =>
    emptyLoads('loading'),
  )
  const [errors, setErrors] = useState<Partial<Record<DatasetKey, string>>>({})
  const [stale, setStale] = useState(false)
  const [source, setSource] = useState<'api' | 'loading' | 'error'>('loading')
  const [apiError, setApiError] = useState<string | null>(null)
  const [lastSuccess, setLastSuccess] = useState<string | null>(null)
  const lastSuccessRef = useRef<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const asOf = useMemo(() => lastSuccess ?? lastSuccessRef.current, [lastSuccess])
  // The request window is anchored to today, not to the last rollup day, so a
  // successful quality read cannot change the window and trigger a second read.
  const dateWindow = useMemo(() => resolveWindow(filters.range, todayIso()), [filters.range])

  const refresh = useCallback(async () => {
    if (scenario === 'loading') {
      setLoads(emptyLoads('loading'))
      setSource('loading')
      return
    }

    setLoads((previous) => {
      const next = { ...previous }
      for (const key of DATASETS) {
        next[key] = previous[key] === 'ready' ? 'ready' : 'loading'
      }
      return next
    })
    setErrors({})

    const api = createAnalyticsApi({
      fixtureState: scenario === 'stale' ? 'stale' : scenario === 'empty' || scenario === 'error' ? scenario : undefined,
    })
    const baseQuery = toQuery(dateWindow)
    // Only the journeys read accepts a journey filter. Sending it to the other
    // endpoints would make the "not applied here" badge a lie.
    const journeysQuery = toQuery(dateWindow, filters.journey)

    const [
      overviewResult,
      journeysResult,
      funnelsResult,
      retentionResult,
      adoptionResult,
      qualityResult,
    ] = await Promise.allSettled([
      api.overview(baseQuery),
      api.journeys(journeysQuery),
      api.funnels(baseQuery),
      api.retention(baseQuery),
      api.adoption(baseQuery),
      api.quality(baseQuery),
    ])

    if (!mounted.current) return

    const nextErrors: Partial<Record<DatasetKey, string>> = {}
    let successes = 0
    let anyStale = false

    const settle = <T,>(
      dataset: DatasetKey,
      result: PromiseSettledResult<{ data: T; stale: boolean }>,
      fallback: T,
    ): T => {
      if (result.status === 'fulfilled') {
        successes += 1
        anyStale = anyStale || result.value.stale
        setLoads((previous) => ({ ...previous, [dataset]: 'ready' }))
        return result.value.data
      }
      nextErrors[dataset] = errorText(result.reason)
      setLoads((previous) => ({ ...previous, [dataset]: 'error' }))
      return fallback
    }

    const overview = settle<AnalyticsOverview>(
      'overview',
      overviewResult,
      emptyOverview(dateWindow),
    )
    const journeys = settle<JourneyStepMetric[]>(
      'journeys',
      journeysResult,
      [] as JourneyStepMetric[],
    )
    const funnels = settle<FunnelMetric[]>('funnels', funnelsResult, [] as FunnelMetric[])
    const retention = settle<RetentionMetric[]>(
      'retention',
      retentionResult,
      [] as RetentionMetric[],
    )
    const adoption = settle<AdoptionMetric[]>(
      'adoption',
      adoptionResult,
      [] as AdoptionMetric[],
    )
    const quality = settle<DataQuality>('quality', qualityResult, emptyQuality(dateWindow))

    const qualityData = qualityResult.status === 'fulfilled' ? quality : null
    const summary = qualitySummary(qualityData, dateWindow)
    if (summary.lastSuccess && summary.lastSuccess !== lastSuccessRef.current) {
      lastSuccessRef.current = summary.lastSuccess
      setLastSuccess(summary.lastSuccess)
    }

    setStale(anyStale)
    setErrors(nextErrors)
    setApiError(
      successes === 0
        ? 'The analytics service did not answer any read. Start the contracts mock on :8099 or retry.'
        : null,
    )
    setSource(successes === 0 ? 'error' : 'api')
    setData({ overview, journeys, funnels, retention, adoption, quality })
  }, [scenario, dateWindow, filters.journey])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setRange = useCallback((range: RangeKey) => {
    setFilters((previous) => ({ ...previous, range }))
  }, [])

  const setJourney = useCallback((journey: JourneyKey | 'all') => {
    setFilters((previous) => ({ ...previous, journey }))
  }, [])

  const resetFilters = useCallback(() => setFilters({ ...DEFAULT_FILTERS }), [])

  // Fixture scenarios are a development affordance; a production build stays
  // on live data even if a control is somehow rendered.
  const setScenario = useCallback(
    (next: Scenario) => setScenarioState(dataStatesAllowed() ? next : 'default'),
    [],
  )

  const searchGap = useMemo(() => buildSearchGap(data?.quality ?? null), [data?.quality])
  const content = useMemo(
    () => buildContent(data?.journeys ?? []),
    [data?.journeys],
  )
  const programme = useMemo(() => buildProgramme(), [])
  const suppression = useMemo(
    () => buildSuppression(data, data?.quality ?? null),
    [data],
  )

  const exportDataset = useCallback(
    async (input: { from: string; to: string; dataset: DatasetKey }): Promise<Acknowledgement> => {
      if (!can('analytics.export')) {
        throw new Error('Your role cannot export analytics.')
      }
      if (stale) {
        throw new Error('Exports are disabled while showing stale rollups.')
      }
      const api = createAnalyticsApi()
      return api.exportDataset(input)
    },
    [can, stale],
  )

  const requestErasure = useCallback(
    async (input: {
      subjectType: 'user' | 'analytics_id'
      subjectRef: string
    }): Promise<ErasureRequest> => {
      if (!can('analytics.erasure')) {
        throw new Error('Your role cannot request analytics erasure.')
      }
      if (stale) {
        throw new Error('Erasure requests are disabled while showing stale rollups.')
      }
      const api = createAnalyticsApi()
      return api.requestErasure(input)
    },
    [can, stale],
  )

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      filters,
      scenario,
      data,
      stale,
      source,
      apiError,
      loads,
      errors,
      lastSuccess: asOf,
      asOf,
      searchGap,
      content,
      programme,
      suppression,
      can,
      setRange,
      setJourney,
      resetFilters,
      setScenario,
      refresh,
      exportDataset,
      requestErasure,
    }),
    [
      filters,
      scenario,
      data,
      stale,
      source,
      apiError,
      loads,
      errors,
      asOf,
      searchGap,
      content,
      programme,
      suppression,
      can,
      setRange,
      setJourney,
      resetFilters,
      setScenario,
      refresh,
      exportDataset,
      requestErasure,
    ],
  )

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
}

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext)
  if (!context) throw new Error('useAnalytics must be used inside AnalyticsProvider')
  return context
}

export type { AnalyticsSectionKey }
