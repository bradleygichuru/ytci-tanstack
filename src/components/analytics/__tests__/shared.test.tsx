import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ContractsSchemas } from '#/lib/contracts/client'
import {
  ActiveReadersChart,
  FunnelBars,
  KpiCard,
  RetentionTable,
  SuppressedMark,
} from '#/components/analytics/shared'
import { dailySeries, retentionGrid } from '#/lib/analytics/derive'

afterEach(cleanup)

const overview: ContractsSchemas['AnalyticsOverview'] = {
  from: '2026-11-01',
  to: '2026-11-19',
  cells: [],
  daily: [
    { day: '2026-11-17', dau: 700, guests: 400, accounts: 300, suppressed: false },
    { day: '2026-11-18', dau: 821, guests: 512, accounts: 309, suppressed: false },
  ],
}

describe('KpiCard', () => {
  it('renders the value, definition and suppression caveat', () => {
    render(
      <KpiCard
        kpi={{
          key: 'activation',
          label: 'Activation',
          value: '31.0%',
          foot: 'Verified action in first 7 days',
          definition: 'New accounts with a verified action in their first 7 days.',
          suppressed: false,
        }}
      />,
    )
    expect(screen.getByText('Activation')).toBeInTheDocument()
    expect(screen.getByText('31.0%')).toBeInTheDocument()
    expect(screen.getByText('Verified action in first 7 days')).toBeInTheDocument()
  })

  it('shows a suppressed value without presenting it as zero', () => {
    render(
      <KpiCard
        kpi={{
          key: 'dau',
          label: 'DAU / WAU / MAU',
          value: '—',
          foot: 'Suppressed: fewer than 10 readers',
          definition: 'Distinct analytics IDs.',
          suppressed: true,
        }}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText(/fewer than 10 readers/i)).toBeInTheDocument()
  })
})

describe('ActiveReadersChart', () => {
  it('labels the chart with the same DAU values it draws', () => {
    const series = dailySeries(overview)
    render(<ActiveReadersChart series={series} windowLabel="Last 30 days" />)
    const image = screen.getByRole('img', { name: /Daily active readers/i })
    expect(image).toHaveAccessibleName(/821/)
    expect(image).toHaveAccessibleName(/700/)
  })

  it('explains an empty series instead of drawing zero bars', () => {
    render(<ActiveReadersChart series={{ points: [], peak: null, max: 0, suppressedDays: 2 }} windowLabel="Last 30 days" />)
    expect(screen.getByText(/No visible daily active-reader points/i)).toBeInTheDocument()
    expect(screen.getByText(/2 suppressed day/i)).toBeInTheDocument()
  })
})

describe('RetentionTable', () => {
  const rows: ContractsSchemas['RetentionMetric'][] = [
    { cohortWeek: '2026-10-20', weekIndex: 0, actors: 1240, retained: 1240, rate: 1, suppressed: false },
    { cohortWeek: '2026-10-20', weekIndex: 1, actors: 1240, retained: 769, rate: 0.62, suppressed: false },
  ]

  it('uses a real table with a caption that lists elapsed weeks only', () => {
    render(<RetentionTable grid={retentionGrid(rows)} />)
    const table = screen.getByRole('table', { name: /Weekly retention cohorts/i })
    expect(table).toBeInTheDocument()
    expect(screen.getByText('20 Oct')).toBeInTheDocument()
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0)
  })
})

describe('FunnelBars', () => {
  it('announces a suppressed step instead of a zero', () => {
    render(
      <FunnelBars
        steps={[
          { step: 'Detail viewed', reached: 1240, dropped: null, share: 1 },
          { step: 'Registered', reached: null, dropped: null, share: null },
        ]}
      />,
    )
    expect(screen.getByText('Detail viewed')).toBeInTheDocument()
    expect(screen.getByText(/Suppressed cell/)).toBeInTheDocument()
  })
})

describe('SuppressedMark', () => {
  it('keeps the visible dash but gives screen readers the reason', () => {
    render(<SuppressedMark />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText(/fewer readers than the suppression threshold/i)).toBeInTheDocument()
  })
})
