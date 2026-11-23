import { describe, expect, it } from 'vitest'
import { checkInRecord, reconcileCheckIn } from '../checkins'

describe('check-in reconciliation', () => {
  it('uses the operator method even when a static payload echoes qr', () => {
    const record = checkInRecord(
      {
        id: 'ci-1',
        registrationId: 'reg-1',
        eventId: 'event-1',
        checkedInAt: '2026-12-05T08:12:00+03:00',
        method: 'qr',
      },
      { eventId: 'event-1', registrationId: 'reg-1', method: 'manual' },
    )
    expect(record.method).toBe('manual')
  })

  it('replaces an existing row for the same registration', () => {
    const page = {
      items: [
        {
          id: 'ci-old',
          registrationId: 'reg-1',
          eventId: 'event-1',
          checkedInAt: '2026-12-05T08:00:00+03:00',
          method: 'qr' as const,
        },
      ],
      stale: false,
    }
    const merged = reconcileCheckIn(page, {
      id: 'ci-new',
      registrationId: 'reg-1',
      eventId: 'event-1',
      checkedInAt: '2026-12-05T08:12:00+03:00',
      method: 'manual',
    })
    expect(merged.items).toHaveLength(1)
    expect(merged.items[0].id).toBe('ci-new')
  })
})
