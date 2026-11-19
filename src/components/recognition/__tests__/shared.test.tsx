import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { BoardRows, RuleDiff } from '#/components/recognition/shared'
import type { BoardRow } from '#/lib/recognition/types'

afterEach(cleanup)

describe('RuleDiff', () => {
  it('renders live and staged values with a field label', () => {
    render(
      <RuleDiff
        rows={[
          { field: 'XP', live: '50', staged: '75' },
          { field: 'Effective date', live: '2026-10-01', staged: '2026-12-01' },
        ]}
      />
    )
    expect(screen.getByText('XP')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('2026-12-01')).toBeInTheDocument()
  })

  it('explains an empty diff instead of rendering empty rows', () => {
    render(<RuleDiff rows={[]} />)
    expect(screen.getByText(/no staged changes yet/i)).toBeInTheDocument()
  })
})

describe('BoardRows', () => {
  const rows: BoardRow[] = [
    {
      rank: 1,
      displayName: 'Njeri M.',
      county: 'Nairobi',
      level: 'Keeper',
      xp: 4820,
      verifiedSites: 18,
      trailCompletions: 6,
      status: 'active',
    },
    {
      rank: 0,
      displayName: 'TrailKing',
      county: null,
      level: 'Scout',
      xp: 900,
      verifiedSites: 2,
      trailCompletions: 0,
      status: 'retracted',
      retractedReason: 'Impersonation confirmed',
    },
  ]

  it('keeps retracted rows visible with a restore action', () => {
    const onRestore = vi.fn()
    render(<BoardRows rows={rows} closed={false} onRetract={vi.fn()} onRestore={onRestore} />)
    expect(screen.getByText('Njeri M.')).toBeInTheDocument()
    expect(screen.getByText('TrailKing')).toBeInTheDocument()
    expect(screen.getByText(/impersonation confirmed/i)).toBeInTheDocument()

    const restore = screen.getByRole('button', { name: /restore trailking/i })
    fireEvent.click(restore)
    expect(onRestore).toHaveBeenCalledWith(rows[1])
  })

  it('reserves danger styling for the confirmation, not every row', () => {
    const onRetract = vi.fn()
    render(<BoardRows rows={rows} closed={false} onRetract={onRetract} onRestore={vi.fn()} />)

    // The row carries a neutral Manage affordance; the confirmation dialog
    // owned by the route is the only place a destructive action is styled.
    expect(screen.queryByRole('button', { name: /^retract$/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /manage njeri m\./i }))
    expect(onRetract).toHaveBeenCalledWith(rows[0])
  })

  it('disables row actions on a closed season', () => {
    render(<BoardRows rows={rows} closed onRetract={vi.fn()} onRestore={vi.fn()} />)
    expect(screen.getByRole('button', { name: /manage njeri m\./i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /restore trailking/i })).toBeDisabled()
  })
})
