import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { FilterStateControl } from '../shared'
import type { AnalyticsSectionKey } from '#/lib/analytics/types'

const state = vi.hoisted(() => ({
  filters: { range: '30d', journey: 'all' } as { range: string; journey: string },
}))

vi.mock('#/lib/analytics/store', () => ({
  useAnalytics: () => ({
    filters: state.filters,
    setRange: vi.fn(),
    setJourney: vi.fn(),
    resetFilters: vi.fn(),
    scenario: 'default',
    setScenario: vi.fn(),
  }),
}))

beforeEach(() => {
  state.filters = { range: '30d', journey: 'all' }
})

afterEach(cleanup)

function renderControl(section: AnalyticsSectionKey) {
  return render(<FilterStateControl section={section} />)
}

describe('FilterStateControl', () => {
  it('never offers a telemetry filter on Programme (#388)', () => {
    renderControl('programme')

    expect(screen.queryByLabelText('Date range')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reset filters/ })).not.toBeInTheDocument()
    expect(screen.getByText('No telemetry filter applies to this screen')).toBeInTheDocument()
    // The data-state switcher is the only remaining control.
    expect(screen.getByLabelText('Data state')).toBeInTheDocument()
  })

  it('still hides the range and reset when a filtered range is carried in', () => {
    state.filters = { range: '90d', journey: 'event_registration' }
    renderControl('programme')

    expect(screen.queryByLabelText('Date range')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reset filters/ })).not.toBeInTheDocument()
  })

  it('offers the range and reset where the rollup applies them', () => {
    renderControl('overview')

    expect(screen.getByLabelText('Date range')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reset filters/ })).toBeInTheDocument()
  })
})
