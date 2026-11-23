import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventDetail } from '#/lib/mice/types'

const detail = {
  id: 'event-1',
  title: 'Nairobi Conservation Conference',
  eventClass: 'conference',
  format: 'in_person',
  access: 'public',
  status: 'published',
  startsAt: '2026-12-05T09:00:00+03:00',
  endsAt: '2026-12-05T17:00:00+03:00',
  timezone: 'Africa/Nairobi',
  county: 'Nairobi',
  capacity: 100,
  attendeeCount: 1,
  waitlistOpen: true,
  registrationMode: 'rsvp',
  accessibility: { state: 'unknown' },
  saved: false,
} as EventDetail

const post = vi.fn(async () => ({ data: { ok: true } }))
const patch = vi.fn(async () => ({ data: { ok: true } }))
const del = vi.fn(async () => ({ data: { ok: true } }))
const client = { POST: post, PATCH: patch, DELETE: del, GET: vi.fn() }

vi.mock('#/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: { user: { name: 'Ada', email: 'ada@test' } } }),
  },
}))
vi.mock('#/lib/contracts/session', () => ({
  useContractRole: () => ({ role: 'administrator' }),
}))
vi.mock('#/lib/mice/api', () => ({
  useMiceClient: () => client,
  useMiceEvents: () => ({ data: { items: [] } }),
  useMiceEvent: () => ({ data: detail }),
  useMiceVenues: () => ({ data: { items: [] } }),
  useMiceOrganizers: () => ({ data: { items: [] } }),
  useMiceReports: () => ({ data: { items: [] } }),
  useMiceRegistrations: () => ({ data: { items: [] } }),
  useMiceCheckIns: () => ({ data: { items: [] } }),
  useMiceAudit: () => ({ data: { items: [] } }),
  miceKeys: {
    all: ['mice'],
    events: (state: string) => ['mice', 'events', state],
    event: (id: string, state: string) => ['mice', 'event', id, state],
    venues: (state: string) => ['mice', 'venues', state],
    organizers: (state: string) => ['mice', 'organizers', state],
    reports: (state: string) => ['mice', 'reports', state],
    registrations: (id: string, state: string) => [
      'mice',
      'registrations',
      id,
      state,
    ],
    checkIns: (id: string, state: string) => ['mice', 'checkins', id, state],
    audit: (state: string) => ['mice', 'audit', state],
  },
}))

const { MiceProvider, useMice } = await import('#/lib/mice/store')

type Store = ReturnType<typeof useMice>

function Harness({ onReady }: { onReady: (store: Store) => void }) {
  const store = useMice()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (ready) return
    setReady(true)
    onReady(store)
  }, [onReady, ready, store])
  return null
}

async function renderStore() {
  let store: Store | null = null
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MiceProvider>
        <Harness
          onReady={(value) => {
            store = value
          }}
        />
      </MiceProvider>
    </QueryClientProvider>,
  )
  await waitFor(() => expect(store).not.toBeNull())
  return store as unknown as Store
}

describe('MICE store write path', () => {
  beforeEach(() => {
    post.mockClear()
    patch.mockClear()
    del.mockClear()
  })

  it('maps lifecycle states to the server actions', async () => {
    const store = await renderStore()

    await store.setLifecycle('event-1', 'cancelled', 'Venue withdrew')
    expect(post).toHaveBeenLastCalledWith('/v1/admin/events/{id}/lifecycle', {
      params: { path: { id: 'event-1' } },
      body: { action: 'cancel', reason: 'Venue withdrew' },
    })

    await store.setLifecycle('event-1', 'unpublished', 'Fixing the venue')
    expect(post).toHaveBeenLastCalledWith('/v1/admin/events/{id}/lifecycle', {
      params: { path: { id: 'event-1' } },
      body: { action: 'unpublish', reason: 'Fixing the venue' },
    })

    await store.setLifecycle('event-1', 'archived', 'Series retired')
    expect(post).toHaveBeenLastCalledWith('/v1/admin/events/{id}/lifecycle', {
      params: { path: { id: 'event-1' } },
      body: { action: 'archive', reason: 'Series retired' },
    })

    await store.setLifecycle('event-1', 'published', 'Back on sale')
    expect(post).toHaveBeenLastCalledWith('/v1/admin/events/{id}/lifecycle', {
      params: { path: { id: 'event-1' } },
      body: { action: 'publish', reason: 'Back on sale' },
    })
  })

  it('rejects a lifecycle change without a reason', async () => {
    const store = await renderStore()
    await expect(store.setLifecycle('event-1', 'cancelled', '  ')).resolves.toBe(
      false,
    )
    expect(post).not.toHaveBeenCalled()
  })

  it('sends, accepts and withdraws a waitlist offer', async () => {
    const store = await renderStore()
    const registration = {
      id: 'reg-1',
      eventId: 'event-1',
      status: 'waitlisted' as const,
      createdAt: '2026-11-18T10:00:00Z',
      attendee: { displayName: 'Waitlist Wendy', email: 'w@test' },
    }

    await store.sendOffer('event-1', registration)
    expect(post).toHaveBeenLastCalledWith(
      '/v1/admin/events/{id}/waitlist-offers',
      {
        params: { path: { id: 'event-1' } },
        body: { registrationId: 'reg-1' },
      },
    )

    await store.acceptOffer('event-1', 'reg-1')
    expect(post).toHaveBeenLastCalledWith(
      '/v1/admin/events/{id}/waitlist-offers/{registrationId}/decision',
      {
        params: { path: { id: 'event-1', registrationId: 'reg-1' } },
        body: { decision: 'accept', reason: undefined },
      },
    )

    await store.withdrawOffer('event-1', 'reg-1')
    expect(post).toHaveBeenLastCalledWith(
      '/v1/admin/events/{id}/waitlist-offers/{registrationId}/decision',
      {
        params: { path: { id: 'event-1', registrationId: 'reg-1' } },
        body: {
          decision: 'withdraw',
          reason: 'Withdrawn from the admin console',
        },
      },
    )
  })

  it('patches a registration correction instead of an overlay', async () => {
    const store = await renderStore()
    await store.overrideRegistration('event-1', 'reg-1', {
      status: 'confirmed',
      answers: { accessibility: 'Wheelchair space' },
      reason: 'Attendee updated their needs',
    })
    expect(patch).toHaveBeenLastCalledWith(
      '/v1/admin/events/{id}/registrations/{registrationId}',
      {
        params: { path: { id: 'event-1', registrationId: 'reg-1' } },
        body: {
          status: 'confirmed',
          answers: { accessibility: 'Wheelchair space' },
          reason: 'Attendee updated their needs',
        },
      },
    )
  })

  it('undoes a check-in through the server', async () => {
    const store = await renderStore()
    await store.undoCheckIn('event-1', 'checkin-1', 'Scanned the wrong guest')
    expect(post).toHaveBeenLastCalledWith(
      '/v1/admin/events/{id}/checkins/{checkInId}/undo',
      {
        params: { path: { id: 'event-1', checkInId: 'checkin-1' } },
        body: { reason: 'Scanned the wrong guest' },
      },
    )
  })

  it('writes speaker consent and removal', async () => {
    const store = await renderStore()
    await store.setSpeakerConsent('event-1', 'person-1', 'declined')
    expect(post).toHaveBeenLastCalledWith(
      '/v1/admin/events/{id}/people/{personId}/consent',
      {
        params: { path: { id: 'event-1', personId: 'person-1' } },
        body: { consent: 'declined' },
      },
    )

    await store.removeSpeaker('event-1', 'person-1')
    expect(del).toHaveBeenLastCalledWith(
      '/v1/admin/events/{id}/people/{personId}',
      { params: { path: { id: 'event-1', personId: 'person-1' } } },
    )
  })

  it('blocks writes on a stale snapshot', async () => {
    const store = await renderStore()
    store.setFixtureState('stale')
    await new Promise((resolve) => setTimeout(resolve, 0))
    await expect(
      store.setLifecycle('event-1', 'cancelled', 'Should not reach the API'),
    ).resolves.toBe(false)
    expect(post).not.toHaveBeenCalled()
  })
})
