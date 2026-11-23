/**
 * MICE operations store.
 *
 * Reads live in TanStack Query against the contracts client; the review
 * lifecycle, local audit trail and the few actions 1.0.0 has no endpoint for are
 * persisted here. Every local action still writes an audit row, and every action
 * the contract does expose goes to the API first.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '#/lib/auth-client'
import { unwrap, type FixtureState } from '#/lib/contracts/client'
import { useContractRole } from '#/lib/contracts/session'
import { notify } from '#/lib/toast'
import {
  useMiceAudit,
  useMiceCheckIns,
  useMiceClient,
  useMiceEvent,
  useMiceEvents,
  useMiceOrganizers,
  useMiceRegistrations,
  useMiceReports,
  useMiceVenues,
  miceKeys,
  type PageResult,
} from './api'
import { eventToWrite } from './workflow'
import { checkInRecord, reconcileCheckIn } from './checkins'
import type {
  AdminRegistration,
  AuditEntry,
  CheckIn,
  EventDetail,
  EventReport,
  EventWrite,
  LifecycleState,
  MiceLocalState,
  OrganizerNote,
  OrganizerProfile,
  ReportAssignment,
  StagedRevision,
  Venue,
  VenueEvidence,
  VenueWrite,
  WaitlistOffer,
} from './types'

const STORAGE_KEY = 'ytci.mice.workflow.v1'

export function emptyLocalState(): MiceLocalState {
  return {
    revisions: {},
    audit: [],
    venueEvidence: {},
    venueRetired: {},
    organizerNotes: {},
    reportAssignments: {},
    reviewAssignments: {},
  }
}

function readLocalState(): MiceLocalState {
  if (typeof localStorage === 'undefined') return emptyLocalState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyLocalState()
    const parsed = JSON.parse(raw) as Partial<MiceLocalState>
    return { ...emptyLocalState(), ...parsed }
  } catch {
    return emptyLocalState()
  }
}

function writeLocalState(state: MiceLocalState): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be full or blocked; the session still works in memory.
  }
}

function auditId(): string {
  return `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export interface MiceStoreValue {
  fixtureState: FixtureState
  setFixtureState: (state: FixtureState) => void
  isStale: boolean
  actorName: string
  actorRole: string
  client: ReturnType<typeof useMiceClient>
  local: MiceLocalState
  eventsQuery: ReturnType<typeof useMiceEvents>
  eventQuery: ReturnType<typeof useMiceEvent>
  venuesQuery: ReturnType<typeof useMiceVenues>
  organizersQuery: ReturnType<typeof useMiceOrganizers>
  reportsQuery: ReturnType<typeof useMiceReports>
  registrationsQuery: ReturnType<typeof useMiceRegistrations>
  checkInsQuery: ReturnType<typeof useMiceCheckIns>
  auditQuery: ReturnType<typeof useMiceAudit>
  events: NonNullable<ReturnType<typeof useMiceEvents>['data']>['items']
  venues: Venue[]
  organizers: OrganizerProfile[]
  reports: EventReport[]
  registrations: AdminRegistration[]
  checkIns: CheckIn[]
  selectedEventId: string | null
  selectEvent: (eventId: string) => void
  revisionFor: (eventId: string) => StagedRevision | undefined
  saveRevision: (eventId: string, write: EventWrite, evidence: string) => void
  submitRevision: (eventId: string) => void
  withdrawRevision: (eventId: string) => void
  recordSecondReview: (eventId: string, by: string, note: string) => void
  markChangedAfterReview: (eventId: string) => void
  publishRevision: (eventId: string) => Promise<boolean>
  createEvent: (write: EventWrite) => Promise<EventDetail | null>
  setLifecycle: (
    eventId: string,
    state: LifecycleState,
    reason: string,
  ) => Promise<boolean>
  addAudit: (
    entry: Omit<AuditEntry, 'id' | 'at' | 'actor' | 'role'> & {
      actor?: string
      role?: string
    },
  ) => void
  sendOffer: (
    eventId: string,
    registration: AdminRegistration,
  ) => Promise<WaitlistOffer | null>
  withdrawOffer: (eventId: string, registrationId: string) => Promise<boolean>
  acceptOffer: (eventId: string, registrationId: string) => Promise<boolean>
  overrideRegistration: (
    eventId: string,
    registrationId: string,
    patch: {
      status?: 'confirmed' | 'waitlisted' | 'cancelled'
      answers?: Record<string, string>
      reason: string
    },
  ) => Promise<boolean>
  cancelRegistration: (
    eventId: string,
    registration: AdminRegistration,
    reason: string,
  ) => Promise<boolean>
  checkIn: (
    eventId: string,
    registration: AdminRegistration,
    options?: {
      override?: boolean
      reason?: string
      method?: 'qr' | 'manual' | 'staff_override'
    },
  ) => Promise<boolean>
  undoCheckIn: (
    eventId: string,
    checkInId: string,
    reason: string,
  ) => Promise<boolean>
  setVenueEvidence: (
    venueId: string,
    fields: VenueEvidence['fields'],
    note: string,
  ) => void
  retireVenue: (venueId: string, mergedInto?: string, reason?: string) => void
  saveVenue: (venueId: string | null, write: VenueWrite) => Promise<boolean>
  decideOrganizer: (
    organizer: OrganizerProfile,
    action: 'verify' | 'reject' | 'revoke' | 'restore' | 'expire',
    reason: string,
    expiresAt?: string | null,
  ) => Promise<boolean>
  noteOrganizer: (organizerId: string, patch: Partial<OrganizerNote>) => void
  assignReport: (reportId: string, assignedTo: string) => void
  escalateReport: (reportId: string) => void
  assignReview: (eventId: string, assignedTo: string) => void
  decideReport: (
    report: EventReport,
    decision: 'resolve' | 'dismiss' | 'revoke_organizer',
    note: string,
  ) => Promise<boolean>
  createSession: (
    eventId: string,
    body: Record<string, unknown>,
  ) => Promise<boolean>
  updateSession: (
    eventId: string,
    sessionId: string,
    body: Record<string, unknown>,
  ) => Promise<boolean>
  createSpeaker: (
    eventId: string,
    body: Record<string, unknown>,
    sessionId?: string,
  ) => Promise<boolean>
  setSpeakerConsent: (
    eventId: string,
    personId: string,
    consent: 'pending' | 'granted' | 'declined',
  ) => Promise<boolean>
  removeSpeaker: (eventId: string, personId: string) => Promise<boolean>
  resetLocal: () => void
}

export const MiceContext = createContext<MiceStoreValue | null>(null)

function useStoredState(): [
  MiceLocalState,
  (updater: (current: MiceLocalState) => MiceLocalState) => void,
] {
  const [state, setState] = useState<MiceLocalState>(readLocalState)

  useEffect(() => {
    writeLocalState(state)
  }, [state])

  const update = useCallback(
    (updater: (current: MiceLocalState) => MiceLocalState) => {
      setState((current) => updater(current))
    },
    [],
  )

  return [state, update]
}

export function MiceProvider({ children }: { children: ReactNode }) {
  const [fixtureState, setFixtureState] = useState<FixtureState>('default')
  const [local, updateLocal] = useStoredState()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const client = useMiceClient(fixtureState)
  const queryClient = useQueryClient()
  const { role } = useContractRole()
  const { data: session } = authClient.useSession()

  const actorName =
    session?.user?.name?.trim() ||
    session?.user?.email?.split('@')[0] ||
    'Administrator'
  const actorRole = role

  const eventsQuery = useMiceEvents(fixtureState)
  const venuesQuery = useMiceVenues(fixtureState)
  const organizersQuery = useMiceOrganizers(fixtureState)
  const reportsQuery = useMiceReports(fixtureState)

  const events = eventsQuery.data?.items ?? []
  const venues = venuesQuery.data?.items ?? []
  const organizers = organizersQuery.data?.items ?? []
  const reports = reportsQuery.data?.items ?? []

  const resolvedEventId = selectedEventId ?? events[0]?.id ?? null
  const eventQuery = useMiceEvent(resolvedEventId, fixtureState)
  const registrationsQuery = useMiceRegistrations(resolvedEventId, fixtureState)
  const checkInsQuery = useMiceCheckIns(resolvedEventId, fixtureState)
  const auditQuery = useMiceAudit(fixtureState)

  const registrations = registrationsQuery.data?.items ?? []
  const checkIns = checkInsQuery.data?.items ?? []
  const isStale = fixtureState === 'stale' || Boolean(eventsQuery.data?.stale)

  const staleRef = useRef(false)
  staleRef.current = fixtureState === 'stale'
  const blockIfStale = useCallback(() => {
    if (!staleRef.current) return false
    notify.warning(
      'Writes are disabled on a stale snapshot. Use live data to continue.',
    )
    return true
  }, [])

  const addAudit = useCallback(
    (
      entry: Omit<AuditEntry, 'id' | 'at' | 'actor' | 'role'> & {
        actor?: string
        role?: string
      },
    ) => {
      updateLocal((current) => ({
        ...current,
        audit: [
          {
            ...entry,
            id: auditId(),
            at: new Date().toISOString(),
            actor: entry.actor ?? actorName,
            role: entry.role ?? actorRole,
          },
          ...current.audit,
        ].slice(0, 500),
      }))
    },
    [actorName, actorRole, updateLocal],
  )

  // Seed one realistic review item so the queue is never an empty prototype.
  useEffect(() => {
    if (fixtureState !== 'default' || local.seeded || !eventQuery.data) return
    const detail = eventQuery.data
    const write = eventToWrite(detail)
    const submittedAt = new Date(Date.now() - 2 * 86_400_000).toISOString()
    updateLocal((current) => {
      if (current.seeded) return current
      return {
        ...current,
        seeded: true,
        revisions: {
          ...current.revisions,
          [detail.id]: {
            eventId: detail.id,
            write: {
              ...write,
              capacity: (write.capacity ?? 0) + 50,
              description:
                `${write.description ?? ''} Programme partners and county tourism teams join the closing session.`.trim(),
            },
            accessibilityEvidence:
              'Site inspection 12 Nov 2026 · Nairobi Convention Bureau',
            status: 'in_review',
            submittedAt,
            submittedBy: 'Brian Otieno',
            note: 'Adds the closing plenary and raises capacity for the partner delegation.',
          },
        },
        audit: [
          {
            id: auditId(),
            at: submittedAt,
            actor: 'Brian Otieno',
            role: 'content_editor',
            action: 'Event submitted for review',
            entity: detail.title,
            detail: 'Revision of a published event · 1 change set',
            category: 'events',
          },
          {
            id: auditId(),
            at: new Date(Date.now() - 4 * 86_400_000).toISOString(),
            actor: 'System',
            role: 'system',
            action: 'Nightly rollup completed',
            entity: '6 published events',
            detail: '18 in production · no failures',
            category: 'system',
          },
          {
            id: auditId(),
            at: new Date(Date.now() - 2 * 86_400_000 + 3_600_000).toISOString(),
            actor: 'Amina Hassan',
            role: 'administrator',
            action: 'Accessibility evidence added',
            entity: detail.venue?.name ?? 'Venue',
            detail: 'Step-free entrance: Unknown → Yes',
            category: 'events',
          },
          ...current.audit,
        ],
      }
    })
  }, [eventQuery.data, fixtureState, local.seeded, updateLocal])

  const revisionFor = useCallback(
    (eventId: string) => local.revisions[eventId],
    [local.revisions],
  )

  const saveRevision = useCallback(
    (eventId: string, write: EventWrite, evidence: string) => {
      if (blockIfStale()) return
      updateLocal((current) => {
        const existing = current.revisions[eventId]
        const revision: StagedRevision = {
          eventId,
          write,
          accessibilityEvidence: evidence,
          status: existing?.status === 'in_review' ? 'in_review' : 'draft',
          submittedAt: existing?.submittedAt,
          submittedBy: existing?.submittedBy,
          secondReview: existing?.secondReview,
          changedAfterReview:
            existing?.status === 'in_review'
              ? true
              : existing?.changedAfterReview,
          note: existing?.note,
        }
        return {
          ...current,
          revisions: { ...current.revisions, [eventId]: revision },
          audit: [
            {
              id: auditId(),
              at: new Date().toISOString(),
              actor: actorName,
              role: actorRole,
              action: existing
                ? 'Staged revision updated'
                : 'Event draft staged',
              entity: write.title,
              detail: existing
                ? 'The live listing is unchanged until review'
                : 'Saved to this browser',
              category: 'events',
            },
            ...current.audit,
          ],
        }
      })
      notify.saved('Event draft')
    },
    [actorName, actorRole, updateLocal],
  )

  const submitRevision = useCallback(
    (eventId: string) => {
      if (blockIfStale()) return
      updateLocal((current) => {
        const revision = current.revisions[eventId]
        if (!revision) return current
        return {
          ...current,
          revisions: {
            ...current.revisions,
            [eventId]: {
              ...revision,
              status: 'in_review',
              submittedAt: new Date().toISOString(),
              submittedBy: actorName,
              changedAfterReview: false,
            },
          },
          audit: [
            {
              id: auditId(),
              at: new Date().toISOString(),
              actor: actorName,
              role: actorRole,
              action: 'Event submitted for review',
              entity: revision.write.title,
              detail: `Uploader ${actorName} · reviewer must differ`,
              category: 'events',
            },
            ...current.audit,
          ],
        }
      })
      notify.success('Submitted for review')
    },
    [actorName, actorRole, updateLocal],
  )

  const withdrawRevision = useCallback(
    (eventId: string) => {
      if (blockIfStale()) return
      updateLocal((current) => {
        const revision = current.revisions[eventId]
        const nextRevisions = { ...current.revisions }
        delete nextRevisions[eventId]
        return {
          ...current,
          revisions: nextRevisions,
          audit: [
            {
              id: auditId(),
              at: new Date().toISOString(),
              actor: actorName,
              role: actorRole,
              action: 'Staged revision withdrawn',
              entity: revision?.write.title ?? eventId,
              detail: 'The live listing was never changed',
              category: 'events',
            },
            ...current.audit,
          ],
        }
      })
      notify.info('Staged revision withdrawn')
    },
    [actorName, actorRole, updateLocal],
  )

  const recordSecondReview = useCallback(
    (eventId: string, by: string, note: string) => {
      if (blockIfStale()) return
      updateLocal((current) => {
        const revision = current.revisions[eventId]
        if (!revision) return current
        return {
          ...current,
          revisions: {
            ...current.revisions,
            [eventId]: {
              ...revision,
              secondReview: { by, at: new Date().toISOString(), note },
            },
          },
          audit: [
            {
              id: auditId(),
              at: new Date().toISOString(),
              actor: by,
              role: 'administrator',
              action: 'Second accessibility review recorded',
              entity: revision.write.title,
              detail:
                note || 'Accessibility claim checked by a second reviewer',
              category: 'events',
            },
            ...current.audit,
          ],
        }
      })
      notify.success('Second review recorded')
    },
    [updateLocal],
  )

  const markChangedAfterReview = useCallback(
    (eventId: string) => {
      updateLocal((current) => {
        const revision = current.revisions[eventId]
        if (!revision) return current
        return {
          ...current,
          revisions: {
            ...current.revisions,
            [eventId]: { ...revision, changedAfterReview: true },
          },
        }
      })
    },
    [updateLocal],
  )

  const publishRevision = useCallback(
    async (eventId: string) => {
      if (blockIfStale()) return false
      const revision = local.revisions[eventId]
      if (!revision) return false
      try {
        await client
          .PATCH('/v1/admin/events/{id}', {
            params: { path: { id: eventId } },
            body: revision.write,
          })
          .then((result) => unwrap(result))
        await client
          .POST('/v1/admin/events/{id}/publish', {
            params: { path: { id: eventId } },
          })
          .then((result) => unwrap(result))
        updateLocal((current) => {
          const nextRevisions = { ...current.revisions }
          delete nextRevisions[eventId]
          return {
            ...current,
            revisions: nextRevisions,
            audit: [
              {
                id: auditId(),
                at: new Date().toISOString(),
                actor: actorName,
                role: actorRole,
                action: 'Event revision published',
                entity: revision.write.title,
                detail: `Revision applied by ${actorName}; uploader ${revision.submittedBy ?? 'unknown'} notified`,
                category: 'events',
              },
              ...current.audit,
            ],
          }
        })
        await queryClient.invalidateQueries({ queryKey: miceKeys.all })
        notify.success('Revision published')
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [actorName, actorRole, client, local.revisions, queryClient, updateLocal],
  )

  const createEvent = useCallback(
    async (write: EventWrite) => {
      if (blockIfStale()) return null
      try {
        const detail = await client
          .POST('/v1/admin/events', { body: write })
          .then((result) => unwrap<EventDetail>(result))
        await queryClient.invalidateQueries({ queryKey: miceKeys.all })
        setSelectedEventId(detail.id)
        addAudit({
          action: 'Event draft created',
          entity: write.title,
          detail: 'Draft created for review',
          category: 'events',
        })
        notify.success('Event draft created')
        return detail
      } catch (error) {
        notify.error(error)
        return null
      }
    },
    [addAudit, client, queryClient],
  )

  const setLifecycle = useCallback(
    async (eventId: string, state: LifecycleState, reason: string) => {
      if (blockIfStale()) return false
      if (!reason.trim()) {
        notify.warning('A reason is required for a lifecycle change')
        return false
      }
      const currentStatus = eventQuery.data?.status
      const action =
        state === 'cancelled'
          ? 'cancel'
          : state === 'unpublished'
            ? 'unpublish'
            : state === 'archived'
              ? 'archive'
              : state === 'published'
                ? currentStatus === 'cancelled'
                  ? 'restore'
                  : 'publish'
                : null
      if (!action) {
        notify.warning(`${state} is not a lifecycle action`)
        return false
      }
      try {
        await client
          .POST('/v1/admin/events/{id}/lifecycle', {
            params: { path: { id: eventId } },
            body: { action, reason: reason.trim() },
          })
          .then((result) => unwrap(result))
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: miceKeys.event(eventId, fixtureState),
          }),
          queryClient.invalidateQueries({
            queryKey: miceKeys.events(fixtureState),
          }),
          queryClient.invalidateQueries({
            queryKey: miceKeys.audit(fixtureState),
          }),
        ])
        addAudit({
          action: `Event marked ${state}`,
          entity: eventQuery.data?.title ?? eventId,
          detail: reason.trim(),
          category: 'events',
        })
        notify.success(`Event marked ${state}`)
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [
      addAudit,
      blockIfStale,
      client,
      eventQuery.data?.status,
      eventQuery.data?.title,
      fixtureState,
      queryClient,
    ],
  )

  const sendOffer = useCallback(
    async (eventId: string, registration: AdminRegistration) => {
      if (blockIfStale()) return null
      const name = registration.attendee?.displayName ?? registration.id
      try {
        const offer = await client
          .POST('/v1/admin/events/{id}/waitlist-offers', {
            params: { path: { id: eventId } },
            body: { registrationId: registration.id },
          })
          .then((result) => unwrap<WaitlistOffer>(result))
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: miceKeys.registrations(eventId, fixtureState),
          }),
          queryClient.invalidateQueries({
            queryKey: miceKeys.audit(fixtureState),
          }),
        ])
        notify.success(`Offer sent to ${name}`)
        return offer
      } catch (error) {
        notify.error(error)
        return null
      }
    },
    [blockIfStale, client, fixtureState, queryClient],
  )

  const decideOffer = useCallback(
    async (
      eventId: string,
      registrationId: string,
      decision: 'accept' | 'withdraw',
    ) => {
      if (blockIfStale()) return false
      try {
        await client
          .POST(
            '/v1/admin/events/{id}/waitlist-offers/{registrationId}/decision',
            {
              params: { path: { id: eventId, registrationId } },
              body: {
                decision,
                reason:
                  decision === 'withdraw'
                    ? 'Withdrawn from the admin console'
                    : undefined,
              },
            },
          )
          .then((result) => unwrap(result))
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: miceKeys.registrations(eventId, fixtureState),
          }),
          queryClient.invalidateQueries({
            queryKey: miceKeys.audit(fixtureState),
          }),
        ])
        notify.success(
          decision === 'accept'
            ? 'Registration confirmed'
            : 'Offer withdrawn',
        )
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [blockIfStale, client, fixtureState, queryClient],
  )

  const withdrawOffer = useCallback(
    (eventId: string, registrationId: string) =>
      decideOffer(eventId, registrationId, 'withdraw'),
    [decideOffer],
  )

  const acceptOffer = useCallback(
    (eventId: string, registrationId: string) =>
      decideOffer(eventId, registrationId, 'accept'),
    [decideOffer],
  )

  const overrideRegistration = useCallback(
    async (
      eventId: string,
      registrationId: string,
      patch: {
        status?: 'confirmed' | 'waitlisted' | 'cancelled'
        answers?: Record<string, string>
        reason: string
      },
    ) => {
      if (blockIfStale()) return false
      if (!patch.reason.trim()) {
        notify.warning('A reason is required for a registration correction')
        return false
      }
      try {
        await client
          .PATCH('/v1/admin/events/{id}/registrations/{registrationId}', {
            params: { path: { id: eventId, registrationId } },
            body: {
              status: patch.status,
              answers: patch.answers,
              reason: patch.reason.trim(),
            },
          })
          .then((result) => unwrap(result))
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: miceKeys.registrations(eventId, fixtureState),
          }),
          queryClient.invalidateQueries({
            queryKey: miceKeys.audit(fixtureState),
          }),
        ])
        addAudit({
          action:
            patch.status === 'cancelled'
              ? 'Registration cancelled'
              : 'Registration edited',
          entity: registrationId,
          detail: patch.reason.trim(),
          category: 'events',
        })
        notify.saved('Registration')
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [addAudit, blockIfStale, client, fixtureState, queryClient],
  )

  const cancelRegistration = useCallback(
    (eventId: string, registration: AdminRegistration, reason: string) =>
      overrideRegistration(eventId, registration.id, {
        status: 'cancelled',
        reason,
      }),
    [overrideRegistration],
  )

  const checkIn = useCallback(
    async (
      eventId: string,
      registration: AdminRegistration,
      options: {
        override?: boolean
        reason?: string
        method?: 'qr' | 'manual' | 'staff_override'
      } = {},
    ) => {
      if (blockIfStale()) return false
      if (options.override && !options.reason?.trim()) {
        notify.warning('An override needs a reason')
        return false
      }
      const method =
        options.method ?? (options.override ? 'staff_override' : 'manual')
      try {
        const result = await client.POST('/v1/mobile/events/{id}/checkins', {
          params: { path: { id: eventId } },
          body: {
            registrationId: registration.id,
            method,
            overrideReason: options.reason,
            deviceId: 'admin-console',
            clientTs: new Date().toISOString(),
          },
        })
        const name = registration.attendee?.displayName ?? registration.id
        // The 201 body is the authoritative row. Reconcile the cached page
        // before the follow-up read so the row and counter update immediately;
        // a static or lagging read can no longer discard the successful action.
        const record = checkInRecord(
          unwrap<Partial<CheckIn> | undefined>(result),
          {
            eventId,
            registrationId: registration.id,
            method,
          },
        )
        queryClient.setQueryData<PageResult<CheckIn>>(
          miceKeys.checkIns(eventId, fixtureState),
          (page) => reconcileCheckIn(page, record),
        )
        updateLocal((current) => ({
          ...current,
          audit: [
            {
              id: auditId(),
              at: new Date().toISOString(),
              actor: actorName,
              role: actorRole,
              action: options.override
                ? 'Check-in override recorded'
                : 'Attendee checked in',
              entity: name,
              detail: options.override
                ? `Reason: ${options.reason}`
                : `Method: ${method}`,
              category: 'events',
            },
            ...current.audit,
          ],
        }))
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: miceKeys.checkIns(eventId, fixtureState),
          }),
          queryClient.invalidateQueries({
            queryKey: miceKeys.registrations(eventId, fixtureState),
          }),
          queryClient.invalidateQueries({
            queryKey: miceKeys.audit(fixtureState),
          }),
        ])
        notify.success(`${name} checked in`)
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [actorName, actorRole, client, fixtureState, queryClient, updateLocal],
  )

  const undoCheckIn = useCallback(
    async (eventId: string, checkInId: string, reason: string) => {
      if (blockIfStale()) return false
      if (!reason.trim()) {
        notify.warning('A reason is required to undo a check-in')
        return false
      }
      try {
        await client
          .POST('/v1/admin/events/{id}/checkins/{checkInId}/undo', {
            params: { path: { id: eventId, checkInId } },
            body: { reason: reason.trim() },
          })
          .then((result) => unwrap(result))
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: miceKeys.checkIns(eventId, fixtureState),
          }),
          queryClient.invalidateQueries({
            queryKey: miceKeys.registrations(eventId, fixtureState),
          }),
          queryClient.invalidateQueries({
            queryKey: miceKeys.audit(fixtureState),
          }),
        ])
        notify.info('Check-in undone')
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [blockIfStale, client, fixtureState, queryClient],
  )

  const setVenueEvidence = useCallback(
    (venueId: string, fields: VenueEvidence['fields'], note: string) => {
      if (blockIfStale()) return
      updateLocal((current) => ({
        ...current,
        venueEvidence: {
          ...current.venueEvidence,
          [venueId]: {
            venueId,
            fields,
            note,
            updatedAt: new Date().toISOString(),
            by: actorName,
          },
        },
      }))
      notify.saved('Venue evidence')
    },
    [actorName, updateLocal],
  )

  const retireVenue = useCallback(
    (venueId: string, mergedInto?: string, reason?: string) => {
      if (blockIfStale()) return
      updateLocal((current) => ({
        ...current,
        venueRetired: {
          ...current.venueRetired,
          [venueId]: {
            at: new Date().toISOString(),
            by: actorName,
            mergedInto,
          },
        },
        audit: [
          {
            id: auditId(),
            at: new Date().toISOString(),
            actor: actorName,
            role: actorRole,
            action: mergedInto ? 'Venue merged' : 'Venue retired',
            entity: venueId,
            detail:
              reason?.trim() ||
              (mergedInto
                ? `Merged into ${mergedInto}`
                : 'Removed from future event choices'),
            category: 'events',
          },
          ...current.audit,
        ],
      }))
      notify.success(mergedInto ? 'Venue merged' : 'Venue retired')
    },
    [actorName, actorRole, updateLocal],
  )

  const saveVenue = useCallback(
    async (venueId: string | null, write: VenueWrite) => {
      if (blockIfStale()) return false
      try {
        if (venueId) {
          await client
            .PATCH('/v1/admin/venues/{id}', {
              params: { path: { id: venueId } },
              body: write,
            })
            .then((result) => unwrap(result))
        } else {
          await client
            .POST('/v1/admin/venues', { body: write })
            .then((result) => unwrap(result))
        }
        await queryClient.invalidateQueries({
          queryKey: miceKeys.venues(fixtureState),
        })
        addAudit({
          action: venueId ? 'Venue updated' : 'Venue created',
          entity: write.name,
          detail: 'Structured accessibility and verification saved',
          category: 'events',
        })
        notify.saved('Venue')
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [addAudit, client, fixtureState, queryClient],
  )

  const decideOrganizer = useCallback(
    async (
      organizer: OrganizerProfile,
      action: 'verify' | 'reject' | 'revoke' | 'restore' | 'expire',
      reason: string,
      expiresAt?: string | null,
    ) => {
      if (blockIfStale()) return false
      if (!organizer.id) {
        notify.warning('This organizer has no id in the fixture')
        return false
      }
      if (!reason.trim()) {
        notify.warning('A reason is required for every decision')
        return false
      }
      try {
        await client
          .POST('/v1/admin/organizers/{id}/verification', {
            params: { path: { id: organizer.id } },
            body: {
              action,
              trustTier: organizer.trustTier,
              reason,
              expiresAt: expiresAt ?? null,
              evidenceRef: null,
            },
          })
          .then((result) => unwrap(result))
        await queryClient.invalidateQueries({
          queryKey: miceKeys.organizers(fixtureState),
        })
        addAudit({
          action: `Organizer ${action}`,
          entity: organizer.displayName,
          detail: reason,
          category: 'safety',
        })
        notify.saved('Verification decision')
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [addAudit, client, fixtureState, queryClient],
  )

  const noteOrganizer = useCallback(
    (organizerId: string, patch: Partial<OrganizerNote>) => {
      if (blockIfStale()) return
      updateLocal((current) => ({
        ...current,
        organizerNotes: {
          ...current.organizerNotes,
          [organizerId]: {
            ...current.organizerNotes[organizerId],
            organizerId,
            ...patch,
          },
        },
      }))
    },
    [updateLocal],
  )

  const assignReport = useCallback(
    (reportId: string, assignedTo: string) => {
      if (blockIfStale()) return
      updateLocal((current) => {
        const existing: ReportAssignment = current.reportAssignments[
          reportId
        ] ?? { reportId, assignedTo: '' }
        return {
          ...current,
          reportAssignments: {
            ...current.reportAssignments,
            [reportId]: { ...existing, assignedTo },
          },
        }
      })
      notify.saved('Assignment')
    },
    [updateLocal],
  )

  const escalateReport = useCallback(
    (reportId: string) => {
      if (blockIfStale()) return
      updateLocal((current) => {
        const existing: ReportAssignment = current.reportAssignments[
          reportId
        ] ?? { reportId, assignedTo: actorName }
        return {
          ...current,
          reportAssignments: {
            ...current.reportAssignments,
            [reportId]: {
              ...existing,
              escalated: true,
              escalatedAt: new Date().toISOString(),
            },
          },
          audit: [
            {
              id: auditId(),
              at: new Date().toISOString(),
              actor: actorName,
              role: actorRole,
              action: 'Event report escalated',
              entity: reportId,
              detail: 'Stays open until a decision is recorded',
              category: 'safety',
            },
            ...current.audit,
          ],
        }
      })
      notify.info('Report escalated')
    },
    [actorName, actorRole, updateLocal],
  )

  const assignReview = useCallback(
    (eventId: string, assignedTo: string) => {
      updateLocal((current) => ({
        ...current,
        reviewAssignments: {
          ...current.reviewAssignments,
          [eventId]: assignedTo,
        },
      }))
      notify.saved('Review assignment')
    },
    [updateLocal],
  )

  const decideReport = useCallback(
    async (
      report: EventReport,
      decision: 'resolve' | 'dismiss' | 'revoke_organizer',
      note: string,
    ) => {
      if (blockIfStale()) return false
      if (!note.trim()) {
        notify.warning('A decision note is required')
        return false
      }
      try {
        await client
          .POST('/v1/admin/event-reports/{id}/decision', {
            params: { path: { id: report.id } },
            body: { decision, note },
          })
          .then((result) => unwrap(result))
        await queryClient.invalidateQueries({
          queryKey: miceKeys.reports(fixtureState),
        })
        addAudit({
          action: `Report ${decision === 'resolve' ? 'resolved' : decision === 'dismiss' ? 'dismissed' : 'escalated to organizer revocation'}`,
          entity: report.id,
          detail: note,
          category: 'safety',
        })
        notify.saved('Report decision')
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [addAudit, client, fixtureState, queryClient],
  )

  const createSession = useCallback(
    async (eventId: string, body: Record<string, unknown>) => {
      if (blockIfStale()) return false
      try {
        await client
          .POST('/v1/admin/events/{id}/sessions', {
            params: { path: { id: eventId } },
            body: body as never,
          })
          .then((result) => unwrap(result))
        await queryClient.invalidateQueries({
          queryKey: miceKeys.event(eventId, fixtureState),
        })
        addAudit({
          action: 'Agenda session added',
          entity: String(body.title ?? eventId),
          detail: `${String(body.day ?? '')} ${String(body.startsAt ?? '')}`,
          category: 'events',
        })
        notify.saved('Session')
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [addAudit, client, fixtureState, queryClient],
  )

  const updateSession = useCallback(
    async (
      eventId: string,
      sessionId: string,
      body: Record<string, unknown>,
    ) => {
      if (blockIfStale()) return false
      try {
        await client
          .PATCH('/v1/admin/events/{id}/sessions/{sessionId}', {
            params: { path: { id: eventId, sessionId } },
            body: body as never,
          })
          .then((result) => unwrap(result))
        await queryClient.invalidateQueries({
          queryKey: miceKeys.event(eventId, fixtureState),
        })
        addAudit({
          action: 'Agenda session updated',
          entity: String(body.title ?? sessionId),
          detail: 'Conflict resolution saved',
          category: 'events',
        })
        notify.saved('Session')
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [addAudit, client, fixtureState, queryClient],
  )

  const createSpeaker = useCallback(
    async (
      eventId: string,
      body: Record<string, unknown>,
      sessionId?: string,
    ) => {
      if (blockIfStale()) return false
      try {
        const person = await client
          .POST('/v1/admin/events/{id}/people', {
            params: { path: { id: eventId } },
            body: body as never,
          })
          .then((result) => unwrap<{ id?: string }>(result))
        if (sessionId && person?.id) {
          await client
            .POST('/v1/admin/sessions/{sessionId}/speakers', {
              params: { path: { sessionId } },
              body: { speakerId: person.id } as never,
            })
            .then((result) => unwrap(result))
        }
        await queryClient.invalidateQueries({
          queryKey: miceKeys.event(eventId, fixtureState),
        })
        addAudit({
          action: 'Speaker record created',
          entity: String(body.displayName ?? 'Speaker'),
          detail: sessionId ? 'Linked to a session' : 'Not linked yet',
          category: 'events',
        })
        notify.saved('Speaker')
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [addAudit, client, fixtureState, queryClient],
  )

  const setSpeakerConsent = useCallback(
    async (
      eventId: string,
      personId: string,
      consent: 'pending' | 'granted' | 'declined',
    ) => {
      if (blockIfStale()) return false
      try {
        await client
          .POST('/v1/admin/events/{id}/people/{personId}/consent', {
            params: { path: { id: eventId, personId } },
            body: { consent },
          })
          .then((result) => unwrap(result))
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: miceKeys.event(eventId, fixtureState),
          }),
          queryClient.invalidateQueries({
            queryKey: miceKeys.audit(fixtureState),
          }),
        ])
        notify.saved('Speaker record')
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [blockIfStale, client, fixtureState, queryClient],
  )

  const removeSpeaker = useCallback(
    async (eventId: string, personId: string) => {
      if (blockIfStale()) return false
      try {
        await client
          .DELETE('/v1/admin/events/{id}/people/{personId}', {
            params: { path: { id: eventId, personId } },
          })
          .then((result) => unwrap(result))
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: miceKeys.event(eventId, fixtureState),
          }),
          queryClient.invalidateQueries({
            queryKey: miceKeys.audit(fixtureState),
          }),
        ])
        notify.success('Speaker removed from the event')
        return true
      } catch (error) {
        notify.error(error)
        return false
      }
    },
    [blockIfStale, client, fixtureState, queryClient],
  )

  const resetLocal = useCallback(() => {
    updateLocal(() => emptyLocalState())
    notify.info('Local MICE workflow cleared')
  }, [updateLocal])

  const value = useMemo<MiceStoreValue>(
    () => ({
      fixtureState,
      setFixtureState,
      isStale,
      actorName,
      actorRole,
      client,
      local,
      eventsQuery,
      eventQuery,
      venuesQuery,
      organizersQuery,
      reportsQuery,
      registrationsQuery,
      checkInsQuery,
      auditQuery,
      events,
      venues,
      organizers,
      reports,
      registrations,
      checkIns,
      selectedEventId: resolvedEventId,
      selectEvent: setSelectedEventId,
      revisionFor,
      saveRevision,
      submitRevision,
      withdrawRevision,
      recordSecondReview,
      markChangedAfterReview,
      publishRevision,
      createEvent,
      setLifecycle,
      addAudit,
      sendOffer,
      withdrawOffer,
      acceptOffer,
      overrideRegistration,
      cancelRegistration,
      checkIn,
      undoCheckIn,
      setVenueEvidence,
      retireVenue,
      saveVenue,
      decideOrganizer,
      noteOrganizer,
      assignReport,
      escalateReport,
      assignReview,
      decideReport,
      createSession,
      updateSession,
      createSpeaker,
      setSpeakerConsent,
      removeSpeaker,
      resetLocal,
    }),
    [
      acceptOffer,
      actorName,
      actorRole,
      addAudit,
      assignReport,
      assignReview,
      auditQuery,
      cancelRegistration,
      checkIn,
      checkIns,
      checkInsQuery,
      client,
      createEvent,
      createSession,
      createSpeaker,
      decideOrganizer,
      decideReport,
      escalateReport,
      eventQuery,
      events,
      eventsQuery,
      fixtureState,
      isStale,
      local,
      markChangedAfterReview,
      noteOrganizer,
      organizers,
      organizersQuery,
      overrideRegistration,
      publishRevision,
      recordSecondReview,
      registrations,
      registrationsQuery,
      removeSpeaker,
      reports,
      reportsQuery,
      resetLocal,
      resolvedEventId,
      retireVenue,
      revisionFor,
      saveRevision,
      saveVenue,
      sendOffer,
      setLifecycle,
      setSpeakerConsent,
      setVenueEvidence,
      submitRevision,
      undoCheckIn,
      updateSession,
      venues,
      venuesQuery,
      withdrawOffer,
      withdrawRevision,
    ],
  )

  return <MiceContext.Provider value={value}>{children}</MiceContext.Provider>
}

export function useMice(): MiceStoreValue {
  const value = useContext(MiceContext)
  if (!value) throw new Error('useMice must be used inside MiceProvider')
  return value
}
