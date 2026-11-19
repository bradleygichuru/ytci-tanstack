import { describe, expect, it } from 'vitest'
import {
  capacityFloor,
  capacityIsValid,
  eventDiff,
  eventToWrite,
  findSessionConflicts,
  formatLongDate,
  nextInQueue,
  orderWaitlist,
  organizerReadiness,
  previousInQueue,
  reportTarget,
  reviewReadiness,
} from '../workflow'
import type {
  AdminRegistration,
  EventDetail,
  EventWrite,
  OrganizerProfile,
  Session,
} from '../types'

const organizer = (
  patch: Partial<OrganizerProfile> = {},
): OrganizerProfile => ({
  slug: 'partner',
  displayName: 'Nairobi Convention Bureau',
  trustTier: 'programme_partner',
  label: 'YTCI programme partner',
  id: 'org-1',
  verificationStatus: 'verified',
  verificationExpiresAt: '2027-02-01T09:00:00Z',
  ...patch,
})

const baseWrite = (patch: Partial<EventWrite> = {}): EventWrite => ({
  title: 'Great Lakes Tourism Forum',
  eventClass: 'conference',
  format: 'hybrid',
  access: 'registered',
  type: 'Conference',
  eventDate: '2026-12-05',
  endDate: '2026-12-06',
  timezone: 'Africa/Nairobi',
  capacity: 400,
  registrationMode: 'rsvp',
  venueId: 'venue-1',
  organizerProfileId: 'org-1',
  accessibility: {
    stepFreeEntrance: 'yes',
    stepFreeRoute: 'yes',
    accessibleToilet: 'yes',
    hearingLoop: 'yes',
  },
  ...patch,
})

describe('capacity floor', () => {
  it('never allows a capacity below the confirmed count', () => {
    expect(capacityFloor(239)).toBe(239)
    expect(capacityIsValid(238, 239)).toBe(false)
    expect(capacityIsValid(239, 239)).toBe(true)
    expect(capacityIsValid(400, 239)).toBe(true)
  })

  it('treats a missing confirmed count as zero, not as unlimited', () => {
    expect(capacityFloor(null)).toBe(0)
    expect(capacityIsValid(0, null)).toBe(true)
  })
})

describe('organizer readiness', () => {
  it('passes a verified, unexpired organizer for a MICE class', () => {
    expect(organizerReadiness('conference', organizer()).ok).toBe(true)
  })

  it('blocks a MICE class when the organizer is pending', () => {
    const result = organizerReadiness(
      'conference',
      organizer({ verificationStatus: 'pending' }),
    )
    expect(result.ok).toBe(false)
    expect(result.label).toContain('Community classes only')
  })

  it('blocks a MICE class when the renewal has lapsed', () => {
    const result = organizerReadiness(
      'meeting',
      organizer({ verificationExpiresAt: '2025-01-01T00:00:00Z' }),
    )
    expect(result.ok).toBe(false)
    expect(result.label).toContain('renewal overdue')
  })

  it('allows a community event with a pending organizer', () => {
    expect(
      organizerReadiness(
        'community',
        organizer({ verificationStatus: 'pending' }),
      ).ok,
    ).toBe(true)
  })
})

describe('review readiness', () => {
  const base = {
    detail: null,
    write: baseWrite(),
    accessEvidence: 'Site inspection 12 Nov 2026',
    confirmed: 239,
    actorName: 'Amina Hassan',
    secondReviewBy: 'Dr. Wanjiku Mwangi',
    organizer: organizer(),
    venue: {
      slug: 'kicc',
      name: 'KICC',
      county: 'Nairobi',
      capacityInPerson: 5000,
    },
  }

  it('publishes when every blocking item is clear', () => {
    const result = reviewReadiness({
      ...base,
      revision: {
        eventId: 'ev-1',
        write: baseWrite(),
        accessibilityEvidence: 'Site inspection',
        status: 'in_review',
        submittedBy: 'Brian Otieno',
      },
    })
    expect(result.canPublish).toBe(true)
  })

  it('blocks when the actor is the uploader', () => {
    const result = reviewReadiness({
      ...base,
      revision: {
        eventId: 'ev-1',
        write: baseWrite(),
        accessibilityEvidence: 'Site inspection',
        status: 'in_review',
        submittedBy: 'Amina Hassan',
      },
    })
    expect(result.canPublish).toBe(false)
    expect(result.reason).toContain('uploaded this event')
  })

  it('blocks an accessibility claim without evidence', () => {
    const result = reviewReadiness({
      ...base,
      accessEvidence: '',
      revision: {
        eventId: 'ev-1',
        write: baseWrite(),
        accessibilityEvidence: '',
        status: 'in_review',
        submittedBy: 'Brian Otieno',
      },
    })
    expect(result.canPublish).toBe(false)
    expect(
      result.items.some(
        (item) => item.key === 'accessibility' && item.state === 'block',
      ),
    ).toBe(true)
  })

  it('requires a second reviewer for an accessibility claim', () => {
    const result = reviewReadiness({
      ...base,
      secondReviewBy: undefined,
      revision: {
        eventId: 'ev-1',
        write: baseWrite(),
        accessibilityEvidence: 'Site inspection',
        status: 'in_review',
        submittedBy: 'Brian Otieno',
      },
    })
    expect(result.canPublish).toBe(false)
    expect(
      result.items.some(
        (item) => item.key === 'second' && item.state === 'block',
      ),
    ).toBe(true)
  })

  it('blocks a capacity below the confirmed floor', () => {
    const result = reviewReadiness({
      ...base,
      write: baseWrite({ capacity: 100 }),
      confirmed: 239,
      revision: {
        eventId: 'ev-1',
        write: baseWrite({ capacity: 100 }),
        accessibilityEvidence: 'Site inspection',
        status: 'in_review',
        submittedBy: 'Brian Otieno',
      },
    })
    expect(result.canPublish).toBe(false)
    expect(
      result.items.some(
        (item) => item.key === 'capacity' && item.state === 'block',
      ),
    ).toBe(true)
  })

  it('allows a published revision even when a non-blocking wait item exists', () => {
    const write = baseWrite({
      accessibility: { ...baseWrite().accessibility, hearingLoop: 'unknown' },
    })
    const result = reviewReadiness({
      ...base,
      write,
      revision: {
        eventId: 'ev-1',
        write,
        accessibilityEvidence: 'Site inspection',
        status: 'in_review',
        submittedBy: 'Brian Otieno',
      },
    })
    expect(result.waiting).toBeGreaterThan(0)
    expect(result.canPublish).toBe(true)
  })
})

describe('event diff', () => {
  const detail = {
    id: 'ev-1',
    title: 'Great Lakes Tourism Forum',
    eventClass: 'conference',
    format: 'hybrid',
    access: 'registered',
    status: 'published',
    startsAt: '2026-12-05T08:00:00+03:00',
    endsAt: '2026-12-06T17:00:00+03:00',
    timezone: 'Africa/Nairobi',
    county: 'Nairobi',
    capacity: 400,
    venue: { slug: 'kicc', name: 'KICC', county: 'Nairobi' },
    accessibility: { state: 'reported' },
  } satisfies EventDetail

  it('converts a detail into an editable write', () => {
    const write = eventToWrite(detail)
    expect(write.eventDate).toBe('2026-12-05')
    expect(write.capacity).toBe(400)
    expect(write.registrationMode).toBe('none')
  })

  it('reports only changed fields', () => {
    const write = {
      ...eventToWrite(detail),
      capacity: 450,
      title: 'Forum 2026',
    }
    const diff = eventDiff(detail, write)
    expect(diff.some((row) => row.field === 'capacity')).toBe(true)
    expect(diff.some((row) => row.field === 'title')).toBe(true)
    expect(diff.some((row) => row.field === 'eventDate')).toBe(false)
  })
})

describe('agenda conflicts', () => {
  const session = (patch: Partial<Session>): Session => ({
    id: 's1',
    day: '2026-12-05',
    startsAt: '2026-12-05T09:00:00+03:00',
    endsAt: '2026-12-05T10:00:00+03:00',
    title: 'Opening',
    room: 'Tsavo',
    speakers: [],
    ...patch,
  })

  it('detects a double-booked room', () => {
    const conflicts = findSessionConflicts([
      session({}),
      session({
        id: 's2',
        title: 'Second',
        startsAt: '2026-12-05T09:30:00+03:00',
        endsAt: '2026-12-05T10:30:00+03:00',
      }),
    ])
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].reason).toContain('double-booked')
  })

  it('detects a double-booked speaker in another room', () => {
    const speaker = { id: 'p1', displayName: 'Dr. Amina' }
    const conflicts = findSessionConflicts([
      session({ speakers: [speaker] }),
      session({
        id: 's2',
        title: 'Second',
        room: 'Lenana',
        startsAt: '2026-12-05T09:30:00+03:00',
        endsAt: '2026-12-05T10:30:00+03:00',
        speakers: [speaker],
      }),
    ])
    expect(conflicts[0].reason).toContain('booked in two sessions')
  })

  it('ignores back-to-back sessions in the same room', () => {
    const conflicts = findSessionConflicts([
      session({}),
      session({
        id: 's2',
        startsAt: '2026-12-05T10:00:00+03:00',
        endsAt: '2026-12-05T11:00:00+03:00',
      }),
    ])
    expect(conflicts).toHaveLength(0)
  })
})

describe('waitlist order', () => {
  const registration = (
    id: string,
    createdAt: string,
    waitlistPosition: number | null,
  ): AdminRegistration => ({
    id,
    eventId: 'ev-1',
    status: 'waitlisted',
    createdAt,
    waitlistPosition,
  })

  it('orders by explicit position, then creation time', () => {
    const ordered = orderWaitlist([
      registration('c', '2026-11-03T10:00:00Z', null),
      registration('b', '2026-11-02T10:00:00Z', 1),
      registration('a', '2026-11-01T10:00:00Z', null),
    ])
    expect(ordered.map((row) => row.registration.id)).toEqual(['b', 'a', 'c'])
    expect(ordered.map((row) => row.waitlistPosition)).toEqual([1, 2, 3])
  })
})

describe('queue navigation and report age', () => {
  it('wraps next and previous', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(nextInQueue(items, items[2], (item) => item.id)?.id).toBe('a')
    expect(previousInQueue(items, items[0], (item) => item.id)?.id).toBe('c')
  })

  it('marks 48 hours or more as late', () => {
    const now = new Date('2026-11-19T12:00:00Z')
    expect(reportTarget('2026-11-17T11:00:00Z', now).tone).toBe('late')
    expect(reportTarget('2026-11-18T20:00:00Z', now).tone).toBe('ok')
  })

  it('formats dates in the en-GB long form used by the echo', () => {
    expect(formatLongDate('2026-11-18')).toBe('Wed 18 Nov 2026')
  })
})
