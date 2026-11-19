import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const { fetchApprovers } = vi.hoisted(() => ({ fetchApprovers: vi.fn() }))

vi.mock('#/lib/recognition/approvers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#/lib/recognition/approvers')>()
  return { ...actual, fetchAdjustmentApprovers: fetchApprovers }
})

import { CorrectionDialog } from '../dialogs'
import type { Award } from '#/lib/recognition/types'

const award: Award = {
  id: 'award-1',
  reader: 'Njeri M.',
  ruleKey: 'event.attendance',
  ruleVersion: 3,
  xp: 60,
  event: 'Check-in at Karura',
  status: 'failed',
  attempts: 2,
  at: '2026-11-18T09:00:00Z',
  cause: 'outbox_retry_exhausted',
}

const otherApprover = {
  id: 'super-2',
  name: 'Zawadi Approver',
  email: 'zawadi@example.ke',
  role: 'super_admin',
}

beforeEach(() => {
  fetchApprovers.mockReset()
})

afterEach(cleanup)

function fillEvidence() {
  fireEvent.change(screen.getByLabelText('Support reference'), {
    target: { value: 'SUP-2026-1188' },
  })
  fireEvent.change(screen.getByLabelText('Correction note'), {
    target: { value: 'Checked the check-in evidence and confirmed the award is valid.' },
  })
}

describe('CorrectionDialog second approver', () => {
  it('loads eligible approvers and blocks submit until one is chosen', async () => {
    fetchApprovers.mockResolvedValue([otherApprover])
    const onSubmit = vi.fn()
    render(
      <CorrectionDialog
        open
        onOpenChange={vi.fn()}
        award={award}
        actorId="actor-1"
        onSubmit={onSubmit}
      />
    )

    await waitFor(() => expect(fetchApprovers).toHaveBeenCalledWith({ actorId: 'actor-1' }))
    await screen.findByRole('option', { name: /zawadi approver/i })
    fillEvidence()

    const confirm = screen.getByRole('button', { name: /record credit/i })
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Second approver'), {
      target: { value: otherApprover.id },
    })
    expect(confirm).toBeEnabled()

    fireEvent.click(confirm)
    expect(onSubmit).toHaveBeenCalledWith({
      action: 'credit',
      supportRef: 'SUP-2026-1188',
      note: 'Checked the check-in evidence and confirmed the award is valid.',
      approverId: 'super-2',
    })
  })

  it('cannot submit when no eligible approver exists', async () => {
    fetchApprovers.mockResolvedValue([])
    const onSubmit = vi.fn()
    render(
      <CorrectionDialog
        open
        onOpenChange={vi.fn()}
        award={award}
        actorId="actor-1"
        onSubmit={onSubmit}
      />
    )

    expect(await screen.findByText(/no eligible approver is available/i)).toBeInTheDocument()
    fillEvidence()
    const confirm = screen.getByRole('button', { name: /record credit/i })
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('explains when the approver directory cannot be read', async () => {
    fetchApprovers.mockRejectedValue(new Error('Could not load eligible approvers (Forbidden).'))
    render(
      <CorrectionDialog
        open
        onOpenChange={vi.fn()}
        award={award}
        actorId="actor-1"
        onSubmit={vi.fn()}
      />
    )

    expect(
      await screen.findByText(/could not load eligible approvers \(forbidden\)/i)
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Second approver')).toBeDisabled()
    fillEvidence()
    expect(screen.getByRole('button', { name: /record credit/i })).toBeDisabled()
  })
})
