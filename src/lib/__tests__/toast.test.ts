import { describe, expect, it } from 'vitest'
import { ContractsApiError } from '#/lib/contracts/client'
import { errorMessage } from '#/lib/toast'

describe('toast error copy', () => {
  it('uses the frozen envelope message', () => {
    expect(
      errorMessage(new ContractsApiError(409, 'EVENT_CAPACITY_FULL', 'No places left')),
    ).toBe('No places left')
  })

  it('summarises field errors first', () => {
    expect(
      errorMessage(
        new ContractsApiError(400, 'VALIDATION_FAILED', 'Invalid request', {
          fieldErrors: [
            { field: 'title', message: 'required' },
            { field: 'startsAt', message: 'must be in the future' },
          ],
        }),
      ),
    ).toBe('title: required, startsAt: must be in the future')
  })

  it('falls back for unknown error shapes', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage('nope')).toBe('nope')
    expect(errorMessage(undefined)).toBe('Something went wrong. Try again.')
  })
})
