/**
 * Pure MICE operations rules.
 *
 * Everything here is deliberately free of React and fetch: capacity floors,
 * publish readiness, agenda conflicts, waitlist order and the event diff are
 * unit-tested and reused by the list, editor and review screens.
 */
import type {
  AccessibilityBlock,
  AccessibilityWrite,
  AccessFieldKey,
  AdminRegistration,
  EventDetail,
  EventSummary,
  EventWrite,
  OrganizerProfile,
  Session,
  StagedRevision,
  TriState,
  Venue,
} from './types'

export const MICE_CLASSES = [
  'meeting',
  'incentive',
  'conference',
  'exhibition',
] as const
export type EventClass = EventSummary['eventClass']

export const EVENT_CLASS_LABEL: Record<EventClass, string> = {
  meeting: 'Meeting',
  incentive: 'Incentive',
  conference: 'Conference',
  exhibition: 'Exhibition',
  community: 'Community',
}

export const TRUST_TIER_LABEL: Record<string, string> = {
  programme_partner: 'YTCI programme partner',
  verified_organizer: 'Verified organizer',
  community_organizer: 'Community organizer',
}

export function isMiceClass(eventClass: string): boolean {
  return (MICE_CLASSES as readonly string[]).includes(eventClass)
}

/** A MICE event needs a verified, unexpired organizer; community events do not. */
export function organizerReadiness(
  eventClass: string,
  organizer: OrganizerProfile | null | undefined,
  now = new Date(),
): { ok: boolean; label: string; tone: 'ok' | 'warn' | 'block' } {
  if (!organizer) {
    return {
      ok: false,
      label: 'No organizer linked. Pick one before saving.',
      tone: 'block',
    }
  }
  const expires = organizer.verificationExpiresAt
    ? new Date(organizer.verificationExpiresAt)
    : null
  const expired = Boolean(expires && expires.getTime() < now.getTime())
  const status = organizer.verificationStatus ?? 'unverified'
  const tier = TRUST_TIER_LABEL[organizer.trustTier] ?? organizer.trustTier

  if (status === 'revoked') {
    return {
      ok: false,
      label: `${tier} · verification revoked: MICE classes cannot be published.`,
      tone: 'block',
    }
  }
  if (status === 'expired' || expired) {
    return {
      ok: false,
      label: `${tier} · renewal overdue: MICE classes cannot be published.`,
      tone: 'block',
    }
  }
  if (status === 'pending') {
    return isMiceClass(eventClass)
      ? {
          ok: false,
          label: `${tier} · verification pending. Community classes only.`,
          tone: 'block',
        }
      : {
          ok: true,
          label: `${tier} · verification pending. Community classes only.`,
          tone: 'warn',
        }
  }
  if (status !== 'verified') {
    return isMiceClass(eventClass)
      ? {
          ok: false,
          label: `${tier} · not verified. MICE classes cannot be published.`,
          tone: 'block',
        }
      : {
          ok: true,
          label: `${tier} · not verified. Community classes only.`,
          tone: 'warn',
        }
  }
  const expiryLabel = expires
    ? `verified, renews ${formatLongDate(organizer.verificationExpiresAt!.slice(0, 10))}`
    : 'verified'
  return { ok: true, label: `${tier} · ${expiryLabel}.`, tone: 'ok' }
}

export function confirmedCount(event: EventSummary): number | null {
  if (typeof event.capacity !== 'number') return null
  if (typeof event.seatsRemaining !== 'number') return null
  return Math.max(0, event.capacity - event.seatsRemaining)
}

/** The capacity floor is the number of confirmed registrations. Never cancel one. */
export function capacityFloor(confirmed: number | null | undefined): number {
  return Math.max(0, confirmed ?? 0)
}

export function capacityIsValid(
  capacity: number | null | undefined,
  confirmed: number | null | undefined,
): boolean {
  if (typeof capacity !== 'number' || Number.isNaN(capacity)) return false
  return capacity >= capacityFloor(confirmed)
}

export type BlockerState = 'block' | 'wait' | 'ok'

export interface ReadinessItem {
  key: string
  label: string
  state: BlockerState
  /** Field the operator must change, used by "Resolve". */
  field?: string
  detail?: string
}

export interface ReadinessInput {
  detail: EventDetail | null
  write: EventWrite
  accessEvidence: string
  revision?: StagedRevision | null
  venue?: Venue | null
  organizer?: OrganizerProfile | null
  confirmed: number | null
  actorName: string
  secondReviewBy?: string
  now?: Date
}

export interface ReadinessResult {
  items: ReadinessItem[]
  blocked: number
  waiting: number
  /** Publish is allowed only when no item blocks. */
  canPublish: boolean
  reason?: string
}

const TRACKED_ACCESS: AccessFieldKey[] = [
  'stepFreeEntrance',
  'accessibleToilet',
  'hearingLoop',
]

export function hasAccessibilityClaim(
  access: AccessibilityWrite | AccessibilityBlock['fields'] | null | undefined,
): boolean {
  if (!access) return false
  return TRACKED_ACCESS.some(
    (key) => (access as Record<string, unknown>)[key] === 'yes',
  )
}

/** Readiness checklist shared by the editor and the review queue. */
export function reviewReadiness(input: ReadinessInput): ReadinessResult {
  const {
    detail,
    write,
    accessEvidence,
    venue,
    organizer,
    confirmed,
    actorName,
    secondReviewBy,
    now,
  } = input
  const items: ReadinessItem[] = []

  if (!write.title.trim()) {
    items.push({
      key: 'title',
      label: 'Title is required',
      state: 'block',
      field: 'title',
    })
  } else {
    items.push({ key: 'title', label: 'Title recorded', state: 'ok' })
  }

  if (!write.eventDate) {
    items.push({
      key: 'date',
      label: 'Start date is required',
      state: 'block',
      field: 'eventDate',
    })
  } else if (write.endDate && write.endDate < write.eventDate) {
    items.push({
      key: 'date',
      label: 'End date is before the start date',
      state: 'block',
      field: 'endDate',
    })
  } else {
    items.push({
      key: 'date',
      label: `Dates: ${formatLongDate(write.eventDate)}${write.endDate ? ` – ${formatLongDate(write.endDate)}` : ''}`,
      state: 'ok',
    })
  }

  const org = organizerReadiness(write.eventClass, organizer, now)
  items.push({
    key: 'organizer',
    label: org.label,
    state: org.tone === 'block' ? 'block' : org.tone === 'warn' ? 'wait' : 'ok',
    field: 'organizerProfileId',
  })

  if (!write.venueId) {
    items.push({
      key: 'venue',
      label: 'No venue linked',
      state: 'block',
      field: 'venueId',
    })
  } else if (
    venue?.capacityInPerson != null &&
    write.capacity != null &&
    write.capacity > venue.capacityInPerson
  ) {
    items.push({
      key: 'venue',
      label: `Venue capacity ${venue.capacityInPerson} is below the requested ${write.capacity}`,
      state: 'block',
      field: 'capacity',
    })
  } else {
    items.push({
      key: 'venue',
      label: `Venue: ${venue?.name ?? 'linked'}`,
      state: 'ok',
    })
  }

  if (!capacityIsValid(write.capacity, confirmed)) {
    items.push({
      key: 'capacity',
      label: `Capacity cannot drop below ${capacityFloor(confirmed)} confirmed registrations`,
      state: 'block',
      field: 'capacity',
    })
  } else {
    items.push({
      key: 'capacity',
      label: `Capacity ${write.capacity} · ${confirmed ?? 0} registered`,
      state: 'ok',
    })
  }

  if (write.registrationMode === 'ticket_handoff') {
    if (!write.priceAmount || !write.priceCurrency) {
      items.push({
        key: 'ticket',
        label: 'Paid handoff needs a price',
        state: 'block',
        field: 'priceAmount',
      })
    } else if (!write.ticketUrl) {
      items.push({
        key: 'ticket',
        label: 'Paid handoff needs an organizer ticket URL',
        state: 'block',
        field: 'ticketUrl',
      })
    } else {
      items.push({
        key: 'ticket',
        label: 'Ticket handoff details recorded',
        state: 'ok',
      })
    }
  } else {
    items.push({
      key: 'ticket',
      label: 'No paid handoff for this registration mode',
      state: 'ok',
    })
  }

  const claim = hasAccessibilityClaim(write.accessibility)
  const unknownField = TRACKED_ACCESS.find(
    (key) =>
      (write.accessibility as Record<string, unknown> | undefined)?.[key] ===
      'unknown',
  )
  if (claim && !accessEvidence.trim()) {
    items.push({
      key: 'accessibility',
      label: 'A “Yes” accessibility claim needs an evidence reference',
      state: 'block',
      field: 'accessibilityEvidence',
    })
  } else {
    if (claim) {
      items.push({
        key: 'accessibility',
        label: `Accessibility claim backed by “${accessEvidence.trim()}”`,
        state: 'ok',
      })
    }
    if (unknownField) {
      items.push({
        key: 'accessibility',
        label: 'Accessibility is still unknown for at least one claim',
        state: 'wait',
        field: 'accessibility',
      })
    } else if (!claim) {
      items.push({
        key: 'accessibility',
        label: 'Accessibility recorded',
        state: 'ok',
      })
    }
  }

  const uploader = input.revision?.submittedBy
  if (uploader && uploader === actorName) {
    items.push({
      key: 'reviewer',
      label: `You (${actorName}) uploaded this event. Another reviewer must publish it.`,
      state: 'block',
    })
  } else if (uploader) {
    items.push({
      key: 'reviewer',
      label: `Reviewer ${actorName} differs from the uploader (${uploader})`,
      state: 'ok',
    })
  } else {
    items.push({
      key: 'reviewer',
      label: 'Uploader not recorded yet',
      state: 'wait',
    })
  }

  if (claim) {
    if (secondReviewBy && secondReviewBy !== actorName) {
      items.push({
        key: 'second',
        label: `Second accessibility review recorded by ${secondReviewBy}`,
        state: 'ok',
      })
    } else if (secondReviewBy) {
      items.push({
        key: 'second',
        label: 'The second reviewer must differ from the current reviewer',
        state: 'block',
      })
    } else {
      items.push({
        key: 'second',
        label: 'Accessibility claim needs a named second reviewer',
        state: 'block',
      })
    }
  }

  if (input.revision?.changedAfterReview) {
    items.push({
      key: 'changed',
      label:
        'The submission changed after review. Send it back for a fresh review.',
      state: 'block',
    })
  }

  const blocked = items.filter((item) => item.state === 'block').length
  const waiting = items.filter((item) => item.state === 'wait').length
  const canPublish = blocked === 0
  const reason = canPublish
    ? undefined
    : (items.find((item) => item.state === 'block')?.label ??
      'Readiness checks are incomplete.')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void detail
  return { items, blocked, waiting, canPublish, reason }
}

export function formatLongDate(value: string | null | undefined): string {
  if (!value) return 'Not set'
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(date)
    .replace(',', '')
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return ''
  const match = /T(\d{2}):(\d{2})/.exec(value)
  return match ? `${match[1]}:${match[2]}` : value
}

export function formatDateRange(
  start: string | null | undefined,
  end?: string | null,
): string {
  if (!start) return 'Not scheduled'
  const startLabel = formatLongDate(start.slice(0, 10))
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return startLabel
  return `${startLabel} – ${formatLongDate(end.slice(0, 10))}`
}

export function dateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

export interface FieldDiff {
  field: string
  label: string
  live: string
  staged: string
}

/** Field-by-field diff between the live record and a staged revision. */
export function eventDiff(detail: EventDetail, write: EventWrite): FieldDiff[] {
  const live = eventToWrite(detail)
  const compare: Array<[keyof EventWrite, string, (value: unknown) => string]> =
    [
      ['title', 'Title', (value) => String(value ?? '')],
      [
        'eventDate',
        'Start date',
        (value) => formatLongDate(String(value ?? '')),
      ],
      [
        'endDate',
        'End date',
        (value) => (value ? formatLongDate(String(value)) : 'Not set'),
      ],
      [
        'venueId',
        'Venue',
        (value) =>
          value ? String(detail.venueDetail?.name ?? value) : 'Not set',
      ],
      [
        'organizerProfileId',
        'Organizer',
        (value) =>
          String(
            value ? (detail.organizerDetail?.displayName ?? value) : 'Not set',
          ),
      ],
      ['capacity', 'Capacity', (value) => String(value ?? 'Not set')],
      [
        'registrationMode',
        'Registration',
        (value) => registrationModeLabel(String(value ?? 'none')),
      ],
      [
        'priceAmount',
        'Price',
        (value) =>
          value == null
            ? 'Not set'
            : `${write.priceCurrency ?? 'KES'} ${value}`,
      ],
      ['ticketUrl', 'Ticket URL', (value) => String(value ?? 'Not set')],
      [
        'accessibility',
        'Accessibility',
        () => accessibilitySummary(write.accessibility),
      ],
    ]

  const diffs: FieldDiff[] = []
  for (const [key, label, render] of compare) {
    const liveValue = render(live[key])
    const stagedValue = render(write[key])
    if (liveValue !== stagedValue) {
      diffs.push({
        field: String(key),
        label,
        live: liveValue,
        staged: stagedValue,
      })
    }
  }
  return diffs
}

export function accessibilitySummary(
  access: AccessibilityWrite | AccessibilityBlock['fields'] | null | undefined,
): string {
  if (!access) return 'Not recorded'
  const parts = TRACKED_ACCESS.map((key) => {
    const value = (access as Record<string, unknown>)[key] as
      TriState | undefined
    return value ? `${ACCESS_LABELS[key]}: ${value}` : null
  }).filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Not recorded'
}

export const ACCESS_LABELS: Record<AccessFieldKey, string> = {
  stepFreeEntrance: 'Step-free entrance',
  stepFreeRoute: 'Step-free route',
  accessibleToilet: 'Accessible toilet',
  accessibleParking: 'Accessible parking',
  accessibleSeating: 'Accessible seating',
  captioning: 'Captioning',
  signLanguage: 'Sign language',
  hearingLoop: 'Assistive listening',
  quietRoom: 'Quiet room',
  assistanceDogs: 'Assistance dogs',
}

export function registrationModeLabel(mode: string): string {
  if (mode === 'ticket_handoff') return 'Ticket handoff'
  if (mode === 'rsvp') return 'RSVP'
  return 'None'
}

/** Convert an API detail into the editable write shape. */
export function eventToWrite(detail: EventDetail): EventWrite {
  const access = detail.accessibilityDetail?.fields
  return {
    title: detail.title,
    organizerProfileId: detail.organizerDetail?.id ?? undefined,
    venueId: detail.venueDetail?.id ?? undefined,
    eventClass: detail.eventClass,
    format: detail.format,
    access: detail.access,
    type: EVENT_CLASS_LABEL[detail.eventClass] ?? 'Event',
    eventDate: detail.startsAt.slice(0, 10),
    endDate: detail.endsAt ? detail.endsAt.slice(0, 10) : null,
    startTime: formatTime(detail.startsAt),
    endTime: detail.endsAt ? formatTime(detail.endsAt) : undefined,
    timezone: detail.timezone,
    description: detail.description ?? undefined,
    capacity: detail.capacity ?? null,
    waitlistCapacity: detail.waitlistOpen ? null : 0,
    registrationMode: detail.registrationMode ?? 'none',
    priceAmount: detail.price?.amount ?? null,
    priceCurrency: detail.price?.currency ?? null,
    salesEnd: detail.sales?.salesEnd ?? null,
    ticketUrl: detail.sales?.ticketUrl ?? null,
    accessibility: access
      ? {
          stepFreeEntrance: access.stepFreeEntrance,
          stepFreeRoute: access.stepFreeRoute,
          accessibleToilet: access.accessibleToilet,
          accessibleParking: access.accessibleParking,
          accessibleSeating: access.accessibleSeating,
          captioning: access.captioning,
          signLanguage: access.signLanguage,
          hearingLoop: access.hearingLoop,
          quietRoom: access.quietRoom,
          assistanceDogs: access.assistanceDogs,
          companionTicketPolicy: access.companionTicketPolicy ?? undefined,
          contentNotes: access.contentNotes ?? undefined,
        }
      : undefined,
  }
}

export interface SessionConflict {
  sessionId: string
  withSessionId: string
  reason: string
}

/** Overlap in the same room, or a speaker double-booked across rooms. */
export function findSessionConflicts(sessions: Session[]): SessionConflict[] {
  const conflicts: SessionConflict[] = []
  const sorted = [...sessions].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  )
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const a = sorted[i]
      const b = sorted[j]
      const overlaps = a.startsAt < b.endsAt && b.startsAt < a.endsAt
      if (!overlaps) continue
      if (a.room && b.room && a.room === b.room) {
        conflicts.push({
          sessionId: a.id,
          withSessionId: b.id,
          reason: `Room ${a.room} is double-booked`,
        })
        continue
      }
      const aSpeakers = new Set(
        (a.speakers ?? []).map((speaker) => speaker.id ?? speaker.displayName),
      )
      const shared = (b.speakers ?? []).find((speaker) =>
        aSpeakers.has(speaker.id ?? speaker.displayName),
      )
      if (shared) {
        conflicts.push({
          sessionId: a.id,
          withSessionId: b.id,
          reason: `${shared.displayName} is booked in two sessions`,
        })
      }
    }
  }
  return conflicts
}

export function sessionConflictFor(
  conflicts: SessionConflict[],
  sessionId: string,
): SessionConflict | undefined {
  return conflicts.find(
    (conflict) =>
      conflict.sessionId === sessionId || conflict.withSessionId === sessionId,
  )
}

export interface OrderedRegistration {
  registration: AdminRegistration
  waitlistPosition: number | null
}

/** FIFO: explicit positions first, then creation time. */
export function orderWaitlist(
  registrations: AdminRegistration[],
): OrderedRegistration[] {
  return registrations
    .map((registration) => ({
      registration,
      waitlistPosition: registration.waitlistPosition ?? null,
    }))
    .sort((a, b) => {
      const aPos = a.waitlistPosition ?? Number.MAX_SAFE_INTEGER
      const bPos = b.waitlistPosition ?? Number.MAX_SAFE_INTEGER
      if (aPos !== bPos) return aPos - bPos
      return a.registration.createdAt.localeCompare(b.registration.createdAt)
    })
    .map((entry, index) => ({
      registration: entry.registration,
      waitlistPosition: entry.waitlistPosition ?? index + 1,
    }))
}

export function attendeeName(registration: AdminRegistration): string {
  return (
    registration.attendee?.displayName?.trim() ||
    `Registration ${registration.id.slice(0, 8)}`
  )
}

export function attendeeEmail(registration: AdminRegistration): string {
  return registration.attendee?.email ?? ''
}

export function reportAgeHours(createdAt: string, now = new Date()): number {
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return 0
  return Math.max(
    0,
    Math.round((now.getTime() - created.getTime()) / 3_600_000),
  )
}

export function reportTarget(
  createdAt: string,
  now = new Date(),
): { tone: 'ok' | 'warn' | 'late'; label: string } {
  const age = reportAgeHours(createdAt, now)
  if (age >= 48)
    return { tone: 'late', label: `${age}h old · past the 48h target` }
  if (age >= 24)
    return { tone: 'warn', label: `${age}h old · ${48 - age}h to target` }
  return { tone: 'ok', label: `${age}h old · ${48 - age}h to target` }
}

export function daysForEvent(
  detail: EventDetail | null | undefined,
  sessions: Session[],
): string[] {
  const days = new Set<string>()
  for (const session of sessions) days.add(session.day)
  if (detail) {
    days.add(detail.startsAt.slice(0, 10))
    if (detail.endsAt) days.add(detail.endsAt.slice(0, 10))
  }
  return [...days].sort()
}

export function nextInQueue<T>(
  items: T[],
  current: T | null,
  key: (item: T) => string,
): T | null {
  if (items.length === 0) return null
  const index = current
    ? items.findIndex((item) => key(item) === key(current))
    : -1
  if (index < 0) return items[0]
  return items[(index + 1) % items.length] ?? items[0]
}

export function previousInQueue<T>(
  items: T[],
  current: T | null,
  key: (item: T) => string,
): T | null {
  if (items.length === 0) return null
  const index = current
    ? items.findIndex((item) => key(item) === key(current))
    : -1
  if (index < 0) return items[items.length - 1] ?? items[0]
  return items[(index - 1 + items.length) % items.length] ?? items[0]
}
