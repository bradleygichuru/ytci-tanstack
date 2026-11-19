import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ContractGapNote,
  CoverageBar,
  Kpi,
  SectionCard,
  StatusPill,
  VariantStatusPill,
} from '#/components/species/shared'

describe('species shared surfaces', () => {
  it('renders a human status label for contract enums', () => {
    render(<StatusPill status="in_review" />)
    expect(screen.getByText('In review')).toBeTruthy()
  })

  it('keeps an explicit label when the state is a category', () => {
    render(<StatusPill status="rights" label="rights" />)
    expect(screen.getByText('rights')).toBeTruthy()
  })

  it('renders a variant status including stale', () => {
    render(<VariantStatusPill status="stale" />)
    expect(screen.getByText('Stale')).toBeTruthy()
  })

  it('exposes coverage as a progress bar with values', () => {
    render(<CoverageBar value={3} total={7} label="Kiswahili" />)
    const bar = screen.getByRole('progressbar', { name: 'Kiswahili coverage' })
    expect(bar.getAttribute('aria-valuenow')).toBe('3')
    expect(bar.getAttribute('aria-valuemax')).toBe('7')
    expect(screen.getByText('3/7 · 43%')).toBeTruthy()
  })

  it('marks an alert KPI with destructive text and no dead action', () => {
    render(<Kpi label="Rights holds" value={2} foot="2 dependent species" alert />)
    expect(screen.getByText('Rights holds')).toBeTruthy()
    expect(screen.getByText('2 dependent species').className).toContain('text-destructive')
  })

  it('renders a titled section with its actions and children', () => {
    render(
      <SectionCard title="Readiness" description="Blockers" actions={<button>Publish</button>}>
        <p>Checklist body</p>
      </SectionCard>,
    )
    expect(screen.getByRole('heading', { name: 'Readiness' })).toBeTruthy()
    expect(screen.getByText('Blockers')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Publish' })).toBeTruthy()
    expect(screen.getByText('Checklist body')).toBeTruthy()
  })

  it('names a contract gap rather than hiding it', () => {
    render(<ContractGapNote>No species audit endpoint.</ContractGapNote>)
    expect(screen.getByText(/No species audit endpoint/)).toBeTruthy()
  })
})
