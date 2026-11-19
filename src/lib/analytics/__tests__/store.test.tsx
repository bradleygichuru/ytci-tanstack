import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AnalyticsProvider, useAnalytics } from '../store'

vi.mock('@tanstack/react-router', () => ({
  useRouteContext: () => ({ user: { id: 'admin-1', name: 'Amina', role: 'administrator' } }),
}))

const overview = {
  from: '2026-10-21',
  to: '2026-11-19',
  cells: [{ metric: 'dau', value: 821, unit: 'count', suppressed: false }],
  daily: [{ day: '2026-11-18', dau: 821, guests: 512, accounts: 309, suppressed: false }],
}

const emptyOverview = { from: '2026-10-21', to: '2026-11-19', cells: [], daily: [] }

const quality = {
  from: '2026-10-21',
  to: '2026-11-19',
  ingest: { events: 84210, batches: 3120, droppedEvents: 412, unknownKeys: 87, rejectedBatches: 6 },
  consent: { granted: 5402, denied: 611, unknown: 291, staleVersion: 44 },
  queue: { clientDrops: 33, expired: 12 },
  suppression: { threshold: 10, cellsSuppressed: 18 },
  rollups: [{ rollup: 'analytics_daily', lastDay: '2026-11-18', status: 'ok' }],
}

vi.mock('#/lib/analytics/api', () => ({
  createAnalyticsApi: (options: { fixtureState?: string } = {}) => {
    const state = options.fixtureState
    if (state === 'error') {
      const fail = () => Promise.reject(new Error('Analytics rollups are still being computed.'))
      return {
        overview: fail,
        journeys: fail,
        funnels: fail,
        retention: fail,
        adoption: fail,
        quality: fail,
        exportDataset: fail,
        requestErasure: fail,
      }
    }
    const empty = state === 'empty'
    const stale = state === 'stale'
    const read = (data: unknown) => Promise.resolve({ data, stale })
    return {
      overview: () => read(empty ? emptyOverview : overview),
      journeys: () => read([]),
      funnels: () => read([]),
      retention: () => read([]),
      adoption: () => read([]),
      quality: () => read(quality),
      exportDataset: () => Promise.resolve({ ok: true, id: 'job-1' }),
      requestErasure: () => Promise.resolve({ id: 'erasure-1' }),
    }
  },
}))

afterEach(cleanup)

function Probe() {
  const { source, lastSuccess, data, stale, loads, setScenario, can } = useAnalytics()
  const dau = data?.overview.cells.find((cell) => cell.metric === 'dau')?.value ?? 'none'
  return (
    <div>
      <span data-testid="source">{source}</span>
      <span data-testid="last">{lastSuccess ?? 'none'}</span>
      <span data-testid="dau">{String(dau)}</span>
      <span data-testid="stale">{String(stale)}</span>
      <span data-testid="load">{loads.overview}</span>
      <span data-testid="export">{String(can('analytics.export'))}</span>
      <button type="button" onClick={() => setScenario('empty')}>
        empty
      </button>
      <button type="button" onClick={() => setScenario('error')}>
        error
      </button>
      <button type="button" onClick={() => setScenario('stale')}>
        stale
      </button>
    </div>
  )
}

describe('AnalyticsProvider', () => {
  it('loads contract reads, keeps the last successful rollup and exposes export role', async () => {
    render(
      <AnalyticsProvider>
        <Probe />
      </AnalyticsProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('source')).toHaveTextContent('api'))
    expect(screen.getByTestId('dau')).toHaveTextContent('821')
    expect(screen.getByTestId('last')).toHaveTextContent('2026-11-18')
    expect(screen.getByTestId('export')).toHaveTextContent('true')
  })

  it('shows an empty dataset without losing the last-success stamp', async () => {
    render(
      <AnalyticsProvider>
        <Probe />
      </AnalyticsProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('source')).toHaveTextContent('api'))
    fireEvent.click(screen.getByRole('button', { name: 'empty' }))
    await waitFor(() => expect(screen.getByTestId('dau')).toHaveTextContent('none'))
    expect(screen.getByTestId('last')).toHaveTextContent('2026-11-18')
  })

  it('turns a failed read into the error source and keeps the last success', async () => {
    render(
      <AnalyticsProvider>
        <Probe />
      </AnalyticsProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('source')).toHaveTextContent('api'))
    fireEvent.click(screen.getByRole('button', { name: 'error' }))
    await waitFor(() => expect(screen.getByTestId('source')).toHaveTextContent('error'))
    expect(screen.getByTestId('last')).toHaveTextContent('2026-11-18')
    expect(screen.getByTestId('load')).toHaveTextContent('error')
  })

  it('marks a stale response while keeping the data visible', async () => {
    render(
      <AnalyticsProvider>
        <Probe />
      </AnalyticsProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('source')).toHaveTextContent('api'))
    fireEvent.click(screen.getByRole('button', { name: 'stale' }))
    await waitFor(() => expect(screen.getByTestId('stale')).toHaveTextContent('true'))
    expect(screen.getByTestId('dau')).toHaveTextContent('821')
  })
})
