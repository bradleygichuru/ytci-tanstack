import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { FilterStateControl } from '../shared'

// Production builds must never expose the fixture switcher.
vi.mock('#/lib/env', () => ({ dataStatesAllowed: () => false }))

vi.mock('#/lib/analytics/store', () => ({
  useAnalytics: () => ({
    filters: { range: '30d', journey: 'all' },
    setRange: vi.fn(),
    setJourney: vi.fn(),
    resetFilters: vi.fn(),
    scenario: 'default',
    setScenario: vi.fn(),
  }),
}))

afterEach(cleanup)

describe('FilterStateControl in a production build', () => {
  it('hides the data-state switcher', () => {
    render(<FilterStateControl section="overview" />)
    expect(screen.queryByLabelText('Data state')).not.toBeInTheDocument()
    expect(screen.queryByTestId('analytics-fixture-state')).not.toBeInTheDocument()
  })
})
