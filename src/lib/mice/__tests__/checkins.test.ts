import { describe, expect, it } from 'vitest'
import { checkInRecord, reconcileCheckIn } from '../checkins'
import type { CheckIn } from '../types'

const record = (patch: Partial<CheckIn> = {}): CheckIn => ({
  id: 'ci-1',
  registrationId: 'reg-1',
  eventId: 'ev-1',
  checkedInAt: '2026-12-05T08:12:00+03:00',
  method: 'manual',
  ...patch,
})

describe('check-in reconciliation', () => {
  it('keeps the 201 body as the row the counter reads', () => {
    const created = checkInRecord(
      {
        id: 'ci-201',
        registrationId: 'reg-1',
        eventId: 'ev-1',
        checkedInAt: '2026-12-05T08:12:00+03:00',
        method: 'manual',
        attendeeName: 'Demo Attendee',
        duplicate: false,
      },
      { eventId: 'ev-1', registrationId: 'reg-1', method: 'manual' },
    )
    expect(created.id).toBe('ci-201')
    // The event day must come from the server, not the browser clock: the
    // counter is day-scoped, and a wall-clock stamp can fall outside it.
    expect(created.checkedInAt).toBe('2026-12-05T08:12:00+03:00')
  })

  it('falls back to the request when a fixture omits fields', () => {
    const created = checkInRecord(undefined, {
      eventId: 'ev-1',
      registrationId: 'reg-1',
      method: 'staff_override',
    })
    expect(created.registrationId).toBe('reg-1')
    expect(created.eventId).toBe('ev-1')
    expect(created.method).toBe('staff_override')
    expect(created.checkedInAt).toBeTruthy()
  })

  it('adds the created row to a page that a static re-read cannot update', () => {
    const page = { items: [record({ id: 'scanner-row' })], stale: false }
    const next = reconcileCheckIn(
      page,
      record({ id: 'ci-201', checkedInAt: '2026-12-05T09:30:00+03:00' }),
    )
    expect(next.items).toHaveLength(1)
    expect(next.items[0].id).toBe('ci-201')
    expect(next.items[0].checkedInAt).toBe('2026-12-05T09:30:00+03:00')
  })

  it('keeps one row per registration and appends a different attendee', () => {
    const page = { items: [record({ id: 'one' })], stale: false }
    const next = reconcileCheckIn(page, record({ id: 'two', registrationId: 'reg-2' }))
    expect(next.items.map((row) => row.id)).toEqual(['two', 'one'])
  })

  it('tolerates a missing page and preserves the stale flag', () => {
    expect(reconcileCheckIn(undefined, record()).items).toHaveLength(1)
    expect(reconcileCheckIn({ items: [], stale: true }, record()).stale).toBe(
      true,
    )
  })
})
